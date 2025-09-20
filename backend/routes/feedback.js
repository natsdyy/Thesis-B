const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Feedback = require("../models/Feedback");
const OrderRating = require("../models/OrderRating");
const Customer = require("../models/Customer");
const EmailService = require("../services/emailService");
const { db } = require("../config/database");
const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/feedback-images");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "feedback-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// No environment variables required for database-only storage

router.post("/", upload.single("image"), async (req, res) => {
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
    // Image is optional for testing purposes
    // if (!imageFile) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "Image upload is required. Please share a photo of your food experience.",
    //   });
    // }

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

    // Find or create customer
    const customer = await Customer.findOrCreate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
    });

    // Create feedback object
    const feedbackData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      phone: phone ? phone.trim() : null,
      rating: rating || null,
      source: "Website Contact Form",
      imagePath: imageFile ? imageFile.path : null,
      imageFilename: imageFile ? imageFile.filename : null,
      customer_id: customer.id,
    };

    // Store feedback in database
    const savedFeedback = await Feedback.create(feedbackData);

    // Update customer statistics
    await Customer.updateStats(customer.id);

    res.status(200).json({
      success: true,
      message:
        "Thank you for your feedback and photo! We'll get back to you soon.",
      data: {
        feedbackId: savedFeedback.id,
        submittedAt: savedFeedback.created_at,
        hasImage: !!imageFile,
      },
    });
  } catch (error) {
    console.error("Error processing feedback:", error);

    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(
          "Uploaded image cleaned up after error:",
          req.file.filename
        );
      } catch (cleanupError) {
        console.warn(
          "Failed to cleanup uploaded image after error:",
          cleanupError.message
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit feedback. Please try again later.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Telegram formatting functions removed - data now stored in database only

// Order rating endpoint for QR code scans
router.post("/order-rating", upload.single("image"), async (req, res) => {
  try {
    const {
      orderData,
      customerName,
      customerEmail,
      overallRating,
      itemRatings,
      comments,
    } = req.body;

    const imageFile = req.file;

    // Parse order data from QR code
    let parsedOrderData;
    try {
      parsedOrderData =
        typeof orderData === "string" ? JSON.parse(orderData) : orderData;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data format",
      });
    }

    // Validate required fields
    if (!parsedOrderData.orderNumber || !customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Order number, customer name, and email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate overall rating
    if (overallRating && (overallRating < 1 || overallRating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Overall rating must be between 1 and 5",
      });
    }

    // Find or create customer
    const customer = await Customer.findOrCreate({
      name: customerName.trim(),
      email: customerEmail.trim().toLowerCase(),
    });

    // Create rating object
    const ratingData = {
      orderNumber: parsedOrderData.orderNumber,
      orderTotal: parsedOrderData.total,
      branch: parsedOrderData.branch,
      cashier: parsedOrderData.cashier,
      orderTimestamp: parsedOrderData.timestamp,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      overallRating: overallRating || null,
      itemRatings: itemRatings ? JSON.parse(itemRatings) : [],
      comments: comments ? comments.trim() : null,
      source: "QR Code Rating",
      imagePath: imageFile ? imageFile.path : null,
      imageFilename: imageFile ? imageFile.filename : null,
      customer_id: customer.id,
    };

    // Store rating in database
    const savedRating = await OrderRating.create(ratingData);

    // Update customer statistics
    await Customer.updateStats(customer.id);

    res.status(200).json({
      success: true,
      message: "Thank you for your rating! We appreciate your feedback.",
      data: {
        ratingId: savedRating.id,
        orderNumber: savedRating.order_number,
        submittedAt: savedRating.created_at,
        hasImage: !!imageFile,
      },
    });
  } catch (error) {
    console.error("Error processing order rating:", error);

    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(
          "Uploaded image cleaned up after error:",
          req.file.filename
        );
      } catch (cleanupError) {
        console.warn(
          "Failed to cleanup uploaded image after error:",
          cleanupError.message
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit rating. Please try again later.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Telegram formatting functions removed - data now stored in database only

// GET /api/feedback - Get all feedback with filters
router.get("/", async (req, res) => {
  try {
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      search: req.query.search || null,
      rating: req.query.rating ? parseInt(req.query.rating) : null,
      source: req.query.source || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };

    const { feedback, total } = await Feedback.getAll(filters);

    res.json({
      success: true,
      data: feedback,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
    });
  }
});

// GET /api/feedback/stats - Get feedback statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await Feedback.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching feedback stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback statistics",
    });
  }
});

// GET /api/feedback/ratings - Get all order ratings with filters
router.get("/ratings", async (req, res) => {
  try {
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      search: req.query.search || null,
      rating: req.query.rating ? parseInt(req.query.rating) : null,
      order_number: req.query.order_number || null,
      branch_name: req.query.branch_name || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };

    const { ratings, total } = await OrderRating.getAll(filters);

    res.json({
      success: true,
      data: ratings,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error fetching order ratings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order ratings",
    });
  }
});

// GET /api/feedback/ratings/stats - Get rating statistics
router.get("/ratings/stats", async (req, res) => {
  try {
    const filters = {
      branch_name: req.query.branch_name || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };

    const stats = await OrderRating.getStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching rating stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rating statistics",
    });
  }
});

