const sgMail = require("@sendgrid/mail");
require("dotenv").config();

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY_2 || process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.warn("⚠️ SendGrid API key not found in environment variables");
} else {
  sgMail.setApiKey(apiKey);
}

class SendGridService {
  /**
   * Check if SendGrid is properly configured
   */
  static isConfigured() {
    const apiKey =
      process.env.SENDGRID_API_KEY_2 || process.env.SENDGRID_API_KEY;
    const isConfigured =
      apiKey &&
      apiKey !== "your-sendgrid-api-key-here" &&
      apiKey.startsWith("SG.") &&
      apiKey.length > 20;

    // Debug logging
    console.log(`🔍 [SENDGRID DEBUG] Checking configuration:`);
    console.log(
      `🔍 [SENDGRID DEBUG] SENDGRID_API_KEY_2: ${process.env.SENDGRID_API_KEY_2 ? "EXISTS" : "NOT_FOUND"}`
    );
    console.log(
      `🔍 [SENDGRID DEBUG] SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? "EXISTS" : "NOT_FOUND"}`
    );
    console.log(
      `🔍 [SENDGRID DEBUG] API Key length: ${apiKey ? apiKey.length : 0}`
    );
    console.log(`🔍 [SENDGRID DEBUG] Is configured: ${isConfigured}`);

    return isConfigured;
  }

