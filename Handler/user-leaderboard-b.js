import db from "../Config/db.js";

export const leaderboardData = (req, res) => {
    const sql = 'SELECT name, coins FROM Users WHERE LOWER(role) = "user" ORDER BY coins DESC, id ASC';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to fetch data from the Forecast Arena" });
        };
        res.status(200).json(result);
    });
};