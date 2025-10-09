const { db } = require("../config/database");
const PayrollPeriod = require("../models/PayrollPeriod");
const PayrollRecord = require("../models/PayrollRecord");
const Holidays = require("date-holidays");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
  formatPhilippineTime,
} = require("../utils/timezoneUtils");

class PayrollService {
  /**
   * Generate payroll for a department
   * @param {string} department
   * @param {string} periodType
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @param {number} generatedBy
   * @param {string} periodName - Optional custom period name
   * @param {string} remarks - Optional remarks
   * @returns {Promise<Object>}
   */
  static async generatePayrollForDepartment(
    department,
    periodType,
    dateFrom,
    dateTo,
    generatedBy,
    periodName = null,
    remarks = null
  ) {
    // Check for overlap
    const hasOverlap = await PayrollPeriod.checkOverlap(
      dateFrom,
      dateTo,
      department,
      null
    );
    if (hasOverlap) {
      throw new Error(
        `A payroll period already exists for ${department} department in this date range`
      );
    }

    // Get all employees in the department
    const employees = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .where("e.department", department)
      .where("e.status", "Active")
      .whereNull("e.deleted_at")
      .select("e.*", "r.role as role_name", "r.rate_per_hour");

    if (!employees.length) {
      throw new Error(`No active employees found in ${department} department`);
    }

    // Calculate payroll for each employee
    const records = await Promise.all(
      employees.map((emp) =>
        this.calculateEmployeePayroll(emp, dateFrom, dateTo)
      )
    );

    // Calculate totals
    const totals = records.reduce(
      (acc, r) => ({
        gross: acc.gross + Number(r.gross_salary || 0),
        deductions: acc.deductions + Number(r.total_deductions || 0),
        net: acc.net + Number(r.net_salary || 0),
      }),
      { gross: 0, deductions: 0, net: 0 }
    );

    // Create payroll period
    const defaultPeriodName = `${department} - ${formatPhilippineTime(dateFrom, "date")} to ${formatPhilippineTime(dateTo, "date")}`;
    const period = await PayrollPeriod.create({
      period_name: periodName || defaultPeriodName,
      period_type: periodType,
      date_from: formatForDatabase(dateFrom),
      date_to: formatForDatabase(dateTo),
      generated_by: generatedBy,
      total_gross_amount: totals.gross,
      total_deductions: totals.deductions,
      total_net_amount: totals.net,
      remarks: remarks,
    });

    // Create payroll records
    const recordsWithPeriodId = records.map((r) => ({
      ...r,
      payroll_period_id: period.id,
    }));

    await PayrollRecord.bulkCreate(recordsWithPeriodId);

    return await PayrollPeriod.getById(period.id);
  }

  /**
   * Generate payroll for a branch
   * @param {number} branchId
   * @param {string} periodType
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @param {number} generatedBy
   * @param {string} periodName - Optional custom period name
   * @param {string} remarks - Optional remarks
   * @returns {Promise<Object>}
   */
  static async generatePayrollForBranch(
    branchId,
    periodType,
    dateFrom,
    dateTo,
    generatedBy,
    periodName = null,
    remarks = null
  ) {
    // Check for overlap
    const hasOverlap = await PayrollPeriod.checkOverlap(
      dateFrom,
      dateTo,
      null,
      branchId
    );
    if (hasOverlap) {
      throw new Error(
        `A payroll period already exists for this branch in this date range`
      );
    }

    // Get branch info
    const branch = await db("branches").where("id", branchId).first();
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Get all employees in the branch
    const employees = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .where("e.branch_id", branchId)
      .where("e.status", "Active")
      .whereNull("e.deleted_at")
      .select("e.*", "r.role as role_name", "r.rate_per_hour");

    if (!employees.length) {
      throw new Error(`No active employees found in ${branch.name} branch`);
    }

    // Calculate payroll for each employee
    const records = await Promise.all(
      employees.map((emp) =>
        this.calculateEmployeePayroll(emp, dateFrom, dateTo)
      )
    );

    // Calculate totals
    const totals = records.reduce(
      (acc, r) => ({
        gross: acc.gross + Number(r.gross_salary || 0),
        deductions: acc.deductions + Number(r.total_deductions || 0),
        net: acc.net + Number(r.net_salary || 0),
      }),
      { gross: 0, deductions: 0, net: 0 }
    );

    // Create payroll period
    const defaultPeriodName = `${branch.name} - ${formatPhilippineTime(dateFrom, "date")} to ${formatPhilippineTime(dateTo, "date")}`;
    const period = await PayrollPeriod.create({
      period_name: periodName || defaultPeriodName,
      period_type: periodType,
      date_from: formatForDatabase(dateFrom),
      date_to: formatForDatabase(dateTo),
      generated_by: generatedBy,
      total_gross_amount: totals.gross,
      total_deductions: totals.deductions,
      total_net_amount: totals.net,
      remarks: remarks,
    });

    // Create payroll records
    const recordsWithPeriodId = records.map((r) => ({
      ...r,
      payroll_period_id: period.id,
    }));

    await PayrollRecord.bulkCreate(recordsWithPeriodId);

    return await PayrollPeriod.getById(period.id);
  }

