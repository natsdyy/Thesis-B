#!/usr/bin/env node

/**
 * Test the new SendGrid API key
 */

// Set the new API key
process.env.SENDGRID_API_KEY_2 =
  "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";

const sgMail = require("@sendgrid/mail");

console.log("🔍 Testing New SendGrid API Key...\n");

// Initialize SendGrid with new key
sgMail.setApiKey(process.env.SENDGRID_API_KEY_2);

// Test configuration
const apiKey = process.env.SENDGRID_API_KEY_2;
const isConfigured =
  apiKey &&
  apiKey !== "your-sendgrid-api-key-here" &&
  apiKey.startsWith("SG.") &&
  apiKey.length > 20;

console.log(`API Key found: ${apiKey ? "YES" : "NO"}`);
if (apiKey) {
  console.log(
    `API Key starts with SG.: ${apiKey.startsWith("SG.") ? "YES" : "NO"}`
  );
  console.log(`API Key length: ${apiKey.length}`);
}
console.log(`SendGrid is configured: ${isConfigured ? "✅ YES" : "❌ NO"}\n`);

if (isConfigured) {
  console.log("🧪 Testing email sending...");

  const msg = {
    to: "test@example.com",
    from: "mailcountrysidesteakhouse@gmail.com",
    subject: "SendGrid Test - New API Key",
    text: "This is a test email from the new SendGrid API key.",
    html: "<p>This is a test email from the new SendGrid API key.</p>",
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("✅ Email sent successfully!");
      console.log("🎉 New SendGrid API key is working correctly!");
    })
    .catch((error) => {
      console.error("❌ SendGrid Error:", error.message);
      if (error.response) {
        console.error("Response Status:", error.response.status);
        console.error("Response Body:", error.response.body);
      }
    });
} else {
  console.log("❌ SendGrid is not properly configured.");
}
