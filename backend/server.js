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
const branchRoutes = require("./routes/branches");
const supplyRequestRoutes = require("./routes/supplyRequest");
const budgetReleaseRoutes = require("./routes/budgetRelease");
const purchaseOrderRoutes = require("./routes/purchaseOrders");
const supplierRoutes = require("./routes/suppliers");
const itemReturnRoutes = require("./routes/itemReturns");
const supplierRatingsRoutes = require("./routes/supplierRatings");
const inventoryRoutes = require("./routes/inventory");
const { serve, setup } = require("./config/swagger");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || [
      "http://localhost:5000",
      "http://localhost:80",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/role-permissions", rolePermissionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/supply-requests", supplyRequestRoutes);
app.use("/api/budget-releases", budgetReleaseRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/item-returns", itemReturnRoutes);
app.use("/api/supplier-ratings", supplierRatingsRoutes);
app.use("/api/inventory", inventoryRoutes);

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
