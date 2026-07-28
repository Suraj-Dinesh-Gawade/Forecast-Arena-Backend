import db from "../Config/db.js";

const SYSTEM_RESERVED_ID = 1;

export const manageQuestion = (req, res) => {
    const sql = 'SELECT q_id, question, Category, Odd_One, Odd_Two, status  FROM Questions';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Error occured while fetching the question from the ForecastArena" });
        };
        res.status(200).json(result);
    });
}

export const resolveQuestion = (req, res) => {
    const questionId = req.params.id;
    const sql = 'UPDATE Questions SET status = "Settled" WHERE q_id = ?';
    db.query(sql, [questionId], (err) => {
        if (err) {
            console.log("Database Update Error: ",err);
            return res.status(500).json({ Error: "Database Error! Error while Resolving Question" });
        };
        res.status(200).json({message : "Question Resolved Successfully!"});
    });
};

export const deleteQuestion = (req, res) => {
    const questionId = req.params.id;
    const sql = 'DELETE FROM Questions WHERE q_id = ?';
    db.query(sql, [questionId], (err) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to Delete Question" });
        };
        res.status(200).json({ message: "Question Deleted Successfully!" });
    });
};

export const winOption = (req, res) => {
    const { qId, winnervalue } = req.body;

    if (!qId || !winnervalue) {
        return res.status(400).json({ Error: "Question ID and winner value are required!" });  
    }

    const selectSql = 'SELECT Odd_One, Odd_Two, Yes_Odds, No_Odds  FROM Questions WHERE q_id = ?';

    db.query(selectSql, [qId], (fetchErr, qRows) => {
        if (fetchErr) {
            console.error("Database Fetch Error: ", fetchErr);
            return res.status(500).json({ Error: "Failed to retrieve options details for prediction calculation." });
        }
        const question = qRows[0];
        const optionOne = question.Odd_One || "YES";

        // const winningOutcome = (winnervalue === optionOne) ? 'YES' : 'NO';

        const isOptionOneWinner = (winnervalue === optionOne);
        
        const winningOdds = isOptionOneWinner
            ? Number(question.Yes_Odds || 1.8) : Number(question.No_Odds || 1.8);
        
        const sql = 'UPDATE Questions SET winner = ?, status = "Settled" WHERE q_id = ?';

        db.query(sql, [winnervalue, qId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ Error: "Database Error! Failed to store winner into ForecastArena" });
            };

            const updateBetsSql = `UPDATE Bets SET Win_Lose = CASE WHEN LOWER(selected_option) = LOWER(?) THEN 'Win' Else 'Lose' END WHERE b_question_id = ?`;
        
            db.query(updateBetsSql, [winnervalue, qId], (betsErr) => {
                if (betsErr) {
                    console.error("Database Bets Update Error : ", betsErr);
                    return res.status(500).json({ Error: "Question settled, but failed to update win/lose statuses" });
                }

             const getBetsSql = "SELECT bet_id, b_user_id, selected_option, bet_amount FROM Bets WHERE b_question_id = ?";

                db.query(getBetsSql, [qId], (getBetsErr, betsList) => {
                    if (getBetsErr) {
                        console.error("Fetch Bets Error:", getBetsErr);
                        return res.status(500).json({ Error: "Failed to retrieve user prediction history for calculation." });
                    }

                    // If nobody placed predictions on this market, we are finished! Send response early.
                    if (betsList.length === 0) {
                        return res.status(200).json({ 
                            message: `Market settled as [${winnervalue}]! No predictions were registered on this question.` 
                        });
                    }

                    // =========================================================================
                    // STEP 5: Payout & Calculation Loop - Calculates & stores Coins_Won_Lose per User
                    // =========================================================================
                    let completedQueries = 0;
                    let hasErrors = false;

                   betsList.forEach(bet => {
    const betId = bet.bet_id;
    const userId = bet.b_user_id;
    const betAmount = Number(bet.bet_amount);
    const isWin = (bet.selected_option.toLowerCase() === winnervalue.toLowerCase());

    let coinsChange = 0;
    let updateBalanceSql = "";
    let updateBalanceParams = [];

    if (isWin) {
        coinsChange = Math.round(betAmount * winningOdds);
        updateBalanceSql = "UPDATE Users SET coins = coins + ? WHERE id = ?";
        updateBalanceParams = [coinsChange, userId];
    } else {
        coinsChange = -betAmount;
        
        // 1. Log loss to audit table
        const logLossSql = "INSERT INTO System_Profit_Audit (user_id, q_id, amount_lost) VALUES (?, ?, ?)";
        db.query(logLossSql, [userId, qId, betAmount], (auditErr) => {
            if (auditErr) console.error("Failed to log audit record:", auditErr);
        });

        // 2. Transfer to System Reserved Account
        updateBalanceSql = "UPDATE Users SET coins = coins + ? WHERE id = ?";
        updateBalanceParams = [betAmount, SYSTEM_RESERVED_ID];
    }

    // Execute updates
    const updateBetCoinsSql = "UPDATE Bets SET Coins_Won_Lose = ? WHERE bet_id = ?";
    db.query(updateBetCoinsSql, [coinsChange, betId], (betUpdateErr) => {
        if (betUpdateErr) {
            console.error(`Failed to update bet coins for ID ${betId}:`, betUpdateErr);
            hasErrors = true;
            next();
        } else {
            db.query(updateBalanceSql, updateBalanceParams, (userUpdateErr) => {
                if (userUpdateErr) {
                    console.error(`Failed to adjust balance for ID ${userId}:`, userUpdateErr);
                    hasErrors = true;
                } else if (isWin) {
                    const logTxSql = "INSERT INTO Transactions (t_user_id, amount, type) VALUES (?, ?, 'Prediction Win Payout')";
                    db.query(logTxSql, [userId, coinsChange], (txErr) => {
                        if (txErr) console.error("Payout transaction log failed:", txErr);
                    });
                }
                next();
            });
        }
    });

    function next() {
        completedQueries++;
        if (completedQueries === betsList.length) {
            if (hasErrors) {
                return res.status(200).json({ message: `Settlement complete, but some transfers failed.` });
            }
            res.status(200).json({ message: `Winner [${winnervalue}] registered! Payouts and System Reserved transfers updated.` });
        }
    }
});
                });    
            //     const { coins, betsUserId } = req.body;
            //     const coinUpdates = 'UPDATE Bets SET Coins_Won_Lose = ? WHERE b_user_id = ?';
            //     db.query(coinUpdates, [coins, betsUserId], (err) => {
            //         if (err) {
            //             return res.status(500).json({ Error: "Database Error! Failed to Update coins for user" });
            //         };
            //         res.status(200).json({ message: "Coins updated successfully" });
            //     })

            //     res.status(200).json({ message: `Winner [${winnervalue}] registered successfully, and users' bet outcomes updated!` });
             });
        });
    });
};

