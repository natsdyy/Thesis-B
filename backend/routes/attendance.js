const express = require('express');
const router = express.Router();
const AttendanceQRCode = require('../models/AttendanceQRCode');
const AttendanceRecord = require('../models/AttendanceRecord');
const { authenticateToken } = require('../middleware/rbac');

// QR Code Management Routes
router.get('/qr-codes', authenticateToken, async (req, res) => {
  try {
    const qrCodes = await AttendanceQRCode.findAll();
    res.json({
      success: true,
      data: qrCodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch QR codes',
      error: error.message
    });
  }
});

router.post('/qr-codes', authenticateToken, async (req, res) => {
  try {
    const { location_name, description, latitude, longitude, branch_id, radius_meters } = req.body;
    
    if (!location_name) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    // Validate GPS coordinates if provided
    if (latitude && longitude) {
      const { isValidCoordinates } = require('../utils/locationUtils');
      if (!isValidCoordinates(latitude, longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GPS coordinates provided'
        });
      }
    }

    const qrCode = await AttendanceQRCode.generateQRCode(
      location_name, 
      description, 
      latitude, 
      longitude, 
      branch_id, 
      radius_meters || 2.0
    );
    
    res.status(201).json({
      success: true,
      data: qrCode,
      message: 'QR code generated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message
    });
  }
});

router.put('/qr-codes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { location_name, description, is_active } = req.body;
    
    const updated = await AttendanceQRCode.update(id, {
      location_name,
      description,
      is_active
    });
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }
    
    res.json({
      success: true,
      data: updated,
      message: 'QR code updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update QR code',
      error: error.message
    });
  }
});

router.delete('/qr-codes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await AttendanceQRCode.delete(id);
    
    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete QR code',
      error: error.message
    });
  }
});

// Attendance Routes
router.post('/time-in', authenticateToken, async (req, res) => {
  try {
    const { qr_code, latitude, longitude } = req.body;
    const employeeId = req.user.id; // This is the employee ID from JWT
    
    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required'
      });
    }
    
    // Find QR code
    const qrCodeRecord = await AttendanceQRCode.findByQRCode(qr_code);
    if (!qrCodeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code'
      });
    }
    
    // Time in with location validation
    const attendanceRecord = await AttendanceRecord.timeIn(employeeId, qrCodeRecord.id, latitude, longitude);
    
    res.json({
      success: true,
      data: attendanceRecord,
      message: `Successfully timed in at ${qrCodeRecord.location_name}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/time-out', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id; // This is the employee ID from JWT
    
    const attendanceRecord = await AttendanceRecord.timeOut(employeeId);
    
    res.json({
      success: true,
      data: attendanceRecord,
      message: 'Successfully timed out'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/my-attendance', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id; // This is the employee ID from JWT
    const { date } = req.query;
    
    const attendance = await AttendanceRecord.findByUserId(employeeId, date);
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
});

router.get('/today', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id; // This is the employee ID from JWT
    
    const todayAttendance = await AttendanceRecord.getTodayAttendance(employeeId);
    
    res.json({
      success: true,
      data: todayAttendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s attendance',
      error: error.message
    });
  }
});

router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    let report;
    if (user_id) {
      report = await AttendanceRecord.getAttendanceReport(user_id, start_date, end_date);
    } else {
      report = await AttendanceRecord.getAllAttendanceReport(start_date, end_date);
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate attendance report',
      error: error.message
    });
  }
});

// Get detailed attendance history (individual time-in/time-out events)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const history = await AttendanceRecord.getAttendanceHistory({
      start_date,
      end_date,
      employee_id
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message
    });
  }
});

// Public route for QR code validation (for mobile scanning)
router.post('/validate-qr', async (req, res) => {
  try {
    const { qr_code } = req.body;
    
    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required'
      });
    }
    
    const qrCodeRecord = await AttendanceQRCode.findByQRCode(qr_code);
    
    if (!qrCodeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: qrCodeRecord.id,
        location_name: qrCodeRecord.location_name,
        description: qrCodeRecord.description
      },
      message: 'Valid QR code'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate QR code',
      error: error.message
    });
  }
});

// Public route for QR code scanning (for AttendanceScan.vue)
router.post('/scan-qr', async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR data is required'
      });
    }
    
    const qrCodeRecord = await AttendanceQRCode.findByQRCode(qrData);
    
    if (!qrCodeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: qrCodeRecord.id,
        location_name: qrCodeRecord.location_name,
        description: qrCodeRecord.description,
        qr_code: qrCodeRecord.qr_code
      },
      message: 'QR code scanned successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to scan QR code',
      error: error.message
    });
  }
});

// Public route for mobile app QR code processing (no authentication required)
router.post('/mobile-scan', async (req, res) => {
  try {
    const { action, employee_id, location, latitude, longitude } = req.body;
    
    if (!action || !employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Action and employee_id are required'
      });
    }
    
    // Find employee by employee_id
    const Employee = require('../models/Employee');
    const employee = await Employee.getByEmployeeId(employee_id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Create a temporary QR code for this mobile scan with GPS coordinates
    const tempQRCode = `MOBILE_QR_${employee_id}_${Date.now()}`;
    const qrCodeRecord = await AttendanceQRCode.create({
      qr_code: tempQRCode,
      location_name: location || 'Mobile App QR Code',
      description: 'Mobile app generated QR code',
      latitude: latitude || null,
      longitude: longitude || null,
      radius_meters: 2.0, // Default 2-meter radius
      is_active: true
    });
    
    // Process attendance using the employee's ID (not employee_id) with location validation
    let attendanceRecord;
    if (action === 'time-in') {
      attendanceRecord = await AttendanceRecord.timeIn(employee.id, qrCodeRecord.id, latitude, longitude);
    } else if (action === 'time-out') {
      attendanceRecord = await AttendanceRecord.timeOut(employee.id);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be time-in or time-out'
      });
    }
    
    res.json({
      success: true,
      data: attendanceRecord,
      message: `Successfully ${action.replace('-', ' ')} for ${employee.first_name} ${employee.last_name}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
