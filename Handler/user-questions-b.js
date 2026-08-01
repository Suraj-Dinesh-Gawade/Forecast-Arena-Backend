import db from "../Config/db.js";

/**
 * Loads all active questions for the prediction arena.
 * Filters out questions whose prediction deadlines (End_Time) have passed.
 */
export const questionData = (req, res) => {

    db.query("UPDATE Questions SET status = 'Settled' WHERE status = 'Active' AND End_Time <= NOW()", (updateErr) => {
    if (updateErr) console.error("Failed to update expired questions:", updateErr);
    // FIXED: Added "AND End_Time > NOW()" to prevent expired questions from loading on the user active dashboard
    const sql = 'SELECT q_id, question, Category, End_Time, Yes_Odds, No_Odds, Odd_One, Odd_Two FROM Questions WHERE LOWER(status) = "active" AND End_Time > NOW()';
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Database Error (questionData):", err);
            return res.status(500).json({ Error: "Database Error! Failed to load questions data" });
        }
        if (result.length === 0) {
            return res.status(200).json({
                Category: "General",
                question: "No active questions available right now",
                End_Time: "N/A"
            });
        }
        res.status(200).json(result);
    });
    });
};
/**
 * Places a prediction bet, checks for active suspensions, verifies balances,
 * deducts coins, logs transactional histories, and updates dynamic odds pools!
 */
