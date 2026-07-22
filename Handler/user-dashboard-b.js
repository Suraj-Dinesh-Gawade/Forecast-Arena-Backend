import db from "../Config/db.js";

/**
 * Fetches user profile details (name, coins, dynamic leaderboard rank, active status, and warning timestamp)
 * Calculates dynamic rank with secondary sorting and safely passes status back to the frontend.
 */
export const userData = (req, res) => {
    const { id } = req.params;

    // FIXED: Added 'u1.status' and 'u1.warned_at' to the selection list so the frontend can calculate active warning countdowns!
const sql = `
        SELECT 
            u1.name, 
            u1.coins, 
            u1.status,
            u1.warning_count,
            u1.warned_at,
            (SELECT COUNT(*) + 1 FROM Users u2 WHERE Lower(u2.role) = 'user' AND (u2.coins > u1.coins OR (u2.coins = u1.coins AND u2.id < u1.id))) AS user_rank,
            (SELECT COUNT(*) FROM Bets b WHERE b.b_user_id = u1.id AND LOWER(b.Win_Lose) IN ('win', 'lose')) AS total_settled,
            (SELECT COUNT(*) FROM Bets b WHERE b.b_user_id = u1.id AND LOWER(b.Win_Lose) = 'win') AS total_wins
        FROM Users u1 
        WHERE u1.id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Database error in userData:", err);
            return res.status(500).json({ Error: "Database Error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ Error: "User Not Found" });
        }

        const row = result[0];
        
        // =========================================================================
        // 🎯 FIXED: CALCULATING ACCURACY MATHEMATICALLY (RESTORING MISSING PIECE)
        // =========================================================================
        const totalSettled = Number(row.total_settled || 0);
        const totalWins = Number(row.total_wins || 0);

        // Safe division-by-zero check to calculate real accuracy
        let accuracy = 0;
        if (totalSettled > 0) {
            accuracy = Math.round((totalWins / totalSettled) * 100);
        }

        // Parse legacy string formats on-the-fly for your frontend elements
        const dbStatus = (row.status || "Active").toLowerCase();
        const warnCount = Number(row.warning_count || 0);
        const warnedAt = row.warned_at;

        let legacyStatus = "Active";
        let statusMessage = "";
        let statusColor = "";

        if (dbStatus.includes("suspended") || warnCount >= 10) {
            legacyStatus = "Suspended";
            statusMessage = "⛔ Your account has been suspended due to 10 warning violations.";
            statusColor = "#dc2626"; // Crimson Red
        } else if (warnCount > 0 && warnedAt) {
            // Dynamically build the legacy "W[Count], Active" string so your frontend stays completely untouched!
            legacyStatus = `W${warnCount}, Active`;

            const warnedTime = new Date(warnedAt).getTime();
            const hoursElapsed = (Date.now() - warnedTime) / (1000 * 60 * 60);

            if (hoursElapsed < 48) {
                // ACTIVE WARNING (Under 48 hours)
                statusMessage = `⚠️ Your account has been warned ${warnCount} time(s). Please play fair. Note: 10 warnings will lead to permanent account suspension!`;
                statusColor = "#ef4444"; // Urgent Red
            } else {
                // PERSISTENT RECORD (After 48 hours)
                statusMessage = `🔔 Warned ${warnCount} time(s)`;
                statusColor = "#a1a1aa"; // Muted Slate Grey
            }
        }

        // Return everything to the frontend!
        return res.status(200).json({
            name: row.name,
            coins: row.coins,
            user_rank: row.user_rank,
            status: legacyStatus,          // FIXED: Set to legacyStatus to support warning strings ("W1, Active", "Suspended", etc.)
            status_message: statusMessage, // Generates dynamic message text from the backend
            status_color: statusColor,
            warned_at: row.warned_at,
            accuracy: accuracy             // FIXED: Sends actual calculated percentage (e.g. 75)
        });
    });
};

/**
 * Simple count of total bets placed by a specific user.
 */
export const totalBets = (req, res) => {
    const { id } = req.params;

    // 1. Fetch user data, rank, and betting stats in one consolidated query
    const sql = `
        SELECT u.*, 
        (SELECT COUNT(*) FROM Bets WHERE b_user_id = u.id) AS total_bets,
        (SELECT COUNT(*) FROM Bets WHERE b_user_id = u.id AND LOWER(Win_Lose) IN ('win', 'lose')) AS total_settled,
        (SELECT COUNT(*) FROM Bets WHERE b_user_id = u.id AND LOWER(Win_Lose) = 'win') AS total_wins,
        (SELECT COUNT(*) + 1 FROM Users u2 WHERE u2.coins > u.coins OR (u2.coins = u.coins AND u2.id < u.id)) AS user_rank
        FROM Users u WHERE u.id = ?
    `;
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Database error in totalBets:", err);
            return res.status(500).json({ Error: "Database Error" });
        }
        if (result.length === 0) return res.status(404).json({ Error: "User Not Found" });

        const row = result[0];
        const totalSettled = Number(row.total_settled || 0);
        const totalWins = Number(row.total_wins || 0);
        const accuracy = totalSettled > 0 ? Math.round((totalWins / totalSettled) * 100) : 0;

        // 2. Logic to determine new badges
        let updates = [];
        if (accuracy >= 70 && !row.has_sharpshooter) updates.push("has_sharpshooter = TRUE");
        if (row.coins >= 10000 && !row.has_tycoon) updates.push("has_tycoon = TRUE");
        if (row.user_rank <= 3 && !row.has_ranked) updates.push("has_ranked = TRUE");
        if (totalSettled > 10 && !row.has_loyal) updates.push("has_loyal = TRUE");

        if (updates.length > 0) {
            const updateSql = `UPDATE Users SET ${updates.join(", ")} WHERE id = ?`;
            db.query(updateSql, [id], (err) => {
                if(err) console.error("Badge Update Error:", err);
            });
            // Update flags locally for the response
            updates.forEach(upd => {
                if(upd.includes("sharpshooter")) row.has_sharpshooter = 1;
                if(upd.includes("tycoon")) row.has_tycoon = 1;
                if(upd.includes("ranked")) row.has_ranked = 1;
                if(upd.includes("loyal")) row.has_loyal = 1;
            });
        }

        return res.status(200).json({
            total_bets: row.total_bets,
            badges: {
                sharpshooter: !!row.has_sharpshooter,
                tycoon: !!row.has_tycoon,
                ranked: !!row.has_ranked,
                loyal: !!row.has_loyal
            }
        });
    });
};

/**
 * Pulls the single latest active prediction market question for the dashboard banner.
 */
export const latestQuestion = (req, res) => {
    const sql = 'SELECT q_id, question, End_Time FROM Questions WHERE LOWER(status) = "active" ORDER BY q_id DESC LIMIT 1';
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Database error in latestQuestion:", err);
            return res.status(500).json({ Error: "Database Error! Failed to load latest question" });
        }
        
        if (result.length === 0) {
            return res.status(200).json({ noQuestions: true });
        }
        
        return res.status(200).json(result[0]);
    });
};