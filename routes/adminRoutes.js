const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const SECRET = "ubbdms_secret_key";

// Admin middleware
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

// GET DASHBOARD STATS
router.get("/stats", verifyAdmin, (req, res) => {
  const stats = {};

  // Total donors
  db.query("SELECT COUNT(*) as total FROM donor", (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching stats" });
    stats.totalDonors = result[0].total;

    // Active donors
    db.query(
      "SELECT COUNT(*) as total FROM donor WHERE availability_status = 1",
      (err2, result2) => {
        if (err2) return res.status(500).json({ message: "Error" });
        stats.activeDonors = result2[0].total;

        // Total requests
        db.query(
          "SELECT COUNT(*) as total FROM blood_request",
          (err3, result3) => {
            if (err3) return res.status(500).json({ message: "Error" });
            stats.totalRequests = result3[0].total;

            // Pending requests
            db.query(
              "SELECT COUNT(*) as total FROM blood_request WHERE request_status = 'Pending'",
              (err4, result4) => {
                if (err4) return res.status(500).json({ message: "Error" });
                stats.pendingRequests = result4[0].total;

                // Fulfilled requests
                db.query(
                  "SELECT COUNT(*) as total FROM blood_request WHERE request_status = 'Fulfilled'",
                  (err5, result5) => {
                    if (err5) return res.status(500).json({ message: "Error" });
                    stats.fulfilledRequests = result5[0].total;

                    // Total donations
                    db.query(
                      "SELECT COUNT(*) as total FROM donation_history",
                      (err6, result6) => {
                        if (err6)
                          return res.status(500).json({ message: "Error" });
                        stats.totalDonations = result6[0].total;

                        res.json(stats);
                      },
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  });
});

// GET BLOOD GROUP DISTRIBUTION
router.get("/blood-group-stats", verifyAdmin, (req, res) => {
  db.query(
    "SELECT blood_group, COUNT(*) as count FROM donor GROUP BY blood_group",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error" });
      res.json(results);
    },
  );
});

// GET RECENT REQUESTS
router.get("/recent-requests", verifyAdmin, (req, res) => {
  db.query(
    `SELECT br.*, d.name as donor_name 
         FROM blood_request br
         LEFT JOIN donor d ON br.donor_id = d.donor_id
         ORDER BY br.request_date DESC LIMIT 5`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error" });
      res.json(results);
    },
  );
});

// GET RECENT DONORS
router.get("/recent-donors", verifyAdmin, (req, res) => {
  db.query(
    `SELECT donor_id, name, email, blood_group, department, 
         availability_status, created_at 
         FROM donor ORDER BY created_at DESC LIMIT 5`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error" });
      res.json(results);
    },
  );
});

// GET ALL DONORS
router.get("/donors", verifyAdmin, (req, res) => {
    db.query(
        `SELECT donor_id, name, email, phone, blood_group, 
        department, availability_status, last_donation_date, 
        created_at FROM donor ORDER BY created_at DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Error fetching donors" });
            res.json(results);
        }
    );
});

// BLOCK / UNBLOCK DONOR
router.put("/donor/block/:id", verifyAdmin, (req, res) => {
    const { status } = req.body;
    db.query(
        "UPDATE donor SET availability_status = ? WHERE donor_id = ?",
        [status, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Failed to update donor" });
            res.json({ message: status == 1 ? "Donor unblocked!" : "Donor blocked!" });
        }
    );
});

// DELETE DONOR
router.delete("/donor/delete/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM donor WHERE donor_id = ?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Failed to delete donor" });
            res.json({ message: "Donor deleted successfully!" });
        }
    );
});

// SEARCH DONORS (ADMIN)
router.get("/donors/search", verifyAdmin, (req, res) => {
    const { blood_group, department, status } = req.query;

    let query = `SELECT donor_id, name, email, phone, blood_group, 
        department, availability_status, last_donation_date, 
        created_at FROM donor WHERE 1=1`;
    let params = [];

    if (blood_group) {
        query += " AND blood_group = ?";
        params.push(blood_group);
    }
    if (department) {
        query += " AND department LIKE ?";
        params.push("%" + department + "%");
    }
    if (status !== undefined && status !== "") {
        query += " AND availability_status = ?";
        params.push(status);
    }

    query += " ORDER BY created_at DESC";

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Search failed" });
        res.json(results);
    });
});

// GET ALL REQUESTS
router.get("/requests", verifyAdmin, (req, res) => {
    const query = `
        SELECT br.*, d.name as donor_name, d.department 
        FROM blood_request br
        LEFT JOIN donor d ON br.donor_id = d.donor_id
        ORDER BY br.request_date DESC`;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching requests" });
        res.json(results);
    });
});

// UPDATE REQUEST STATUS
router.put("/request/status/:id", verifyAdmin, (req, res) => {
    const { status } = req.body;
    db.query(
        "UPDATE blood_request SET request_status = ? WHERE request_id = ?",
        [status, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Failed to update request" });
            res.json({ message: "Request status updated to " + status });
        }
    );
});

// DELETE REQUEST
router.delete("/request/delete/:id", verifyAdmin, (req, res) => {
    db.query(
        "DELETE FROM blood_request WHERE request_id = ?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Failed to delete request" });
            res.json({ message: "Request deleted successfully!" });
        }
    );
});

// SEARCH REQUESTS
router.get("/requests/search", verifyAdmin, (req, res) => {
    const { blood_group, status } = req.query;

    let query = `
        SELECT br.*, d.name as donor_name 
        FROM blood_request br
        LEFT JOIN donor d ON br.donor_id = d.donor_id
        WHERE 1=1`;
    let params = [];

    if (blood_group) {
        query += " AND br.blood_group = ?";
        params.push(blood_group);
    }
    if (status) {
        query += " AND br.request_status = ?";
        params.push(status);
    }

    query += " ORDER BY br.request_date DESC";

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Search failed" });
        res.json(results);
    });
});

// PUBLIC STATS (no login required for home page)
router.get("/public-stats", (req, res) => {
    const stats = {};

    db.query("SELECT COUNT(*) as total FROM donor", (err, result) => {
        if (err) return res.status(500).json({ message: "Error" });
        stats.totalDonors = result[0].total;

        db.query("SELECT COUNT(*) as total FROM donation_history", (err2, result2) => {
            if (err2) return res.status(500).json({ message: "Error" });
            stats.totalDonations = result2[0].total;

            db.query("SELECT COUNT(*) as total FROM blood_request", (err3, result3) => {
                if (err3) return res.status(500).json({ message: "Error" });
                stats.totalRequests = result3[0].total;

                db.query("SELECT COUNT(*) as total FROM blood_request WHERE request_status = 'Fulfilled'", (err4, result4) => {
                    if (err4) return res.status(500).json({ message: "Error" });
                    stats.fulfilledRequests = result4[0].total;
                    res.json(stats);
                });
            });
        });
    });
});

module.exports = router;
