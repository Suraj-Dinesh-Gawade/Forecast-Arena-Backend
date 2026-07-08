import db from "../Config/db.js";

export const userDataProfile = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT name, coins FROM Users WHERE id = ?'
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ Error: "Database Error! Failed to load User data From Forecast Arena" });
        
        res.status(200).json(result[0]);
    });
};