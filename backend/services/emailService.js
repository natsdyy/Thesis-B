const nodemailer = require("nodemailer");
require("dotenv").config();

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('📧 SendGrid initialized for Railway deployment');
}

// Email configuration from environment variables
const EMAIL_CONFIG = {
  user: process.env.SMTP_USER || 'mailcountrysidesteakhouse@gmail.com',
  pass: process.env.SMTP_PASS || 'hgne ityd ejzn dgnv',
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || false
};

// Check if we're in Railway environment
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production';

// Create multiple transporter configurations for fallback
const createTransporter = (config) => {
  return nodemailer.createTransport({
    ...config,
    auth: {
<<<<<<< HEAD
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass
    },
    // Optimized timeout settings for better reliability
    connectionTimeout: 60000,  // 60 seconds - increased for better connectivity
    greetingTimeout: 30000,    // 30 seconds - increased
    socketTimeout: 60000,      // 60 seconds - increased
    pool: false, // Disable connection pooling for Railway compatibility
    tls: {
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'SSLv3'
    },
    debug: false, // Disable debug for production
    logger: false,
    // Additional reliability settings
    requireTLS: true,
    ignoreTLS: false,
    // Add more robust connection settings
    maxConnections: 1,
    maxMessages: 1,
    rateDelta: 1000,
    rateLimit: 1
=======
      user: "mailcountrysidesteakhouse@gmail.com",
      pass: "sclg quvi fuyh dcfa", // Gmail App Password
    },
    // Production-optimized timeout settings
    connectionTimeout: 120000, // 2 minutes
    greetingTimeout: 60000, // 1 minute
    socketTimeout: 120000, // 2 minutes
    pool: false, // Disable connection pooling for Railway compatibility
    tls: {
      rejectUnauthorized: false,
      secureProtocol: "TLSv1_2_method",
    },
    debug: false, // Reduced logging for production
    logger: false,
>>>>>>> origin
  });
};

// Primary transporter (Port 587 - STARTTLS) - Better for cloud hosting
const transporter = createTransporter({
<<<<<<< HEAD
  host: EMAIL_CONFIG.host,
  port: EMAIL_CONFIG.port,
  secure: EMAIL_CONFIG.secure
=======
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
>>>>>>> origin
});

// Fallback transporter (Port 465 - SSL)
const fallbackTransporter = createTransporter({
<<<<<<< HEAD
  host: EMAIL_CONFIG.host,
=======
  host: "smtp.gmail.com",
>>>>>>> origin
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
    secureProtocol: 'TLSv1_method',
    ciphers: 'ALL'
  },
  connectionTimeout: 120000,  // 2 minutes
  greetingTimeout: 60000,     // 1 minute
  socketTimeout: 120000       // 2 minutes
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
      pass: process.env.RAILWAY_SMTP_PASS || EMAIL_CONFIG.pass
    }
  });
}

// Verify transporter configuration with retry
let verificationAttempts = 0;
const maxVerificationAttempts = 3;

