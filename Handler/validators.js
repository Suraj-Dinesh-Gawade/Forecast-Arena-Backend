import db from "../Config/db.js";
import bcrypt from "bcrypt";

export const registerUser = (req, res) => {
  const { name, username, password } = req.body;

  const sql2 = "SELECT username FROM Users WHERE username = ?";

  db.query(sql2, [username], (err, result) => {
    if (err) {
      return res.status(500).json({ Error: "Database Error" });
    }
    if (result.length > 0) {
      return res.status(400).json({ Error: "Username already exist" });
    } else {
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ Error: "Hashing Error" });
        }

        const sql =
          "INSERT INTO Users(name, username, password) VALUES(?, ?, ?)";

        db.query(sql, [name, username, hashedPassword], (err) => {
          if (err) {
            return res.status(500).json({ Error: "Database Error" });
          }
          res.status(200).json({ message: "Registration Successful" });
        });
      });
    }
  });
};

export const loginUser = (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT id, password FROM Users WHERE BINARY username = ?";
  db.query(sql, [username], (err, result) => {
    if (err) {
      return res.status(500).json({ Error: "Database Error" });
    }
    if (result.length === 0) {
      return res.status(400).json({ Error: "Username not found" });
    }

    bcrypt.compare(password, result[0].password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ Error: "Compare Error" });
      }

      if (!isMatch) {
        return res.status(400).json({ Error: "Password does not match" });
      }

      res.status(200).json({
        id : result[0].id
       });
    });
  });
};
