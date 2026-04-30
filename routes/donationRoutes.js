const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const SECRET = "ubbdms_secret_key";

// Middleware to verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ADD DONATION RECORD
router.post("/add", verifyToken, (req, res) => {
  const { donation_date, hospital, blood_group, notes } = req.body;
  const donor_id = req.user.id;

  const query = `INSERT INTO donation_history 
        (donor_id, donation_date, hospital, blood_group, notes) 
        VALUES (?, ?, ?, ?, ?)`;

  db.query(
    query,
    [donor_id, donation_date, hospital, blood_group, notes],
    (err, result) => {
      if (err)
        return res.status(500).json({ message: "Failed to add donation" });

      // Update last donation date in donor table
      db.query(
        "UPDATE donor SET last_donation_date = ? WHERE donor_id = ?",
        [donation_date, donor_id],
        (err2) => {
          if (err2) console.error("Failed to update last donation date");
        },
      );

      res.json({ message: "Donation record added successfully!" });
    },
  );
});

// GET MY DONATION HISTORY
router.get("/my", verifyToken, (req, res) => {
  const donor_id = req.user.id;

  const query = `SELECT * FROM donation_history 
        WHERE donor_id = ? 
        ORDER BY donation_date DESC`;

  db.query(query, [donor_id], (err, results) => {
    if (err)
      return res.status(500).json({ message: "Failed to fetch history" });
    res.json(results);
  });
});

// DELETE DONATION RECORD
router.delete("/delete/:id", verifyToken, (req, res) => {
  db.query(
    "DELETE FROM donation_history WHERE donation_id = ? AND donor_id = ?",
    [req.params.id, req.user.id],
    (err) => {
      if (err)
        return res.status(500).json({ message: "Failed to delete record" });
      res.json({ message: "Record deleted successfully!" });
    },
  );
});

module.exports = router;
