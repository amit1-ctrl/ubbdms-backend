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

// POST BLOOD REQUEST
router.post("/create", verifyToken, (req, res) => {
  const { patient_name, blood_group, hospital_name, location, contact_number } =
    req.body;
  const donor_id = req.user.id;

  const query = `INSERT INTO blood_request 
        (donor_id, patient_name, blood_group, hospital_name, location, contact_number) 
        VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(
    query,
    [
      donor_id,
      patient_name,
      blood_group,
      hospital_name,
      location,
      contact_number,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ message: "Failed to create request" });
      res.json({ message: "Blood request posted successfully!" });
    },
  );
});

// GET ALL ACTIVE REQUESTS
router.get("/all", verifyToken, (req, res) => {
  const query = `
        SELECT br.*, d.name as donor_name, d.department 
        FROM blood_request br
        LEFT JOIN donor d ON br.donor_id = d.donor_id
        WHERE br.request_status = 'Pending'
        ORDER BY br.request_date DESC
    `;

  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ message: "Failed to fetch requests" });
    res.json(results);
  });
});

// MARK REQUEST AS FULFILLED (by donor)
router.put("/fulfill/:id", verifyToken, (req, res) => {
  db.query(
    "UPDATE blood_request SET request_status = 'Fulfilled' WHERE request_id = ?",
    [req.params.id],
    (err) => {
      if (err)
        return res.status(500).json({ message: "Failed to update request" });
      res.json({ message: "Request marked as fulfilled!" });
    },
  );
});

module.exports = router;
