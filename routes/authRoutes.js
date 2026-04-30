const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = "ubbdms_secret_key";

// REGISTER (update your existing register to include password)
router.post("/register", async (req, res) => {
  const {
    name,
    student_id,
    email,
    phone,
    blood_group,
    department,
    last_donation_date,
    password,
  } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `INSERT INTO donor 
        (name, student_id, email, phone, blood_group, department, last_donation_date, password) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

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
      hashedPassword,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Registration failed" });
      res.json({ message: "Registered successfully!" });
    },
  );
});

// LOGIN
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM donor WHERE email = ?",
    [email],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ message: "Invalid email or password" });

      const donor = results[0];
      const match = await bcrypt.compare(password, donor.password);

      if (!match)
        return res.status(401).json({ message: "Invalid email or password" });

      const token = jwt.sign(
        { id: donor.donor_id, email: donor.email, role: "donor" },
        SECRET,
        { expiresIn: "1d" },
      );

      res.json({ message: "Login successful", token, name: donor.name });
    },
  );
});

// ADMIN LOGIN
router.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM admin WHERE email = ?",
    [email],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ message: "Invalid admin credentials" });

      const admin = results[0];
      const match = await bcrypt.compare(password, admin.password);

      if (!match)
        return res.status(401).json({ message: "Invalid admin credentials" });

      const token = jwt.sign(
        { id: admin.admin_id, email: admin.email, role: "admin" },
        SECRET,
        { expiresIn: "1d" },
      );

      res.json({ message: "Admin login successful", token, name: admin.name });
    },
  );
});

// GET DONOR PROFILE
router.get("/profile", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, SECRET);
        
        db.query("SELECT * FROM donor WHERE donor_id = ?", [decoded.id], (err, results) => {
            if (err || results.length === 0)
                return res.status(404).json({ message: "Donor not found" });

            const donor = results[0];
            delete donor.password;
            res.json(donor);
        });
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
});
module.exports = router;
