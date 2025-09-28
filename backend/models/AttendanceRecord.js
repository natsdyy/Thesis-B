const { db: knex } = require("../config/database");

class AttendanceRecord {
  // Valid attendance statuses
  static VALID_STATUSES = {
    PRESENT: "present",
    LATE: "late",
    ABSENT: "absent",
    ON_LEAVE: "on_leave",
    DAY_OFF: "day_off",
  };

  // Valid stored statuses (only these are stored in attendance_records table)
  static STORED_STATUSES = {
    PRESENT: "present",
    LATE: "late",
  };

  // Computed statuses (determined by business logic, not stored in DB)
  static COMPUTED_STATUSES = {
    ABSENT: "absent",
    ON_LEAVE: "on_leave",
    DAY_OFF: "day_off",
  };

  /**
   * Validate if a status is valid
   * @param {string} status - Status to validate
   * @returns {boolean} - True if valid
   */
  static isValidStatus(status) {
    return Object.values(this.VALID_STATUSES).includes(status);
  }

  /**
   * Check if status is a stored status (saved in attendance_records table)
   * @param {string} status - Status to check
   * @returns {boolean} - True if stored status
   */
  static isStoredStatus(status) {
    return Object.values(this.STORED_STATUSES).includes(status);
  }

  /**
   * Check if status is a computed status (determined by business logic)
   * @param {string} status - Status to check
   * @returns {boolean} - True if computed status
   */
  static isComputedStatus(status) {
    return Object.values(this.COMPUTED_STATUSES).includes(status);
  }
  static async create(data) {
    const [record] = await knex("attendance_records")
      .insert(data)
      .returning("*");
    return record;
  }

  static async findByUserId(employeeId, date = null) {
    let query = knex("attendance_records")
      .where("employee_id", employeeId)
      .orderBy("created_at", "desc");

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query.whereBetween("created_at", [startOfDay, endOfDay]);
    }

