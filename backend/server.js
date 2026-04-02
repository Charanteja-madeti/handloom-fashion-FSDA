require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const authRouter = express.Router();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString("hex");
let schemaInitPromise = null;

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "handloom"
};

if (isProduction) {
  const missingProductionEnv = [];

  if (!process.env.DB_HOST) {
    missingProductionEnv.push("DB_HOST");
  }

  if (!process.env.DB_USER) {
    missingProductionEnv.push("DB_USER");
  }

  if (!process.env.DB_NAME) {
    missingProductionEnv.push("DB_NAME");
  }

  if (missingProductionEnv.length > 0) {
    throw new Error(
      `Missing required production env vars: ${missingProductionEnv.join(", ")}. ` +
      "Set them in your deployment environment before starting the server."
    );
  }

  if (!process.env.DB_PASSWORD) {
    console.warn("DB_PASSWORD is not set in production; using an empty password.");
  }

  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set in production; generating a runtime fallback secret.");
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    console.warn("JWT_REFRESH_SECRET is not set in production; generating a runtime fallback refresh secret.");
  }
}

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isNetlifyOrigin(origin) {
  try {
    const parsedUrl = new URL(origin);
    return parsedUrl.hostname.endsWith(".netlify.app");
  } catch {
    return false;
  }
}

function isVercelOrigin(origin) {
  try {
    const parsedUrl = new URL(origin);
    return parsedUrl.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || isNetlifyOrigin(origin) || isVercelOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS blocked for this origin"));
  }
}));
app.use(express.json());

