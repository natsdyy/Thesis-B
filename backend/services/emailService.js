const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
const SendGridService = require("./sendGridService");
require("dotenv").config();

// Initialize SendGrid if API key is available
const sendGridKey =
  process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY_2;
if (
  sendGridKey &&
  sendGridKey !== "your-sendgrid-api-key-here" &&
  sendGridKey.startsWith("SG.")
) {
  sgMail.setApiKey(sendGridKey);
  console.log("📧 SendGrid initialized for email delivery");
  console.log("🚂 Railway-compatible email service ready");
  console.log(
    "🔑 Using SendGrid API key:",
    sendGridKey.substring(0, 10) + "..."
  );
} else {
  console.log(
    "⚠️  SendGrid API key not found or not configured, using SMTP fallback"
  );
  console.log(
    "💡 To fix Railway email issues, add SENDGRID_API_KEY environment variable"
  );
  if (sendGridKey) {
    console.log(
      "🔍 Detected API key but invalid format:",
      sendGridKey.substring(0, 10) + "..."
    );
  }
}

// Email configuration from environment variables
const EMAIL_CONFIG = {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true" || false,
};

// Check if we have proper email configuration
const hasValidEmailConfig = () => {
  // More lenient SendGrid detection
  const hasSendGrid =
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY !==
      "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" &&
    process.env.SENDGRID_API_KEY_2 !==
      "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" &&
    process.env.SENDGRID_API_KEY.length > 10; // Reduced from 20 to 10

  // More lenient SMTP detection
  const hasSMTP = process.env.SMTP_PASS && process.env.SMTP_PASS.length > 5;

  // Additional check: if we're in Railway and have any email-related env vars, consider it valid
  const isRailwayEnv =
    process.env.RAILWAY_ENVIRONMENT === "production" ||
    process.env.NODE_ENV === "production";
  const hasAnyEmailConfig =
    process.env.SENDGRID_API_KEY ||
    process.env.SMTP_PASS ||
    process.env.SMTP_USER;

  console.log("🔍 Email Config Debug:", {
    hasSendGrid,
    hasSMTP,
    isRailwayEnv,
    hasAnyEmailConfig,
    sendGridKey: process.env.SENDGRID_API_KEY
      ? `${process.env.SENDGRID_API_KEY.substring(0, 10)}...`
      : "undefined",
    smtpPass: process.env.SMTP_PASS
      ? `${process.env.SMTP_PASS.substring(0, 5)}...`
      : "undefined",
    smtpUser: process.env.SMTP_USER,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    allEnvVars: Object.keys(process.env).filter(
      (key) => key.includes("SMTP") || key.includes("SENDGRID")
    ),
  });

  // In Railway, if we have any email config, consider it valid
  if (isRailwayEnv && hasAnyEmailConfig) {
    console.log(
      "🚂 Railway environment detected with email config - considering valid"
    );
    return true;
  }

  return hasSendGrid || hasSMTP;
};

if (!hasValidEmailConfig()) {
  console.error("❌ No valid email configuration found!");
  console.error(
    "   Please set up either SendGrid API key or Gmail SMTP password in Railway environment variables."
  );
  console.error("   See RAILWAY_EMAIL_FIX_GUIDE.md for instructions.");
}

// Check if we're in Railway environment
const isRailway =
  process.env.RAILWAY_ENVIRONMENT === "production" ||
  process.env.NODE_ENV === "production";

// Railway-specific email configuration
if (isRailway) {
  console.log(
    "🚂 Railway environment detected - using Railway-optimized email settings"
  );

  // Override EMAIL_CONFIG for Railway
  if (process.env.SMTP_USER) {
    EMAIL_CONFIG.user = process.env.SMTP_USER;
  }
  if (process.env.SMTP_PASS) {
    EMAIL_CONFIG.pass = process.env.SMTP_PASS;
  }
  if (process.env.SMTP_HOST) {
    EMAIL_CONFIG.host = process.env.SMTP_HOST;
  }
  if (process.env.SMTP_PORT) {
    EMAIL_CONFIG.port = parseInt(process.env.SMTP_PORT);
  }
  if (process.env.SMTP_SECURE) {
    EMAIL_CONFIG.secure = process.env.SMTP_SECURE === "true";
  }
}

// Create multiple transporter configurations for fallback
const createTransporter = (config) => {
  return nodemailer.createTransport({
    ...config,
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass,
    },
    // Production-optimized timeout settings for Railway
    connectionTimeout: 30000, // 30 seconds - reduced for Railway
    greetingTimeout: 30000, // 30 seconds - reduced for Railway
    socketTimeout: 30000, // 30 seconds - reduced for Railway
    pool: false, // Disable connection pooling for Railway compatibility
    tls: {
      rejectUnauthorized: false,
      secureProtocol: "TLSv1_2_method",
    },
    debug: false, // Disable debug logging for security
    logger: false,
  });
};

// Primary transporter (Port 587 - STARTTLS) - Better for cloud hosting
const transporter = createTransporter({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
});

// Fallback transporter (Port 465 - SSL)
const fallbackTransporter = createTransporter({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
});

// Alternative transporter with different settings for extreme cases
const alternativeTransporter = createTransporter({
  host: EMAIL_CONFIG.host,
  port: 587,
  secure: false,
  tls: {
    rejectUnauthorized: false,
    secureProtocol: "TLSv1_method",
    ciphers: "ALL",
  },
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 1 minute
});

