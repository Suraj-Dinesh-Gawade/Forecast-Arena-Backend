import db from "../Config/db.js";

export const userData = (req, res) => {
  const { id } = req.params;

    const sql = `SELECT 
  u1.name, u1.coins,
  (SELECT COUNT(*) + 1 FROM Users u2 WHERE u2.coins > u1.coins OR (u2.coins = u1.coins AND u2.id < u1.id)) AS user_rank,
  (SELECT COUNT(*) FROM Bets b WHERE b.b_user_id = u1.id AND LOWER(b.Win_Lose) IN ('win', 'lose')) AS total_settled,
  (SELECT COUNT(*) FROM Bets b WHERE b.b_user_id = u1.id AND LOWER(b.Win_Lose) = 'win') AS total_wins
  FROM Users u1
  WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ Error: "Database Error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ Error: "User Not Found" });
    }

      const row = result[0];
      const totalSettled = Number(row.total_settled || 0);
      const totalWins = Number(row.total_wins || 0);

      let accuracy = 0;
      if (totalSettled > 0) {
          accuracy = Math.round((totalWins / totalSettled) * 100);
      }
      
      return res.status(200).json({
          name: row.name,
          coins: row.coins,
          user_rank: row.user_rank,
          accuracy: accuracy
    });
  });
};

export const totalBets = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT COUNT(*) AS total_bets FROM Bets WHERE b_user_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ Error: "Database Error" });
    }
    return res.status(200).json(result[0]);
  });
};

export const latestQuestion = (req, res) => {
  const sql =
    'SELECT q_id, question, End_Time FROM Questions WHERE LOWER(status) = "active" ORDER BY q_id DESC LIMIT 1';
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ Error: "Database Error! Failed to load latest question" });
    }
    if (result.length === 0) {
      // Return a clean success status (200) with a flag
      return res.status(200).json({ noQuestions: true });
    }
    return res.status(200).json(result[0]);
  });
};
