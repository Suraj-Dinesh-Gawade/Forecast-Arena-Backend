// import db from "../Config/db.js";

// export const addQuestion = (req, res) => {
//     const { question } = req.body;
//     const sql = 'INSERT INTO Questions(question) VALUES(?)';
//     db.query(sql, [question], (err) => {
//         if (err) {
//             return res.status(500).json({ Error: "Database Error" });
//         };
//         res.status(200).json({ message: "Question added into the database" });
//     });
// };

import db from "../Config/db.js";

export const questionData = (req, res) => {
    const sql = 'SELECT q_id, question, Category, End_Time, Yes_Odds, No_Odds, Odd_One, Odd_Two FROM Questions WHERE LOWER(status) = "active"';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to load quetions data" });
        };
        if (result.length === 0) {
            return res.status(200).json({
                Category: "General",
                question: "No active questions available right now",
                End_Time: "N/A"
            });
        }
        res.status(200).json(result);
    });
};

export const addBetsData = (req, res) => {
    // 1. Destructure the exact keys sent by your frontend body
    const { userId, qId, prediction, coins } = req.body;

    // Safety checks
    if (!userId || !qId || !prediction || !coins) {
        return res.status(400).json({ Error: "All prediction parameters are required!" });
    }

    // 2. FIXED: Matches your exact database table and column names
    const sql = `
        INSERT INTO Bets (b_user_id, b_question_id, selected_option, bet_amount) 
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [userId, qId, prediction, coins], (err, result) => {
        if (err) {
            console.error("Database Error: ", err);
            return res.status(500).json({ Error: "Failed to submit prediction into database." });
        }
        
        const poolColumn = (prediction === 'YES') ? 'Green_Amount' : 'Red_Amount';

        const updatePoolSql = `UPDATE Questions SET ${poolColumn} = ${poolColumn} + ? WHERE q_id = ?`;

        db.query(updatePoolSql, [coins, qId], (poolErr) => {
            if (poolErr) {
                console.error("Pool Update Error : ", poolErr);
                return res.status(500).json({ Error: "Prediction registered, but failed to adjust odds pool." });
            }
            const getPoolsSql = "SELECT Green_Amount, Red_Amount FROM Questions WHERE q_id = ?";
            db.query(getPoolsSql, [qId], (fetchErr, rows) => {
                if (fetchErr || rows.length === 0) {
                    return res.status(200).json({ message: "Prediction recorded!" });
                }

                const greenPool = Number(rows[0].Green_Amount);
                const redPool = Number(rows[0].Red_Amount);
                const totalPool = greenPool + redPool;

                // 4. Calculate dynamic multipliers (T/G and T/R)
                const newYesOdds = greenPool > 0 ? (totalPool / greenPool).toFixed(2) : 2.00;
                const newNoOdds = redPool > 0 ? (totalPool / redPool).toFixed(2) : 2.00;

                // 5. Update the live odds in the Questions table
                const updateOddsSql = `
                    UPDATE Questions 
                    SET yes_odds = ?, no_odds = ? 
                    WHERE q_id = ?
                `;

                db.query(updateOddsSql, [newYesOdds, newNoOdds, qId], (oddsErr) => {
                    if (oddsErr) {
                        console.error("Odds Saving Error: ", oddsErr);
                    }
                    res.status(200).json({ message: "Prediction recorded and live odds updated!" });
                });
            });
        })
    });
};