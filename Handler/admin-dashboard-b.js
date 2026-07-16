import db from "../Config/db.js";

export const no_Of_Users = (req, res) => {
    const sql = "SELECT COUNT(*) AS total_Users FROM Users";
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to Load Users Count" });
        };
        res.status(200).json(result[0]);
    });
};

export const no_Of_Questions = (req, res) => {
    const sql = "SELECT COUNT(*) AS total_Questions FROM Questions";
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to Load Questions Count" });
        };
        res.status(200).json(result[0]);
    });
};

export const live_Questions_No = (req, res) => {
    const sql = 'SELECT COUNT(*) AS Live_Questions FROM Questions WHERE status = "Active"';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to load Live Questions Count" });
        };
        res.status(200).json(result[0]);
    });
};

export const total_Predictions = (req, res) => {
    const sql = 'SELECT COUNT(*) AS Total_Predictions FROM Bets';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to load Prediction Count" });
        };
        res.status(200).json(result[0]);
    });
};