// GET /api/feedback/ratings/top-items - Get top rated items
router.get("/ratings/top-items", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const topItems = await OrderRating.getTopRatedItems(limit);

    res.json({
      success: true,
      data: topItems,
    });
  } catch (error) {
    console.error("Error fetching top rated items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top rated items",
    });
  }
});

// POST /api/feedback/:id/reply - Send reply email to customer
router.post("/:id/reply", async (req, res) => {
  try {
    console.log('Reply request received:', req.params.id, req.body);
    
    const feedbackId = req.params.id;
    const { message, internal_note } = req.body;

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    // Get feedback details
    console.log('Fetching feedback with ID:', feedbackId);
    const feedback = await Feedback.getById(feedbackId);
    if (!feedback) {
      console.log('Feedback not found for ID:', feedbackId);
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    console.log('Feedback found:', feedback.email, feedback.name);

    // Update feedback status to 'replied' and store reply details FIRST
    console.log('Updating feedback status to replied');
    await db('feedback')
      .where('id', feedbackId)
      .update({
        status: 'replied',
        reply_message: message.trim(),
        reply_internal_note: internal_note ? internal_note.trim() : null,
        reply_sent_at: new Date(),
        updated_at: new Date()
      });

    // Send response immediately to prevent timeout
    res.json({
      success: true,
      message: "Reply sent successfully to customer",
      data: {
        feedbackId: feedbackId,
        customerEmail: feedback.email,
        replyMessage: message.trim(),
        sentAt: new Date().toISOString(),
        emailMessageId: 'pending' // Will be updated when email completes
      }
    });

    // Send email asynchronously (don't wait for completion)
    console.log('Sending email to:', feedback.email);
    EmailService.sendFeedbackReplyEmail(
      feedback.email,
      feedback.name,
      feedback.message,
      message.trim(),
      feedback.rating
    ).then(emailResult => {
      console.log('Email sent successfully:', emailResult);
      
      // Update the feedback record with the actual email message ID
      if (emailResult.success) {
        db('feedback')
          .where('id', feedbackId)
          .update({
            reply_sent_at: new Date(),
            updated_at: new Date()
          })
          .catch(err => console.error('Error updating email status:', err));
      } else {
        console.error('Failed to send reply email:', emailResult.error);
        // Optionally update status to indicate email failure
        db('feedback')
          .where('id', feedbackId)
          .update({
            status: 'replied',
            updated_at: new Date()
          })
          .catch(err => console.error('Error updating email failure status:', err));
      }
    }).catch(error => {
      console.error('Email sending failed:', error);
      // Update status to indicate email failure
      db('feedback')
        .where('id', feedbackId)
        .update({
          status: 'replied',
          updated_at: new Date()
        })
        .catch(err => console.error('Error updating email failure status:', err));
    });

  } catch (error) {
    console.error("Error sending feedback reply:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send reply",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

// PATCH /api/feedback/:id/mark-read - Mark feedback as read
router.patch("/:id/mark-read", async (req, res) => {
  try {
    const feedbackId = req.params.id;

    // Check if feedback exists
    const feedback = await Feedback.getById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    // Update status to 'read'
    await db('feedback')
      .where('id', feedbackId)
      .update({
        status: 'read',
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: "Feedback marked as read",
      data: {
        feedbackId: feedbackId,
        status: 'read'
      }
    });

  } catch (error) {
    console.error("Error marking feedback as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark feedback as read",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

// PATCH /api/feedback/:id/archive - Archive feedback
router.patch("/:id/archive", async (req, res) => {
  try {
    const feedbackId = req.params.id;

    // Check if feedback exists
    const feedback = await Feedback.getById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    // Update status to 'archived'
    await db('feedback')
      .where('id', feedbackId)
      .update({
        status: 'archived',
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: "Feedback archived successfully",
      data: {
        feedbackId: feedbackId,
        status: 'archived'
      }
    });

  } catch (error) {
    console.error("Error archiving feedback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive feedback",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

// GET /api/feedback/export - Export feedback to CSV
router.get("/export", async (req, res) => {
  try {
    const filters = {
      search: req.query.search || null,
      rating: req.query.rating ? parseInt(req.query.rating) : null,
      source: req.query.source || null,
      status: req.query.status || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };

    const { feedback } = await Feedback.getAll({ ...filters, limit: 10000 }); // Export all

    // Generate CSV content
    const csvHeaders = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Message',
      'Rating',
      'Source',
      'Status',
      'Created At',
      'Reply Message',
      'Reply Sent At',
      'Internal Note'
    ].join(',');

    const csvRows = feedback.map(item => [
      item.id,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      item.email || '',
      item.phone || '',
      `"${(item.message || '').replace(/"/g, '""')}"`,
      item.rating || '',
      item.source || '',
      item.status || 'new',
      item.created_at || '',
      `"${(item.reply_message || '').replace(/"/g, '""')}"`,
      item.reply_sent_at || '',
      `"${(item.reply_internal_note || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=feedback-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error("Error exporting feedback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export feedback",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Feedback service is healthy",
      storage: "Database",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Feedback service health check failed",
      error: error.message,
    });
  }
});

module.exports = router;