  /**
   * Test if the SendGrid API key is valid and working
   */
  static async testApiKey() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "SendGrid API key not configured",
        };
      }

      // Use SendGrid's built-in API key validation endpoint
      const response = await sgMail.send({
        to: "test@example.com", // This won't actually send
        from: "mailcountrysidesteakhouse@gmail.com",
        subject: "Test",
        text: "Test",
        mail_settings: {
          sandbox_mode: {
            enable: true, // Sandbox mode prevents actual sending
          },
        },
      });

      return {
        success: true,
        message: "SendGrid API key is valid and working",
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid API key test failed:", error);

      if (error.response) {
        const errorCode = error.response.status;
        const errorMessage =
          error.response.body.errors?.[0]?.message || error.message;

        if (errorCode === 401) {
          return {
            success: false,
            error: "SendGrid API key is invalid or expired",
            needsNewKey: true,
          };
        }

        return {
          success: false,
          error: `SendGrid API Error (${errorCode}): ${errorMessage}`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
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
   * Send supplier order notification when SCM confirms receipt and proceeds with supplier-sourced items
   * @param {string} to - Supplier email
   * @param {string} supplierName - Supplier or contact name
   * @param {object} order - Order payload containing request and items
   * @param {object} order.request - Supply request header
   * @param {Array} order.items - Array of items with item_name, item_quantity, item_unit, item_unit_price, item_amount
   */
  static async sendSupplierOrderEmail(to, supplierName, order) {
    try {
      if (!this.isConfigured()) {
        console.warn("SendGrid not configured - skipping supplier order email");
        return { skipped: true };
      }

      if (!to) {
        console.warn(
          "No supplier email provided - skipping supplier order email"
        );
        return { skipped: true };
      }

      const { request = {}, items = [] } = order || {};
      const requestId = request.request_id || request.id || "-";
      const totalAmount = Number(request.total_amount || 0).toLocaleString(
        "en-PH",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );

      const itemsRows = (items || [])
        .map((it, idx) => {
          const qty = Number(it.item_quantity || 0);
          const unit = it.item_unit || "";
          const unitPrice = Number(it.item_unit_price || 0).toLocaleString(
            "en-PH",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          );
          const amount = Number(
            it.item_amount || qty * (it.item_unit_price || 0)
          ).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return `
            <tr>
              <td style="padding:8px; border-bottom:1px solid #eee; color:#2c3e50;">${idx + 1}</td>
              <td style="padding:8px; border-bottom:1px solid #eee; color:#2c3e50;">${it.item_name || "-"}</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${qty} ${unit}</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">₱ ${unitPrice}</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right; font-weight:600;">₱ ${amount}</td>
            </tr>`;
        })
        .join("");

      const fromEmail =
        process.env.SMTP_USER ||
        process.env.EMAIL_USER ||
        process.env.SENDGRID_FROM_EMAIL ||
        process.env.SENDGRID_SENDER_EMAIL;

      if (!fromEmail) {
        console.warn(
          "SendGrid FROM email not configured (prefer SMTP_USER/EMAIL_USER; fallback SENDGRID_FROM_EMAIL/SENDGRID_SENDER_EMAIL). Skipping supplier order email."
        );
        return { skipped: true };
      }

      const msg = {
        to,
        from: { email: fromEmail, name: "Countryside SCM" },
        subject: `New Order from Countryside Steakhouse — Request #${requestId}`,
        text: `New supplier order for request #${requestId} (Total: ₱ ${totalAmount}). Please confirm and provide delivery schedule.`,
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
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color:#2c3e50;">
            <div style="max-width:680px; margin:0 auto; padding:24px;">
              <h2 style="margin:0 0 12px 0; font-size:20px; font-weight:700;">New Order</h2>
              <p style="margin:0 0 16px 0;">Hello ${supplierName || "Supplier"},</p>
              <p style="margin:0 0 16px 0;">We have confirmed the budget receipt for the following supplier-sourced request and would like to proceed with the order.</p>

              <div style="background:#f8f9fa; border:1px solid #eaecef; border-radius:8px; padding:12px; margin:16px 0;">
                <div style="display:flex; justify-content:space-between;">
                  <div>
                    <div style="font-size:13px; color:#6b7280;">Request #</div>
                    <div style="font-weight:600;">${requestId}</div>
                  </div>
                  <div>
                    <div style="font-size:13px; color:#6b7280;">Total Amount</div>
                    <div style="font-weight:700; color:#0f766e;">₱ ${totalAmount}</div>
                  </div>
                </div>
              </div>

              <table style="width:100%; border-collapse:collapse; margin-top:8px;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:8px; border-bottom:2px solid #e5e7eb; color:#6b7280;">#</th>
                    <th style="text-align:left; padding:8px; border-bottom:2px solid #e5e7eb; color:#6b7280;">Item</th>
                    <th style="text-align:right; padding:8px; border-bottom:2px solid #e5e7eb; color:#6b7280;">Qty</th>
                    <th style="text-align:right; padding:8px; border-bottom:2px solid #e5e7eb; color:#6b7280;">Unit Price</th>
                    <th style="text-align:right; padding:8px; border-bottom:2px solid #e5e7eb; color:#6b7280;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <p style="margin:16px 0 0 0; font-size:14px; color:#374151;">Please confirm receipt of this order and provide expected delivery schedule. If you need clarification, reply to this email.</p>
              <p style="margin:16px 0 0 0; font-size:12px; color:#6b7280;">This is an automated message from the Countryside SCM system.</p>
            </div>
          </div>
        `,
      };

      console.log(
        `📧 [SENDGRID] Sending supplier order email for request #${requestId} to ${to}`
      );
      const response = await sgMail.send(msg);
      console.log(
        "✅ SendGrid supplier order email sent:",
        response[0]?.headers?.["x-message-id"] || "<no-message-id>"
      );
      return { success: true };
    } catch (error) {
      const apiErrors = error?.response?.body?.errors;
      if (apiErrors) {
        console.error("❌ SendGrid API errors:", JSON.stringify(apiErrors));
      }
      console.error(
        "❌ Error sending supplier order email:",
        error?.message || error
      );
      return {
        success: false,
        error: apiErrors || error?.message || String(error),
      };
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
   * Send employee rate change email using SendGrid
   */
  static async sendEmployeeRateChangeEmail(
    to,
    employeeName,
    role,
    department,
    oldRate,
    newRate
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

      const fromEmail =
        process.env.SMTP_USER ||
        process.env.EMAIL_USER ||
        process.env.SENDGRID_FROM_EMAIL ||
        process.env.SENDGRID_SENDER_EMAIL;
      if (!fromEmail) {
        return {
          success: false,
          error:
            "SendGrid FROM email not configured (prefer SMTP_USER/EMAIL_USER; fallback SENDGRID_FROM_EMAIL/SENDGRID_SENDER_EMAIL)",
        };
      }

      const oldVal = Number(oldRate || 0);
      const newVal = Number(newRate || 0);
      const diff = newVal - oldVal;
      const increased = diff > 0;
      const direction = increased
        ? "Increased"
        : diff < 0
          ? "Decreased"
          : "Updated";

      const formatPhp = (v) =>
        Number(v).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      const subject = `Rate ${direction} for ${role} — ₱ ${formatPhp(newVal)}/hr`;

      const msg = {
        to,
        from: { email: fromEmail, name: "Countryside HR" },
        subject,
        text: `Hello ${employeeName || "Employee"},\n\nYour rate for the ${role} (${department}) position was ${direction.toLowerCase()}.\nPrevious: ₱ ${formatPhp(oldVal)}/hr\nNew: ₱ ${formatPhp(newVal)}/hr\nChange: ${increased ? "+" : ""}${formatPhp(diff)} per hour.\n\nIf you have questions, please contact HR.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111827;">
            <div style="max-width:640px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;">Rate ${direction}</h2>
              <p style="margin:0 0 12px 0;">Hello ${employeeName || "Employee"},</p>
              <p style="margin:0 0 16px 0;">Your rate for the <strong>${role}</strong> role in <strong>${department}</strong> has been ${direction.toLowerCase()}.</p>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:#6b7280;">Previous</span>
                  <strong>₱ ${formatPhp(oldVal)}/hr</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:#6b7280;">New</span>
                  <strong style="color:${increased ? "#065f46" : "#7c2d12"};">₱ ${formatPhp(newVal)}/hr</strong>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#6b7280;">Change</span>
                  <strong>${increased ? "+" : ""}₱ ${formatPhp(diff)}/hr</strong>
                </div>
              </div>
              <p style="margin:16px 0 0 0;font-size:14px;color:#374151;">If you have any questions, please contact HR.</p>
            </div>
          </div>
        `,
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
          openTracking: { enable: false },
        },
      };

      const response = await sgMail.send(msg);
      return {
        success: true,
        messageId: response[0]?.headers?.["x-message-id"],
      };
    } catch (error) {
      const apiErrors = error.response?.body?.errors
        ?.map((e) => e.message)
        .join(", ");
      return {
        success: false,
        error: apiErrors || error?.message || String(error),
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
          email: "mailcountrysidesteakhouse@gmail.com",
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
          email: "mailcountrysidesteakhouse@gmail.com",
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
          email: "mailcountrysidesteakhouse@gmail.com",
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

  /**
   * Send employee transfer notification email using SendGrid
   * @param {string} to - Employee email address
   * @param {string} employeeName - Employee's full name
   * @param {string} fromBranchName - Source branch name
   * @param {string} toBranchName - Destination branch name
   * @param {Date} transferDate - Date when transfer takes effect
   * @param {string} managerName - Name of manager who requested transfer
   * @param {string} customMessage - Optional custom message about what changed
   * @param {string} customSubject - Optional custom email subject
   * @param {Object} additionalInfo - Optional additional info (fromDept, toDept, fromRole, toRole, hasBranchChanged, hasDeptChanged, hasRoleChanged)
   */
  static async sendEmployeeTransferNotification(
    to,
    employeeName,
    fromBranchName,
    toBranchName,
    transferDate,
    managerName,
    customMessage = null,
    customSubject = null,
    additionalInfo = {}
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

      // Determine what type of transfer this is and customize messaging
      const {
        hasBranchChanged = true,
        hasDeptChanged = false,
        hasRoleChanged = false,
        fromDept,
        toDept,
      } = additionalInfo;

      // Customize "What This Means For You" section based on transfer type
      let whatThisMeans = "";
      let nextStepsHtml = "";

      if (hasBranchChanged && !hasDeptChanged && !hasRoleChanged) {
        // Pure branch transfer
        whatThisMeans = `Your transfer to <strong>${toBranchName}</strong> is now effective. Please report to your new branch location starting from the effective date. All your existing employment benefits and terms remain unchanged. If you have any questions about this transfer, please contact your new branch manager or the HR department.`;

        nextStepsHtml = `
                    <li>Report to your new branch on the effective date</li>
                    <li>Introduce yourself to your new branch manager</li>
                    <li>Familiarize yourself with the new location and procedures</li>
                    <li>Update your emergency contact information if needed</li>`;
      } else if (hasDeptChanged && !hasBranchChanged) {
        // Department change only (no branch change)
        whatThisMeans = `Your department assignment has been updated to <strong>${toDept}</strong>. Please review your new responsibilities and expectations in your new department. All your existing employment benefits and terms remain unchanged. If you have any questions about this transition, please contact your department head or the HR department.`;

        nextStepsHtml = `
                    <li>Review your new department responsibilities</li>
                    <li>Introduce yourself to your new department head</li>
                    <li>Familiarize yourself with any new procedures or processes</li>
                    <li>Update your emergency contact information if needed</li>`;
      } else {
        // Combined changes (branch + dept or branch + role, etc.)
        whatThisMeans = `Your transfer is now effective. Please review your new assignment details and prepare accordingly. All your existing employment benefits and terms remain unchanged. If you have any questions about this change, please contact your new supervisor or the HR department.`;

        nextStepsHtml = `
                    <li>Review your new assignment details</li>
                    <li>Introduce yourself to your new supervisor or manager</li>
                    <li>Familiarize yourself with your new role and responsibilities</li>
                    <li>Update your emergency contact information if needed</li>`;
      }

      const msg = {
        to: to,
        from: {
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
        subject:
          customSubject ||
          "Employee Transfer Notification - Countryside Steakhouse",
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
                <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; font-weight: bold;">Employee Transfer Notification</h2>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${employeeName}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  ${customMessage || "We are writing to inform you that your branch assignment has been updated as part of our organizational restructuring. Your transfer has been approved and is now effective."}
                </p>
                
                <!-- Transfer Details Card -->
                <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #2c3e50; margin-top: 0; font-size: 20px; font-weight: bold; margin-bottom: 20px;">Transfer Details</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Employee:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${employeeName}
                      </td>
                    </tr>
                    ${
                      hasBranchChanged &&
                      toBranchName !== "Unassigned" &&
                      fromBranchName !== "Unassigned"
                        ? `
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 16px; font-weight: 500;">Previous Branch:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 16px;">
                        ${fromBranchName}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 16px; font-weight: 500;">New Branch:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #466114; font-size: 16px;">
                        ${toBranchName}
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      hasDeptChanged && !hasBranchChanged
                        ? `
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 16px; font-weight: 500;">Previous Department:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 16px;">
                        ${fromDept || "Current Department"}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 16px; font-weight: 500;">New Department:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #466114; font-size: 16px;">
                        ${toDept || "New Department"}
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      hasDeptChanged &&
                      hasBranchChanged &&
                      fromBranchName === "Unassigned"
                        ? `
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 16px; font-weight: 500;">Previous Department:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 16px;">
                        ${fromDept || "Current Department"}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 16px; font-weight: 500;">New Department:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #466114; font-size: 16px;">
                        ${toDept || "New Department"}
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      hasDeptChanged &&
                      hasBranchChanged &&
                      toBranchName === "Unassigned"
                        ? `
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 16px; font-weight: 500;">Previous Department:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 16px;">
                        ${fromDept || "Current Department"}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 16px; font-weight: 500;">New Department:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #466114; font-size: 16px;">
                        ${toDept || "New Department"}
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">Effective Date:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${transferDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Requested By:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${managerName}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <!-- Information Note -->
                <div style="background-color: rgba(170,211,109,0.1); border-left: 4px solid #466114; 
                            padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #466114; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">What This Means For You</h4>
                  <p style="color: #2c3e50; margin: 0; font-size: 15px; line-height: 1.6;">
                    ${whatThisMeans}
                  </p>
                </div>
                
                <!-- Next Steps -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                            padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #856404; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Next Steps</h4>
                  <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6;">
                    ${nextStepsHtml}
                  </ul>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-top: 25px; line-height: 1.6;">
                  We wish you success in your new assignment!<br>
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
          ${customSubject || "Countryside Steakhouse - Employee Transfer Notification"}
          
          Dear ${employeeName},
          
          ${customMessage || "We are writing to inform you that your assignment has been updated. Your transfer has been approved and is now effective."}
          
          TRANSFER DETAILS:
          Employee: ${employeeName}
          ${hasBranchChanged && toBranchName !== "Unassigned" && fromBranchName !== "Unassigned" ? `Previous Branch: ${fromBranchName}\n          New Branch: ${toBranchName}` : ""}
          ${hasDeptChanged && !hasBranchChanged ? `Previous Department: ${fromDept || "Current Department"}\n          New Department: ${toDept || "New Department"}` : ""}
          ${hasDeptChanged && hasBranchChanged && fromBranchName === "Unassigned" ? `Previous Department: ${fromDept || "Current Department"}\n          New Department: ${toDept || "New Department"}` : ""}
          ${hasDeptChanged && hasBranchChanged && toBranchName === "Unassigned" ? `Previous Department: ${fromDept || "Current Department"}\n          New Department: ${toDept || "New Department"}` : ""}
          Effective Date: ${transferDate.toLocaleDateString("en-PH")}
          Requested By: ${managerName}
          
          WHAT THIS MEANS FOR YOU:
          ${whatThisMeans
            .replace(/<strong>/g, "")
            .replace(/<\/strong>/g, "")
            .replace(/<li>/g, "- ")
            .replace(/<\/li>/g, "")
            .replace(/\n\s+/g, "\n")}
          
          NEXT STEPS:
          ${nextStepsHtml
            .replace(/<li>/g, "- ")
            .replace(/<\/li>/g, "")
            .replace(/\n\s+/g, "\n")}
          
          We wish you success in your new assignment!
          Countryside Steakhouse HR Team
          
          ©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.
          This is an automated message, please do not reply to this email.
        `,
      };

      console.log(
        `📧 [SENDGRID] Sending employee transfer notification to ${to}`
      );
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid employee transfer notification sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid employee transfer notification error:", error);

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
   * Send employee termination notification email using SendGrid
   * @param {string} to - Employee email address
   * @param {string} employeeName - Employee's full name
   * @param {string} terminationReason - Reason for termination
   * @param {Date} lastWorkingDay - Last working day
   * @param {string} handoverNotes - Optional handover notes
   * @param {boolean} finalPayrollProcessed - Whether final payroll is processed
   * @param {boolean} systemAccessRevoked - Whether system access is revoked
   * @param {string} terminatedBy - Name of person who terminated the employee
   */
  static async sendEmployeeTerminationNotification(
    to,
    employeeName,
    terminationReason,
    lastWorkingDay,
    handoverNotes = null,
    finalPayrollProcessed = false,
    systemAccessRevoked = false,
    terminatedBy = "HR Department"
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
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
        subject: "Employee Termination Notice - Countryside Steakhouse",
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
              <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: bold;">Countryside Steakhouse</h1>
                <p style="color: #dc2626; margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">Employee Termination Notice</p>
              </div>
              
              <!-- Main Content -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; font-weight: bold;">Termination Notice</h2>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${employeeName}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  This email is to formally notify you that your employment with Countryside Steakhouse has been terminated, 
                  effective as of the date specified below.
                </p>
                
                <!-- Termination Details Card -->
                <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #991b1b; margin-top: 0; font-size: 20px; font-weight: bold; margin-bottom: 20px;">Termination Details</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Employee:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${employeeName}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #fecaca;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">Termination Reason:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #dc2626;">
                        ${terminationReason}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Last Working Day:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date(lastWorkingDay).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Terminated By:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${terminatedBy}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #fecaca;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">Termination Date:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <!-- Post-Termination Status -->
                <div style="background-color: #fff7ed; border: 2px solid #fb923c; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #9a3412; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Post-Termination Checklist Status</h3>
                  
                  <table style="width: 100%; font-size: 15px;">
                    <tr>
                      <td style="padding: 8px 0; color: #555;">Final Payroll Processing:</td>
                      <td style="padding: 8px 0; text-align: right;">
                        <span style="
                          padding: 4px 12px;
                          border-radius: 4px;
                          font-weight: 600;
                          ${
                            finalPayrollProcessed
                              ? "background-color: #dcfce7; color: #166534;"
                              : "background-color: #fef3c7; color: #92400e;"
                          }"
                        >
                          ${finalPayrollProcessed ? "✓ Completed" : "✗ Pending"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555;">System Access Revocation:</td>
                      <td style="padding: 8px 0; text-align: right;">
                        <span style="
                          padding: 4px 12px;
                          border-radius: 4px;
                          font-weight: 600;
                          ${
                            systemAccessRevoked
                              ? "background-color: #dcfce7; color: #166534;"
                              : "background-color: #fef3c7; color: #92400e;"
                          }"
                        >
                          ${systemAccessRevoked ? "✓ Revoked" : "✗ Pending"}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
                
                ${
                  handoverNotes
                    ? `
                <!-- Handover Notes -->
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Handover Notes</h3>
                  <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #466114;">
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                      ${handoverNotes}
                    </p>
                  </div>
                </div>
                `
                    : ""
                }
                
                <!-- Important Information -->
                <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; 
                            padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #991b1b; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Important Information</h4>
                  <ul style="color: #7f1d1d; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                    <li>All company property must be returned immediately</li>
                    <li>Access to company systems and premises has been revoked</li>
                    ${finalPayrollProcessed ? "<li>Final payroll has been processed and will be disbursed according to company policy</li>" : "<li>Final payroll processing is pending. Please contact HR for details</li>"}
                    <li>Please ensure all pending work has been properly handed over</li>
                    <li>For questions or concerns, please contact the HR department</li>
                  </ul>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-top: 25px; line-height: 1.6;">
                  We thank you for your service and wish you the best in your future endeavors.<br>
                  <strong style="color: #dc2626;">Countryside Steakhouse HR Team</strong>
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
          Countryside Steakhouse - Employee Termination Notice
          
          Dear ${employeeName},
          
          This email is to formally notify you that your employment with Countryside Steakhouse has been terminated, 
          effective as of the date specified below.
          
          TERMINATION DETAILS:
          Employee: ${employeeName}
          Termination Reason: ${terminationReason}
          Last Working Day: ${new Date(lastWorkingDay).toLocaleDateString("en-PH")}
          Terminated By: ${terminatedBy}
          Termination Date: ${new Date().toLocaleDateString("en-PH")}
          
          POST-TERMINATION CHECKLIST STATUS:
          Final Payroll Processing: ${finalPayrollProcessed ? "✓ Completed" : "✗ Pending"}
          System Access Revocation: ${systemAccessRevoked ? "✓ Revoked" : "✗ Pending"}
          
          ${handoverNotes ? `\nHANDOVER NOTES:\n${handoverNotes}\n` : ""}
          
          IMPORTANT INFORMATION:
          - All company property must be returned immediately
          - Access to company systems and premises has been revoked
          - ${finalPayrollProcessed ? "Final payroll has been processed and will be disbursed according to company policy" : "Final payroll processing is pending. Please contact HR for details"}
          - Please ensure all pending work has been properly handed over
          - For questions or concerns, please contact the HR department
          
          We thank you for your service and wish you the best in your future endeavors.
          Countryside Steakhouse HR Team
          
          ©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.
          This is an automated message, please do not reply to this email.
        `,
      };

      console.log(
        `📧 [SENDGRID] Sending employee termination notification to ${to}`
      );
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid employee termination notification sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error(
        "❌ SendGrid employee termination notification error:",
        error
      );

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
   * Send leave approval notification email using SendGrid
   * @param {string} to - Employee email address
   * @param {string} employeeName - Employee's full name
   * @param {Object} leaveData - Leave request information
   * @param {string} approvedBy - Name of person who approved
   * @param {string} approvalNotes - Optional approval notes
   */
  static async sendLeaveApprovalNotification(
    to,
    employeeName,
    leaveData,
    approvedBy,
    approvalNotes = null
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
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
        subject: `Leave Request Approved - ${leaveData.leave_type}`,
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
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px; margin-bottom: 15px;">
                    <svg style="width: 48px; height: 48px; color: #16a34a;" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <h2 style="color: #16a34a; margin: 0; font-size: 28px; font-weight: bold;">Leave Request Approved!</h2>
                </div>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${employeeName}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  We are pleased to inform you that your leave request has been <strong style="color: #16a34a;">approved</strong>.
                </p>
                
                <!-- Leave Details Card -->
                <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #2c3e50; margin-top: 0; font-size: 20px; font-weight: bold; margin-bottom: 20px;">Leave Request Details</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Leave Type:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${leaveData.leave_type}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">From Date:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date(leaveData.from_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">To Date:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date(leaveData.to_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Duration:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${leaveData.days || this.calculateDays(leaveData.from_date, leaveData.to_date)} days
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">Reason:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50; max-width: 200px;">
                        ${leaveData.reason}
                      </td>
                    </tr>
                    ${
                      leaveData.use_sil
                        ? `
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">SIL Days Used:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${leaveData.sil_days || 0} days
                      </td>
                    </tr>
                    `
                        : ""
                    }
                  </table>
                </div>
                
                <!-- Approval Information -->
                <div style="background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #166534; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Approval Information</h3>
                  
                  <table style="width: 100%; font-size: 15px;">
                    <tr>
                      <td style="padding: 8px 0; color: #555;">Approved By:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #166534;">
                        ${approvedBy}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555;">Approved On:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #166534;">
                        ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  </table>
                  
                  ${
                    approvalNotes
                      ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #86efac;">
                    <p style="color: #166534; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Approval Notes:</p>
                    <p style="color: #166534; font-size: 15px; line-height: 1.6; margin: 0;">
                      "${approvalNotes}"
                    </p>
                  </div>
                  `
                      : ""
                  }
                </div>
                
                <!-- Information Note -->
                <div style="background-color: rgba(170,211,109,0.1); border-left: 4px solid #466114; 
                            padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #466114; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Important Reminders</h4>
                  <ul style="color: #2c3e50; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6;">
                    <li>Please ensure your work is properly handed over before your leave begins</li>
                    <li>Submit necessary documents or clearances if required</li>
                    <li>Enjoy your well-deserved time off!</li>
                  </ul>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-top: 25px; line-height: 1.6;">
                  We hope you have a restful and enjoyable time off!<br>
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
          Countryside Steakhouse - Leave Request Approved
          
          Dear ${employeeName},
          
          We are pleased to inform you that your leave request has been approved.
          
          LEAVE REQUEST DETAILS:
          Leave Type: ${leaveData.leave_type}
          From Date: ${new Date(leaveData.from_date).toLocaleDateString("en-PH")}
          To Date: ${new Date(leaveData.to_date).toLocaleDateString("en-PH")}
          Duration: ${leaveData.days || this.calculateDays(leaveData.from_date, leaveData.to_date)} days
          Reason: ${leaveData.reason}
          ${leaveData.use_sil ? `SIL Days Used: ${leaveData.sil_days || 0} days` : ""}
          
          APPROVAL INFORMATION:
          Approved By: ${approvedBy}
          Approved On: ${new Date().toLocaleDateString("en-PH")} ${new Date().toLocaleTimeString("en-PH")}
          ${approvalNotes ? `Approval Notes: "${approvalNotes}"` : ""}
          
          IMPORTANT REMINDERS:
          - Please ensure your work is properly handed over before your leave begins
          - Submit necessary documents or clearances if required
          - Enjoy your well-deserved time off!
          
          We hope you have a restful and enjoyable time off!
          Countryside Steakhouse HR Team
          
          ©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.
          This is an automated message, please do not reply to this email.
        `,
      };

      console.log(`📧 [SENDGRID] Sending leave approval notification to ${to}`);
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid leave approval notification sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid leave approval notification error:", error);

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
   * Send leave rejection notification email using SendGrid
   * @param {string} to - Employee email address
   * @param {string} employeeName - Employee's full name
   * @param {Object} leaveData - Leave request information
   * @param {string} rejectedBy - Name of person who rejected
   * @param {string} rejectionReason - Reason for rejection
   */
  static async sendLeaveRejectionNotification(
    to,
    employeeName,
    leaveData,
    rejectedBy,
    rejectionReason
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
          email: "mailcountrysidesteakhouse@gmail.com",
          name: "Countryside Steakhouse",
        },
        subject: `Leave Request - ${leaveData.leave_type} Not Approved`,
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
              <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: bold;">Countryside Steakhouse</h1>
                <p style="color: #dc2626; margin: 5px 0 0 0; font-size: 16px; font-weight: 500;">Leave Request Decision</p>
              </div>
              
              <!-- Main Content -->
              <div style="margin-bottom: 30px;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="display: inline-block; background-color: #fee2e2; border-radius: 50%; padding: 20px; margin-bottom: 15px;">
                    <svg style="width: 48px; height: 48px; color: #dc2626;" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <h2 style="color: #dc2626; margin: 0; font-size: 28px; font-weight: bold;">Leave Request Not Approved</h2>
                </div>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear <strong>${employeeName}</strong>,
                </p>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  We regret to inform you that your leave request has <strong style="color: #dc2626;">not been approved</strong> at this time.
                </p>
                
                <!-- Leave Details Card -->
                <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #2c3e50; margin-top: 0; font-size: 20px; font-weight: bold; margin-bottom: 20px;">Requested Leave Details</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Leave Type:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${leaveData.leave_type}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">From Date:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date(leaveData.from_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">To Date:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${new Date(leaveData.to_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555; font-size: 15px; font-weight: 500;">Duration:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50;">
                        ${leaveData.days || this.calculateDays(leaveData.from_date, leaveData.to_date)} days
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #dee2e6;">
                      <td style="padding: 12px 0; color: #555; font-size: 15px; font-weight: 500;">Reason:</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 15px; color: #2c3e50; max-width: 200px;">
                        ${leaveData.reason}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <!-- Rejection Information -->
                <div style="background-color: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #991b1b; margin-top: 0; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Rejection Information</h3>
                  
                  <div style="margin-bottom: 15px;">
                    <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin-bottom: 8px;">Rejection Reason:</p>
                    <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #dc2626;">
                      <p style="color: #7f1d1d; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                        ${rejectionReason}
                      </p>
                    </div>
                  </div>
                  
                  <table style="width: 100%; font-size: 15px;">
                    <tr>
                      <td style="padding: 8px 0; color: #555;">Rejected By:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #991b1b;">
                        ${rejectedBy}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #555;">Rejected On:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #991b1b;">
                        ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  </table>
                </div>
                
                <!-- Information Note -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                            padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4 style="color: #856404; margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Next Steps</h4>
                  <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.6;">
                    <li>You may submit a new leave request with different dates</li>
                    <li>If you have questions or concerns, please contact your supervisor or HR</li>
                    <li>Consider discussing your leave plans with your team in advance</li>
                  </ul>
                </div>
                
                <p style="color: #555; font-size: 16px; margin-top: 25px; line-height: 1.6;">
                  If you have any questions or concerns, please feel free to reach out to us.<br>
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
          Countryside Steakhouse - Leave Request Not Approved
          
          Dear ${employeeName},
          
          We regret to inform you that your leave request has not been approved at this time.
          
          REQUESTED LEAVE DETAILS:
          Leave Type: ${leaveData.leave_type}
          From Date: ${new Date(leaveData.from_date).toLocaleDateString("en-PH")}
          To Date: ${new Date(leaveData.to_date).toLocaleDateString("en-PH")}
          Duration: ${leaveData.days || this.calculateDays(leaveData.from_date, leaveData.to_date)} days
          Reason: ${leaveData.reason}
          
          REJECTION INFORMATION:
          Rejection Reason: ${rejectionReason}
          Rejected By: ${rejectedBy}
          Rejected On: ${new Date().toLocaleDateString("en-PH")} ${new Date().toLocaleTimeString("en-PH")}
          
          NEXT STEPS:
          - You may submit a new leave request with different dates
          - If you have questions or concerns, please contact your supervisor or HR
          - Consider discussing your leave plans with your team in advance
          
          If you have any questions or concerns, please feel free to reach out to us.
          Countryside Steakhouse HR Team
          
          ©2025 COUNTRYSIDE-STEAKHOUSE. All rights reserved.
          This is an automated message, please do not reply to this email.
        `,
      };

      console.log(
        `📧 [SENDGRID] Sending leave rejection notification to ${to}`
      );
      const response = await sgMail.send(msg);

      console.log(
        "✅ SendGrid leave rejection notification sent:",
        response[0].headers["x-message-id"]
      );
      return {
        success: true,
        messageId: response[0].headers["x-message-id"],
        provider: "SendGrid",
      };
    } catch (error) {
      console.error("❌ SendGrid leave rejection notification error:", error);

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
   * Helper function to calculate days between two dates
   * @param {string} fromDate - Start date
   * @param {string} toDate - End date
   * @returns {number} - Number of days
   */
  static calculateDays(fromDate, toDate) {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

module.exports = SendGridService;
