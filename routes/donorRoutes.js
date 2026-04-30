const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Register Donor API
router.post("/register", (req, res) => {
  const {
    name,
    student_id,
    email,
    phone,
    blood_group,
    department,
    last_donation_date,
  } = req.body;

  const query = `
        INSERT INTO donor 
        (name, student_id, email, phone, blood_group, department, last_donation_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

  db.query(
    query,
    [
      name,
      student_id,
      email,
      phone,
      blood_group,
      department,
      last_donation_date,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error registering donor" });
      }

      res.json({ message: "Donor registered successfully" });
    },
  );
});


// SEARCH DONORS BY BLOOD GROUP
router.get("/search", (req, res) => {
    const { blood_group, department } = req.query;

    let query = "SELECT donor_id, name, blood_group, department, phone, availability_status, last_donation_date FROM donor WHERE 1=1";
    let params = [];

    if (blood_group) {
        query += " AND blood_group = ?";
        params.push(blood_group);
    }

    if (department) {
        query += " AND department LIKE ?";
        params.push("%" + department + "%");
    }

    query += " AND availability_status = 1";

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Search failed" });
        res.json(results);
    });
});
module.exports = router;