const verifyTransporter = () => {
  verificationAttempts++;
<<<<<<< HEAD
  console.log(`📧 Verifying email service (attempt ${verificationAttempts}/${maxVerificationAttempts})`);
  
  // Try primary transporter first (Port 587 - STARTTLS)
  transporter.verify((primaryError, primarySuccess) => {
    if (!primaryError) {
      console.log('✅ Primary email service (port 587 STARTTLS) ready to send messages');
=======
  console.log(
    `📧 Verifying email service (attempt ${verificationAttempts}/${maxVerificationAttempts})`
  );

  // Try primary transporter first
  transporter.verify((primaryError, primarySuccess) => {
    if (!primaryError) {
      console.log("✅ Primary email service (port 587) ready to send messages");
>>>>>>> origin
      return;
    }

    console.log(`❌ Primary transporter failed: ${primaryError.message}`);
<<<<<<< HEAD
    console.log(`📧 Trying fallback transporter (port 465 SSL)...`);
    
    // Try fallback transporter (Port 465 - SSL)
    fallbackTransporter.verify((fallbackError, fallbackSuccess) => {
      if (!fallbackError) {
        console.log('✅ Fallback email service (port 465 SSL) ready to send messages');
        return;
      }
      
      console.log(`❌ Fallback transporter failed: ${fallbackError.message}`);
      console.log(`📧 Trying alternative transporter...`);
      
      // Try alternative transporter
      alternativeTransporter.verify((altError, altSuccess) => {
        if (!altError) {
          console.log('✅ Alternative email service ready to send messages');
          return;
        }
        
        console.error(`❌ All transporters failed on attempt ${verificationAttempts}`);
        console.error(`Primary: ${primaryError.message}`);
        console.error(`Fallback: ${fallbackError.message}`);
        console.error(`Alternative: ${altError.message}`);
        
        if (verificationAttempts < maxVerificationAttempts) {
          console.log(`⏳ Retrying email service verification in 10 seconds...`);
          setTimeout(verifyTransporter, 10000);
        } else {
          console.error('❌ Email service verification failed after all attempts');
          console.error('⚠️  Email functionality may be limited');
          console.error('💡 Troubleshooting tips:');
          console.error('   1. Check your internet connection');
          console.error('   2. Verify Gmail app password is correct');
          console.error('   3. Ensure 2FA is enabled on Gmail account');
          console.error('   4. Check if Gmail is blocking the connection from your server IP');
        }
      });
=======
    console.log(`📧 Trying fallback transporter (port 465)...`);

    // Try fallback transporter
    fallbackTransporter.verify((fallbackError, fallbackSuccess) => {
      if (!fallbackError) {
        console.log(
          "✅ Fallback email service (port 465) ready to send messages"
        );
        return;
      }

      console.error(
        `❌ Both transporters failed on attempt ${verificationAttempts}`
      );
      console.error(`Primary: ${primaryError.message}`);
      console.error(`Fallback: ${fallbackError.message}`);

      if (verificationAttempts < maxVerificationAttempts) {
        console.log(`⏳ Retrying email service verification in 10 seconds...`);
        setTimeout(verifyTransporter, 10000);
      } else {
        console.error(
          "❌ Email service verification failed after all attempts"
        );
        console.error("⚠️  Email functionality may be limited");
      }
>>>>>>> origin
    });
  });
};

// Start verification
verifyTransporter();

class EmailService {
  /**
   * Wrapper to add timeout to email operations
   * @param {Promise} emailPromise - The email promise
   * @param {number} timeoutMs - Timeout in milliseconds (default: 90000)
   */
<<<<<<< HEAD
  static async withTimeout(emailPromise, timeoutMs = 90000) {
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Email operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Clear timeout if promise resolves first
      emailPromise.finally(() => clearTimeout(timeoutId));
    });

    return Promise.race([emailPromise, timeoutPromise]);
  }

  /**
   * Send email using SendGrid (Railway-compatible)
   * @param {Object} mailOptions - Email options
   * @returns {Promise<Object>} Result object
   */
  static async sendWithSendGrid(mailOptions) {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const msg = {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html
    };

    try {
      console.log('📧 Sending email via SendGrid...');
      const response = await sgMail.send(msg);
      console.log('✅ SendGrid email sent successfully');
      return { 
        success: true, 
        messageId: response[0].headers['x-message-id'] || 'sendgrid-success',
        provider: 'sendgrid'
      };
    } catch (error) {
      console.error('❌ SendGrid error:', error.message);
      throw error;
    }
=======
  static async withTimeout(emailPromise, timeoutMs = 150000) {
    return Promise.race([
      emailPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Email operation timed out")),
          timeoutMs
        )
      ),
    ]);
>>>>>>> origin
  }

  /**
   * Send password recovery email
   * @param {string} to - Recipient email address
   * @param {string} resetToken - Password reset token
   * @param {string} username - User's username/name
   */
  static async sendPasswordRecoveryEmail(to, resetToken, username = "User") {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
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

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password recovery email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending password recovery email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new users
   * @param {string} to - Recipient email address
   * @param {string} username - User's username/name
   * @param {string} temporaryPassword - Temporary password (if applicable)
   */
  static async sendWelcomeEmail(to, username, temporaryPassword = null) {
    try {
      const mailOptions = {
        from: '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
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
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Welcome email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending welcome email:", error);
      return { success: false, error: error.message };
    }
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
    try {
      const defaultLoginUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/login`;
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
      try {
        console.log(`📧 Sending employee welcome email to ${email}`);
        info = await this.withTimeout(
          transporter.sendMail(mailOptions),
          120000
        );
      } catch (primaryError) {
        console.log(`❌ Primary transporter failed: ${primaryError.message}`);
        console.log(
          `📧 Trying fallback transporter for employee welcome email`
        );
        info = await this.withTimeout(
          fallbackTransporter.sendMail(mailOptions),
          120000
        );
      }

      console.log("✅ Employee welcome email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending employee welcome email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send feedback reply email to customer
   * @param {string} customerEmail - Customer's email address
   * @param {string} customerName - Customer's name
   * @param {string} originalMessage - Original feedback message
   * @param {string} replyMessage - Reply message from restaurant
   * @param {number} rating - Customer's rating (if any)
   */
<<<<<<< HEAD
  static async sendFeedbackReplyEmail(customerEmail, customerName, originalMessage, replyMessage, rating = null) {
    const maxRetries = 3;
=======
  static async sendFeedbackReplyEmail(
    customerEmail,
    customerName,
    originalMessage,
    replyMessage,
    rating = null
  ) {
    const maxRetries = 2;
>>>>>>> origin
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add delay between attempts (except for first attempt)
      if (attempt > 1) {
        const delay = attempt * 2000; // 2s, 4s, 6s delays
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries} - Sending feedback reply to ${customerEmail}`
        );

        const ratingText = rating ? `${rating}/5 stars` : "No rating provided";

        const mailOptions = {
          from: '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
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

        // Try different email methods based on environment
        let info;
<<<<<<< HEAD
        let lastTransporterError;
        
        // For Railway deployment, try SendGrid first if available
        if (isRailway && process.env.SENDGRID_API_KEY) {
          try {
            console.log(`📧 Using SendGrid for Railway deployment`);
            info = await this.sendWithSendGrid(mailOptions);
          } catch (sendGridError) {
            console.log(`❌ SendGrid failed: ${sendGridError.message}`);
            lastTransporterError = sendGridError;
            // Continue to SMTP fallbacks
          }
        }
        
        // If SendGrid failed or not available, try SMTP transporters
        if (!info) {
          try {
            console.log(`📧 Using primary transporter (port ${EMAIL_CONFIG.port} ${EMAIL_CONFIG.secure ? 'SSL' : 'STARTTLS'})`);
            info = await this.withTimeout(transporter.sendMail(mailOptions), 90000);
          } catch (primaryError) {
            console.log(`❌ Primary transporter failed: ${primaryError.message}`);
            lastTransporterError = primaryError;
            
            // Try Railway-specific transporter if configured
            if (railwayTransporter) {
              try {
                console.log(`📧 Trying Railway-specific transporter`);
                info = await this.withTimeout(railwayTransporter.sendMail(mailOptions), 90000);
              } catch (railwayError) {
                console.log(`❌ Railway transporter failed: ${railwayError.message}`);
                lastTransporterError = railwayError;
              }
            }
            
            if (!info) {
              try {
                console.log(`📧 Trying fallback transporter (port 465 SSL)`);
                info = await this.withTimeout(fallbackTransporter.sendMail(mailOptions), 90000);
              } catch (fallbackError) {
                console.log(`❌ Fallback transporter failed: ${fallbackError.message}`);
                lastTransporterError = fallbackError;
                
                try {
                  console.log(`📧 Trying alternative transporter (extended timeout)`);
                  info = await this.withTimeout(alternativeTransporter.sendMail(mailOptions), 120000);
                } catch (altError) {
                  console.log(`❌ Alternative transporter failed: ${altError.message}`);
                  throw altError; // Throw the last error to trigger retry
                }
              }
            }
          }
=======
        try {
          console.log(`📧 Using primary transporter (port 587)`);
          info = await this.withTimeout(
            transporter.sendMail(mailOptions),
            120000
          );
        } catch (primaryError) {
          console.log(`❌ Primary transporter failed: ${primaryError.message}`);
          console.log(`📧 Trying fallback transporter (port 465)`);
          info = await this.withTimeout(
            fallbackTransporter.sendMail(mailOptions),
            120000
          );
>>>>>>> origin
        }
        console.log(
          `✅ Feedback reply email sent (attempt ${attempt}):`,
          info.messageId
        );
        return { success: true, messageId: info.messageId };
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
   * Send notification email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   */
  static async sendNotificationEmail(to, subject, message) {
    try {
      const mailOptions = {
        from: '"Countryside Steak House" <mailcountrysidesteakhouse@gmail.com>',
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

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Notification email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending notification email:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
