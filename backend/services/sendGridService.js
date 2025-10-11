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
          email: "noreply@countryside-steakhouse.site",
          name: "Countryside Steakhouse",
        },
        subject: "Welcome to Countryside Supplier Portal",
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false,
          },
          openTracking: {
            enable: false,
          },
        },
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #466114;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold;">Countryside Steakhouse</h1>
                <p style="color: #466114; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Supplier Portal</p>
              </div>
              <div style="margin-bottom: 24px;">
                <h2 style="color: #2c3e50; margin: 0 0 12px 0; font-size: 20px; font-weight: bold;">Your Supplier Account Has Been Created!</h2>
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
          email: "noreply@countryside-steakhouse.site",
          name: "Countryside Steakhouse",
        },
        subject: "Welcome aboard to COUNTRYSIDE-STEAKHOUSE!",
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false,
          },
          openTracking: {
            enable: false,
          },
        },
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
   * Send payroll notification email using SendGrid
   * @param {string} to - Recipient email address
   * @param {string} employeeName - Employee's full name
   * @param {Object} payrollData - Payroll information
   */
  static async sendPayrollNotification(to, employeeName, payrollData) {
    try {
      if (!this.isConfigured()) {
        console.log("⚠️ SendGrid not configured, skipping email");
        return {
          success: false,
          error: "SendGrid API key not configured",
          skipEmail: true,
        };
      }

      const msg = {
        to: to,
        from: {
          email: "noreply@countryside-steakhouse.site",
          name: "Countryside Steakhouse",
        },
        subject: `Payroll Statement - ${payrollData.period_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <!-- Main Email Container -->
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #466114;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: bold;">Countryside Steakhouse</h1>
                <p style="color: #466114; margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">Payroll Statement</p>
              </div>
              
              <!-- Main Content -->
              <div style="margin-bottom: 30px;">
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${employeeName}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Your payroll for the period <strong>${payrollData.period_name} (${new Date(payrollData.date_from).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} - ${new Date(payrollData.date_to).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })})</strong> has been processed and released.
                </p>
                
                <!-- Payroll Summary Card -->
                <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h2 style="color: #2c3e50; margin-top: 0; font-size: 20px; font-weight: bold; margin-bottom: 20px;">Payroll Summary</h2>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px;">Period Covered:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date(payrollData.date_from).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} - 
                        ${new Date(payrollData.date_to).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Government Benefit Numbers -->
                  ${
                    payrollData.sss_number ||
                    payrollData.philhealth_number ||
                    payrollData.pagibig_number
                      ? `
                  <div style="margin: 15px 0; padding: 12px; background-color: #e9ecef; border-radius: 5px;">
                    <p style="color: #555; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">Government Benefit Numbers:</p>
                    <table style="width: 100%; font-size: 13px;">
                      ${
                        payrollData.sss_number
                          ? `
                      <tr>
                        <td style="padding: 3px 0; color: #555;">SSS:</td>
                        <td style="padding: 3px 0; text-align: right; font-weight: 500; color: #2c3e50; font-family: monospace;">${payrollData.sss_number}</td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        payrollData.philhealth_number
                          ? `
                      <tr>
                        <td style="padding: 3px 0; color: #555;">PhilHealth:</td>
                        <td style="padding: 3px 0; text-align: right; font-weight: 500; color: #2c3e50; font-family: monospace;">${payrollData.philhealth_number}</td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        payrollData.pagibig_number
                          ? `
                      <tr>
                        <td style="padding: 3px 0; color: #555;">Pag-IBIG:</td>
                        <td style="padding: 3px 0; text-align: right; font-weight: 500; color: #2c3e50; font-family: monospace;">${payrollData.pagibig_number}</td>
                      </tr>
                      `
                          : ""
                      }
                    </table>
                  </div>
                  `
                      : ""
                  }
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 16px; font-weight: 500;">Gross Salary:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #466114; font-size: 18px;">
                        ₱${Number(payrollData.gross_salary).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Deductions Section -->
                  <div style="margin: 20px 0; padding-top: 15px; border-top: 2px solid #dee2e6;">
                    <h3 style="color: #dc2626; font-size: 16px; margin-bottom: 12px; font-weight: bold;">Deductions:</h3>
                    <table style="width: 100%; font-size: 15px;">
                      <tr>
                        <td style="padding: 6px 0; color: #555;">SSS:</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #2c3e50;">
                          ₱${Number(payrollData.deductions.sss || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #555;">PhilHealth:</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #2c3e50;">
                          ₱${Number(payrollData.deductions.philhealth || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #555;">Pag-IBIG:</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #2c3e50;">
                          ₱${Number(payrollData.deductions.pagibig || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr style="border-top: 1px solid #dee2e6;">
                        <td style="padding: 10px 0 6px 0; color: #dc2626; font-weight: 600; font-size: 16px;">Total Deductions:</td>
                        <td style="padding: 10px 0 6px 0; text-align: right; color: #dc2626; font-weight: 700; font-size: 16px;">
                          ₱${Number(payrollData.deductions.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Net Salary Section -->
                  <div style="background-color: #466114; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 5px rgba(70,97,20,0.3);">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: white; font-size: 18px; font-weight: 700;">Net Salary:</td>
                        <td style="color: white; font-size: 28px; font-weight: 900; text-align: right;">
                          ₱${Number(payrollData.net_salary).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Payment Date -->
                  <p style="color: #555; font-size: 14px; margin-top: 15px; margin-bottom: 0; text-align: center;">
                    <strong>Payment Date:</strong> ${new Date(payrollData.payment_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                
                <!-- Information Note -->
                <div style="background-color: rgba(170,211,109,0.1); border-left: 4px solid #466114; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #466114; margin-top: 0; margin-bottom: 10px; font-size: 16px; font-weight: bold;">Payment Notification</h4>
                  <p style="color: #2c3e50; margin: 0; font-size: 15px; line-height: 1.6;">
                    Your net salary has been disbursed. Please contact the HR department if you have any questions about your payroll.
                  </p>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-top: 25px; line-height: 1.6;">
                  Thank you for your hard work and dedication!<br>
                  <strong style="color: #466114;">Countryside Steakhouse HR Team</strong>
                </p>
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
          Countryside Steakhouse - Payroll Statement
          
          Dear ${employeeName},
          
          Your payroll for the period ${payrollData.period_name} has been processed and released.
          
          PAYROLL SUMMARY
          ----------------
          Period Covered: ${new Date(payrollData.date_from).toLocaleDateString("en-PH")} - ${new Date(payrollData.date_to).toLocaleDateString("en-PH")}
          Gross Salary: ₱${Number(payrollData.gross_salary).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          
          DEDUCTIONS:
          SSS: ₱${Number(payrollData.deductions.sss || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          PhilHealth: ₱${Number(payrollData.deductions.philhealth || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          Pag-IBIG: ₱${Number(payrollData.deductions.pagibig || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          Total Deductions: ₱${Number(payrollData.deductions.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          
          NET SALARY: ₱${Number(payrollData.net_salary).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          
          Payment Date: ${new Date(payrollData.payment_date).toLocaleDateString("en-PH")}
          
          Your net salary has been disbursed. Please contact the HR department if you have any questions about your payroll.
          
          Thank you for your hard work and dedication!
          Countryside Steakhouse HR Team
          
          ©2025 Countryside-Steakhouse. All rights reserved.
          This is an automated message. Please do not reply to this email.
        `,
      };

      console.log(`📧 [SENDGRID] Sending payroll notification to ${to}`);
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid payroll notification sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid payroll notification error:", error);

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
   * Send feedback reply email using SendGrid
   * @param {string} to - Customer email address
   * @param {string} customerName - Customer's name
   * @param {string} originalMessage - Customer's original feedback message
   * @param {string} replyMessage - Staff's reply message
   * @param {number} rating - Customer's original rating (optional)
   * @param {string} orderNumber - Order number (optional)
   */
  static async sendFeedbackReplyEmail(
    to,
    customerName,
    originalMessage,
    replyMessage,
    rating = null,
    orderNumber = null
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

      const msg = {
        to: to,
        from: {
          email: "noreply@countryside-steakhouse.site",
          name: "Countryside Steakhouse",
        },
        subject: "Thank you for your feedback - Countryside Steakhouse",
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false,
          },
          openTracking: {
            enable: false,
          },
        },
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
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${customerName}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Thank you for taking the time to share your feedback with us. We truly appreciate your input and the opportunity to improve our service.
                </p>
                
                <!-- Original Feedback Section -->
                <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Your Feedback:</h3>
                  ${orderNumber ? `<p style="color: #666; font-size: 14px; margin: 0 0 10px 0;"><strong>Order Number:</strong> ${orderNumber}</p>` : ""}
                  ${rating ? `<p style="color: #666; font-size: 14px; margin: 0 0 15px 0;"><strong>Rating:</strong> ${rating}/5 ⭐</p>` : ""}
                  <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #466114;">
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">
                      "${originalMessage || "No comments provided"}"
                    </p>
                  </div>
                </div>
                
                <!-- Reply Section -->
                <div style="background-color: rgba(170,211,109,0.1); border: 2px solid #466114; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #466114; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Our Response:</h3>
                  <div style="background-color: white; padding: 15px; border-radius: 5px;">
                    <p style="color: #2c3e50; font-size: 15px; line-height: 1.6; margin: 0;">
                      ${replyMessage}
                    </p>
                  </div>
                </div>
                
                <!-- Thank You Message -->
                <div style="background-color: rgba(170,211,109,0.1); border-left: 4px solid #466114; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #466114; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">We Value Your Feedback</h4>
                  <p style="color: #2c3e50; margin: 0; font-size: 15px; line-height: 1.6;">
                    Your feedback helps us continuously improve our service and maintain the high standards that make Countryside Steakhouse "Ang Paborito ng Bayan." 
                    We look forward to serving you again soon!
                  </p>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-top: 25px; line-height: 1.6;">
                  Thank you for choosing Countryside Steakhouse!<br>
                  <strong style="color: #466114;">The Countryside Team</strong>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0;">©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        `,
        text: `
          Countryside Steakhouse - Thank you for your feedback
          
          Dear ${customerName},
          
          Thank you for taking the time to share your feedback with us. We truly appreciate your input and the opportunity to improve our service.
          
          YOUR FEEDBACK:
          ${orderNumber ? `Order Number: ${orderNumber}` : ""}
          ${rating ? `Rating: ${rating}/5 stars` : ""}
          "${originalMessage || "No comments provided"}"
          
          OUR RESPONSE:
          ${replyMessage}
          
          We Value Your Feedback
          Your feedback helps us continuously improve our service and maintain the high standards that make Countryside Steakhouse "Ang Paborito ng Bayan." We look forward to serving you again soon!
          
          Thank you for choosing Countryside Steakhouse!
          The Countryside Team
          
          ©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.
          This is an automated message. Please do not reply to this email.
        `,
      };

      console.log(`📧 [SENDGRID] Sending feedback reply email to ${to}`);
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid feedback reply email sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid feedback reply error:", error);

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
   * @param {string} to - Recipient email address
   * @param {string} resetToken - Password reset token
   * @param {string} username - Employee's name
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

      // Get the correct frontend URL based on environment
      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://www.countryside-steakhouse.site"
          : "http://localhost:8080");
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      const msg = {
        to: to,
        from: {
          email: "noreply@countryside-steakhouse.site",
          name: "Countryside Steakhouse",
        },
        subject: "Reset Your Password - Countryside Steakhouse",
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false,
          },
          openTracking: {
            enable: false,
          },
        },
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
                <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; font-weight: bold;">Password Recovery Request</h2>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Hello <strong>${username}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  We received a request to reset your password for your Countryside Steakhouse employee account. 
                  If you made this request, click the button below to reset your password:
                </p>
                
                <!-- Reset Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #466114; color: white; padding: 15px 30px; 
                            text-decoration: none; border-radius: 6px; font-weight: bold; 
                            display: inline-block; font-size: 16px; box-shadow: 0 2px 5px rgba(70,97,20,0.3);
                            transition: background-color 0.3s ease;"
                     onmouseover="this.style.backgroundColor='#3a5211'"
                     onmouseout="this.style.backgroundColor='#466114'">
                    Reset My Password
                  </a>
                </div>
                
                <!-- Alternative Link -->
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #466114; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
                </p>
                
                <!-- Security Note -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                            padding: 15px; border-radius: 5px; margin-top: 25px;">
                  <p style="color: #856404; margin: 0; font-size: 14px; font-weight: 500;">
                    <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
                    If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                  </p>
                </div>
                
                <!-- Additional Information -->
                <div style="background-color: rgba(170,211,109,0.1); border-left: 4px solid #466114; 
                            padding: 20px; border-radius: 5px; margin-top: 25px;">
                  <h4 style="color: #466114; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Need Help?</h4>
                  <p style="color: #2c3e50; margin: 0; font-size: 15px; line-height: 1.6;">
                    If you're having trouble accessing your account or didn't request this password reset, 
                    please contact your administrator or the HR department for assistance.
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
          Password Recovery - Countryside Steakhouse
          
          Hello ${username},
          
          We received a request to reset your password for your Countryside Steakhouse employee account.
          If you made this request, click the link below to reset your password:
          
          ${resetUrl}
          
          Security Note: This link will expire in 1 hour for your security.
          If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          
          Need Help?
          If you're having trouble accessing your account or didn't request this password reset, 
          please contact your administrator or the HR department for assistance.
          
          ©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.
          This is an automated message, please do not reply to this email.
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
}

module.exports = SendGridService;
