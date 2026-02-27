const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const authRouter = express.Router();
const port = Number(process.env.PORT || 5000);
const jwtSecret = process.env.JWT_SECRET || "change_this_secret_in_production";
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "change_this_refresh_secret_in_production";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "2400090002",
  database: process.env.DB_NAME || "handloom"
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(express.json());

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    jwtSecret,
    { expiresIn: "1h" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "refresh"
    },
    jwtRefreshSecret,
    { expiresIn: "7d" }
  );
}

/* ✅ Test Route */
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* ✅ Signup */
authRouter.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const [existingUsers] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [trimmedEmail]);

    if (existingUsers.length > 0) {
      return res.status(200).json({
        message: "Account already exists. Please login.",
        alreadyRegistered: true
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [String(name).trim(), trimmedEmail, passwordHash]
    );

    return res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/* ✅ Login */
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const [users] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [trimmedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(String(password), user.password_hash || "");

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = hashToken(refreshToken);

    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
      [user.id, refreshTokenHash]
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, jwtRefreshSecret);
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    if (payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    const refreshTokenHash = hashToken(refreshToken);
    const [storedTokens] = await pool.query(
      "SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1",
      [refreshTokenHash]
    );

    if (storedTokens.length === 0) {
      return res.status(401).json({ message: "Refresh token not recognized" });
    }

    const tokenRecord = storedTokens[0];
    const [users] = await pool.query(
      "SELECT id, name, email FROM users WHERE id = ? LIMIT 1",
      [tokenRecord.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = users[0];
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await pool.query(
      "UPDATE refresh_tokens SET token_hash = ?, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?",
      [newRefreshTokenHash, tokenRecord.id]
    );

    return res.status(200).json({
      message: "Token refreshed",
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    const refreshTokenHash = hashToken(refreshToken);
    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = ?", [refreshTokenHash]);

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/protected", verifyToken, (req, res) => {
  return res.status(200).json({
    message: "Access granted",
    user: req.user
  });
});

app.use(authRouter);
app.use("/api", authRouter);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});