export const addBetsData = (req, res) => {
    // 1. Destructure the exact keys sent by your frontend body
    const { userId, qId, prediction, coins } = req.body;

    // Safety checks
    if (!userId || !qId || !prediction || !coins) {
        return res.status(400).json({ Error: "All prediction parameters are required!" });
    }

    // STEP 1: Fetch user profile state, balance, and warning counters
    const checkUserSql = "SELECT coins, status, warning_count FROM Users WHERE id = ?";
    db.query(checkUserSql, [userId], (err, userRows) => {
        if (err) {
            console.error("User validation fetch error:", err);
            return res.status(500).json({ Error: "Database Error while verifying user profile." });
        }
        if (userRows.length === 0) {
            return res.status(404).json({ Error: "User profile not found." });
        }

        const user = userRows[0];
        const currentCoins = Number(user.coins || 0);
        const userStatus = (user.status || "Active").toLowerCase();
        const warningCount = Number(user.warning_count || 0);

        // =========================================================================
        // ⛔ ACTIVE LOCKOUT INTERCEPTOR: Prevent suspended users from predicting
        // =========================================================================
        if (userStatus.includes("suspended") || warningCount >= 10) {
            return res.status(403).json({ 
                Error: "⛔ Access Denied! Your account has been suspended due to multiple policy violations. You are restricted from placing any more predictions." 
            });
        }

        // STEP 2: Verify that the user has a sufficient coin balance
        if (currentCoins < Number(coins)) {
            return res.status(400).json({ 
                Error: `Insufficient coins balance! You only have ${currentCoins} coins.` 
            });
        }

        // STEP 3: Fetch the question to match the custom options ("YES"/"NO" or Team Names) and verify timeline constraints
        // FIXED: Added End_Time and status selection inside the question validation query
        const getQuestionSql = "SELECT Odd_One, Odd_Two, Green_Amount, Red_Amount, End_Time, status FROM Questions WHERE q_id = ?";
        db.query(getQuestionSql, [qId], (qErr, qRows) => {
            if (qErr) {
                console.error("Question fetch error:", qErr);
                return res.status(500).json({ Error: "Database Error while checking prediction metadata." });
            }
            if (qRows.length === 0) {
                return res.status(404).json({ Error: "Prediction market question not found." });
            }

            const question = qRows[0];
            const optionOne = question.Odd_One || "YES";
            
            // =========================================================================
            // 🔒 Strict TIME LOCKOUT GATEWAY: Re-evaluates date/time constraints on transaction execution
            // =========================================================================
            const deadlineTime = new Date(question.End_Time);
            const currentServerTime = new Date();

            // Guard A: Verify that the question has not already been settled or resolved by an admin
            if ((question.status || "active").toLowerCase() !== "active") {
                return res.status(400).json({ 
                    Error: "⛔ Prediction Locked! This prediction market is closed or already resolved." 
                });
            }

            // Guard B: Confirm current server date-time is strictly before the prediction deadline
            if (currentServerTime >= deadlineTime) {
                return res.status(400).json({ 
                    Error: "⛔ Prediction Locked! The deadline for this market has passed. No more predictions are accepted." 
                });
            }

            // Dynamically determine the correct odds pool (Green = Option 1, Red = Option 2)
            const isOptionOne = (String(prediction).toLowerCase() === String(optionOne).toLowerCase());
            const poolColumn = isOptionOne ? 'Green_Amount' : 'Red_Amount';

            // STEP 4: Deduct the bet coins from the user's profile account
            const deductCoinsSql = "UPDATE Users SET coins = coins - ? WHERE id = ?";
            db.query(deductCoinsSql, [coins, userId], (deductErr) => {
                if (deductErr) {
                    console.error("Coin deduction error:", deductErr);
                    return res.status(500).json({ Error: "Database Error while deducting prediction coins." });
                }

                // STEP 5: Log a record into the transaction ledger
                const insertTxSql = "INSERT INTO Transactions (t_user_id, amount, type) VALUES (?, ?, 'Prediction Stake')";
                db.query(insertTxSql, [userId, -coins], (txErr) => {
                    if (txErr) {
                        console.error("Transaction ledger insert failed:", txErr);
                    }

                    // STEP 6: Insert the prediction record into the Bets table
                    const insertBetSql = `
                        INSERT INTO Bets (b_user_id, b_question_id, selected_option, bet_amount) 
                        VALUES (?, ?, ?, ?)
                    `;
                    db.query(insertBetSql, [userId, qId, prediction, coins], (betErr) => {
                        if (betErr) {
                            console.error("Bet insertion database error:", betErr);
                            return res.status(500).json({ Error: "Failed to submit prediction into database." });
                        }

                        // STEP 7: Add the coins to the active resolved pool column (Green_Amount or Red_Amount)
                        const updatePoolSql = `UPDATE Questions SET ${poolColumn} = ${poolColumn} + ? WHERE q_id = ?`;
                        db.query(updatePoolSql, [coins, qId], (poolErr) => {
                            if (poolErr) {
                                console.error("Pool update error:", poolErr);
                                return res.status(500).json({ Error: "Prediction registered, but failed to adjust odds pool." });
                            }

                            // STEP 8: Fetch current pool sizes to recalculate dynamic odds multipliers
                            const getPoolsSql = "SELECT Green_Amount, Red_Amount FROM Questions WHERE q_id = ?";
                            db.query(getPoolsSql, [qId], (fetchErr, rows) => {
                                if (fetchErr || rows.length === 0) {
                                    return res.status(200).json({ message: "Prediction recorded!" });
                                }

                                const greenPool = Number(rows[0].Green_Amount || 0);
                                const redPool = Number(rows[0].Red_Amount || 0);
                                const totalPool = greenPool + redPool;

                                // Recalculate dynamic multipliers (Total/Green and Total/Red)
                                const newYesOdds = greenPool > 0 ? (totalPool / greenPool).toFixed(2) : 2.00;
                                const newNoOdds = redPool > 0 ? (totalPool / redPool).toFixed(2) : 2.00;

                                // STEP 9: Write the updated dynamic odds multipliers back to the Questions table
                                const updateOddsSql = `
                                    UPDATE Questions 
                                    SET yes_odds = ?, no_odds = ? 
                                    WHERE q_id = ?
                                `;
                                db.query(updateOddsSql, [newYesOdds, newNoOdds, qId], (oddsErr) => {
                                    if (oddsErr) {
                                        console.error("Odds Saving Error:", oddsErr);
                                    }
                                    res.status(200).json({ message: "Prediction recorded and live odds updated!" });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};
