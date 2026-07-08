import db from "../Config/db.js";

export const question_Data = (req, res) => {
    const { question, category, endtime, odd1, odd2 } = req.body;

    const sql = 'INSERT INTO Questions(question, Category, End_Time, Odd_One, Odd_Two) VALUES(? , ?, ?, ?, ?)';
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

