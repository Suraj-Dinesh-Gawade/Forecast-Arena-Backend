import db from "../Config/db.js";

export const question_Data = (req, res) => {
    const { question, category, endtime, odd1, odd2 } = req.body;

    if (endtime) {
        const inputDeadline = new Date(endtime);
        const currentServetTime = new Date();
        if (inputDeadline <= currentServetTime) {
            return res.status(400).json({ Error: "⛔ Question Creation Failed! The prediction deadline cannot be set to a date or time in the past." });
        }
    }
    const sql = 'INSERT INTO Questions(question, Category, End_Time, Odd_One, Odd_Two) VALUES(?, ?, ?, ?, ?)';
    db.query(sql, [question, category, endtime, odd1, odd2], (err) => {
        if (err) {
            console.log("Database Error : ", err);
            return res.status(500).json({ Error: "Database Error! Failed to add question to the database" });
        };
        res.status(200).json({
            message: "Question Data added to the ForcastArena Successfully"
        });
    });
};

