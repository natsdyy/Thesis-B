const { db } = require("../config/database");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");

class PayrollRecord {
  /**
   * Create a new payroll record
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  static async create(data) {
    const [record] = await db("payroll_records")
      .insert({
        payroll_period_id: data.payroll_period_id,
        employee_id: data.employee_id,
        employee_name: data.employee_name,
        department: data.department,
        branch_id: data.branch_id || null,
        role_name: data.role_name,
        rate_per_hour: data.rate_per_hour,
        employee_type: data.employee_type,
        // Government benefit numbers
        sss_number: data.sss_number || null,
        philhealth_number: data.philhealth_number || null,
        pagibig_number: data.pagibig_number || null,
        days_worked: data.days_worked || 0,
        hours_worked: data.hours_worked || 0,
        overtime_hours: data.overtime_hours || 0,
        late_count: data.late_count || 0,
        absent_from_lates: data.absent_from_lates || 0,
        leave_days: data.leave_days || 0,
        sil_used_days: data.sil_used_days || 0,
        sil_converted_days: data.sil_converted_days || 0,
        basic_salary: data.basic_salary || 0,
        regular_holiday_pay: data.regular_holiday_pay || 0,
        special_holiday_pay: data.special_holiday_pay || 0,
        double_holiday_pay: data.double_holiday_pay || 0,
        holiday_hours_worked: data.holiday_hours_worked || 0,
        overtime_pay: data.overtime_pay || 0,
        sil_conversion_pay: data.sil_conversion_pay || 0,
        sss_employee_share: data.sss_employee_share || 0,
        philhealth_employee_share: data.philhealth_employee_share || 0,
        pagibig_employee_share: data.pagibig_employee_share || 0,
        sss_employer_share: data.sss_employer_share || 0,
        philhealth_employer_share: data.philhealth_employer_share || 0,
        pagibig_employer_share: data.pagibig_employer_share || 0,
        total_deductions: data.total_deductions || 0,
        total_employer_contributions: data.total_employer_contributions || 0,
        gross_salary: data.gross_salary || 0,
        net_salary: data.net_salary || 0,
        status: data.status || "pending",
        remarks: data.remarks || null,
        created_at: formatForDatabase(getCurrentPhilippineTime()),
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");

    return record;
  }

  /**
   * Get all records for a payroll period
   * @param {number} periodId
   * @returns {Promise<Array>}
   */
  static async getByPeriodId(periodId) {
    const records = await db("payroll_records as pr")
      .leftJoin("employees as e", "pr.employee_id", "e.id")
      .leftJoin("branches as b", "pr.branch_id", "b.id")
      .where("pr.payroll_period_id", periodId)
      .whereNull("pr.deleted_at")
      .select(
        "pr.*",
        "e.first_name",
        "e.last_name",
        "e.email",
        "e.photo_url",
        "b.name as branch_name"
      )
      .orderBy("pr.employee_name", "asc");

    return records;
  }

  /**
   * Get payroll record by ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  static async getById(id) {
    const record = await db("payroll_records as pr")
      .leftJoin("employees as e", "pr.employee_id", "e.id")
      .leftJoin("branches as b", "pr.branch_id", "b.id")
      .where("pr.id", id)
      .whereNull("pr.deleted_at")
      .select(
        "pr.*",
        "e.first_name",
        "e.last_name",
        "e.email",
        "e.photo_url",
        "b.name as branch_name"
      )
      .first();

    if (!record) {
      throw new Error("Payroll record not found");
    }

    return record;
  }

  /**
   * Update a payroll record
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  static async update(id, data) {
    const [record] = await db("payroll_records")
      .where("id", id)
      .update({
        ...data,
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");

    return record;
  }

  /**
   * Bulk create payroll records
   * @param {Array} records
   * @returns {Promise<Array>}
   */
  static async bulkCreate(records) {
    const inserted = await db("payroll_records")
      .insert(
        records.map((r) => ({
          ...r,
          created_at: formatForDatabase(getCurrentPhilippineTime()),
          updated_at: formatForDatabase(getCurrentPhilippineTime()),
        }))
      )
      .returning("*");

    return inserted;
  }

  /**
   * Get payroll history for an employee
   * @param {number} employeeId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  static async getEmployeeHistory(employeeId, filters = {}) {
    const { limit = 10, offset = 0 } = filters;

    const records = await db("payroll_records as pr")
      .join("payroll_periods as pp", "pr.payroll_period_id", "pp.id")
      .where("pr.employee_id", employeeId)
      .whereNull("pr.deleted_at")
      .whereNull("pp.deleted_at")
      .select(
        "pr.*",
        "pp.period_name",
        "pp.period_type",
        "pp.date_from",
        "pp.date_to",
        "pp.status as period_status"
      )
      .orderBy("pp.date_to", "desc")
      .limit(limit)
      .offset(offset);

    return records;
  }

  /**
   * Update email status
   * @param {number} id
   * @param {boolean} sent
   * @returns {Promise<Object>}
   */
  static async updateEmailStatus(id, sent) {
    const [record] = await db("payroll_records")
      .where("id", id)
      .update({
        email_sent: sent,
        email_sent_at: sent
          ? formatForDatabase(getCurrentPhilippineTime())
          : null,
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");

    return record;
  }

  /**
   * Update status for a payroll record
   * @param {number} id
   * @param {string} status - 'pending', 'paid', etc.
   * @returns {Promise<Object>}
   */
  static async updateStatus(id, status) {
    const [record] = await db("payroll_records")
      .where("id", id)
      .update({
        status: status,
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");

    return record;
  }

  /**
   * Delete (soft delete) a payroll record
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    await db("payroll_records")
      .where("id", id)
      .update({
        deleted_at: formatForDatabase(getCurrentPhilippineTime()),
      });

    return true;
  }
}

module.exports = PayrollRecord;