// Railway-compatible transporter using alternative SMTP (if configured)
let railwayTransporter = null;
if (process.env.RAILWAY_SMTP_HOST) {
  railwayTransporter = createTransporter({
    host: process.env.RAILWAY_SMTP_HOST,
    port: parseInt(process.env.RAILWAY_SMTP_PORT) || 2525,
    secure: false,
    auth: {
      user: process.env.RAILWAY_SMTP_USER || EMAIL_CONFIG.user,
      pass: process.env.RAILWAY_SMTP_PASS || EMAIL_CONFIG.pass,
    },
  });
}

// Railway-optimized Gmail SMTP transporter with better DNS resolution
const railwayGmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_CONFIG.user,
    pass: EMAIL_CONFIG.pass,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  pool: false,
  tls: {
    rejectUnauthorized: false,
    secureProtocol: "TLSv1_2_method",
  },
  // Use different DNS servers for Railway
  dns: {
    servers: ["1.1.1.1", "1.0.0.1"], // Cloudflare DNS
  },
  debug: false, // Disable debug logging for security
  logger: false,
});

// Railway-specific transporter using alternative ports
const railwayAlternativeTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 2525, // Alternative port that Railway might allow
  secure: false,
  auth: {
    user: EMAIL_CONFIG.user,
    pass: EMAIL_CONFIG.pass,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  pool: false,
  tls: {
    rejectUnauthorized: false,
    secureProtocol: "TLSv1_2_method",
  },
  debug: false, // Disable debug logging for security
  logger: false,
});

// Verify transporter configuration with retry
let verificationAttempts = 0;
const maxVerificationAttempts = 3;
let emailServiceReady = false;

const verifyTransporter = () => {
  verificationAttempts++;
  console.log(
    `📧 Verifying email service (attempt ${verificationAttempts}/${maxVerificationAttempts})`
  );

  // Create a timeout promise for verification
  const verificationTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Verification timeout")), 20000); // 20 second timeout
  });

  // Try primary transporter first with timeout
  const primaryVerification = new Promise((resolve, reject) => {
    transporter.verify((error, success) => {
      if (error) reject(error);
      else resolve(success);
    });
  });

  Promise.race([primaryVerification, verificationTimeout])
    .then(() => {
      console.log("✅ Primary email service (port 587) ready to send messages");
      emailServiceReady = true;
    })
    .catch((primaryError) => {
      console.log(`❌ Primary transporter failed: ${primaryError.message}`);
      console.log(`📧 Trying fallback transporter (port 465)...`);

      // Try fallback transporter with timeout
      const fallbackVerification = new Promise((resolve, reject) => {
        fallbackTransporter.verify((error, success) => {
          if (error) reject(error);
          else resolve(success);
        });
      });

      Promise.race([fallbackVerification, verificationTimeout])
        .then(() => {
          console.log(
            "✅ Fallback email service (port 465) ready to send messages"
          );
          emailServiceReady = true;
        })
        .catch((fallbackError) => {
          console.error(
            `❌ Both transporters failed on attempt ${verificationAttempts}`
          );
          console.error(`Primary: ${primaryError.message}`);
          console.error(`Fallback: ${fallbackError.message}`);

          if (verificationAttempts < maxVerificationAttempts) {
            console.log(
              `⏳ Retrying email service verification in 10 seconds...`
            );
            setTimeout(verifyTransporter, 10000);
          } else {
            console.error(
              "❌ Email service verification failed after all attempts"
            );
            console.error("⚠️  Email functionality may be limited");
            console.log(
              "📧 Email service will attempt to send emails when needed, but verification failed"
            );
            emailServiceReady = false;
          }
        });
    });
};

// Start verification only if not in Railway environment or if we have SMTP config
if (isRailway && process.env.SENDGRID_API_KEY && !process.env.SMTP_PASS) {
  console.log(
    "🚂 Railway environment with SendGrid only - skipping SMTP verification"
  );
  emailServiceReady = true;
} else {
  // Start verification
  verifyTransporter();
}

class EmailService {
  /**
   * Check if email service is ready
   * @returns {boolean} True if email service is ready
   */
  static isEmailServiceReady() {
    return emailServiceReady;
  }

