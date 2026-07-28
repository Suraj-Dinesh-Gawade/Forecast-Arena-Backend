import bcrypt from "bcrypt";
import db from "../Config/db.js";

export const adminUserData = (req, res) => {
    const sql = 'SELECT id, name, username, coins, status FROM Users WHERE LOWER(role) = "user"';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to Fetch User Data" });
        };
        res.status(200).json(result);
    });
};

export const warnUser = (req, res) => {
    const userId = req.params.id;

    const selectSql = 'SELECT status, warning_count FROM Users WHERE id = ? AND LOWER(role) = "user"';
    db.query(selectSql, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to fetch user status" });
        }
        if (result.length === 0) {
            return res.status(404).json({ Error: "User Not Found" });
        }

         const currentCount = Number(result[0].warning_count || 0);
        const nextCount = currentCount + 1;
        let updateSql = "";
        let updateParams = [];

        if (nextCount >= 10) {
            // Trigger auto-suspension on the 10th warning
            updateSql = "UPDATE Users SET status = 'Suspended', warning_count = ?, warned_at = NOW() WHERE id = ?";
            updateParams = [nextCount, userId];
        } else {
            // Standard increment
            updateSql = "UPDATE Users SET warning_count = ?, warned_at = NOW() WHERE id = ?";
            updateParams = [nextCount, userId];
        }

        db.query(updateSql, updateParams, (upErr) => {
            if (upErr) {
                console.error("Warn Update Error:", upErr);
                return res.status(500).json({ Error: "Failed to record user warning details." });
            }

            let msg = `User warning count successfully updated to ${nextCount}/10.`;
            if (nextCount >= 10) {
                msg = "User warning count limit reached! Account permanently Suspended.";
            }
            res.status(200).json({ message: msg });
        });
    });
};

export const suspendUser = (req, res) => {
    const userId = req.params.id;
    const sql = 'UPDATE Users SET status = "Suspended", warning_count = 10, warned_at = NOW() WHERE id = ? AND LOWER(role) = "user"';
    db.query(sql, [userId], (err) => {
        if (err) {
            return res.status(500).json({ Error : "Database Error! Failed to suspend the user"});
        };
        res.status(200).json({ message: "User Profile Suspended Successfully" });
    });
};

export const activateUser = (req, res) => {
    const userId = req.params.id;
    const sql = 'UPDATE Users SET status = "Active", warning_count = 0, warned_at = NULL WHERE id = ? AND LOWER(role) = "user"';
    db.query(sql, [userId], (err) => {
        if (err) {
            return res.status(500).json({ Error: "Database Error! Failed to activate user account" });
        };
        res.status(200).json({ message: "User Activated Successfully" });
    });
};

// Password-Reset System

// 1. Fetch all pending password reset requests
export const getPasswordRequests = (req, res) => {
    const sql = "SELECT * FROM Password_Requests WHERE status = 'Pending' ORDER BY request_date DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Failed to fetch password requests:", err);
            return res.status(500).json({ Error: "Database Error" });
        }
        res.status(200).json(results);
    });
};

// 2. Admin approves and resets user password to default "123456"
export const approvePasswordReset = (req, res) => {
    const { requestId, username, tempPassword } = req.body;

    if (!tempPassword) {
        return res.status(400).json({ Error: "Temporary password is required." });
    }

    bcrypt.hash(tempPassword, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ Error: "Hashing Error" });

        const updatePasswordSql = "UPDATE Users SET password = ? WHERE username = ?";
        db.query(updatePasswordSql, [hashedPassword, username], (updateErr) => {
            if (updateErr) {
                console.error("Failed to update user password:", updateErr);
                return res.status(500).json({ Error: "Failed to reset password." });
            }

            const updateRequestSql = "UPDATE Password_Requests SET status = 'Approved' WHERE id = ?";
            db.query(updateRequestSql, [requestId], (reqErr) => {
                if (reqErr) console.error("Failed to update request status:", reqErr);
                
                res.status(200).json({ 
                    message: `Password reset successful! Share this temporary password with the user: [ ${tempPassword} ]` 
                });
            });
        });
    });
};