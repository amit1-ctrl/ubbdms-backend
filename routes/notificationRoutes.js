const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const transporter = require("../config/emailConfig");

const SECRET = "ubbdms_secret_key";

// Verify token middleware
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

// Verify admin middleware
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ==========================================
// ADMIN: SEND NOTIFICATION TO ALL DONORS
// ==========================================
router.post("/send-all", verifyAdmin, (req, res) => {
  const { title, message } = req.body;

  // Get all donors with email
  db.query("SELECT donor_id, name, email FROM donor", async (err, donors) => {
    if (err) return res.status(500).json({ message: "Failed to fetch donors" });

    if (donors.length === 0)
      return res.status(400).json({ message: "No donors found" });

    // Save notification for each donor in DB
    const values = donors.map((d) => [d.donor_id, title, message]);
    db.query(
      "INSERT INTO notifications (donor_id, title, message) VALUES ?",
      [values],
      async (err2) => {
        if (err2)
          return res
            .status(500)
            .json({ message: "Failed to save notifications" });

        // Send email to each donor
        let emailsSent = 0;
        for (const donor of donors) {
          try {
            await transporter.sendMail({
              from: '"UBBDMS Blood Bank" <amitmazharul@gmail.com>',
              to: donor.email,
              subject: title,
              html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; }
                                    .header {
                                        background: #c0392b;
                                        color: white;
                                        padding: 20px;
                                        text-align: center;
                                    }
                                    .content {
                                        padding: 30px;
                                        background: #f9f9f9;
                                    }
                                    .footer {
                                        background: #2c3e50;
                                        color: white;
                                        padding: 15px;
                                        text-align: center;
                                        font-size: 12px;
                                    }
                                    .btn {
                                        background: #c0392b;
                                        color: white;
                                        padding: 12px 25px;
                                        text-decoration: none;
                                        border-radius: 5px;
                                        display: inline-block;
                                        margin-top: 15px;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="header">
                                    <h1>🩸 UBBDMS Blood Bank</h1>
                                    <p>University of Information Technology & Sciences</p>
                                </div>
                                <div class="content">
                                    <h2>Dear ${donor.name},</h2>
                                    <p>${message}</p>
                                    <a href="http://localhost:5500/FRONTEND/donor-dashboard.html" 
                                        class="btn">
                                        Visit Dashboard
                                    </a>
                                </div>
                                <div class="footer">
                                    <p>UITS Blood Bank & Donor Management System</p>
                                    <p>This is an automated email. Please do not reply.</p>
                                </div>
                            </body>
                            </html>`,
            });
            emailsSent++;
          } catch (emailErr) {
            console.error("Email failed for:", donor.email);
          }
        }

        res.json({
          message: `Notification sent to ${emailsSent} donors successfully!`,
        });
      },
    );
  });
});

// ==========================================
// ADMIN: SEND NOTIFICATION BY BLOOD GROUP
// ==========================================
router.post("/send-blood-group", verifyAdmin, (req, res) => {
  const { title, message, blood_group } = req.body;

  db.query(
    "SELECT donor_id, name, email FROM donor WHERE blood_group = ?",
    [blood_group],
    async (err, donors) => {
      if (err)
        return res.status(500).json({ message: "Failed to fetch donors" });

      if (donors.length === 0)
        return res.status(400).json({
          message: "No donors found with blood group " + blood_group,
        });

      // Save to DB
      const values = donors.map((d) => [d.donor_id, title, message]);
      db.query(
        "INSERT INTO notifications (donor_id, title, message) VALUES ?",
        [values],
        async (err2) => {
          if (err2)
            return res.status(500).json({
              message: "Failed to save notifications",
            });

          // Send emails
          let emailsSent = 0;
          for (const donor of donors) {
            try {
              await transporter.sendMail({
                from: '"UBBDMS Blood Bank" <amitmazharul@gmail.com>',
                to: donor.email,
                subject: "🚨 Urgent: " + title,
                html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <style>
                                        body { font-family: Arial, sans-serif; }
                                        .header {
                                            background: #c0392b;
                                            color: white;
                                            padding: 20px;
                                            text-align: center;
                                        }
                                        .urgent {
                                            background: #fff3cd;
                                            border: 2px solid #f39c12;
                                            padding: 15px;
                                            border-radius: 5px;
                                            margin: 15px 0;
                                        }
                                        .content { padding: 30px; background: #f9f9f9; }
                                        .footer {
                                            background: #2c3e50;
                                            color: white;
                                            padding: 15px;
                                            text-align: center;
                                            font-size: 12px;
                                        }
                                        .btn {
                                            background: #c0392b;
                                            color: white;
                                            padding: 12px 25px;
                                            text-decoration: none;
                                            border-radius: 5px;
                                            display: inline-block;
                                            margin-top: 15px;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="header">
                                        <h1>🩸 UBBDMS Blood Bank</h1>
                                        <p>URGENT NOTIFICATION</p>
                                    </div>
                                    <div class="content">
                                        <h2>Dear ${donor.name},</h2>
                                        <div class="urgent">
                                            <strong>🚨 Urgent Request for 
                                            ${blood_group} Blood Group</strong>
                                        </div>
                                        <p>${message}</p>
                                        <a href="http://localhost:5500/FRONTEND/blood-request.html"
                                            class="btn">
                                            View Blood Requests
                                        </a>
                                    </div>
                                    <div class="footer">
                                        <p>UITS Blood Bank & Donor Management System</p>
                                        <p>This is an automated email. Please do not reply.</p>
                                    </div>
                                </body>
                                </html>`,
              });
              emailsSent++;
            } catch (emailErr) {
              console.error("Email failed for:", donor.email);
            }
          }

          res.json({
            message: `Urgent notification sent to ${emailsSent} 
                        ${blood_group} donors!`,
          });
        },
      );
    },
  );
});

// ==========================================
// DONOR: GET MY NOTIFICATIONS
// ==========================================
router.get("/my", verifyToken, (req, res) => {
  db.query(
    `SELECT * FROM notifications 
        WHERE donor_id = ? 
        ORDER BY created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Failed to fetch notifications" });
      res.json(results);
    },
  );
});

// DONOR: MARK NOTIFICATION AS READ
router.put("/read/:id", verifyToken, (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = TRUE WHERE notification_id = ?",
    [req.params.id],
    (err) => {
      if (err)
        return res.status(500).json({ message: "Failed to mark as read" });
      res.json({ message: "Marked as read" });
    },
  );
});

// DONOR: GET UNREAD COUNT
router.get("/unread-count", verifyToken, (req, res) => {
  db.query(
    "SELECT COUNT(*) as count FROM notifications WHERE donor_id = ? AND is_read = FALSE",
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error" });
      res.json({ count: results[0].count });
    },
  );
});

module.exports = router;
