const express = require("express");
const cron = require("node-cron");
const Inventory = require("./models/Inventory");
const cors = require("cors");
require("dotenv").config();

// Import database configuration and models
const { testConnection, runMigrations } = require("./config/database");
const Employee = require("./models/Employee");

// Import routes
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
const grnRoutes = require("./routes/grn");
const feedbackRoutes = require("./routes/feedback");
const productionRoutes = require("./routes/production");
const menuRoutes = require("./routes/menu");
const menuAnalyticsRoutes = require("./routes/menuAnalytics");
const attendanceRoutes = require("./routes/attendance");
const employeeRoutes = require("./routes/employees");
const branchRequestRoutes = require("./routes/branchRequests");
const branchDistributionRoutes = require("./routes/branchDistributions");
const { serve, setup } = require("./config/swagger");

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
// Enhanced CORS to allow localhost, LAN dev origins, and Railway deployment
const rawCorsOrigin = process.env.CORS_ORIGIN || "";
const envOrigins = rawCorsOrigin
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  "http://localhost:5000", // Localhost backend
  "http://localhost:80", //docker
  "http://localhost:8080", // Localhost frontend
  "http://192.168.18.5:8080", // Network frontend
  "http://192.168.56.1:5000", // Network backend
  "http://localhost:8080", // Localhost frontend
  "https://countrysides.up.railway.app", // Railway deployment
  "https://*.up.railway.app", // Railway wildcard
];

const allowList = [...defaultAllowedOrigins, ...envOrigins];

const corsConfig = {
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin (no Origin header)
    if (!origin) return callback(null, true);

    const isLanDevOrigin = /^http:\/\/192\.168\.\d+\.\d+:(8080|80)$/.test(
      origin
    );

    if (allowList.includes(origin) || isLanDevOrigin) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsConfig));
app.use(express.json());
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));

// API Routes
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
app.use("/api/grn", grnRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/menu/analytics", menuAnalyticsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/branch-requests", branchRequestRoutes);
app.use("/api/branch-distributions", branchDistributionRoutes);

// Auto-expire job
async function autoExpireJob() {
  const today = new Date().toISOString().split("T")[0];
  const items = await db("inventory_items")
    .select("id")
    .whereNull("deleted_at")
    .where("status", "available")
    .whereNotNull("expiry_date")
    .where("expiry_date", "<", today);

  for (const row of items) {
    try {
      await Inventory.updateInventoryQuantity(row.id, {
        transaction_type: "adjustment",
        quantity: 0,
        reference_number: null,
        reason: "Auto-expired by daily job",
        notes: "System auto-expiry based on expiry_date",
        performed_by: "System",
        transaction_date: new Date(),
        adjustment_type: "mark_expired",
      });
    } catch (e) {
      console.error("Auto-expire failed for", row.id, e.message);
    }
  }
}

// Run daily at 01:00 server time
cron.schedule("0 1 * * *", autoExpireJob);
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
