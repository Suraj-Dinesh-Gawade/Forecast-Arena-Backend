import db from "../Config/db.js";

export const adminUserData = (req, res) => {
    const sql = 'SELECT id, name, username, coins, status FROM Users';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to Fetch User Data" });
        };
        res.status(200).json(result);
    });
};

export const warnUser = (req, res) => {
    const userId = req.params.id;
    const sql = 'UPDATE Users SET status = "Warned" WHERE id = ?';
    db.query(sql, [userId], (err) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to warn the user" });
        };
        res.status(200).json({
            message: "User Warned Successfully"
        });
    });
};

export const suspendUser = (req, res) => {
    const userId = req.params.id;
    const sql = 'UPDATE Users SET status = "Suspended" WHERE id = ?';
    db.query(sql, [userId], (err) => {
        if (err) {
            return res.status(500).json({ Error : "Database Error! Failed to suspend the user"});
        };
        res.status(200).json({ message: "User Suspended Successfully" });
    });
};

export const activateUser = (req, res) => {
    const userId = req.params.id;
    const sql = 'UPDATE Users SET status = "Active" WHERE id = ?';
    db.query(sql, [userId], (err) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to activate user account" });
        };
        res.status(200).json({ message: "User Activated Successfully" });
    });
};
