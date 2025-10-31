const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const JobApplication = require("../models/JobApplication");
const Interview = require("../models/Interview");
const EmailService = require("../services/emailService");
const { db } = require("../config/database");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/job-applications");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      resume: ['.pdf', '.doc', '.docx'],
      additional: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
    };
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fieldName = file.fieldname;
    
    if (allowedTypes[fieldName] && allowedTypes[fieldName].includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${fieldName}. Allowed types: ${allowedTypes[fieldName].join(', ')}`), false);
    }
  }
});

// Helper function to verify reCAPTCHA token
const verifyRecaptcha = async (token) => {
  try {
    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!token) {
      return { success: false, error: 'No reCAPTCHA token provided' };
    }

    if (!RECAPTCHA_SECRET_KEY) {
      console.warn('RECAPTCHA_SECRET_KEY not found in environment variables');
      // In development, if no key is set, allow the request (for testing)
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Skipping reCAPTCHA verification in development mode (no secret key)');
        return { success: true, error: null };
      }
      return { success: false, error: 'reCAPTCHA secret key not configured' };
    }

    console.log('Verifying reCAPTCHA token with secret key:', RECAPTCHA_SECRET_KEY.substring(0, 10) + '...');

    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: RECAPTCHA_SECRET_KEY,
        response: token
      }
    });

    console.log('reCAPTCHA verification response:', {
      success: response.data.success,
      errorCodes: response.data['error-codes'],
      hostname: response.data.hostname
    });

    if (response.data['error-codes'] && response.data['error-codes'].includes('invalid-input-secret')) {
      console.error('Invalid reCAPTCHA secret key. Please check your RECAPTCHA_SECRET_KEY in .env file.');
      return { 
        success: false, 
        error: 'Invalid reCAPTCHA secret key. Please contact the administrator.' 
      };
    }

    if (response.data['error-codes'] && response.data['error-codes'].includes('invalid-input-response')) {
      console.error('Invalid reCAPTCHA token. Token may be expired or invalid.');
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed. Please complete the verification again.' 
      };
    }

    return {
      success: response.data.success === true,
      error: response.data['error-codes'] || null
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, error: 'Failed to verify reCAPTCHA: ' + error.message };
  }
};

// POST /api/job-applications - Submit a new job application
router.post("/", upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'additional', maxCount: 1 }
]), async (req, res) => {
  try {
    const applicationData = req.body;
    
    // Verify reCAPTCHA token
    if (!applicationData.recaptchaToken) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification required. Please complete the security verification.',
        error: 'Missing reCAPTCHA token'
      });
    }

    const recaptchaVerification = await verifyRecaptcha(applicationData.recaptchaToken);
    if (!recaptchaVerification.success) {
      // Provide more helpful error messages
      let errorMessage = 'reCAPTCHA verification failed. Please try again.';
      if (recaptchaVerification.error) {
        if (Array.isArray(recaptchaVerification.error)) {
          if (recaptchaVerification.error.includes('invalid-keys')) {
            errorMessage = 'reCAPTCHA configuration error. Please contact the administrator.';
          } else if (recaptchaVerification.error.includes('invalid-input-secret')) {
            errorMessage = 'reCAPTCHA configuration error. Please contact the administrator.';
          } else if (recaptchaVerification.error.includes('invalid-input-response')) {
            errorMessage = 'reCAPTCHA verification expired. Please complete the verification again.';
          }
        }
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: recaptchaVerification.error
      });
    }
    
    // Handle file uploads
    let resumePath = null;
    let additionalDocumentsPath = null;
    
    if (req.files) {
      if (req.files.resume && req.files.resume[0]) {
        resumePath = `/uploads/job-applications/${req.files.resume[0].filename}`;
      }
      if (req.files.additional && req.files.additional[0]) {
        additionalDocumentsPath = `/uploads/job-applications/${req.files.additional[0].filename}`;
      }
    }

    // Prepare application data
    // Coerce types safely for numeric fields that arrive as strings via multipart/form-data
    const normalizedExperienceYears = Number.parseInt(applicationData.experienceYears ?? '0', 10);
    const normalizedExpectedSalary = (applicationData.expectedSalary === undefined ||
                                      applicationData.expectedSalary === null ||
                                      applicationData.expectedSalary === '' ||
                                      applicationData.expectedSalary === 'null')
      ? null
      : Number.parseFloat(applicationData.expectedSalary);
    const normalizedPositionId = (applicationData.positionId === undefined ||
                                  applicationData.positionId === null ||
                                  applicationData.positionId === '' ||
                                  applicationData.positionId === 'null')
      ? null
      : Number.parseInt(applicationData.positionId, 10);

    // Extract branchId if provided (for branch positions)
    const normalizedBranchId = (applicationData.branchId === undefined ||
                                applicationData.branchId === null ||
                                applicationData.branchId === '' ||
                                applicationData.branchId === 'null')
      ? null
      : Number.parseInt(applicationData.branchId, 10);

    const jobApplicationData = {
      fullName: applicationData.fullName,
      email: applicationData.email,
      phone: applicationData.phone,
      dateOfBirth: applicationData.dateOfBirth,
      address: applicationData.address,
      positionTitle: applicationData.positionTitle,
      department: applicationData.department,
      experienceYears: Number.isNaN(normalizedExperienceYears) ? 0 : normalizedExperienceYears,
      expectedSalary: Number.isNaN(normalizedExpectedSalary) ? null : normalizedExpectedSalary,
      skills: applicationData.skills,
      motivation: applicationData.motivation || null,
      availability: applicationData.availability || null,
      additionalNotes: applicationData.additionalNotes || null,
      resumePath: resumePath || null,
      additionalDocumentsPath: additionalDocumentsPath || null,
      positionId: Number.isNaN(normalizedPositionId) ? null : normalizedPositionId,
      branchId: Number.isNaN(normalizedBranchId) ? null : normalizedBranchId,
      applicationDate: applicationData.applicationDate || new Date().toISOString(),
      status: 'new'
    };

    const result = await JobApplication.create(jobApplicationData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error in job application submission:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// Serve job application document file with proper inline headers (bypasses download managers and auth)
// IMPORTANT: This route must come BEFORE /:id route to avoid route conflicts
router.get("/documents/:applicationId/view", async (req, res) => {
  console.log("📄 Document view route hit:", req.params, req.query);
  try {
    const { applicationId } = req.params;
    const { type } = req.query; // 'resume' or 'additional'
    
    if (!type || !['resume', 'additional'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Document type is required (resume or additional)",
      });
    }
    
    // Get application from database to get file path
    const application = await db("job_applications")
      .where("id", applicationId)
      .first();
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }
    
    // Get the file path based on type
    const filePathField = type === 'resume' ? 'resume_path' : 'additional_documents_path';
    const filePath = application[filePathField];
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: `${type === 'resume' ? 'Resume' : 'Additional documents'} not found for this application`,
      });
    }
    
    // Construct full file path
    // filePath is like /uploads/job-applications/resume-xxx.pdf
    // Remove leading slash and join with backend root
    const relativePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const fullPath = path.join(__dirname, "..", relativePath);
    
    console.log('Document view request:', {
      applicationId,
      type,
      filePathField,
      filePath,
      relativePath,
      fullPath,
      exists: fs.existsSync(fullPath)
    });
    
    // Check if file exists, try alternative paths if not found
    let finalPath = fullPath;
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found at primary path: ${fullPath}`);
      console.error(`Original filePath from DB: ${filePath}`);
      
      // Try alternative: just filename in job-applications folder
      const filename = path.basename(filePath);
      const altPath = path.join(__dirname, "..", "uploads", "job-applications", filename);
      
      if (fs.existsSync(altPath)) {
        console.log(`Found file at alternative path: ${altPath}`);
        finalPath = altPath;
      } else {
        console.error(`File also not found at: ${altPath}`);
        return res.status(404).json({
          success: false,
          message: "File not found on server. The file may have been deleted or moved.",
          debug: {
            filePath,
            fullPath,
            altPath,
            exists: false
          }
        });
      }
    }
    
    // Get file extension and determine content type
    const ext = path.extname(finalPath).toLowerCase();
    const basename = path.basename(finalPath);
    
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.doc' || ext === '.docx') {
      contentType = 'application/msword';
    }
    
    // Set headers to force inline display
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${basename}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
    
    // Stream the file
    res.sendFile(finalPath);
  } catch (error) {
    console.error("Error serving job application document:", error);
    res.status(500).json({
      success: false,
      message: "Error serving document",
      error: error.message,
    });
  }
});

