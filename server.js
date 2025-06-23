// server.js (handles Express only)
const express = require("express");
const app = express();
const Database = require("better-sqlite3");
const path = require("path");

// Use %APPDATA%\IQS.sqlite3
const dbPath = path.join(process.env.APPDATA, "IQS.sqlite3");
const db = new Database(dbPath);

app.use(express.json());
app.use(express.static("frontend"));

app.post("/api/example", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

app.post("/api/register", (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    // Check if user already exists
    const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (existing) {
      return res.status(409).json({ success: false, message: "Username already taken." });
    }

    // Insert new user
    const insert = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    insert.run(username, password); // Plaintext for now, you can hash later

    console.log("✅ Registered user:", username);
    return res.json({ success: true, message: "User registered successfully." });

  } catch (err) {
    console.error("❌ /api/register error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});


app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const now = Date.now();

  const lock = db.prepare("SELECT * FROM locked_users WHERE username = ?").get(username);
  if (lock && now < lock.locked_until) {
    return res.status(403).json({ success: false, message: `User locked. Try again later.` });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);

  // Log the attempt
  db.prepare("INSERT INTO login_attempts (username, timestamp, success) VALUES (?, ?, ?)").run(
    username, now, user ? 1 : 0
  );

  if (!user) {
    const past2hrs = now - 2 * 60 * 60 * 1000;
    const past24hrs = now - 24 * 60 * 60 * 1000;

    const count2hr = db.prepare(`
      SELECT COUNT(*) AS count FROM login_attempts 
      WHERE username = ? AND timestamp > ? AND success = 0
    `).get(username, past2hrs).count;

    const count24hr = db.prepare(`
      SELECT COUNT(*) AS count FROM login_attempts 
      WHERE username = ? AND timestamp > ? AND success = 0
    `).get(username, past24hrs).count;

    if (count2hr >= 3) {
      const until = now + 2 * 60 * 60 * 1000; // 2 hrs
      db.prepare("INSERT OR REPLACE INTO locked_users (username, locked_until) VALUES (?, ?)").run(username, until);
      db.prepare("DELETE FROM login_attempts WHERE username = ?").run(username);
      return res.status(403).json({ success: false, message: "Too many attempts. Locked for 2 hours." });
    }

    if (count24hr >= 5) {
      const until = now + 24 * 60 * 60 * 1000; // 24 hrs
      db.prepare("INSERT OR REPLACE INTO locked_users (username, locked_until) VALUES (?, ?)").run(username, until);
      db.prepare("DELETE FROM login_attempts WHERE username = ?").run(username);
      return res.status(403).json({ success: false, message: "Too many failed attempts. Locked for 24 hours." });
    }

    return res.status(401).json({ success: false, message: "Invalid username or password." });
  }

  // Success: clean up attempts
  db.prepare("DELETE FROM login_attempts WHERE username = ?").run(username);
  db.prepare("DELETE FROM locked_users WHERE username = ?").run(username);

  return res.json({ success: true, user });
});

async function verifyLoginCredentials(username, password) {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await res.json();

    if (!res.ok) {
      showWarningModal(result.message || "Login failed.");
      return false;
    }

    return result.success;
  } catch (err) {
    showWarningModal("⚠️ Could not connect to server.");
    return false;
  }
}


const otpStore = {}; // username → otp

app.post("/api/generate-otp", (req, res) => {
  const { username } = req.body;

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[username] = otp;

  console.log(`🔐 OTP for ${username}: ${otp} (local-only)`);

  res.json({ success: true, otp }); // In production, don’t expose the OTP!
});

app.post("/api/verify-otp", (req, res) => {
  const { username, enteredOtp } = req.body;
  const correctOtp = otpStore[username];

  if (enteredOtp === correctOtp) {
    delete otpStore[username]; // OTP is one-time-use
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid OTP." });
  }
});

// Start server only once
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
