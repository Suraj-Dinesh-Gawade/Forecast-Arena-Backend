import db from "../Config/db.js";

export const no_Of_Users = (req, res) => {
  const sql =
    "SELECT COUNT(*) AS total_Users FROM Users WHERE LOWER(role) = 'user'";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ Error: "Database Error! Failed to Load Users Count" });
    }
    res.status(200).json(result[0]);
  });
};

export const no_Of_Questions = (req, res) => {
  const sql = "SELECT COUNT(*) AS total_Questions FROM Questions";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ Error: "Database Error! Failed to Load Questions Count" });
    }
    res.status(200).json(result[0]);
  });
};

export const live_Questions_No = (req, res) => {
  const sql =
    'SELECT COUNT(*) AS Live_Questions FROM Questions WHERE status = "Active"';
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ Error: "Database Error! Failed to load Live Questions Count" });
    }
    res.status(200).json(result[0]);
  });
};

export const total_Predictions = (req, res) => {
  const sql = "SELECT COUNT(*) AS Total_Predictions FROM Bets";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ Error: "Database Error! Failed to load Prediction Count" });
    }
    res.status(200).json(result[0]);
  });
};

// Fetch the detailed list for your Audit table view
export const getAuditLogs = (req, res) => {
  const sql = `
        SELECT a.id, u.name as username, q.question, a.amount_lost, a.created_at 
        FROM System_Profit_Audit a
        JOIN Users u ON a.user_id = u.id
        JOIN Questions q ON a.q_id = q.q_id
        ORDER BY a.created_at DESC
    `;
  db.query(sql, (err, result) => {
    if (err)
      return res.status(500).json({ Error: "Failed to load audit logs" });
    res.status(200).json(result);
  });
};

// Fetch the TOTAL sum of money lost (Your Total System Profit)
export const getTotalSystemProfit = (req, res) => {
  const sql = "SELECT SUM(amount_lost) AS totalProfit FROM System_Profit_Audit";

  db.query(sql, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ Error: "Failed to calculate total profit" });

    const totalProfit = result[0].totalProfit || 0;

    // Use the NEW snapshot table
    const sql2 =
      "INSERT INTO System_Profit_Snapshot(total_coins_snapshot) VALUES (?)";

    db.query(sql2, [totalProfit], (err2) => {
      if (err2) {
        console.error("Database Error! Failed to store total coins:", err2);
        return res.status(500).json({ Error: "Failed to save snapshot" });
      }
      // Send the response ONLY after the INSERT succeeds
      res.status(200).json({ totalProfit: totalProfit });
    });
  });
};
