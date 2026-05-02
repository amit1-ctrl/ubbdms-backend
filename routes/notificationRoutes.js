require("dotenv").config();
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/emailConfig");

const SECRET = "ubbdms_secret_key";

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

// SEND TO ALL DONORS
router.post("/send-all", verifyAdmin, (req, res) => {
  const { title, message } = req.body;

  db.query(
    "SELECT donor_id, name, email FROM donor WHERE availability_status = 1",
    async (err, donors) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "Failed to fetch donors" });
      }

      console.log("Total donors found:", donors.length);

      if (donors.length === 0)
        return res.json({ message: "No active donors found" });

      // Save to DB
      const values = donors.map((d) => [d.donor_id, title, message]);
      db.query(
        "INSERT INTO notifications (donor_id, title, message) VALUES ?",
        [values],
        async (err2) => {
          if (err2) console.error("Notification save error:", err2);

          let emailsSent = 0;
          let emailsFailed = 0;

          for (const donor of donors) {
            const html = `
                        <!DOCTYPE html>
                        <html>
                        <body>
                            <div style="background:#c0392b;color:white;padding:20px;text-align:center;">
                                <h1>🩸 UBBDMS Blood Bank</h1>
                                <p>University of Information Technology & Sciences</p>
                            </div>
                            <div style="padding:30px;background:#f9f9f9;">
                                <h2>Dear ${donor.name},</h2>
                                <p>${message}</p>
                                <a href="https://yourbloodbank.netlify.app/donor-dashboard.html"
                                    style="background:#c0392b;color:white;padding:12px 25px;
                                    text-decoration:none;border-radius:5px;
                                    display:inline-block;margin-top:15px;">
                                    Visit Dashboard
                                </a>
                            </div>
                            <div style="background:#2c3e50;color:white;padding:15px;
                                text-align:center;font-size:12px;">
                                <p>UITS Blood Bank & Donor Management System</p>
                                <p>This is an automated email. Please do not reply.</p>
                            </div>
                        </body>
                        </html>`;

            const sent = await sendEmail(donor.email, donor.name, title, html);

            if (sent) {
              emailsSent++;
              console.log("Email sent to:", donor.email);
            } else {
              emailsFailed++;
              console.error("Email failed for:", donor.email);
            }
          }

          res.json({
            message: `Notification sent to ${emailsSent} donors successfully! ${emailsFailed > 0 ? emailsFailed + " failed." : ""}`,
          });
        },
      );
    },
  );
});

// SEND BY BLOOD GROUP
router.post("/send-blood-group", verifyAdmin, (req, res) => {
  const { title, message, blood_group } = req.body;

  db.query(
    "SELECT donor_id, name, email FROM donor WHERE blood_group = ? AND availability_status = 1",
    [blood_group],
    async (err, donors) => {
      if (err)
        return res.status(500).json({ message: "Failed to fetch donors" });

      console.log("Donors found:", donors.length);

      if (donors.length === 0)
        return res.json({
          message: "No donors found with blood group " + blood_group,
        });

      const values = donors.map((d) => [d.donor_id, title, message]);
      db.query(
        "INSERT INTO notifications (donor_id, title, message) VALUES ?",
        [values],
        async (err2) => {
          if (err2) console.error("Save error:", err2);

          let emailsSent = 0;
          let emailsFailed = 0;

          for (const donor of donors) {
            const html = `
                        <!DOCTYPE html>
                        <html>
                        <body>
                            <div style="background:#c0392b;color:white;padding:20px;text-align:center;">
                                <h1>🩸 UBBDMS Blood Bank</h1>
                                <p>URGENT NOTIFICATION</p>
                            </div>
                            <div style="padding:30px;background:#f9f9f9;">
                                <h2>Dear ${donor.name},</h2>
                                <div style="background:#fff3cd;border:2px solid #f39c12;
                                    padding:15px;border-radius:5px;margin:15px 0;">
                                    <strong>🚨 Urgent Request for ${blood_group} Blood Group</strong>
                                </div>
                                <p>${message}</p>
                                <a href="https://yourbloodbank.netlify.app/blood-request.html"
                                    style="background:#c0392b;color:white;padding:12px 25px;
                                    text-decoration:none;border-radius:5px;
                                    display:inline-block;margin-top:15px;">
                                    View Blood Requests
                                </a>
                            </div>
                            <div style="background:#2c3e50;color:white;padding:15px;
                                text-align:center;font-size:12px;">
                                <p>UITS Blood Bank & Donor Management System</p>
                            </div>
                        </body>
                        </html>`;

            const sent = await sendEmail(
              donor.email,
              donor.name,
              "🚨 Urgent: " + title,
              html,
            );

            if (sent) emailsSent++;
            else emailsFailed++;
          }

          res.json({
            message: `Urgent notification sent to ${emailsSent} ${blood_group} donors! ${emailsFailed > 0 ? emailsFailed + " failed." : ""}`,
          });
        },
      );
    },
  );
});

// GET MY NOTIFICATIONS
router.get("/my", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE donor_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch" });
      res.json(results);
    },
  );
});

// MARK AS READ
router.put("/read/:id", verifyToken, (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = TRUE WHERE notification_id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed" });
      res.json({ message: "Marked as read" });
    },
  );
});

// GET UNREAD COUNT
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
