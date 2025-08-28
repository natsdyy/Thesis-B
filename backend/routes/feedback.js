const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Configure Telegram settings
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '@PNCountryside_Feedbacks';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/feedback-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validate required environment variables
if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required in environment variables');
}

/**
 * @swagger
 * /api/feedback
 * post:
 *   summary: Submit customer feedback with optional image
 *   description: Submit customer feedback and send to Telegram group with image if provided
 *   tags: [Feedback]
 *   requestBody:
 *     required: true
 *     content:
 *       multipart/form-data:
 *         schema:
 *           type: object
 *           required:
 *             - name
 *             - email
 *             - message
 *             - image
 *           properties:
 *             name:
 *               type: string
 *               description: Customer's name
 *             email:
 *               type: string
 *               description: Customer's email
 *             message:
 *               type: string
 *               description: Feedback message
 *             phone:
 *               type: string
 *               description: Customer's phone number (optional)
 *             rating:
 *               type: number
 *               description: Rating from 1-5 (optional)
 *             image:
 *               type: string
 *               format: binary
 *               description: Required image file (max 5MB) - Photo of food experience
 *   responses:
 *     200:
 *       description: Feedback submitted successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *     400:
 *       description: Bad request - missing required fields or invalid file
 *     500:
 *       description: Internal server error
 */
router.post("/", upload.single('image'), async (req, res) => {
  try {
    const { name, email, message, phone, rating } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required fields",
      });
    }

    // Validate image is required
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Image upload is required. Please share a photo of your food experience.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Create feedback object
    const feedback = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      phone: phone ? phone.trim() : null,
      rating: rating || null,
      timestamp: new Date().toISOString(),
      source: 'Website Contact Form',
      imagePath: imageFile ? imageFile.path : null,
      imageFilename: imageFile ? imageFile.filename : null
    };

    // Format message for Telegram
    const telegramMessage = formatTelegramMessage(feedback);

    // Send to Telegram group
    let telegramResponse = null;
    try {
      if (TELEGRAM_BOT_TOKEN) {
        // Always send image with caption to Telegram since image is required
        const imageStream = fs.createReadStream(imageFile.path);
        telegramResponse = await bot.sendPhoto(TELEGRAM_CHAT_ID, imageStream, {
          caption: telegramMessage,
          parse_mode: 'HTML'
        });
        console.log('Feedback with image sent to Telegram successfully:', telegramResponse.message_id);
      } else {
        console.warn('TELEGRAM_BOT_TOKEN not configured, skipping Telegram notification');
      }
    } catch (telegramError) {
      console.error('Failed to send feedback to Telegram:', telegramError.message);
      // Don't fail the request if Telegram fails, just log it
    }

    // Store feedback in database (optional - you can add a feedback table later)
    // For now, we'll just log it
    console.log('New feedback received:', feedback);

    // Clean up uploaded file after sending to Telegram
    if (imageFile && fs.existsSync(imageFile.path)) {
      try {
        fs.unlinkSync(imageFile.path);
        console.log('Uploaded image cleaned up:', imageFile.filename);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded image:', cleanupError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "Thank you for your feedback and photo! We'll get back to you soon.",
      data: {
        feedbackId: Date.now(), // Simple ID for now
        telegramMessageId: telegramResponse?.message_id || null,
        submittedAt: feedback.timestamp,
        hasImage: true // Always true since image is required
      }
    });

  } catch (error) {
    console.error("Error processing feedback:", error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Uploaded image cleaned up after error:', req.file.filename);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded image after error:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit feedback. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Format feedback data for Telegram message
 * @param {Object} feedback - The feedback object
 * @returns {string} Formatted HTML message for Telegram
 */
function formatTelegramMessage(feedback) {
  const ratingStars = feedback.rating ? '⭐'.repeat(feedback.rating) : 'No rating';
  const phoneInfo = feedback.phone ? `\n📱 <b>Phone:</b> ${feedback.phone}` : '';
  
  return `🆕 <b>New Customer Feedback with Photo</b>

👤 <b>Name:</b> ${feedback.name}
📧 <b>Email:</b> ${feedback.email}${phoneInfo}
⭐ <b>Rating:</b> ${ratingStars}
📸 <b>Image:</b> Attached
💬 <b>Message:</b>

${feedback.message}

📅 <b>Submitted:</b> ${new Date(feedback.timestamp).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

🌐 <b>Source:</b> ${feedback.source}`;
}

/**
 * @swagger
 * /api/feedback/health
 * get:
 *   summary: Check feedback service health
 *   description: Check if the feedback service and Telegram bot are working
 *   tags: [Feedback]
 *   responses:
 *     200:
 *       description: Service is healthy
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               message:
 *                 type: string
 *               telegram:
 *                 type: object
 *                 properties:
 *                   configured:
 *                     type: boolean
 *                   chatId:
 *                     type: string
 */
router.get("/health", async (req, res) => {
  try {
    const telegramStatus = {
      configured: !!TELEGRAM_BOT_TOKEN,
      chatId: TELEGRAM_CHAT_ID,
      botToken: TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured'
    };

    res.status(200).json({
      success: true,
      message: "Feedback service is healthy",
      telegram: telegramStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Feedback service health check failed",
      error: error.message
    });
  }
});

module.exports = router;
