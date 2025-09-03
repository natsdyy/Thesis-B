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
    const { location_name, description } = req.body;
    
    if (!location_name) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    const qrCode = await AttendanceQRCode.generateQRCode(location_name, description);
    
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
    const { qr_code } = req.body;
    const userId = req.user.id;
    
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
    
    // Time in
    const attendanceRecord = await AttendanceRecord.timeIn(userId, qrCodeRecord.id);
    
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
    const userId = req.user.id;
    
    const attendanceRecord = await AttendanceRecord.timeOut(userId);
    
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
    const userId = req.user.id;
    const { date } = req.query;
    
    const attendance = await AttendanceRecord.findByUserId(userId, date);
    
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
    const userId = req.user.id;
    
    const todayAttendance = await AttendanceRecord.getTodayAttendance(userId);
    
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

module.exports = router;
