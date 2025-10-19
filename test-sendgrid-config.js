#!/usr/bin/env node

/**
 * SendGrid Configuration Test Script
 * This script helps verify SendGrid API key configuration
 */

require("dotenv").config();
const SendGridService = require("./backend/services/sendGridService");

console.log("🔍 Testing SendGrid Configuration...\n");

// Check environment variables
console.log("Environment Variables:");
console.log(
  `SENDGRID_API_KEY_2: ${process.env.SENDGRID_API_KEY_2 ? "SET" : "NOT SET"}`
);
console.log(
  `SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? "SET" : "NOT SET"}\n`
);

// Test configuration
const isConfigured = SendGridService.isConfigured();
console.log(`SendGrid is configured: ${isConfigured ? "✅ YES" : "❌ NO"}\n`);

if (!isConfigured) {
  console.log("❌ SendGrid is not properly configured. Please check:");
  console.log(
    "1. Set SENDGRID_API_KEY_2 or SENDGRID_API_KEY environment variable"
  );
  console.log('2. Make sure the API key starts with "SG." and is valid');
  console.log(
    "3. For Railway deployment, add the environment variable in Railway dashboard"
  );
  console.log("4. For local development, create a .env file with the API key");
} else {
  console.log("✅ SendGrid appears to be configured correctly!");
  console.log("You can now test sending emails through your application.");
}

console.log("\n📧 To test email functionality, try:");
console.log("- Creating a new employee (should send welcome email)");
console.log(
  "- Approving an employee transfer (should send transfer notification)"
);
console.log("- Generating payroll (should send payroll notification)");