// GET /api/job-applications - Get all job applications (with optional filters)
router.get("/", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      department: req.query.department,
      positionId: req.query.positionId
    };

    const result = await JobApplication.getAll(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error retrieving job applications:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// GET /api/job-applications/stats - Get job application statistics
router.get("/stats", async (req, res) => {
  try {
    const result = await JobApplication.getStats();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error retrieving job application stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// Interview Routes - MUST come before /:id routes to avoid conflicts

// POST /api/job-applications/interviews - Schedule a new interview
router.post("/interviews", async (req, res) => {
  try {
    const interviewData = req.body;

    const result = await Interview.create(interviewData);

    if (result.success) {
      // Fire-and-forget: email the applicant their interview schedule with styled template
      (async () => {
        try {
          if (interviewData.applicationId) {
            const appResult = await JobApplication.getById(interviewData.applicationId);
            if (appResult && appResult.success && appResult.data && appResult.data.email) {
              const applicant = appResult.data;
              
              await EmailService.sendInterviewScheduledEmail(
                applicant.email,
                {
                  applicantName: applicant.full_name || applicant.applicant_name,
                  positionTitle: applicant.position_title || applicant.role || '',
                  interviewDate: interviewData.interviewDate,
                  interviewTime: interviewData.interviewTime,
                  interviewType: interviewData.interviewType,
                  location: interviewData.location,
                  meetingLink: interviewData.meetingLink,
                  notes: interviewData.notes
                }
              );
            }
          }
        } catch (e) {
          console.warn('Email send failed for interview schedule:', e.message);
        }
      })();

      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error in interview scheduling:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// Send hire link to applicant's email with prefilled details
router.post("/:id/send-hire-link", async (req, res) => {
  try {
    const applicationId = req.params.id;

    // Fetch the application details
    const appResult = await JobApplication.getById(applicationId);
    if (!appResult.success || !appResult.data) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const app = appResult.data;
    const applicantEmail = app.email || app.applicant_email;
    const applicantName = app.full_name || app.applicant_name || "Applicant";
    const department = app.department || app.department_name || "";
    const roleName = app.position_title || app.role || app.role_name || "";
    const employeeType = "Full-time"; // default for onboarding

    if (!applicantEmail) {
      return res.status(400).json({ success: false, message: "Applicant email not available" });
    }

    // Generate onboarding token
    let onboardingToken = null;
    try {
      onboardingToken = jwt.sign(
        {
          application_id: applicationId,
          email: applicantEmail,
          type: "onboarding"
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
    } catch (error) {
      console.error("Error generating onboarding token:", error);
    }

    const frontendUrl = process.env.FRONTEND_URL || 
      (process.env.NODE_ENV === "production"
        ? "https://www.countryside-steakhouse.site"
        : "http://localhost:8080");
    
    let onboardingLink;
    
    if (onboardingToken) {
      // Use tokenized onboarding link
      onboardingLink = `${frontendUrl}/onboard?token=${encodeURIComponent(onboardingToken)}`;
    } else {
      // Fallback to old link format (should not happen, but just in case)
      onboardingLink = `${frontendUrl}/hr/add-employee?dept=${encodeURIComponent(
        department
      )}&role_name=${encodeURIComponent(roleName)}&employee_type=${encodeURIComponent(
        employeeType
      )}`;
      console.warn('Onboarding token generation failed, using fallback link');
    }

    try {
      // Use styled hire onboarding email
      const emailResult = await EmailService.sendHireOnboardingEmail(
        applicantEmail,
        {
          applicantName: applicantName,
          positionTitle: roleName,
          department: department,
          onboardingLink: onboardingLink
        }
      );

      return res.status(200).json({ success: true, emailResult });
    } catch (err) {
      console.error("Failed to send hire link email:", err);
      return res.status(500).json({ success: false, message: "Failed to send email" });
    }
  } catch (error) {
    console.error("Error sending hire link:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// GET /api/job-applications/interviews - Get all interviews
router.get("/interviews", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      interviewDate: req.query.interviewDate,
      interviewerEmail: req.query.interviewerEmail
    };

    const result = await Interview.getAll(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error retrieving interviews:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// GET /api/job-applications/interviews/upcoming - Get upcoming interviews
router.get("/interviews/upcoming", async (req, res) => {
  try {
    const result = await Interview.getUpcoming();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error retrieving upcoming interviews:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// GET /api/job-applications/interviews/:id - Get a specific interview
router.get("/interviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Interview.getById(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error retrieving interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// PUT /api/job-applications/interviews/:id - Update an interview
router.put("/interviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await Interview.update(id, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error updating interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// PUT /api/job-applications/interviews/:id/status - Update interview status
router.put("/interviews/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, result } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const validStatuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate result if provided
    if (result && !['passed', 'failed'].includes(result)) {
      return res.status(400).json({
        success: false,
        message: "Invalid result. Must be 'passed' or 'failed'"
      });
    }

    const interviewResult = await Interview.updateStatus(id, status, result);

    if (interviewResult.success) {
      res.json(interviewResult);
    } else {
      res.status(404).json(interviewResult);
    }
  } catch (error) {
    console.error("Error updating interview status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// DELETE /api/job-applications/interviews/:id - Delete an interview
router.delete("/interviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Interview.delete(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error deleting interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// GET /api/job-applications/:id - Get a specific job application
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await JobApplication.getById(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error retrieving job application:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// PUT /api/job-applications/:id/status - Update job application status
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const validStatuses = ['new', 'reviewing', 'interview-scheduled', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await JobApplication.updateStatus(id, status);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error updating job application status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// DELETE /api/job-applications/:id - Delete a job application
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await JobApplication.delete(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error deleting job application:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

module.exports = router;