    return await query;
  }

  static async findByQRCodeId(qrCodeId, date = null) {
    let query = knex("attendance_records")
      .where("qr_code_id", qrCodeId)
      .orderBy("created_at", "desc");

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query.whereBetween("created_at", [startOfDay, endOfDay]);
    }

    return await query;
  }

  static async getTodayAttendance(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await knex("attendance_records")
      .where("employee_id", employeeId)
      .whereBetween("created_at", [today, endOfDay])
      .first();
  }

  static async timeIn(
    employeeId,
    qrCodeId,
    userLatitude = null,
    userLongitude = null
  ) {
    // Check if employee already has attendance for today
    const existingRecord = await this.getTodayAttendance(employeeId);

    if (existingRecord && existingRecord.time_in) {
      throw new Error("You have already timed in today");
    }

    // Check if employee is on approved leave
    const isOnLeave = await this.isEmployeeOnLeave(employeeId);
    if (isOnLeave) {
      throw new Error(
        "You are currently on approved leave and cannot time in. Please contact HR if you need to return early."
      );
    }

    // Validate employee schedule for time-in
    const EmployeeScheduleService = require("../services/EmployeeScheduleService");
    const scheduleValidation =
      await EmployeeScheduleService.validateTimeInSchedule(employeeId);

    if (!scheduleValidation.isValid) {
      // Create a more descriptive error message based on the validation result
      let errorMessage = scheduleValidation.message;

      if (scheduleValidation.reason === "NO_SCHEDULE") {
        errorMessage =
          "No work schedule assigned for today. Please contact your supervisor to set up your schedule.";
      } else if (scheduleValidation.reason === "DAY_OFF") {
        errorMessage =
          "You are scheduled for Day Off today. You cannot time in on your scheduled day off.";
      } else if (scheduleValidation.reason === "OUTSIDE_SCHEDULE") {
        const { schedule, currentTime, timeDifference, direction } =
          scheduleValidation;
        if (timeDifference && direction) {
          const timeDiffText =
            timeDifference < 60
              ? `${timeDifference} minutes`
              : `${Math.round(timeDifference / 60)} hours`;
          errorMessage = `You are ${timeDiffText} ${direction} your scheduled time. Your schedule today is ${schedule.start_time} - ${schedule.end_time} (${schedule.shift_name}).`;
        } else {
          errorMessage = `Time-in is outside your scheduled hours. Your schedule today is ${schedule.start_time} - ${schedule.end_time} (${schedule.shift_name}).`;
        }
      }

      throw new Error(errorMessage);
    }

    // Get QR code details for location validation
    const qrCode = await knex("attendance_qr_codes")
      .where("id", qrCodeId)
      .andWhere("is_active", true)
      .first();

    if (!qrCode) {
      throw new Error("Invalid QR code");
    }

    // Validate location if GPS coordinates are provided
    if (userLatitude && userLongitude && qrCode.latitude && qrCode.longitude) {
      const {
        isWithinRadius,
        isValidCoordinates,
      } = require("../utils/locationUtils");

      // Validate coordinates
      if (!isValidCoordinates(userLatitude, userLongitude)) {
        throw new Error("Invalid GPS coordinates provided");
      }

      if (
        !isValidCoordinates(
          parseFloat(qrCode.latitude),
          parseFloat(qrCode.longitude)
        )
      ) {
        throw new Error("QR code location coordinates are invalid");
      }

      // Check if user is within allowed radius
      const allowedRadius = qrCode.radius_meters || 2.0;
      const isWithinRange = isWithinRadius(
        userLatitude,
        userLongitude,
        parseFloat(qrCode.latitude),
        parseFloat(qrCode.longitude),
        allowedRadius
      );

      if (!isWithinRange) {
        const { getDistanceInfo } = require("../utils/locationUtils");
        const distanceInfo = getDistanceInfo(
          userLatitude,
          userLongitude,
          parseFloat(qrCode.latitude),
          parseFloat(qrCode.longitude)
        );

        throw new Error(
          `You are too far from the attendance location. Distance: ${distanceInfo.humanReadable}, Required: within ${allowedRadius}m`
        );
      }
    }

    // Determine attendance status with grace period based on schedule
    const GRACE_PERIOD_MINUTES = 10;
    let attendanceStatus = "present";
    let tardinessMinutes = 0;

    try {
      const { schedule } = scheduleValidation || {};
      if (schedule && schedule.start_time) {
        // Build today's local date string to avoid timezone skew from DATE columns
        const localDateStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
        const scheduleStart = new Date(
          `${localDateStr}T${schedule.start_time}`
        );
        const graceLimit = new Date(
          scheduleStart.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000
        );
        const now = new Date();
        if (now > graceLimit) {
          attendanceStatus = "late";
          const diffMs = now - scheduleStart;
          const mins = Math.floor(diffMs / (1000 * 60));
          tardinessMinutes = Math.max(mins - GRACE_PERIOD_MINUTES, 0);
        }
      }
    } catch (_) {
      // Fallback to present if any parsing issue occurs
      attendanceStatus = "present";
    }

    const data = {
      employee_id: employeeId,
      qr_code_id: qrCodeId,
      time_in: knex.fn.now(),
      status: attendanceStatus,
      tardiness_minutes: tardinessMinutes,
    };

    if (existingRecord) {
      // Update existing record
      const [updated] = await knex("attendance_records")
        .where("id", existingRecord.id)
        .update({
          time_in: knex.fn.now(),
          status: attendanceStatus,
          tardiness_minutes: tardinessMinutes,
          updated_at: knex.fn.now(),
        })
        .returning("*");
      return updated;
    } else {
      // Create new record
      return await this.create(data);
    }
  }

  static async timeOut(employeeId) {
    const todayRecord = await this.getTodayAttendance(employeeId);

    if (!todayRecord) {
      throw new Error("No time-in record found for today");
    }

    if (todayRecord.time_out) {
      throw new Error("You have already timed out today");
    }

    if (!todayRecord.time_in) {
      throw new Error("You must time in before timing out");
    }

    const timeOut = new Date();
    const timeIn = new Date(todayRecord.time_in);

    // Default calculations without schedule
    let hoursWorked = (timeOut - timeIn) / (1000 * 60 * 60);

    try {
      // Use today's local date to avoid timezone skew
      const localDateStr = new Date().toLocaleDateString("en-CA");
      const EmployeeScheduleService = require("../services/EmployeeScheduleService");
      const schedule = await EmployeeScheduleService.getEmployeeScheduleForDate(
        employeeId,
        localDateStr
      );

      if (schedule && schedule.start_time && schedule.end_time) {
        const scheduleStart = new Date(
          `${localDateStr}T${schedule.start_time}`
        );
        let scheduleEnd = new Date(`${localDateStr}T${schedule.end_time}`);
        if (scheduleEnd <= scheduleStart) {
          scheduleEnd.setDate(scheduleEnd.getDate() + 1);
        }

        const endForWorkCalc = timeOut < scheduleEnd ? timeOut : scheduleEnd;
        const workingMs = Math.max(0, endForWorkCalc - timeIn);
        hoursWorked = workingMs / (1000 * 60 * 60);
        // Per requirement: do not auto-calculate OT; approval flow handles OT separately
      }
    } catch (_) {
      // Fallback to simple diff if schedule fetch fails
      hoursWorked = (timeOut - timeIn) / (1000 * 60 * 60);
    }

    const [updated] = await knex("attendance_records")
      .where("id", todayRecord.id)
      .update({
        time_out: knex.fn.now(),
        hours_worked: hoursWorked.toFixed(2),
        updated_at: knex.fn.now(),
      })
      .returning("*");

    return updated;
  }

  static async getAttendanceReport(employeeId, startDate, endDate) {
    return await knex("attendance_records")
      .select(
        "attendance_records.*",
        "attendance_qr_codes.location_name",
        "employees.first_name",
        "employees.last_name"
      )
      .leftJoin(
        "attendance_qr_codes",
        "attendance_records.qr_code_id",
        "attendance_qr_codes.id"
      )
      .leftJoin("employees", "attendance_records.employee_id", "employees.id")
      .where("attendance_records.employee_id", employeeId)
      .whereBetween("attendance_records.created_at", [startDate, endDate])
      .orderBy("attendance_records.created_at", "desc");
  }

  static async getAllAttendanceReport(startDate, endDate) {
    const records = await knex("attendance_records")
      .select(
        "attendance_records.*",
        "attendance_qr_codes.location_name",
        "employees.first_name",
        "employees.last_name",
        "employees.employee_id"
      )
      .leftJoin(
        "attendance_qr_codes",
        "attendance_records.qr_code_id",
        "attendance_qr_codes.id"
      )
      .leftJoin("employees", "attendance_records.employee_id", "employees.id")
      .whereBetween("attendance_records.created_at", [startDate, endDate])
      .orderBy("attendance_records.created_at", "desc");

    // Add leave status to each record
    const recordsWithLeaveStatus = await Promise.all(
      records.map(async (record) => {
        const isOnLeave = await this.isEmployeeOnLeave(
          record.employee_id,
          record.created_at
        );
        return {
          ...record,
          is_on_leave: isOnLeave,
          attendance_status: isOnLeave ? "on_leave" : record.status || "absent",
        };
      })
    );

    return recordsWithLeaveStatus;
  }

  // Get detailed attendance history (individual time-in/time-out events)
  static async getAttendanceHistory({ start_date, end_date, employee_id }) {
    const startDate = new Date(start_date).toISOString();
    const endDate = new Date(end_date + "T23:59:59.999Z").toISOString();

    let query = knex("attendance_records")
      .select(
        "attendance_records.*",
        "employees.first_name",
        "employees.last_name",
        "employees.employee_id",
        "attendance_qr_codes.location_name"
      )
      .leftJoin(
        "attendance_qr_codes",
        "attendance_records.qr_code_id",
        "attendance_qr_codes.id"
      )
      .leftJoin("employees", "attendance_records.employee_id", "employees.id")
      .whereBetween("attendance_records.created_at", [startDate, endDate]);

    if (employee_id) {
      query = query.where("employees.employee_id", employee_id);
    }

    const records = await query.orderBy(
      "attendance_records.created_at",
      "desc"
    );

    // Transform records to show individual time-in/time-out events
    const history = [];

    records.forEach((record) => {
      // Add time-in event if it exists
      if (record.time_in) {
        history.push({
          id: `${record.id}_time_in`,
          employee_id: record.employee_id,
          employee_name:
            `${record.first_name || ""} ${record.last_name || ""}`.trim(),
          event_type: "time-in",
          created_at: record.time_in,
          location_name: record.location_name,
          status: "present",
          duration: record.time_out
            ? this.calculateDuration(record.time_in, record.time_out)
            : null,
        });
      }

      // Add time-out event if it exists
      if (record.time_out) {
        history.push({
          id: `${record.id}_time_out`,
          employee_id: record.employee_id,
          employee_name:
            `${record.first_name || ""} ${record.last_name || ""}`.trim(),
          event_type: "time-out",
          created_at: record.time_out,
          location_name: record.location_name,
          status: "present",
          duration: record.time_in
            ? this.calculateDuration(record.time_in, record.time_out)
            : null,
        });
      }
    });

    // Sort by date and time (newest first)
    return history.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  // Helper method to calculate duration between two timestamps
  static calculateDuration(timeIn, timeOut) {
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  }

  // Check if employee is on approved leave for a specific date
  static async isEmployeeOnLeave(employeeId, date = null) {
    let targetDate;
    if (date) {
      targetDate = new Date(date);
    } else {
      // Get current date in Philippines timezone (UTC+8)
      const now = new Date();
      const philippinesTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // UTC+8
      targetDate = new Date(philippinesTime.toISOString().split("T")[0]);
    }
    const dateStr = targetDate.toISOString().split("T")[0];

    const leaveRequest = await knex("leave_requests")
      .where("employee_id", employeeId)
      .where("from_date", "<=", dateStr)
      .where("to_date", ">=", dateStr)
      .where("status", "approved_by_hr") // Only HR-approved requests count as actual leave
      .first();

    return !!leaveRequest;
  }

  // Check if employee is scheduled for day off on a specific date
  static async isEmployeeOnDayOff(employeeId, date = null) {
    let targetDate;
    if (date) {
      targetDate = new Date(date);
    } else {
      // Get current date in Philippines timezone (UTC+8)
      const now = new Date();
      const philippinesTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // UTC+8
      targetDate = new Date(philippinesTime.toISOString().split("T")[0]);
    }
    const dateStr = targetDate.toISOString().split("T")[0];

    const schedule = await knex("employee_schedules")
      .where("employee_id", employeeId)
      .where("schedule_date", dateStr)
      .first();

    return schedule && schedule.shift_name === "Day Off";
  }

  // Enhanced getTodayAttendance that includes leave status and day off detection
  static async getTodayAttendanceWithLeaveStatus(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get attendance record
    const attendanceRecord = await knex("attendance_records")
      .where("employee_id", employeeId)
      .whereBetween("created_at", [today, endOfDay])
      .first();

    // Check if employee is on leave or day off
    const isOnLeave = await this.isEmployeeOnLeave(employeeId);
    const isOnDayOff = await this.isEmployeeOnDayOff(employeeId);

    // Determine attendance status with priority: day_off > on_leave > present/late > absent
    let attendanceStatus;
    if (isOnDayOff) {
      attendanceStatus = "day_off";
    } else if (isOnLeave) {
      attendanceStatus = "on_leave";
    } else if (attendanceRecord) {
      attendanceStatus = attendanceRecord.status;
    } else {
      attendanceStatus = "absent";
    }

    return {
      ...attendanceRecord,
      is_on_leave: isOnLeave,
      is_on_day_off: isOnDayOff,
      attendance_status: attendanceStatus,
    };
  }
}

module.exports = AttendanceRecord;