  /**
   * Calculate payroll for a single employee
   * @param {Object} employee
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Promise<Object>}
   */
  static async calculateEmployeePayroll(employee, dateFrom, dateTo) {
    const hourlyRate = Number(employee.rate_per_hour || 0);
    const employeeType = employee.employee_type || "Full-time";
    const hoursPerDay = employeeType === "Full-time" ? 8 : 4;

    // Get attendance records for the period
    const attendanceRecords = await db("attendance_records")
      .where("employee_id", employee.id)
      .whereBetween("created_at", [
        formatForDatabase(dateFrom),
        formatForDatabase(dateTo),
      ])
      .select("*");

    // Calculate hours worked and overtime
    let totalHoursWorked = 0;
    let totalOvertimeHours = 0;
    let lateCount = 0;
    let leaveDays = 0;
    let regularHolidayPay = 0;
    let specialHolidayPay = 0;
    let doubleHolidayPay = 0;
    let holidayHoursWorked = 0;

    // Get Philippine holidays in the period
    const holidays = this.getPhilippineHolidays(dateFrom, dateTo);

    // Track consecutive lates for absence calculation
    let consecutiveLates = 0;
    let absentFromLates = 0;

    for (const record of attendanceRecords) {
      const recordDate = new Date(record.created_at);
      const holiday = holidays.find(
        (h) =>
          formatPhilippineTime(h.date, "date") ===
          formatPhilippineTime(recordDate, "date")
      );

      // Check if late
      if (record.attendance_status === "late") {
        lateCount++;
        consecutiveLates++;

        // 3 consecutive lates = 1 absent day
        if (consecutiveLates >= 3) {
          absentFromLates += 1;
          consecutiveLates = 0;
        }
      } else {
        consecutiveLates = 0; // Reset if not late
      }

      // Check if on leave
      if (record.attendance_status === "on_leave") {
        leaveDays++;
        continue;
      }

      // Skip if day off or absent
      if (
        record.attendance_status === "day_off" ||
        record.attendance_status === "absent"
      ) {
        continue;
      }

      // Calculate hours worked
      const hoursWorked = Number(record.hours_worked || 0);
      const overtimeHours = Number(record.overtime_hours || 0);

      if (holiday) {
        // Holiday pay calculation
        holidayHoursWorked += hoursWorked;
        const dailyRate = hourlyRate * hoursPerDay;

        switch (holiday.type) {
          case "regular":
            if (hoursWorked > 0) {
              // Worked on regular holiday: 200% of daily rate
              regularHolidayPay += dailyRate * 2;
              // Add OT if applicable (30% on top of 200%)
              if (overtimeHours > 0) {
                regularHolidayPay += hourlyRate * overtimeHours * 0.3;
              }
            } else {
              // Did not work: 100% of daily rate
              regularHolidayPay += dailyRate;
            }
            break;

          case "special_non_working":
            if (hoursWorked > 0) {
              // Worked on special non-working: 130% of daily rate
              specialHolidayPay += dailyRate * 1.3;
              // Add OT if applicable (30% on top of 130%)
              if (overtimeHours > 0) {
                specialHolidayPay += hourlyRate * overtimeHours * 0.3;
              }
            }
            // If did not work: no pay (unless company policy states otherwise)
            break;

          case "special_working":
            // Treated as ordinary day: 100% of daily rate
            totalHoursWorked += hoursWorked;
            break;

          case "double":
            if (hoursWorked > 0) {
              // Worked on double holiday: 300% of daily rate
              doubleHolidayPay += dailyRate * 3;
              // Add OT if applicable (30% on top of 300%)
              if (overtimeHours > 0) {
                doubleHolidayPay += hourlyRate * overtimeHours * 0.3;
              }
            } else {
              // Did not work: 200% of daily rate
              doubleHolidayPay += dailyRate * 2;
            }
            break;
        }

        totalOvertimeHours += overtimeHours;
      } else {
        // Regular workday
        totalHoursWorked += hoursWorked;
        totalOvertimeHours += overtimeHours;
      }
    }

    // Calculate days worked
    const daysWorked = totalHoursWorked / hoursPerDay;

    // Calculate basic salary
    const basicSalary = totalHoursWorked * hourlyRate;

    // Calculate overtime pay (1.25x for first 8 hours of OT)
    const overtimePay = totalOvertimeHours * hourlyRate * 1.25;

    // Calculate SIL conversion if applicable
    const silConversionPay = await this.calculateSILConversion(
      employee.id,
      dateFrom,
      dateTo
    );

    // Calculate gross salary
    const grossSalary =
      basicSalary +
      overtimePay +
      regularHolidayPay +
      specialHolidayPay +
      doubleHolidayPay +
      silConversionPay;

    // Calculate government deductions
    const deductions = this.calculateGovernmentDeductions(
      grossSalary,
      employee
    );

    // Calculate net salary
    const netSalary = grossSalary - deductions.totalEmployeeShare;

    return {
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      department: employee.department,
      branch_id: employee.branch_id,
      role_name: employee.role_name || employee.job_title,
      rate_per_hour: hourlyRate,
      employee_type: employeeType,
      days_worked: daysWorked - absentFromLates,
      hours_worked: totalHoursWorked,
      overtime_hours: totalOvertimeHours,
      late_count: lateCount,
      absent_from_lates: absentFromLates,
      leave_days: leaveDays,
      sil_used_days: 0, // TODO: Track from leave system
      sil_converted_days: silConversionPay > 0 ? 5 : 0,
      basic_salary: basicSalary,
      regular_holiday_pay: regularHolidayPay,
      special_holiday_pay: specialHolidayPay,
      double_holiday_pay: doubleHolidayPay,
      holiday_hours_worked: holidayHoursWorked,
      overtime_pay: overtimePay,
      sil_conversion_pay: silConversionPay,
      sss_employee_share: deductions.sssEmployee,
      philhealth_employee_share: deductions.philhealthEmployee,
      pagibig_employee_share: deductions.pagibigEmployee,
      sss_employer_share: deductions.sssEmployer,
      philhealth_employer_share: deductions.philhealthEmployer,
      pagibig_employer_share: deductions.pagibigEmployer,
      total_deductions: deductions.totalEmployeeShare,
      total_employer_contributions: deductions.totalEmployerShare,
      gross_salary: grossSalary,
      net_salary: netSalary,
      status: "pending",
    };
  }

