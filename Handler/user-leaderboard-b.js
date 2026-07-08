import db from "../Config/db.js";

export const leaderboardData = (req, res) => {
    const sql = 'SELECT name, coins FROM Users ORDER BY coins DESC';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to fetch data from the Forecast Arena" });
        };
        res.status(200).json(result);
    });
};