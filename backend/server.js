const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import database configuration and models
const { testConnection, runMigrations } = require("./config/database");
const User = require("./models/User");

// Import routes
const userRoutes = require("./routes/users");
const roleRoutes = require("./routes/roles");
const { serve, setup } = require("./config/swagger");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Express server is running!" });
});

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend server is healthy" });
});

// Database health check
app.get("/api/db-health", async (req, res) => {
  try {
    await testConnection();
    res.json({ status: "OK", message: "Database connection is healthy" });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// User routes
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api-docs", serve, setup);
// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Run database migrations
    await runMigrations();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(
        `🗄️  Database health: http://localhost:${PORT}/api/db-health`
      );
      console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
      console.log(`👥 Roles API: http://localhost:${PORT}/api/roles`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
