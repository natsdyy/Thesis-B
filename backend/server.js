const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import database configuration and models
const { testConnection, runMigrations } = require("./config/database");
const User = require("./models/User");

// Import routes
const userRoutes = require("./routes/users");
const roleRoutes = require("./routes/roles");
const permissionRoutes = require("./routes/permissions");
const rolePermissionRoutes = require("./routes/rolePermissions");
const authRoutes = require("./routes/auth");
const { serve, setup } = require("./config/swagger");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/role-permissions", rolePermissionRoutes);
app.use("/api/auth", authRoutes);

// Swagger documentation
app.use("/api-docs", serve, setup);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Database health check
app.get("/api/health/db", async (req, res) => {
  try {
    await testConnection();
    res.json({
      success: true,
      message: "Database connection is healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );

  try {
    await testConnection();
    console.log("✅ Database connected successfully");

    await runMigrations();
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
});