async function ensureSchemaInitialized() {
  if (!schemaInitPromise) {
    schemaInitPromise = ensureAuthSchema().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  return schemaInitPromise;
}

app.use(async (_req, res, next) => {
  try {
    await ensureSchemaInitialized();
    next();
  } catch (error) {
    console.error("Schema initialization failed:", error.message);
    res.status(500).json({ message: "Server initialization failed" });
  }
});

async function ensureAuthSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NULL,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100),
      image LONGTEXT,
      offer_text VARCHAR(255) NULL,
      offer_percent INT NULL,
      stock_left INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const alterQueries = [
    "ALTER TABLE products ADD COLUMN offer_text VARCHAR(255) NULL",
    "ALTER TABLE products ADD COLUMN offer_percent INT NULL",
    "ALTER TABLE products ADD COLUMN stock_left INT NULL"
  ];

  for (const alterQuery of alterQueries) {
    try {
      await pool.query(alterQuery);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_code VARCHAR(64) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(191) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      alternate_phone VARCHAR(40) NULL,
      address TEXT NOT NULL,
      nearby_location VARCHAR(255) NULL,
      city VARCHAR(120) NOT NULL,
      district VARCHAR(120) NOT NULL,
      state VARCHAR(120) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      item_count INT NOT NULL DEFAULT 0,
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
      shipping DECIMAL(10, 2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(40) NOT NULL DEFAULT 'COD',
      payment_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
      payment_reference VARCHAR(120) NULL,
      payment_app VARCHAR(60) NULL,
      payer_upi_id VARCHAR(120) NULL,
      submitted_at DATETIME NULL,
      customer_details_text LONGTEXT NULL,
      order_details_text LONGTEXT NULL,
      full_details_text LONGTEXT NULL,
      tracking_status VARCHAR(80) NOT NULL DEFAULT 'Order Placed',
      courier_name VARCHAR(120) NULL,
      tracking_number VARCHAR(120) NULL,
      current_location VARCHAR(255) NULL,
      estimated_delivery DATE NULL,
      delivery_notes TEXT NULL,
      cancellation_reason TEXT NULL,
      cancelled_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      category VARCHAR(120) NULL,
      image LONGTEXT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cart_user_product (user_id, product_id),
      CONSTRAINT fk_cart_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NULL,
      product_name VARCHAR(255) NOT NULL,
      category VARCHAR(120) NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL,
      line_total DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
    )
  `);

  const orderAlterQueries = [
    "ALTER TABLE orders ADD COLUMN cancellation_reason TEXT NULL",
    "ALTER TABLE orders ADD COLUMN cancelled_at DATETIME NULL",
    "ALTER TABLE orders ADD COLUMN submitted_at DATETIME NULL",
    "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT 'COD'",
    "ALTER TABLE orders ADD COLUMN payment_status VARCHAR(40) NOT NULL DEFAULT 'Pending'",
    "ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(120) NULL",
    "ALTER TABLE orders ADD COLUMN payment_app VARCHAR(60) NULL",
    "ALTER TABLE orders ADD COLUMN payer_upi_id VARCHAR(120) NULL",
    "ALTER TABLE orders ADD COLUMN customer_details_text LONGTEXT NULL",
    "ALTER TABLE orders ADD COLUMN order_details_text LONGTEXT NULL",
    "ALTER TABLE orders ADD COLUMN full_details_text LONGTEXT NULL"
  ];

  for (const alterQuery of orderAlterQueries) {
    try {
      await pool.query(alterQuery);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  const cartAlterQueries = [
    "ALTER TABLE cart_items ADD COLUMN category VARCHAR(120) NULL",
    "ALTER TABLE cart_items ADD COLUMN image LONGTEXT NULL"
  ];

  for (const alterQuery of cartAlterQueries) {
    try {
      await pool.query(alterQuery);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }
}

function parseOfferPercent(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return { invalid: true };
  }

  return Math.round(parsed);
}

function parseStockLeft(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { invalid: true };
  }

  return Math.round(parsed);
}

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

function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === "admin@handloom.com";
}

/* ✅ Test Route */
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (!isProduction) {
      req.user = { id: 0, email: "dev@local" };
      return next();
    }
    return res.status(401).json({ message: "Token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch (_error) {
    if (!isProduction) {
      const unsafeDecoded = jwt.decode(token) || {};
      req.user = {
        id: Number(unsafeDecoded.id || 0),
        email: String(unsafeDecoded.email || "dev@local").trim().toLowerCase()
      };
      return next();
    }
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

const requireProductAdmin = isProduction
  ? verifyToken
  : (_req, _res, next) => next();

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
    } catch (_error) {
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

/* ✅ Products Routes */

// GET all products
app.get("/api/products", async (req, res) => {
  try {
    const [products] = await pool.query(
      "SELECT id, name, description, price, category, image, offer_text, offer_percent, stock_left, created_at FROM products ORDER BY created_at DESC"
    );
    return res.status(200).json({
      message: "Products fetched successfully",
      products
    });
  } catch (error) {
    console.error("Get products error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET single product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await pool.query(
      "SELECT id, name, description, price, category, image, offer_text, offer_percent, stock_left FROM products WHERE id = ? LIMIT 1",
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      product: products[0]
    });
  } catch (error) {
    console.error("Get product error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST new product (admin only - requires token)
app.post("/api/products", requireProductAdmin, async (req, res) => {
  try {
    const { name, description, price, category, image, offerText, offerPercent, stockLeft } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "name and price are required" });
    }

    const parsedOfferPercent = parseOfferPercent(offerPercent);
    if (parsedOfferPercent && parsedOfferPercent.invalid) {
      return res.status(400).json({ message: "offerPercent must be between 0 and 100" });
    }

    const parsedStockLeft = parseStockLeft(stockLeft);
    if (parsedStockLeft && parsedStockLeft.invalid) {
      return res.status(400).json({ message: "stockLeft must be 0 or greater" });
    }

    await pool.query(
      "INSERT INTO products (name, description, price, category, image, offer_text, offer_percent, stock_left) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        String(name).trim(),
        String(description || "").trim(),
        parseFloat(price),
        String(category || "").trim(),
        image || null,
        String(offerText || "").trim() || null,
        parsedOfferPercent,
        parsedStockLeft
      ]
    );

    return res.status(201).json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Add product error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// UPDATE product (admin only - requires token)
app.put("/api/products/:id", requireProductAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image, offerText, offerPercent, stockLeft } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "name and price are required" });
    }

    const parsedOfferPercent = parseOfferPercent(offerPercent);
    if (parsedOfferPercent && parsedOfferPercent.invalid) {
      return res.status(400).json({ message: "offerPercent must be between 0 and 100" });
    }

    const parsedStockLeft = parseStockLeft(stockLeft);
    if (parsedStockLeft && parsedStockLeft.invalid) {
      return res.status(400).json({ message: "stockLeft must be 0 or greater" });
    }

    const [result] = await pool.query(
      "UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, offer_text = ?, offer_percent = ?, stock_left = ? WHERE id = ?",
      [
        String(name).trim(),
        String(description || "").trim(),
        parseFloat(price),
        String(category || "").trim(),
        image || null,
        String(offerText || "").trim() || null,
        parsedOfferPercent,
        parsedStockLeft,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Update product error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/api/products/:id/offer-stock", requireProductAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { offerText, offerPercent, stockLeft, price } = req.body;

    const parsedOfferPercent = parseOfferPercent(offerPercent);
    if (parsedOfferPercent && parsedOfferPercent.invalid) {
      return res.status(400).json({ message: "offerPercent must be between 0 and 100" });
    }

    const parsedStockLeft = parseStockLeft(stockLeft);
    if (parsedStockLeft && parsedStockLeft.invalid) {
      return res.status(400).json({ message: "stockLeft must be 0 or greater" });
    }

    let parsedPrice = null;
    if (price !== undefined && price !== null && price !== "") {
      parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: "price must be 0 or greater" });
      }
    }

    const [products] = await pool.query(
      "SELECT price FROM products WHERE id = ? LIMIT 1",
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const currentPrice = Number(products[0].price);
    let finalPrice = currentPrice;

    if (parsedPrice !== null) {
      finalPrice = parsedPrice;
    } else if (Number.isFinite(parsedOfferPercent) && parsedOfferPercent > 0) {
      finalPrice = Number((currentPrice * (1 - parsedOfferPercent / 100)).toFixed(2));
    }

    const [result] = await pool.query(
      "UPDATE products SET offer_text = ?, offer_percent = ?, stock_left = ?, price = ? WHERE id = ?",
      [String(offerText || "").trim() || null, parsedOfferPercent, parsedStockLeft, finalPrice, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Offer, stock, and price updated successfully" });
  } catch (error) {
    console.error("Update offer/stock error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/cart", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id || 0);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const [items] = await pool.query(
      `SELECT
        product_id AS id,
        product_name AS name,
        category,
        image,
        price,
        quantity,
        updated_at
      FROM cart_items
      WHERE user_id = ?
      ORDER BY updated_at DESC`,
      [userId]
    );

    return res.status(200).json({
      message: "Cart fetched successfully",
      items
    });
  } catch (error) {
    console.error("Get cart error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/cart", verifyToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = Number(req.user?.id || 0);
    const items = Array.isArray(req.body?.items) ? req.body.items : null;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    if (!items) {
      return res.status(400).json({ message: "items array is required" });
    }

    const safeItems = items
      .map((item) => {
        const productId = Number(item?.id);
        const quantity = Number(item?.quantity || 0);
        const price = Number(item?.price || 0);
        const name = String(item?.name || "").trim();
        const category = String(item?.category || "").trim() || null;
        const image = String(item?.image || "").trim() || null;

        if (!Number.isInteger(productId) || productId <= 0) {
          return null;
        }

        if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0) {
          return null;
        }

        return {
          productId,
          name,
          category,
          image,
          price,
          quantity
        };
      })
      .filter(Boolean);

    if (items.length > 0 && safeItems.length !== items.length) {
      return res.status(400).json({ message: "Invalid cart item payload" });
    }

    await connection.beginTransaction();

    await connection.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);

    if (safeItems.length > 0) {
      for (const item of safeItems) {
        await connection.query(
          `INSERT INTO cart_items (user_id, product_id, product_name, category, image, price, quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?)` ,
          [userId, item.productId, item.name, item.category, item.image, item.price, item.quantity]
        );
      }
    }

    await connection.commit();

    return res.status(200).json({
      message: "Cart saved successfully",
      items: safeItems.map((item) => ({
        id: item.productId,
        name: item.name,
        category: item.category,
        image: item.image,
        price: item.price,
        quantity: item.quantity
      }))
    });
  } catch (error) {
    await connection.rollback();
    console.error("Save cart error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
});

app.delete("/api/cart", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id || 0);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);

    return res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Clear cart error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/orders", verifyToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = Number(req.user?.id || 0);
    const userEmail = String(req.user?.email || "").trim().toLowerCase();

    const {
      customerName,
      customerEmail,
      phone,
      alternatePhone,
      address,
      nearbyLocation,
      city,
      district,
      state,
      pincode,
      itemCount,
      subtotal,
      shipping,
      totalAmount,
      paymentMethod,
      paymentStatus,
      paymentReference,
      paymentApp,
      payerUpiId,
      submittedAt,
      customerDetails,
      orderDetails,
      fullDetails,
      items
    } = req.body || {};

    if (!userId || !userEmail) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    if (!customerName || !customerEmail || !phone || !address || !city || !district || !state || !pincode) {
      return res.status(400).json({ message: "Missing required customer fields" });
    }

    const normalizedCustomerEmail = String(customerEmail).trim().toLowerCase();
    if (normalizedCustomerEmail !== userEmail && !isAdminEmail(userEmail)) {
      return res.status(403).json({ message: "Order email must match logged in user" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must include at least one item" });
    }

    const safeItems = items
      .map((item) => {
        const quantity = Number(item?.quantity || 0);
        const unitPrice = Number(item?.price || 0);
        const lineTotal = Number((unitPrice * quantity).toFixed(2));
        const productName = String(item?.name || "").trim();

        if (!productName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          return null;
        }

        return {
          productId: item?.id || null,
          productName,
          category: String(item?.category || "").trim() || null,
          unitPrice,
          quantity,
          lineTotal
        };
      })
      .filter(Boolean);

    if (safeItems.length === 0) {
      return res.status(400).json({ message: "Invalid item payload" });
    }

    const normalizedSubtotal = Number(subtotal || 0);
    const normalizedShipping = Number(shipping || 0);
    const normalizedTotalAmount = Number(totalAmount || 0);
    const normalizedPaymentMethod = String(paymentMethod || "COD").trim().toUpperCase();
    const allowedPaymentMethods = ["COD", "UPI", "CARD"];
    if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: "paymentMethod must be COD, UPI, or CARD" });
    }

    const normalizedPaymentStatus = String(paymentStatus || (normalizedPaymentMethod === "COD" ? "Pending" : "Paid")).trim();
    const normalizedPaymentReference = String(paymentReference || "").trim() || null;
    const normalizedPaymentApp = String(paymentApp || "").trim() || null;
    const normalizedPayerUpiId = String(payerUpiId || "").trim() || null;

    if (normalizedPaymentMethod !== "COD" && !normalizedPaymentReference) {
      return res.status(400).json({ message: "paymentReference is required for online payment methods" });
    }

    const normalizedItemCount = Number(itemCount || safeItems.reduce((sum, item) => sum + item.quantity, 0));
    const submittedDate = submittedAt ? new Date(submittedAt) : null;
    const normalizedSubmittedAt = submittedDate && !Number.isNaN(submittedDate.getTime())
      ? submittedDate
      : null;
    const orderCode = `HF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

    await connection.beginTransaction();

    const [orderInsert] = await connection.query(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_email, phone, alternate_phone,
        address, nearby_location, city, district, state, pincode,
        item_count, subtotal, shipping, total_amount,
        payment_method, payment_status, payment_reference, payment_app, payer_upi_id,
        submitted_at, customer_details_text, order_details_text, full_details_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        orderCode,
        userId,
        String(customerName).trim(),
        normalizedCustomerEmail,
        String(phone).trim(),
        String(alternatePhone || "").trim() || null,
        String(address).trim(),
        String(nearbyLocation || "").trim() || null,
        String(city).trim(),
        String(district).trim(),
        String(state).trim(),
        String(pincode).trim(),
        normalizedItemCount,
        Number.isFinite(normalizedSubtotal) ? normalizedSubtotal : 0,
        Number.isFinite(normalizedShipping) ? normalizedShipping : 0,
        Number.isFinite(normalizedTotalAmount) ? normalizedTotalAmount : 0,
        normalizedPaymentMethod,
        normalizedPaymentStatus,
        normalizedPaymentReference,
        normalizedPaymentApp,
        normalizedPayerUpiId,
        normalizedSubmittedAt,
        String(customerDetails || "").trim() || null,
        String(orderDetails || "").trim() || null,
        String(fullDetails || "").trim() || null
      ]
    );

    const orderId = orderInsert.insertId;

    for (const item of safeItems) {
      await connection.query(
        `INSERT INTO order_items (
          order_id, product_id, product_name, category, unit_price, quantity, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.category,
          item.unitPrice,
          item.quantity,
          item.lineTotal
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Order placed successfully",
      order: {
        id: orderId,
        orderCode,
        trackingStatus: "Order Placed"
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create order error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
});

app.get("/api/orders", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id || 0);
    const userEmail = String(req.user?.email || "").trim().toLowerCase();
    const isAdmin = isAdminEmail(userEmail);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const [orders] = await pool.query(
      `SELECT
        o.id,
        o.order_code,
        o.user_id,
        o.customer_name,
        o.customer_email,
        o.phone,
        o.alternate_phone,
        o.address,
        o.nearby_location,
        o.city,
        o.district,
        o.state,
        o.pincode,
        o.item_count,
        o.subtotal,
        o.shipping,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.payment_reference,
        o.payment_app,
        o.payer_upi_id,
        DATE_FORMAT(o.submitted_at, '%Y-%m-%d %H:%i:%s') AS submitted_at,
        o.customer_details_text,
        o.order_details_text,
        o.full_details_text,
        o.tracking_status,
        o.courier_name,
        o.tracking_number,
        o.current_location,
        DATE_FORMAT(o.estimated_delivery, '%Y-%m-%d') AS estimated_delivery,
        o.delivery_notes,
        o.cancellation_reason,
        o.cancelled_at,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE (? = 1 OR o.user_id = ? OR o.customer_email = ?)
      ORDER BY o.created_at DESC`,
      [isAdmin ? 1 : 0, userId, userEmail]
    );

    if (orders.length === 0) {
      return res.status(200).json({ message: "Orders fetched successfully", orders: [] });
    }

    const orderIds = orders.map((order) => order.id);
    const placeholders = orderIds.map(() => "?").join(",");
    const [items] = await pool.query(
      `SELECT order_id, product_id, product_name, category, unit_price, quantity, line_total
       FROM order_items
       WHERE order_id IN (${placeholders})
       ORDER BY id ASC`,
      orderIds
    );

    const itemMap = items.reduce((accumulator, item) => {
      const key = item.order_id;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }

      accumulator[key].push(item);
      return accumulator;
    }, {});

    return res.status(200).json({
      message: "Orders fetched successfully",
      orders: orders.map((order) => ({
        ...order,
        items: itemMap[order.id] || []
      }))
    });
  } catch (error) {
    console.error("Get orders error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/orders/:id", verifyToken, async (req, res) => {
  try {
    const adminEmail = String(req.user?.email || "").trim().toLowerCase();

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ message: "Only admin can update order tracking details" });
    }

    const { id } = req.params;
    const {
      customerName,
      customerEmail,
      phone,
      alternatePhone,
      address,
      nearbyLocation,
      city,
      district,
      state,
      pincode,
      trackingStatus,
      courierName,
      trackingNumber,
      currentLocation,
      estimatedDelivery,
      deliveryNotes
    } = req.body || {};

    if (!customerName || !customerEmail || !phone || !address || !city || !district || !state || !pincode || !trackingStatus) {
      return res.status(400).json({ message: "Missing required fields for order update" });
    }

    const [result] = await pool.query(
      `UPDATE orders
       SET customer_name = ?, customer_email = ?, phone = ?, alternate_phone = ?,
           address = ?, nearby_location = ?, city = ?, district = ?, state = ?, pincode = ?,
           tracking_status = ?, courier_name = ?, tracking_number = ?, current_location = ?,
           estimated_delivery = ?, delivery_notes = ?, cancelled_at = ?, cancellation_reason = ?
       WHERE id = ?`,
      [
        String(customerName).trim(),
        String(customerEmail).trim().toLowerCase(),
        String(phone).trim(),
        String(alternatePhone || "").trim() || null,
        String(address).trim(),
        String(nearbyLocation || "").trim() || null,
        String(city).trim(),
        String(district).trim(),
        String(state).trim(),
        String(pincode).trim(),
        String(trackingStatus).trim(),
        String(courierName || "").trim() || null,
        String(trackingNumber || "").trim() || null,
        String(currentLocation || "").trim() || null,
        estimatedDelivery ? String(estimatedDelivery).trim() : null,
        String(deliveryNotes || "").trim() || null,
        String(trackingStatus).trim().toLowerCase() === "cancelled" ? new Date() : null,
        String(trackingStatus).trim().toLowerCase() === "cancelled"
          ? String(deliveryNotes || "Cancelled by admin").trim()
          : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order tracking details updated successfully" });
  } catch (error) {
    console.error("Update order error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/api/orders/:id/cancel", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id || 0);
    const userEmail = String(req.user?.email || "").trim().toLowerCase();
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!userId || !userEmail) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const [orders] = await pool.query(
      "SELECT id, user_id, customer_email, tracking_status FROM orders WHERE id = ? LIMIT 1",
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];
    const isOwner = Number(order.user_id) === userId || String(order.customer_email || "").trim().toLowerCase() === userEmail;

    if (!isOwner && !isAdminEmail(userEmail)) {
      return res.status(403).json({ message: "You can cancel only your own orders" });
    }

    const currentStatus = String(order.tracking_status || "").trim().toLowerCase();
    const cancellationBlockedStatuses = ["shipped", "out for delivery", "delivered", "cancelled"];

    if (cancellationBlockedStatuses.includes(currentStatus)) {
      return res.status(400).json({ message: `Order cannot be cancelled after status: ${order.tracking_status}` });
    }

    await pool.query(
      `UPDATE orders
       SET tracking_status = 'Cancelled',
           cancellation_reason = ?,
           cancelled_at = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(reason || "Cancelled by customer").trim(), id]
    );

    return res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Cancel order error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE product (admin only - requires token)
app.delete("/api/products/:id", requireProductAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.use(authRouter);
app.use("/api", authRouter);

async function startServer() {
  try {
    await ensureSchemaInitialized();
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;