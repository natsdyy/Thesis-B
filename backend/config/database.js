const knex = require("knex");
const knexConfig = require("../knexfile");
require("dotenv").config();

// Set timezone for database connections
process.env.TZ = process.env.TZ || "Asia/Manila";

// Initialize Knex instance
const environment = process.env.NODE_ENV || "development";
const db = knex(knexConfig[environment]);

// Set timezone for PostgreSQL connections if using PostgreSQL
if (knexConfig[environment].client === "pg") {
  db.raw("SET timezone = 'Asia/Manila'").catch((err) => {
    console.warn("Could not set database timezone:", err.message);
  });
}

// Test database connection using Knex
const testConnection = async () => {
  try {
    await db.raw("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    await db.migrate.latest();
    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  }
};

module.exports = {
  db,
  testConnection,
  runMigrations,
};
