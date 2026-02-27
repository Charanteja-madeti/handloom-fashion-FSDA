const mysql = require("mysql2/promise");

async function initDatabase() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || "handloom";

  if (!password) {
    throw new Error("DB_PASSWORD is required. Set it before running db-init.");
  }

  const rootConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
  });

  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await rootConnection.end();

  const appConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  await appConnection.query(`
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

  await appConnection.query(`
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

  const [passwordColumn] = await appConnection.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
  `, [database]);

  if (passwordColumn.length === 0) {
    await appConnection.query(`
      ALTER TABLE users
      ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''
    `);
  }

  const [createdAtColumn] = await appConnection.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'created_at'
  `, [database]);

  if (createdAtColumn.length === 0) {
    await appConnection.query(`
      ALTER TABLE users
      ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
  }

  const [updatedAtColumn] = await appConnection.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'updated_at'
  `, [database]);

  if (updatedAtColumn.length === 0) {
    await appConnection.query(`
      ALTER TABLE users
      ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }

  const [rows] = await appConnection.query("SHOW TABLES LIKE 'users'");
  const [refreshRows] = await appConnection.query("SHOW TABLES LIKE 'refresh_tokens'");
  console.log("Database:", database);
  console.log("Users table created:", rows.length > 0);
  console.log("Refresh tokens table created:", refreshRows.length > 0);

  await appConnection.end();
}

initDatabase().catch((error) => {
  console.error("DB init failed:", error.message);
  process.exit(1);
});