  /**
   * Get Philippine holidays in a date range
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Array}
   */
  static getPhilippineHolidays(dateFrom, dateTo) {
    const hd = new Holidays("PH");
    const holidays = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    // Get holidays for the range
    const year = start.getFullYear();
    const yearHolidays = hd.getHolidays(year);

    for (const holiday of yearHolidays) {
      const holidayDate = new Date(holiday.date);
      if (holidayDate >= start && holidayDate <= end) {
        // Determine holiday type based on holiday name
        let type = "special_working";

        if (holiday.type === "public") {
          type = "regular"; // Regular holidays like New Year, Independence Day, etc.
        } else if (holiday.type === "observance") {
          type = "special_non_working";
        }

        holidays.push({
          date: holidayDate,
          name: holiday.name,
          type: type,
        });
      }
    }

    // Check for custom company holidays
    // TODO: Implement custom holidays from database

    return holidays;
  }

  /**
   * Calculate government deductions based on PH 2025 rates
   * @param {number} grossSalary
   * @param {Object} employee
   * @returns {Object}
   */
  static calculateGovernmentDeductions(grossSalary, employee) {
    // Calculate monthly salary for bracket determination
    const monthlySalary = grossSalary;

    // SSS Contribution (2025 rates - simplified)
    let sssEmployee = 0;
    let sssEmployer = 0;

    if (monthlySalary <= 4250) {
      sssEmployee = 180;
      sssEmployer = 380;
    } else if (monthlySalary <= 4750) {
      sssEmployee = 202.5;
      sssEmployer = 427.5;
    } else if (monthlySalary <= 5250) {
      sssEmployee = 225;
      sssEmployer = 475;
    } else if (monthlySalary <= 5750) {
      sssEmployee = 247.5;
      sssEmployer = 522.5;
    } else if (monthlySalary <= 6250) {
      sssEmployee = 270;
      sssEmployer = 570;
    } else if (monthlySalary <= 6750) {
      sssEmployee = 292.5;
      sssEmployer = 617.5;
    } else if (monthlySalary <= 7250) {
      sssEmployee = 315;
      sssEmployer = 665;
    } else if (monthlySalary <= 7750) {
      sssEmployee = 337.5;
      sssEmployer = 712.5;
    } else if (monthlySalary <= 8250) {
      sssEmployee = 360;
      sssEmployer = 760;
    } else if (monthlySalary <= 8750) {
      sssEmployee = 382.5;
      sssEmployer = 807.5;
    } else if (monthlySalary <= 9250) {
      sssEmployee = 405;
      sssEmployer = 855;
    } else if (monthlySalary <= 9750) {
      sssEmployee = 427.5;
      sssEmployer = 902.5;
    } else if (monthlySalary <= 10250) {
      sssEmployee = 450;
      sssEmployer = 950;
    } else if (monthlySalary <= 10750) {
      sssEmployee = 472.5;
      sssEmployer = 997.5;
    } else if (monthlySalary <= 11250) {
      sssEmployee = 495;
      sssEmployer = 1045;
    } else if (monthlySalary <= 11750) {
      sssEmployee = 517.5;
      sssEmployer = 1092.5;
    } else if (monthlySalary <= 12250) {
      sssEmployee = 540;
      sssEmployer = 1140;
    } else if (monthlySalary <= 12750) {
      sssEmployee = 562.5;
      sssEmployer = 1187.5;
    } else if (monthlySalary <= 13250) {
      sssEmployee = 585;
      sssEmployer = 1235;
    } else if (monthlySalary <= 13750) {
      sssEmployee = 607.5;
      sssEmployer = 1282.5;
    } else if (monthlySalary <= 14250) {
      sssEmployee = 630;
      sssEmployer = 1330;
    } else if (monthlySalary <= 14750) {
      sssEmployee = 652.5;
      sssEmployer = 1377.5;
    } else if (monthlySalary <= 15250) {
      sssEmployee = 675;
      sssEmployer = 1425;
    } else if (monthlySalary <= 15750) {
      sssEmployee = 697.5;
      sssEmployer = 1472.5;
    } else if (monthlySalary <= 16250) {
      sssEmployee = 720;
      sssEmployer = 1520;
    } else if (monthlySalary <= 16750) {
      sssEmployee = 742.5;
      sssEmployer = 1567.5;
    } else if (monthlySalary <= 17250) {
      sssEmployee = 765;
      sssEmployer = 1615;
    } else if (monthlySalary <= 17750) {
      sssEmployee = 787.5;
      sssEmployer = 1662.5;
    } else if (monthlySalary <= 18250) {
      sssEmployee = 810;
      sssEmployer = 1710;
    } else if (monthlySalary <= 18750) {
      sssEmployee = 832.5;
      sssEmployer = 1757.5;
    } else if (monthlySalary <= 19250) {
      sssEmployee = 855;
      sssEmployer = 1805;
    } else if (monthlySalary <= 19750) {
      sssEmployee = 877.5;
      sssEmployer = 1852.5;
    } else if (monthlySalary <= 20250) {
      sssEmployee = 900;
      sssEmployer = 1900;
    } else if (monthlySalary <= 20750) {
      sssEmployee = 922.5;
      sssEmployer = 1947.5;
    } else if (monthlySalary <= 21250) {
      sssEmployee = 945;
      sssEmployer = 1995;
    } else if (monthlySalary <= 21750) {
      sssEmployee = 967.5;
      sssEmployer = 2042.5;
    } else if (monthlySalary <= 22250) {
      sssEmployee = 990;
      sssEmployer = 2090;
    } else if (monthlySalary <= 22750) {
      sssEmployee = 1012.5;
      sssEmployer = 2137.5;
    } else if (monthlySalary <= 23250) {
      sssEmployee = 1035;
      sssEmployer = 2185;
    } else if (monthlySalary <= 23750) {
      sssEmployee = 1057.5;
      sssEmployer = 2232.5;
    } else if (monthlySalary <= 24250) {
      sssEmployee = 1080;
      sssEmployer = 2280;
    } else if (monthlySalary <= 24750) {
      sssEmployee = 1102.5;
      sssEmployer = 2327.5;
    } else {
      // Maximum contribution
      sssEmployee = 1125;
      sssEmployer = 2375;
    }

    // PhilHealth Contribution (2025: 4.5% of basic salary, max ₱90,000)
    const philhealthBase = Math.min(monthlySalary, 90000);
    const philhealthTotal = philhealthBase * 0.045;
    const philhealthEmployee = philhealthTotal / 2; // 2.25%
    const philhealthEmployer = philhealthTotal / 2; // 2.25%

    // Pag-IBIG Contribution (2025 rates)
    let pagibigEmployee = 0;
    let pagibigEmployer = 0;

    if (monthlySalary <= 1500) {
      pagibigEmployee = monthlySalary * 0.01; // 1%
      pagibigEmployer = monthlySalary * 0.02; // 2%
    } else if (monthlySalary <= 5000) {
      pagibigEmployee = monthlySalary * 0.02; // 2%
      pagibigEmployer = monthlySalary * 0.02; // 2%
    } else {
      pagibigEmployee = 100; // Fixed ₱100
      pagibigEmployer = 100; // Fixed ₱100
    }

    const totalEmployeeShare =
      sssEmployee + philhealthEmployee + pagibigEmployee;
    const totalEmployerShare =
      sssEmployer + philhealthEmployer + pagibigEmployer;

    return {
      sssEmployee: Number(sssEmployee.toFixed(2)),
      sssEmployer: Number(sssEmployer.toFixed(2)),
      philhealthEmployee: Number(philhealthEmployee.toFixed(2)),
      philhealthEmployer: Number(philhealthEmployer.toFixed(2)),
      pagibigEmployee: Number(pagibigEmployee.toFixed(2)),
      pagibigEmployer: Number(pagibigEmployer.toFixed(2)),
      totalEmployeeShare: Number(totalEmployeeShare.toFixed(2)),
      totalEmployerShare: Number(totalEmployerShare.toFixed(2)),
    };
  }