  /**
   * Send email using SendGrid (primary method)
   * @param {Object} emailData - Email data object
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - HTML content
   * @param {string} emailData.text - Text content
   * @param {string} emailData.from - Sender email
   * @returns {Promise<Object>} SendGrid response
   */
  static async sendViaSendGrid(emailData) {
    try {
      const msg = {
        to: emailData.to,
        from:
          emailData.from ||
          '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      console.log("📧 Sending email via SendGrid to:", emailData.to);
      const response = await sgMail.send(msg);
      console.log(
        "✅ SendGrid email sent successfully:",
        response[0].statusCode
      );
      return { success: true, messageId: response[0].headers["x-message-id"] };
    } catch (error) {
      console.error("❌ SendGrid email failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email with fallback (SendGrid first, then SMTP)
   * @param {Object} emailData - Email data object
   * @returns {Promise<Object>} Email response
   */
  static async sendEmailWithFallback(emailData) {
    // Check if email service is ready, but don't fail if it's not
    if (!this.isEmailServiceReady()) {
      console.log(
        "⚠️  Email service verification failed, but attempting to send anyway..."
      );
    }

    // Try SendGrid first if API key is available (Railway recommended)
    const sendGridKey =
      process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY_2;
    if (
      sendGridKey &&
      sendGridKey !== "your-sendgrid-api-key-here" &&
      sendGridKey.startsWith("SG.")
    ) {
      console.log("📧 Attempting to send via SendGrid (Railway-compatible)...");
      const sendGridResult = await this.sendViaSendGrid(emailData);
      if (sendGridResult.success) {
        console.log("✅ SendGrid email sent successfully (Railway-compatible)");
        return sendGridResult;
      }
      console.log("❌ SendGrid failed, falling back to SMTP...");
    } else {
      console.log(
        "⚠️  SendGrid not configured - Railway email may fail due to SMTP port blocking"
      );
      if (sendGridKey) {
        console.log("🔍 SendGrid key detected but invalid format");
      }
    }

    // Fallback to SMTP (may fail on Railway due to port blocking)
    console.log("📧 Sending via SMTP fallback (may timeout on Railway)...");
    return await this.sendViaSMTP(emailData);
  }

  /**
   * Send email using SMTP (fallback method)
   * @param {Object} emailData - Email data object
   * @returns {Promise<Object>} SMTP response
   */
  static async sendViaSMTP(emailData) {
    try {
      const mailOptions = {
        from:
          emailData.from ||
          '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      };

      // Try primary transporter first
      try {
        const info = await this.withTimeout(
          transporter.sendMail(mailOptions),
          60000
        );
        console.log("✅ SMTP email sent (primary):", info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (primaryError) {
        console.log("❌ Primary SMTP failed:", primaryError.message);
        console.log("📧 Trying fallback SMTP (port 465)...");

        try {
          const info = await this.withTimeout(
            fallbackTransporter.sendMail(mailOptions),
            60000
          );
          console.log("✅ SMTP email sent (fallback):", info.messageId);
          return { success: true, messageId: info.messageId };
        } catch (fallbackError) {
          console.log("❌ Fallback SMTP failed:", fallbackError.message);
          console.log("📧 Trying Railway-optimized SMTP...");

          try {
            const info = await this.withTimeout(
              railwayGmailTransporter.sendMail(mailOptions),
              60000
            );
            console.log(
              "✅ SMTP email sent (Railway-optimized):",
              info.messageId
            );
            return { success: true, messageId: info.messageId };
          } catch (railwayError) {
            console.log(
              "❌ Railway-optimized SMTP failed:",
              railwayError.message
            );
            console.log("📧 Trying alternative SMTP...");

            try {
              const info = await this.withTimeout(
                alternativeTransporter.sendMail(mailOptions),
                60000
              );
              console.log("✅ SMTP email sent (alternative):", info.messageId);
              return { success: true, messageId: info.messageId };
            } catch (alternativeError) {
              console.log(
                "❌ Alternative SMTP failed:",
                alternativeError.message
              );
              console.log("📧 Trying Railway alternative SMTP (port 2525)...");

              const info = await this.withTimeout(
                railwayAlternativeTransporter.sendMail(mailOptions),
                60000
              );
              console.log(
                "✅ SMTP email sent (Railway alternative):",
                info.messageId
              );
              return { success: true, messageId: info.messageId };
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ All SMTP methods failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Wrapper to add timeout to email operations
   * @param {Promise} emailPromise - The email promise
   * @param {number} timeoutMs - Timeout in milliseconds (default: 30000 for production)
   */
  static async withTimeout(emailPromise, timeoutMs = 30000) {
    return Promise.race([
      emailPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Email operation timed out")),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Send supplier welcome email with login credentials
   * Tries SendGrid first, falls back to Gmail SMTP
   */
  static async sendSupplierWelcomeEmail(
    to,
    supplierName,
    email,
    password = "supplier123",
    loginUrl = null
  ) {
    // Try SendGrid first
    if (SendGridService.isConfigured()) {
      console.log(
        "📧 [EMAIL SERVICE] Using SendGrid for supplier welcome email"
      );
      const sendGridResult = await SendGridService.sendSupplierWelcomeEmail(
        to,
        supplierName,
        email,
        password,
        loginUrl
      );

      if (sendGridResult.success) {
        return sendGridResult;
      } else {
        console.log(
          `⚠️ SendGrid failed, falling back to Gmail SMTP: ${sendGridResult.error}`
        );
      }
    } else {
      console.log(
        "📧 [EMAIL SERVICE] SendGrid not configured, using Gmail SMTP"
      );
    }

    // Fallback to Gmail SMTP
    try {
      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://www.countryside-steakhouse.site"
          : "http://localhost:8080");
      const defaultLoginUrl = `${frontendUrl}/supplier/login`;
      const loginLink = loginUrl || defaultLoginUrl;

      const mailOptions = {
        from: '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
        to: to,
        subject: "Welcome to Countryside Supplier Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Supplier Portal</h1>
            </div>
            <div style="background-color: #f8f9fa; padding: 24px; border-radius: 10px; margin-bottom: 16px;">
              <h3 style="color: #2c3e50; margin-top: 0;">Your Supplier Account</h3>
              <p style="color: #555; font-size: 15px; line-height: 1.6;">Hello ${supplierName},</p>
              <p style="color: #555; font-size: 15px; line-height: 1.6;">Your supplier account has been created. Here are your login details:</p>
              <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Default Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
              </div>
              <div style="text-align: center; margin-top: 16px;">
                <a href="${loginLink}" style="background-color: #466114; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Supplier Login</a>
              </div>
              <p style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 6px; font-size: 13px; margin-top: 16px;">
                <strong>Note:</strong> Please change your password after your first login.
              </p>
            </div>
          </div>
        `,
        text: `Hello ${supplierName},\n\nYour supplier account has been created.\n\nEmail: ${email}\nDefault Password: ${password}\n\nLogin: ${loginLink}\n\nPlease change your password after first login.`,
      };

      // Try primary then fallback
      let info;
      this.logEmailAttempt("Supplier Welcome Email", email);
      try {
        info = await this.withTimeout(transporter.sendMail(mailOptions), 25000);
      } catch (primaryError) {
        console.log(`❌ Primary transporter failed: ${primaryError.message}`);
        info = await this.withTimeout(
          fallbackTransporter.sendMail(mailOptions),
          25000
        );
      }
      console.log("✅ Supplier welcome email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending supplier welcome email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if we're in production environment
   */
  static isProduction() {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Log email attempt with environment context
   */
  static logEmailAttempt(operation, email, environment = null) {
    const env =
      environment || (this.isProduction() ? "PRODUCTION" : "DEVELOPMENT");
    console.log(
      `📧 [${env}] ${operation} - Attempting to send email to: ${email}`
    );
  }

  /**
   * Log successful email send with environment context
   */
  static logEmailSuccess(operation, email, info, environment = null) {
    const env =
      environment || (this.isProduction() ? "PRODUCTION" : "DEVELOPMENT");
    console.log(
      `✅ [${env}] ${operation} - Email sent successfully to: ${email}, MessageID: ${info.messageId}`
    );
  }

  /**
   * Send password recovery email
   * @param {string} to - Recipient email address
   * @param {string} resetToken - Password reset token
   * @param {string} username - User's username/name
   */
  static async sendPasswordRecoveryEmail(to, resetToken, username = "User") {
    // Try SendGrid first (recommended for production)
    if (SendGridService.isConfigured()) {
      console.log(
        "📧 [EMAIL SERVICE] Using SendGrid for password recovery email"
      );
      const sendGridResult = await SendGridService.sendPasswordRecoveryEmail(
        to,
        resetToken,
        username
      );

      if (sendGridResult.success) {
        return sendGridResult;
      } else {
        console.log(
          `⚠️ SendGrid failed, falling back to Gmail SMTP: ${sendGridResult.error}`
        );
      }
    } else {
      console.log(
        "📧 [EMAIL SERVICE] SendGrid not configured, using Gmail SMTP"
      );
    }

    // Fallback to Gmail SMTP
    console.log(
      "📧 [EMAIL SERVICE] Using Gmail SMTP fallback for password recovery email"
    );

    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        const delay = attempt * 2000; // 2s, 4s delays
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries} - Sending password recovery email to ${to}`
        );

        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${resetToken}`;

        const emailData = {
          to: to,
          subject: "Password Recovery - Countryside Steak House",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
                <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin-top: 0;">Password Recovery Request</h3>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Hello ${username},
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  We received a request to reset your password for your Countryside Steak House account. 
                  If you made this request, click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #e74c3c; color: white; padding: 15px 30px; 
                            text-decoration: none; border-radius: 5px; font-weight: bold; 
                            display: inline-block; font-size: 16px;">
                    Reset My Password
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #e74c3c; word-break: break-all;">${resetUrl}</a>
                </p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                            padding: 15px; border-radius: 5px; margin-top: 20px;">
                  <p style="color: #856404; margin: 0; font-size: 14px;">
                    <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
                    If you didn't request this password reset, please ignore this email.
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                <p>© 2024 Countryside Steak House. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          `,
          text: `
            Password Recovery - Countryside Steak House
            
            Hello ${username},
            
            We received a request to reset your password for your Countryside Steak House account.
            If you made this request, click the link below to reset your password:
            
            ${resetUrl}
            
            This link will expire in 1 hour for your security.
            If you didn't request this password reset, please ignore this email.
            
            © 2025 Countryside Steak House. All rights reserved.
          `,
        };

        // Use the SendGrid-first approach with SMTP fallback
        const result = await this.sendEmailWithFallback(emailData);

        if (result.success) {
          console.log(
            `✅ Password recovery email sent (attempt ${attempt}):`,
            result.messageId
          );
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Error sending password recovery email (attempt ${attempt}):`,
          error.message
        );

        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error("❌ All attempts failed for password recovery email");
    return { success: false, error: lastError.message };
  }

  /**
   * Send welcome email to new users
   * @param {string} to - Recipient email address
   * @param {string} username - User's username/name
   * @param {string} temporaryPassword - Temporary password (if applicable)
   */
  static async sendWelcomeEmail(to, username, temporaryPassword = null) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        const delay = attempt * 2000; // 2s, 4s delays
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries} - Sending welcome email to ${to}`
        );

        const emailData = {
          to: to,
          subject: "Welcome to Countryside Steak House System",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
                <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                <h3 style="color: #2c3e50; margin-top: 0;">Welcome to Our System!</h3>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Hello ${username},
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Welcome to the Countryside Steak House management system! 
                  Your account has been successfully created.
                </p>
                
                ${
                  temporaryPassword
                    ? `
                  <div style="background-color: #d4edda; border: 1px solid #c3e6cb; 
                              padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="color: #155724; margin: 0; font-weight: bold;">
                      Your temporary password: <code style="background: white; padding: 2px 5px; border-radius: 3px;">${temporaryPassword}</code>
                    </p>
                    <p style="color: #155724; margin: 5px 0 0 0; font-size: 14px;">
                      Please change this password after your first login.
                    </p>
                  </div>
                `
                    : ""
                }
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  You can now access the system and manage your restaurant operations efficiently.
                </p>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                <p>© 2024 Countryside Steak House. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `
            Welcome to Countryside Steak House System
            
            Hello ${username},
            
            Welcome to the Countryside Steak House management system! 
            Your account has been successfully created.
            
            ${temporaryPassword ? `Your temporary password: ${temporaryPassword}\nPlease change this password after your first login.\n\n` : ""}
            You can now access the system and manage your restaurant operations efficiently.
            
            © 2024 Countryside Steak House. All rights reserved.
          `,
        };

        // Use the SendGrid-first approach with SMTP fallback
        const result = await this.sendEmailWithFallback(emailData);

        if (result.success) {
          console.log(
            `✅ Welcome email sent (attempt ${attempt}):`,
            result.messageId
          );
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Error sending welcome email (attempt ${attempt}):`,
          error.message
        );

        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error("❌ All attempts failed for welcome email");
    return { success: false, error: lastError.message };
  }

  /**
   * Send employee welcome email with login credentials
   * @param {string} to - Recipient email address
   * @param {string} employeeName - Employee's full name
   * @param {string} email - Employee's email address
   * @param {string} password - Employee's temporary password
   * @param {string} loginUrl - Login URL for the system
   */
  static async sendEmployeeWelcomeEmail(
    to,
    employeeName,
    email,
    password,
    loginUrl = null
  ) {
    // Try SendGrid first (recommended for production)
    if (SendGridService.isConfigured()) {
      console.log(
        "📧 [EMAIL SERVICE] Using SendGrid for employee welcome email"
      );
      const sendGridResult = await SendGridService.sendEmployeeWelcomeEmail(
        to,
        employeeName,
        email,
        password,
        loginUrl
      );

      if (sendGridResult.success) {
        return sendGridResult;
      } else {
        console.log(
          `⚠️ SendGrid failed, falling back to Gmail SMTP: ${sendGridResult.error}`
        );
      }
    } else {
      console.log(
        "📧 [EMAIL SERVICE] SendGrid not configured, using Gmail SMTP"
      );
    }

    // Fallback to Gmail SMTP
    console.log(
      "📧 [EMAIL SERVICE] Using Gmail SMTP fallback for employee welcome email"
    );

    // Get the correct frontend URL based on environment
    const frontendUrl =
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://www.countryside-steakhouse.site"
        : "http://localhost:8080");
    const defaultLoginUrl = `${frontendUrl}/login`;
    const loginLink = loginUrl || defaultLoginUrl;

    const mailOptions = {
      from: '"COUNTRYSIDE-STEAKHOUSE" <mailcountrysidesteakhouse@gmail.com>',
      to: to,
      subject: "Welcome aboard to COUNTRYSIDE-STEAKHOUSE!",
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <!-- Main Email Container -->
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #466114;">
                <!-- Logo -->
                <div style="margin-bottom: 15px;">
                  <img src="${frontendUrl}/logo1.png" 
                       alt="Countryside Steakhouse Logo" 
                       style="max-height: 60px; width: auto; margin: 0 auto; display: block;" />
                </div>
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: bold;">Countryside Steakhouse</h1>
                <p style="color: #466114; margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">Ang Paborito ng Bayan</p>
              </div>
              
              <!-- Main Content -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; font-weight: bold;">Your Account Has Been Created</h2>
                
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #466114;">
                  <!-- Logo -->
                  <div style="margin-bottom: 15px;">
                    <img src="${process.env.FRONTEND_URL || "http://localhost:8080"}/logo1.png" 
                         alt="Countryside Steakhouse Logo" 
                         style="max-height: 60px; width: auto; margin: 0 auto; display: block;" />
                  </div>
                  <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: bold;">Countryside Steakhouse</h1>
                  <p style="color: #466114; margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">Ang Paborito ng Bayan</p>
                </div>
                
                <!-- Main Content -->
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; font-weight: bold;">Your Account Has Been Created</h2>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Hi ${employeeName},
                  </p>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    Your account for the Countryside Steakhouse ERP System has been successfully created.
                  </p>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px; font-weight: 500;">
                    Here are your login credentials:
                  </p>
                  
                  <!-- Credentials Box -->
                  <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <div style="margin-bottom: 15px;">
                      <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Email:</strong>
                      <a href="mailto:${email}" style="color: #007bff; text-decoration: none; font-weight: 500; font-size: 16px;">${email}</a>
                    </div>
                    <div>
                      <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Password:</strong>
                      <span style="color: #2c3e50; font-weight: bold; font-size: 16px; background-color: #e9ecef; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${password}</span>
                    </div>
                  </div>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    You can log in at the following link:
                  </p>
                  
                  <!-- Login Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${loginLink}" 
                       style="background-color: #466114; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold; 
                              display: inline-block; font-size: 16px; box-shadow: 0 2px 5px rgba(70,97,20,0.3);
                              transition: background-color 0.3s ease;"
                       onmouseover="this.style.backgroundColor='#3a5211'"
                       onmouseout="this.style.backgroundColor='#466114'">
                      Login Now
                    </a>
                  </div>
                  
                  <!-- Security Note -->
                  <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                              padding: 15px; border-radius: 5px; margin-top: 25px;">
                    <p style="color: #856404; margin: 0; font-size: 14px; font-weight: 500;">
                      <strong>Important:</strong> For your security, please change your password after logging in for the first time.
                    </p>
                  </div>
                  
                  <!-- Welcome Message -->
                  <div style="background-color: rgba(170,211,109,0.1); border-left: 4px solid #466114; 
                              padding: 20px; border-radius: 5px; margin-top: 25px;">
                    <h4 style="color: #466114; margin-top: 0; margin-bottom: 15px; font-size: 18px; font-weight: bold;">Welcome to Our Team!</h4>
                    <p style="color: #2c3e50; margin: 0; font-size: 15px; line-height: 1.6;">
                      We're excited to have you join the COUNTRYSIDE-STEAKHOUSE family! As a valued team member, 
                      you now have access to our comprehensive ERP system that will help you manage your daily tasks 
                      efficiently. We look forward to working with you and contributing to our shared success.
                    </p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                  <p style="margin: 0;">©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.</p>
                  <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply to this email.</p>
                </div>
              </div>
            </div>
          `,
      text: `
            Welcome aboard to Countryside Steakhouse!
            
            Your Account Has Been Created!
            
            Hi ${employeeName},
            
            Your account for the Countryside Steakhouse ERP System has been successfully created.
            
            Here are your login credentials:
            
            Email: ${email}
            Password: ${password}
            
            You can log in at: ${loginLink}
            
            Important: For your security, please change your password after logging in for the first time.
            
            Welcome to Our Team!
            We're excited to have you join the Countryside-Steakhouse family! As a valued team member, 
            you now have access to our comprehensive ERP system that will help you manage your daily tasks 
            efficiently. We look forward to working with you and contributing to our shared success.
            
            ©2025 Countryside-Steakhouse. All rights reserved.
          `,
    };

    // Try primary transporter first, then fallback
    let info;
    this.logEmailAttempt("Employee Welcome Email", email);

    try {
      info = await this.withTimeout(
        transporter.sendMail(mailOptions),
        25000 // Reduced timeout for Railway
      );
    } catch (primaryError) {
      console.log(`❌ Primary transporter failed: ${primaryError.message}`);
      if (this.isProduction()) {
        console.log(
          `🌐 [PRODUCTION] SMTP connection may be blocked by Railway`
        );
      }
      console.log(`📧 Trying fallback transporter for employee welcome email`);
      try {
        info = await this.withTimeout(
          fallbackTransporter.sendMail(mailOptions),
          25000 // Reduced timeout for Railway
        );
      } catch (fallbackError) {
        console.error(
          `❌ Both transporters failed in ${this.isProduction() ? "PRODUCTION" : "DEVELOPMENT"}`
        );
        console.error(`Primary error: ${primaryError.message}`);
        console.error(`Fallback error: ${fallbackError.message}`);

        // In production, if both fail, we should still return success for employee creation
        if (this.isProduction()) {
          console.log(
            `⚠️ [PRODUCTION] Email sending failed but continuing with employee creation`
          );
          return {
            success: false,
            error: `Email sending failed in production: ${fallbackError.message}`,
            productionWarning: true,
          };
        }
        throw fallbackError;
      }
    }

    // If we reach here, email was sent successfully
    this.logEmailSuccess("Employee Welcome Email", email, info);
    return { success: true, messageId: info.messageId };
  }

  /**
   * Send payroll notification email to employee
   * @param {string} to - Employee email address
   * @param {string} employeeName - Employee's full name
   * @param {Object} payrollData - Payroll details
   * @param {string} payrollData.period_name - Payroll period name
   * @param {Date} payrollData.date_from - Period start date
   * @param {Date} payrollData.date_to - Period end date
   * @param {number} payrollData.gross_salary - Gross salary amount
   * @param {Object} payrollData.deductions - Deductions breakdown
   * @param {number} payrollData.net_salary - Net salary amount
   * @param {Date} payrollData.payment_date - Payment date
   */
  static async sendPayrollNotification(to, employeeName, payrollData) {
    try {
      // Use SendGrid for payroll notifications (tested and reliable)
      const SendGridService = require("./sendGridService");
      const result = await SendGridService.sendPayrollNotification(
        to,
        employeeName,
        payrollData
      );

      if (result.success) {
        console.log(
          `✅ Payroll notification sent successfully via ${result.provider}:`,
          result.messageId
        );
        return result;
      }

      // If SendGrid fails or is not configured, log and return failure
      console.error(`❌ Failed to send payroll notification:`, result.error);
      return result;
    } catch (error) {
      console.error("❌ Error in sendPayrollNotification:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * DEPRECATED: Old SMTP-based payroll notification (kept for reference)
   * Use sendPayrollNotification() which uses SendGrid instead
   */
  static async sendPayrollNotificationSMTP(to, employeeName, payrollData) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || "mailcountrysidesteakhouse@gmail.com",
        to,
        subject: `Payroll Statement - ${payrollData.period_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Countryside Steak House</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0;">Payroll Statement</p>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">Dear ${employeeName},</p>
              
              <p style="color: #6b7280; line-height: 1.6;">
                Your payroll for the period <strong>${payrollData.period_name}</strong> has been processed and released.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #667eea;">
                <h2 style="color: #667eea; margin-top: 0; font-size: 18px;">Payroll Summary</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Period Covered:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">
                      ${new Date(payrollData.date_from).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} - 
                      ${new Date(payrollData.date_to).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </td>
                  </tr>
                  <tr style="border-top: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; color: #6b7280;">Gross Salary:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">
                      ₱${Number(payrollData.gross_salary).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </table>
                
                <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <h3 style="color: #dc2626; font-size: 14px; margin-bottom: 10px;">Deductions:</h3>
                  <table style="width: 100%; font-size: 14px;">
                    <tr>
                      <td style="padding: 4px 0; color: #6b7280;">SSS:</td>
                      <td style="padding: 4px 0; text-align: right;">
                        ₱${Number(payrollData.deductions.sss || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6b7280;">PhilHealth:</td>
                      <td style="padding: 4px 0; text-align: right;">
                        ₱${Number(payrollData.deductions.philhealth || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6b7280;">Pag-IBIG:</td>
                      <td style="padding: 4px 0; text-align: right;">
                        ₱${Number(payrollData.deductions.pagibig || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e7eb; font-weight: 600;">
                      <td style="padding: 8px 0 4px 0; color: #dc2626;">Total Deductions:</td>
                      <td style="padding: 8px 0 4px 0; text-align: right; color: #dc2626;">
                        ₱${Number(payrollData.deductions.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 6px; margin-top: 15px;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="color: white; font-size: 18px; font-weight: 600;">Net Salary:</td>
                      <td style="color: white; font-size: 24px; font-weight: 700; text-align: right;">
                        ₱${Number(payrollData.net_salary).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 15px; margin-bottom: 0;">
                  <strong>Payment Date:</strong> ${new Date(payrollData.payment_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Your net salary has been disbursed. Please contact the HR department if you have any questions about your payroll.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Thank you for your hard work and dedication!<br>
                <strong>Countryside Steak House HR Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
              <p>© 2025 Countryside Steak House. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Payroll notification sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending payroll notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send feedback reply email to customer
   * Tries SendGrid first, falls back to Gmail SMTP
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {string} originalMessage - Original feedback message
   * @param {string} replyMessage - Reply message from restaurant
   * @param {number} rating - Customer's rating (if any)
   * @param {string} orderNumber - Order number (optional)
   */
  static async sendFeedbackReplyEmail(
    customerEmail,
    customerName,
    originalMessage,
    replyMessage,
    rating = null,
    orderNumber = null
  ) {
    // Try SendGrid first (recommended for production)
    if (SendGridService.isConfigured()) {
      console.log("📧 [EMAIL SERVICE] Using SendGrid for feedback reply email");
      const sendGridResult = await SendGridService.sendFeedbackReplyEmail(
        customerEmail,
        customerName,
        originalMessage,
        replyMessage,
        rating,
        orderNumber
      );

      if (sendGridResult.success) {
        return sendGridResult;
      } else {
        console.log(
          `⚠️ SendGrid failed, falling back to Gmail SMTP: ${sendGridResult.error}`
        );
      }
    } else {
      console.log(
        "📧 [EMAIL SERVICE] SendGrid not configured, using Gmail SMTP"
      );
    }

    // Fallback to Gmail SMTP
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        const delay = attempt * 2000; // 2s, 4s, 6s delays
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries} - Sending feedback reply to ${customerEmail} via Gmail SMTP`
        );

        const ratingText = rating ? `${rating}/5 stars` : "No rating provided";

        const emailData = {
          to: customerEmail,
          subject: "Thank you for your feedback - Countryside Steak House",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
              <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
              <h3 style="color: #2c3e50; margin-top: 0;">Thank You for Your Feedback!</h3>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Dear ${customerName},
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Thank you for taking the time to share your experience with us. We truly appreciate your feedback and value your input.
              </p>
              
              <!-- Original Feedback Section -->
              <div style="background-color: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h4 style="color: #2c3e50; margin-top: 0; margin-bottom: 10px;">Your Feedback:</h4>
                ${orderNumber ? `<p style="color: #666; font-size: 14px; margin: 0 0 10px 0;"><strong>Order Number:</strong> ${orderNumber}</p>` : ""}
                <p style="color: #555; font-style: italic; margin: 0;">"${originalMessage}"</p>
                ${rating ? `<p style="color: #f39c12; margin: 10px 0 0 0; font-weight: bold;">Rating: ${ratingText}</p>` : ""}
              </div>
              
              <!-- Reply Section -->
              <div style="background-color: #e8f5e8; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h4 style="color: #2c3e50; margin-top: 0; margin-bottom: 10px;">Our Response:</h4>
                <p style="color: #555; margin: 0;">${replyMessage}</p>
              </div>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                We are committed to providing the best dining experience for all our customers. Your feedback helps us improve our service and maintain our high standards.
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                We look forward to serving you again soon and hope to exceed your expectations on your next visit.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #e74c3c; font-weight: bold; font-size: 18px; margin: 0;">
                  Maraming Salamat!<br>
                  <span style="font-size: 14px; font-weight: normal; color: #555;">Thank you for choosing Countryside Steak House</span>
                </p>
              </div>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Contact Us:</strong> If you have any further questions or concerns, please don't hesitate to reach out to us. We're here to help!
              </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              <p>© 2024 Countryside Steak House. All rights reserved.</p>
              <p>This email was sent in response to your feedback. Please do not reply to this automated message.</p>
            </div>
          </div>
        `,
          text: `
          Thank You for Your Feedback - Countryside Steak House
          
          Dear ${customerName},
          
          Thank you for taking the time to share your experience with us. We truly appreciate your feedback and value your input.
          
          Your Feedback:
          ${orderNumber ? `Order Number: ${orderNumber}` : ""}
          "${originalMessage}"
          ${rating ? `Rating: ${ratingText}` : ""}
          
          Our Response:
          ${replyMessage}
          
          We are committed to providing the best dining experience for all our customers. Your feedback helps us improve our service and maintain our high standards.
          
          We look forward to serving you again soon and hope to exceed your expectations on your next visit.
          
          Maraming Salamat!
          Thank you for choosing Countryside Steak House
          
          Contact Us: If you have any further questions or concerns, please don't hesitate to reach out to us. We're here to help!
          
          © 2024 Countryside Steak House. All rights reserved.
          This email was sent in response to your feedback. Please do not reply to this automated message.
        `,
        };

        // Use the new SendGrid-first approach with SMTP fallback
        const result = await this.sendEmailWithFallback(emailData);

        if (result.success) {
          console.log(
            `✅ Feedback reply email sent (attempt ${attempt}):`,
            result.messageId
          );
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Error sending feedback reply email (attempt ${attempt}):`,
          error.message
        );

        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error("❌ All attempts failed for feedback reply email");
    return { success: false, error: lastError.message };
  }

  /**
   * Send OTP code for password recovery
   * @param {string} to - Recipient email address
   * @param {string} otpCode - 6-digit OTP code
   * @param {string} username - User's username/name
   */
  static async sendOTPEmail(to, otpCode, username = "User") {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        const delay = attempt * 2000; // 2s, 4s delays
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries} - Sending OTP email to ${to}`
        );

        const emailData = {
          to: to,
          subject: "Password Recovery OTP - Countryside Steak House",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
                <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin-top: 0;">Password Recovery OTP</h3>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Hello ${username},
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  We received a request to reset your password for your Countryside Steak House account. 
                  Use the following One-Time Password (OTP) to verify your identity:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background-color: #e74c3c; color: white; padding: 20px; 
                              border-radius: 10px; display: inline-block; font-size: 32px; 
                              font-weight: bold; letter-spacing: 5px; font-family: monospace;">
                    ${otpCode}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5; text-align: center;">
                  This OTP will expire in 10 minutes for your security.
                </p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                            padding: 15px; border-radius: 5px; margin-top: 20px;">
                  <p style="color: #856404; margin: 0; font-size: 14px;">
                    <strong>Security Note:</strong> This OTP is valid for 10 minutes only. 
                    If you didn't request this password reset, please ignore this email and 
                    contact our support team immediately.
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                <p>© 2025 Countryside Steak House. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          `,
          text: `
            Password Recovery OTP - Countryside Steak House
            
            Hello ${username},
            
            We received a request to reset your password for your Countryside Steak House account.
            Use the following One-Time Password (OTP) to verify your identity:
            
            OTP Code: ${otpCode}
            
            This OTP will expire in 10 minutes for your security.
            
            If you didn't request this password reset, please ignore this email and contact our support team immediately.
            
            © 2025 Countryside Steak House. All rights reserved.
          `,
        };

        // Use the SendGrid-first approach with SMTP fallback
        const result = await this.sendEmailWithFallback(emailData);

        if (result.success) {
          console.log(
            `✅ OTP email sent (attempt ${attempt}):`,
            result.messageId
          );
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Error sending OTP email (attempt ${attempt}):`,
          error.message
        );

        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error("❌ All attempts failed for OTP email");
    return { success: false, error: lastError.message };
  }

  /**
   * Send notification email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   */
  static async sendNotificationEmail(to, subject, message) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        const delay = attempt * 2000; // 2s, 4s delays
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries} - Sending notification email to ${to}`
        );

        const emailData = {
          to: to,
          subject: `Countryside Steak House - ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
                <h2 style="color: #e74c3c; margin: 0; ">Ang Paborito ng Bayan</h2>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                <h3 style="color: #2c3e50; margin-top: 0;">${subject}</h3>
                <div style="color: #555; font-size: 16px; line-height: 1.6;">
                  ${message}
                </div>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                <p>© 2024 Countryside Steak House. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `${subject}\n\n${message}\n\n© 2024 Countryside Steak House. All rights reserved.`,
        };

        // Use the SendGrid-first approach with SMTP fallback
        const result = await this.sendEmailWithFallback(emailData);

        if (result.success) {
          console.log(
            `✅ Notification email sent (attempt ${attempt}):`,
            result.messageId
          );
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Error sending notification email (attempt ${attempt}):`,
          error.message
        );

        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error("❌ All attempts failed for notification email");
    return { success: false, error: lastError.message };
  }
}

module.exports = EmailService;
