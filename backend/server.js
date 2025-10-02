const express = require("express");
const cron = require("node-cron");
const Inventory = require("./models/Inventory");
const cors = require("cors");
require("dotenv").config();

// Set timezone to Philippine Time (Asia/Manila)
process.env.TZ = process.env.TZ || "Asia/Manila";
console.log(`🌍 Timezone set to: ${process.env.TZ}`);
console.log(
  `🕐 Current server time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`
);

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
const customerRoutes = require("./routes/customers");
const analyticsRoutes = require("./routes/analytics");
const productionRoutes = require("./routes/production");
const menuRoutes = require("./routes/menu");
const menuAnalyticsRoutes = require("./routes/menuAnalytics");
const attendanceRoutes = require("./routes/attendance");
const employeeRoutes = require("./routes/employees");
const branchRequestRoutes = require("./routes/branchRequests");
const branchDistributionRoutes = require("./routes/branchDistributions");
const branchInventoryRoutes = require("./routes/branchInventory");
const branchReturnRoutes = require("./routes/branchReturns");
const branchScheduleRoutes = require("./routes/branchSchedules");
const employeeScheduleRoutes = require("./routes/employeeSchedules");
const shiftTypesRoutes = require("./routes/shiftTypes");
const { serve, setup } = require("./config/swagger");
const posRoutes = require("./routes/pos");
const overtimeRoutes = require("./routes/overtime");
const leaveRoutes = require("./routes/leave");
const financeRoutes = require("./routes/finance");

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;

// Middleware
// Enhanced CORS to allow localhost, LAN dev origins, and Railway deployment
const rawCorsOrigin = process.env.CORS_ORIGIN || "";
const envOrigins = rawCorsOrigin
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  "http://192.168.68.111:8080", // Wi-Fi 4 frontend
  "http://192.168.254.116:8080", // Wi-Fi 3 frontend
  "http://10.196.212.241:8080", // Wi-Fi 2 frontend
  "http://10.196.212.194:8080", // Wi-Fi frontend
  "http://192.168.56.1:8080", // Ethernet 3 frontend
  "http://localhost:5000", // Localhost backend
  "http://localhost:80", //docker
  "http://localhost:8080", // Localhost frontend
  "http://192.168.18.5:8080", // Legacy network frontend
  "http://192.168.68.111:5000", // Wi-Fi 4 backend
  "http://192.168.56.1:5000", // Ethernet 3 backend
  "https://countrysides.up.railway.app", // Railway deployment
  "https://thesis-b-frontend-production.up.railway.app", // Railway frontend
  "https://thesis-b-backend-production.up.railway.app", // Railway backend
  "https://www.countryside-steakhouse.site", // Production domain
  "http://www.countryside-steakhouse.site", // Production domain (HTTP fallback addons)
];

const allowList = [...defaultAllowedOrigins, ...envOrigins];

const corsConfig = {
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin (no Origin header)
    if (!origin) return callback(null, true);

    const isLanDevOrigin = /^http:\/\/192\.168\.\d+\.\d+:(8080|80)$/.test(
      origin
    );

    // Allow Railway domains
    const isRailwayOrigin = /^https:\/\/.*\.up\.railway\.app$/.test(origin);

    if (allowList.includes(origin) || isLanDevOrigin || isRailwayOrigin) {
      return callback(null, true);
    }

    console.log(`CORS blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsConfig));
app.use(express.json());
// Serve uploads with proper CORS headers for images
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  },
  express.static(require("path").join(__dirname, "uploads"))
);

// Serve frontend static files
const frontendPath = require("path").join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendPath));

// Health check endpoint for Railway
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

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
app.use("/api/customers", customerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/menu/analytics", menuAnalyticsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/branch-requests", branchRequestRoutes);
app.use("/api/branch-distributions", branchDistributionRoutes);
app.use("/api/branch-inventory", branchInventoryRoutes);
app.use("/api/branch-returns", branchReturnRoutes);
app.use("/api/branch-schedules", branchScheduleRoutes);
app.use("/api/employee-schedules", employeeScheduleRoutes);
app.use("/api/shift-types", shiftTypesRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/overtime", overtimeRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/finance", financeRoutes);

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

// Debug endpoint for Railway environment variables
app.get("/api/debug-env", (req, res) => {
  const emailVars = {};
  Object.keys(process.env).forEach(key => {
    if (key.includes('SMTP') || key.includes('SENDGRID') || key.includes('RAILWAY') || key.includes('NODE')) {
      const value = process.env[key];
      if (value && value.length > 10) {
        emailVars[key] = `${value.substring(0, 10)}...`;
      } else {
        emailVars[key] = value;
      }
    }
  });
  
  res.json({
    environment: process.env.NODE_ENV,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
    emailVariables: emailVars,
    allEmailKeys: Object.keys(process.env).filter(key => key.includes('SMTP') || key.includes('SENDGRID'))
  });
});

// Email test endpoint
app.get("/api/test-email", async (req, res) => {
  try {
    const EmailService = require('./services/emailService');
    
    // Test email data
    const testEmailData = {
      to: 'test@example.com', // This will fail but we can see the error
      subject: 'Test Email from Countryside Steak House',
      html: '<h1>Test Email</h1><p>This is a test email to verify email service functionality.</p>',
      text: 'Test Email - This is a test email to verify email service functionality.'
    };

    console.log('🧪 Testing email service...');
    const result = await EmailService.sendEmailWithFallback(testEmailData);
    
    res.json({
      success: true,
      message: 'Email test completed',
      emailServiceReady: EmailService.isEmailServiceReady(),
      result: result
    });
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Email test failed',
      error: error.message,
      emailServiceReady: require('./services/emailService').isEmailServiceReady()
    });
  }
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(require("path").join(frontendPath, "index.html"));
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
const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `📚 API Documentation available at http://localhost:${PORT}/api-docs`
  );
  console.log(
    `🏥 Health check available at http://localhost:${PORT}/api/health`
  );

  try {
    await testConnection();
    console.log("✅ Database connected successfully");
    console.log("🔄 Running database migrations...");
    await runMigrations();
    console.log("✅ Database migrations completed");
    console.log("🎉 Server is ready to accept requests!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("⚠️ Server started but database is not available");
  }
});

// Handle server errors
server.on("error", (error) => {
  console.error("❌ Server error:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
