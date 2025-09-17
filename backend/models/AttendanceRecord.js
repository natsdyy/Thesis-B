const { db: knex } = require("../config/database");

class AttendanceRecord {
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

  static async timeIn(employeeId, qrCodeId) {
    // Check if employee already has attendance for today
    const existingRecord = await this.getTodayAttendance(employeeId);

    if (existingRecord && existingRecord.time_in) {
      throw new Error("You have already timed in today");
    }

    const data = {
      employee_id: employeeId,
      qr_code_id: qrCodeId,
      time_in: knex.fn.now(),
      status: "present",
    };

    if (existingRecord) {
      // Update existing record
      const [updated] = await knex("attendance_records")
        .where("id", existingRecord.id)
        .update({
          time_in: knex.fn.now(),
          status: "present",
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
    const hoursWorked = (timeOut - timeIn) / (1000 * 60 * 60); // Convert to hours

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
    return await knex("attendance_records")
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
  }

  // Get detailed attendance history (individual time-in/time-out events)
  static async getAttendanceHistory({ start_date, end_date, employee_id }) {
    const startDate = new Date(start_date).toISOString();
    const endDate = new Date(end_date + 'T23:59:59.999Z').toISOString();

    let query = knex("attendance_records")
      .select(
        "attendance_records.*",
        "employees.first_name",
        "employees.last_name",
        "employees.employee_id",
        "attendance_qr_codes.location_name"
      )
      .leftJoin("attendance_qr_codes", "attendance_records.qr_code_id", "attendance_qr_codes.id")
      .leftJoin("employees", "attendance_records.employee_id", "employees.id")
      .whereBetween("attendance_records.created_at", [startDate, endDate]);

    if (employee_id) {
      query = query.where("employees.employee_id", employee_id);
    }

    const records = await query.orderBy("attendance_records.created_at", "desc");

    // Transform records to show individual time-in/time-out events
    const history = [];
    
    records.forEach(record => {
      // Add time-in event if it exists
      if (record.time_in) {
        history.push({
          id: `${record.id}_time_in`,
          employee_id: record.employee_id,
          employee_name: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
          event_type: 'time-in',
          created_at: record.time_in,
          location_name: record.location_name,
          status: 'present',
          duration: record.time_out ? this.calculateDuration(record.time_in, record.time_out) : null
        });
      }
      
      // Add time-out event if it exists
      if (record.time_out) {
        history.push({
          id: `${record.id}_time_out`,
          employee_id: record.employee_id,
          employee_name: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
          event_type: 'time-out',
          created_at: record.time_out,
          location_name: record.location_name,
          status: 'present',
          duration: record.time_in ? this.calculateDuration(record.time_in, record.time_out) : null
        });
      }
    });

    // Sort by date and time (newest first)
    return history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
}

module.exports = AttendanceRecord;