  /**
   * Calculate SIL conversion to cash
   * @param {number} employeeId
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Promise<number>}
   */
  static async calculateSILConversion(employeeId, dateFrom, dateTo) {
    // Check if this is a year-end payroll
    const endDate = new Date(dateTo);
    const isYearEnd = endDate.getMonth() === 11 && endDate.getDate() === 31;

    if (!isYearEnd) {
      return 0; // SIL conversion only happens at year-end
    }

    // Get employee SIL credits for the year
    const year = endDate.getFullYear();
    const silRecord = await db("employee_sil_credits")
      .where("employee_id", employeeId)
      .where("year", year)
      .first();

    if (!silRecord || silRecord.available_credits <= 0) {
      return 0;
    }

    // Get employee hourly rate
    const employee = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .where("e.id", employeeId)
      .select("e.employee_type", "r.rate_per_hour")
      .first();

    if (!employee) {
      return 0;
    }

    const hourlyRate = Number(employee.rate_per_hour || 0);
    const hoursPerDay = employee.employee_type === "Full-time" ? 8 : 4;
    const dailyRate = hourlyRate * hoursPerDay;

    // Calculate cash equivalent
    const silConversionPay = silRecord.available_credits * dailyRate;

    // Update SIL credits to show they've been converted
    await db("employee_sil_credits")
      .where("id", silRecord.id)
      .update({
        used_credits: silRecord.total_credits,
        available_credits: 0,
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      });

    return silConversionPay;
  }
}

module.exports = PayrollService;
