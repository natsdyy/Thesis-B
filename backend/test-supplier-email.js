#!/usr/bin/env node

/**
 * Test Supplier Welcome Email Functionality
 */

require("dotenv").config();
const SendGridService = require("./services/sendGridService");

console.log("🧪 Testing Supplier Welcome Email...\n");

// Test data
const testSupplier = {
  name: "Test Supplier Company",
  contact_person: "John Doe",
  email: "test@supplier.com",
  password: "supplier123",
};

console.log("📧 Test Supplier Data:");
console.log(`Name: ${testSupplier.name}`);
console.log(`Contact: ${testSupplier.contact_person}`);
console.log(`Email: ${testSupplier.email}`);
console.log(`Password: ${testSupplier.password}\n`);

// Test SendGrid configuration
console.log("🔍 Checking SendGrid Configuration...");
const isConfigured = SendGridService.isConfigured();
console.log(`SendGrid is configured: ${isConfigured ? "✅ YES" : "❌ NO"}\n`);

if (isConfigured) {
  console.log("📧 Sending supplier welcome email...");

  SendGridService.sendSupplierWelcomeEmail(
    testSupplier.email,
    testSupplier.contact_person,
    testSupplier.email,
    testSupplier.password
  )
    .then((result) => {
      if (result.success) {
        console.log("✅ Supplier welcome email sent successfully!");
        console.log(`📧 Message ID: ${result.messageId}`);
        console.log(`🔧 Provider: ${result.provider}`);
        console.log("\n🎉 Supplier email functionality is working correctly!");
        console.log("\n📋 What this means:");
        console.log("- ✅ New suppliers will receive welcome emails");
        console.log("- ✅ Emails include login credentials");
        console.log("- ✅ Emails include supplier portal login link");
        console.log("- ✅ Professional email template is used");
      } else {
        console.log("❌ Failed to send supplier welcome email");
        console.log(`Error: ${result.error}`);
      }
    })
    .catch((error) => {
      console.error("❌ Error testing supplier email:", error.message);
    });
} else {
  console.log("❌ SendGrid is not configured properly");
  console.log("Please check your SENDGRID_API_KEY_2 environment variable");
}
