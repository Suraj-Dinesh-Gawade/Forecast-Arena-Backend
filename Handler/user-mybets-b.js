
import db from "../Config/db.js";
// ====== NEW: Fetch Full Prediction List Details (Includes SQL Join for Question Texts) ======
export const userBetsList = (req, res) => {
    const { id } = req.params;
    
    // We join the Questions and Bets table using b_question_id = q_id
    const sql = `
        SELECT b.bet_id, q.question, b.selected_option, b.bet_amount, b.Win_Lose 
        FROM Bets b 
        JOIN Questions q ON b.b_question_id = q.q_id 
        WHERE b.b_user_id = ?
    `;
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Database SQL Join Error: ", err);
            return res.status(500).json({ Error: "Database Error! Failed to load prediction history detail." });
        }
        res.status(200).json(result);
    });
};