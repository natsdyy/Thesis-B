const sgMail = require("@sendgrid/mail");
require("dotenv").config();

// Initialize SendGrid
sgMail.setApiKey(
  process.env.SENDGRID_API_KEY_2 ||
    process.env.SENDGRID_API_KEY ||
    "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"
);

class SendGridService {
  /**
   * Check if SendGrid is properly configured
   */
  static isConfigured() {
    const apiKey =
      process.env.SENDGRID_API_KEY_2 || process.env.SENDGRID_API_KEY;
    const isConfigured =
      apiKey && apiKey !== "your-sendgrid-api-key-here" && apiKey.length > 20;

    // Debug logging
    // console.log(`🔍 [SENDGRID DEBUG] Checking configuration:`);
    // console.log(
    //   `🔍 [SENDGRID DEBUG] SENDGRID_API_KEY_2: ${process.env.SENDGRID_API_KEY_2 ? "EXISTS" : "NOT_FOUND"}`
    // );
    // console.log(
    //   `🔍 [SENDGRID DEBUG] SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? "EXISTS" : "NOT_FOUND"}`
    // );
    // console.log(
    //   `🔍 [SENDGRID DEBUG] API Key length: ${apiKey ? apiKey.length : 0}`
    // );
    // console.log(`🔍 [SENDGRID DEBUG] Is configured: ${isConfigured}`);

    return isConfigured;
  }

  /**
   * Send supplier welcome email using SendGrid
   * @param {string} to - Recipient email address
   * @param {string} supplierName - Supplier or contact person's name
   * @param {string} email - Supplier login email address
   * @param {string} password - Default/temporary password
   * @param {string} loginUrl - Optional custom supplier portal login URL
   */
  static async sendSupplierWelcomeEmail(
    to,
    supplierName,
    email,
    password = "supplier123",
    loginUrl = null
  ) {
    try {
      if (!this.isConfigured()) {
        console.log("⚠️ SendGrid not configured, skipping email");
        return {
          success: false,
          error: "SendGrid API key not configured",
          skipEmail: true,
        };
      }

      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://www.countryside-steakhouse.site"
          : "http://localhost:8080");
      const defaultLoginUrl = `${frontendUrl}/supplier/login`;
      const loginLink = loginUrl || defaultLoginUrl;

      const msg = {
        to: to,
        from: {
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
        subject: "Welcome to Countryside Supplier Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #466114;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold;">Countryside Steakhouse</h1>
                <p style="color: #466114; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Supplier Portal</p>
              </div>
              <div style="margin-bottom: 24px;">
                <h2 style="color: #2c3e50; margin: 0 0 12px 0; font-size: 20px; font-weight: bold;">Your Supplier Account Has Been Created</h2>
                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hi ${supplierName},</p>
                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Welcome to the Countryside Supplier Portal. Use the credentials below to sign in and manage your purchase orders and products.</p>
                <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                  <div style="margin-bottom: 10px;">
                    <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Email:</strong>
                    <a href="mailto:${email}" style="color: #007bff; text-decoration: none; font-weight: 500; font-size: 15px;">${email}</a>
                  </div>
                  <div>
                    <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Default Password:</strong>
                    <span style="color: #2c3e50; font-weight: bold; font-size: 15px; background-color: #e9ecef; padding: 4px 10px; border-radius: 4px; font-family: monospace;">${password}</span>
                  </div>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${loginLink}" style="background-color: #466114; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 2px 5px rgba(70,97,20,0.3);">Go to Supplier Login</a>
                </div>
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 5px;">
                  <p style="color: #856404; margin: 0; font-size: 13px;"><strong>Important:</strong> Please change your password after your first login.</p>
                </div>
              </div>
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0;">©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.</p>
                <p style="margin: 4px 0 0 0;">This is an automated message, please do not reply.</p>
              </div>
            </div>
          </div>
        `,
        text: `
          Welcome to the Countryside Supplier Portal!
          
          Hi ${supplierName},
          Your supplier account has been created.
          
          Email: ${email}
          Default Password: ${password}
          
          Login here: ${loginLink}
          
          Please change your password after first login.
        `,
      };

      console.log(`📧 [SENDGRID] Sending supplier welcome email to ${email}`);
      const response = await sgMail.send(msg);
      console.log(
        "✅ SendGrid supplier email sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid supplier welcome error:", error);
      if (error.response) {
        console.error("SendGrid API Error:", error.response.body);
        return {
          success: false,
          error: `SendGrid API Error: ${error.response.body.errors?.[0]?.message || error.message}`,
          provider: "SendGrid",
        };
      }
      return { success: false, error: error.message, provider: "SendGrid" };
    }
  }

  /**
   * Send employee welcome email using SendGrid
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
      if (!this.isConfigured()) {
        console.log("⚠️ SendGrid not configured, skipping email");
        return {
          success: false,
          error: "SendGrid API key not configured",
          skipEmail: true,
        };
      }

      // Get the correct frontend URL based on environment
      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://www.countryside-steakhouse.site"
          : "http://localhost:8080");
      const defaultLoginUrl = `${frontendUrl}/login`;
      const loginLink = loginUrl || defaultLoginUrl;

      const msg = {
        to: to,
        from: {
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
        subject: "Welcome aboard to COUNTRYSIDE-STEAKHOUSE!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <!-- Main Email Container -->
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              
               <!-- Header -->
               <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #466114;">
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
                    <strong style="color: #2c3e50; display: block; margin-bottom: 5px;">Default Password:</strong>
                    <span style="color: #2c3e50; font-weight: bold; font-size: 16px; background-color: #e9ecef; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${password}</span>
                  </div>
                </div>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  You can log in at the following link:
                </p>
                
                <!-- Login Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginLink}" 
                     style="background-color: #466114; color: white; padding: 8px 16px; 
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

      console.log(`📧 [SENDGRID] Sending employee welcome email to ${email}`);
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid email sent successfully:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid email error:", error);

      // Handle SendGrid specific errors
      if (error.response) {
        console.error("SendGrid API Error:", error.response.body);
        return {
          success: false,
          error: `SendGrid API Error: ${error.response.body.errors?.[0]?.message || error.message}`,
          provider: "SendGrid",
        };
      }

      return {
        success: false,
        error: error.message,
        provider: "SendGrid",
      };
    }
  }

  /**
   * Send password recovery email using SendGrid
   */
  static async sendPasswordRecoveryEmail(to, resetToken, username = "User") {
    try {
      if (!this.isConfigured()) {
        console.log("⚠️ SendGrid not configured, skipping email");
        return {
          success: false,
          error: "SendGrid API key not configured",
          skipEmail: true,
        };
      }

      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://www.countryside-steakhouse.site"
          : "http://localhost:8080");
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      const msg = {
        to: to,
        from: {
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
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
      };

      console.log(`📧 [SENDGRID] Sending password recovery email to ${to}`);
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid password recovery email sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid password recovery error:", error);
      return {
        success: false,
        error: error.message,
        provider: "SendGrid",
      };
    }
  }
}

module.exports = SendGridService;
