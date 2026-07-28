import db from "../Config/db.js";
import bcrypt from "bcrypt";

/**
 * Handles registering a standard user.
 * Automatically defaults the newly created user's role to 'user' in the database.
 */
export const registerUser = (req, res) => {
  const { name, username, password, secretKey } = req.body;

  if (!name || !username || !password || !secretKey) {
    return res.status(400).json({ Error: "All fields are required!" });
  }

  const sql2 = "SELECT username FROM Users WHERE username = ?";

  db.query(sql2, [username], (err, result) => {
    if (err) {
      console.error("Registration Check Error:", err);
      return res.status(500).json({ Error: "Database Error" });
    }

    if (result.length > 0) {
      return res.status(400).json({ Error: "Username already exists" });
    } else {
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Password Hashing Error:", err);
          return res.status(500).json({ Error: "Hashing Error" });
        }

        // Explicitly insert 'user' role to prevent MySQL constraint failures if no default is set
        const sql =
          "INSERT INTO Users(name, username, password, role, secret_key) VALUES(?, ?, ?, 'user', ?)";

        db.query(sql, [name, username, hashedPassword, secretKey], (err) => {
          if (err) {
            console.error("Database Insert Error:", err);
            return res.status(500).json({ Error: "Database Error" });
          }
          res.status(200).json({
            message:
              "Registration Successful! Login Now to start your Predictions",
          });
        });
      });
    }
  });
};

/**
 * Validates credentials, checks for account suspension states (via status or warning count limit),
 * and returns the user payload along with their authorization role.
 */
export const loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ Error: "All fields are required!" });
  }

  // 🌟 FIXED: Make sure "role" and "warning_count" are selected from the database table
  const sql =
    "SELECT id, password, status, role, warning_count FROM Users WHERE BINARY username = ?";

  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error("Login Query Error:", err);
      return res.status(500).json({ Error: "Database Error" });
    }
    if (result.length === 0) {
      return res.status(400).json({ Error: "Username not found" });
    }

    const user = result[0];
    const userStatus = (user.status || "Active").toLowerCase();
    const warnCount = Number(user.warning_count || 0);

    // 🔍 ---------------------------------------------------------------------
    // ⚡ TERMINAL DEBUG SYSTEM: Watch your VS Code terminal when you log in!
    // ---------------------------------------------------------------------
    console.log("=========================================");
    console.log("⚡ [DEBUG] LOGIN ATTEMPT RECEIVED ⚡");
    console.log("Username submitted: ", username);
    console.log("Raw Row Fetched from MySQL Database: ", user);
    console.log("Returned Role in RAM: ", user.role);
    console.log("=========================================");

    // Verify if user is suspended before entry
    if (userStatus.includes("suspended") || warnCount >= 10) {
      return res.status(403).json({
        Error:
          "⛔ Access Denied! Your account has been permanently suspended due to multiple policy violations.",
      });
    }

    // Secure async password evaluation
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Bcrypt Comparison Error:", err);
        return res.status(500).json({ Error: "Compare Error" });
      }

      if (!isMatch) {
        return res.status(400).json({ Error: "Password does not match" });
      }

      // Safe login success response including user role
      res.status(200).json({
        id: user.id,
        role: user.role || "user",
      });
    });
  });
};

// Password Reset Route
export const requestPasswordReset = (req, res) => {
  const { username, secretKey, email } = req.body;

  if (!username || !secretKey || !email) {
    return res
      .status(400)
      .json({ Error: "Username and Secret Key, and Email are required" });
  }

  // 1. Verify if username and secret key match in the database
  const checkSql =
    "SELECT username FROM Users WHERE username = ? AND secret_key = ?";
  db.query(checkSql, [username, secretKey], (err, results) => {
    if (err) {
      console.error("Database error during password reset request : ", err);
      return res.status(500).json({ Error: "Database Error" });
    }
    if (results.length === 0) {
      return res.status(401).json({ Error: "Invalid username or secret key." });
    }
    const insertSql =
      "INSERT INTO Password_Requests (username, email, submitted_key) VALUES (?, ?, ?)";
    db.query(insertSql, [username, email, secretKey], (insertErr) => {
      if (insertErr) {
        console.error("Failed to insert password request : ", insertErr);
        return res.status(500).json({ Error: "Failed to submit request." });
      }
      res.status(200).json({
        message:
          "Reset request submitted successfully! Please wait for admin approval.",
      });
    });
  });
};

// Password update logic
export const changePassword = (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ Error: "All fields are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ Error: "Password must be at least 6 characters long." });
  }

  const sql = "SELECT password FROM Users WHERE id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err || results.length === 0) {
      console.error("Error while password updating ", err);
      return res.status(404).json({ Error: "User not found." });
    }

    const hashedPassword = results[0].password;

    bcrypt.compare(oldPassword, hashedPassword, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ Error: "Incorrect old password." });
      }
      bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
        if (err) return res.status(500).json({ Error: "Hashing Error" });
        const updateSql = "UPDATE Users SET password = ? WHERE id = ?";
        db.query(updateSql, [newHashedPassword, userId], (err) => {
          if (err)
            return res.status(500).json({ Error: "Failed to update password" });
          res.status(200).json({ message: "Password changed successfully!" });
        });
      });
    });
  });
};
