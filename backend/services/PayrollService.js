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
    let totalNightDiffHours = 0;
    let totalNightDiffPay = 0;
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

      // Calculate night differential
      const nightDiff = this.calculateNightDifferential(
        record,
        hourlyRate,
        holiday?.type
      );
      totalNightDiffHours += nightDiff.nightDiffHours;
      totalNightDiffPay += nightDiff.nightDiffPay;

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
      totalNightDiffPay +
      regularHolidayPay +
      specialHolidayPay +
      doubleHolidayPay +
      silConversionPay;

    // Calculate government deductions
    const deductions = this.calculateGovernmentDeductions(
      grossSalary,
      employee
    );

    // Calculate net salary before any carryover balance
    const netBeforeBalance = grossSalary - deductions.totalEmployeeShare;

    // Fetch existing employee balance (negative means employee owes company)
    const previousBalance = await this.getEmployeePayrollBalance(employee.id);

    // Apply previous negative balance to current net
    // Logic: netAfter = netBefore + previousBalance (previousBalance may be negative)
    // - If netAfter < 0 → pay 0 this period; carry the remaining negative
    // - If netAfter >= 0 → pay netAfter; clear balance
    const netAfterBalance = netBeforeBalance + previousBalance;
    const previousBalanceApplied =
      previousBalance < 0
        ? Math.min(-previousBalance, Math.max(0, netBeforeBalance))
        : 0;
    const newBalanceCarryover = netAfterBalance < 0 ? netAfterBalance : 0;
    const netSalary = Math.max(0, netAfterBalance);

    return {
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      department: employee.department,
      branch_id: employee.branch_id,
      role_name: employee.role_name || employee.job_title,
      rate_per_hour: hourlyRate,
      employee_type: employeeType,
      // Government benefit numbers for compliance
      sss_number: employee.sss_number || null,
      philhealth_number: employee.philhealth_number || null,
      pagibig_number: employee.pagibig_number || null,
      days_worked: daysWorked - absentFromLates,
      hours_worked: totalHoursWorked,
      overtime_hours: totalOvertimeHours,
      night_diff_hours: totalNightDiffHours,
      night_diff_pay: totalNightDiffPay,
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
      withholding_tax: deductions.withholdingTax,
      total_deductions: deductions.totalEmployeeShare,
      total_employer_contributions: deductions.totalEmployerShare,
      gross_salary: grossSalary,
      net_salary: netSalary,
      previous_balance_applied: previousBalanceApplied,
      new_balance_carryover: newBalanceCarryover,
      status: "pending",
    };
  }

  /**
   * Get current payroll balance for employee (negative means owes company)
   * @param {number} employeeId
   * @returns {Promise<number>}
   */
  static async getEmployeePayrollBalance(employeeId) {
    const row = await db("employee_payroll_balances")
      .where("employee_id", employeeId)
      .first();
    return Number(row?.balance || 0);
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
   * Calculate night differential hours and pay
   * @param {Object} record - Attendance record
   * @param {number} hourlyRate - Employee hourly rate
   * @param {string} holidayType - Type of holiday if applicable
   * @returns {Object}
   */
  static calculateNightDifferential(record, hourlyRate, holidayType = null) {
    const checkInTime = new Date(record.check_in_time);
    const checkOutTime = new Date(record.check_out_time);

    // Night differential period: 10 PM - 6 AM
    const nightStart = 22; // 10 PM
    const nightEnd = 6; // 6 AM

    let nightDiffHours = 0;
    let nightDiffPay = 0;

    // Calculate night differential hours
    if (record.check_in_time && record.check_out_time) {
      const checkInHour = checkInTime.getHours();
      const checkOutHour = checkOutTime.getHours();

      // Simple calculation - if work spans night hours
      if (checkInHour < nightEnd || checkOutHour >= nightStart) {
        // For simplicity, assume if working during night period, apply ND
        // In real implementation, you'd calculate exact hours within night period
        nightDiffHours = Math.min(record.hours_worked || 0, 8); // Max 8 hours
      }
    }

    // Calculate night differential pay based on holiday type
    if (nightDiffHours > 0) {
      const baseNightDiffRate = hourlyRate * 0.1; // 10% additional

      switch (holidayType) {
        case "regular":
          // Regular Holiday + ND: 2.20x (200% + 10% of 200%)
          nightDiffPay = nightDiffHours * hourlyRate * 2.2;
          break;
        case "special_non_working":
          // Special Non-Working + ND: 1.43x (130% + 10% of 130%)
          nightDiffPay = nightDiffHours * hourlyRate * 1.43;
          break;
        case "double":
          // Double Holiday + ND: 3.30x (300% + 10% of 300%)
          nightDiffPay = nightDiffHours * hourlyRate * 3.3;
          break;
        default:
          // Regular day + ND: 1.10x (100% + 10%)
          nightDiffPay = nightDiffHours * hourlyRate * 1.1;
          break;
      }
    }

    return {
      nightDiffHours,
      nightDiffPay,
    };
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

    // SSS Contribution (2025 rates - Official Schedule)
    // Based on official SSS 2025 schedule: 5% employee, 10% employer, max MSC ₱35,000
    let sssEmployee = 0;
    let sssEmployer = 0;

    // Determine Monthly Salary Credit (MSC) based on salary range
    let msc = 0;
    if (monthlySalary < 5250) {
      msc = 5000;
    } else if (monthlySalary < 5750) {
      msc = 5500;
    } else if (monthlySalary < 6250) {
      msc = 6000;
    } else if (monthlySalary < 6750) {
      msc = 6500;
    } else if (monthlySalary < 7250) {
      msc = 7000;
    } else if (monthlySalary < 7750) {
      msc = 7500;
    } else if (monthlySalary < 8250) {
      msc = 8000;
    } else if (monthlySalary < 8750) {
      msc = 8500;
    } else if (monthlySalary < 9250) {
      msc = 9000;
    } else if (monthlySalary < 9750) {
      msc = 9500;
    } else if (monthlySalary < 10250) {
      msc = 10000;
    } else if (monthlySalary < 10750) {
      msc = 10500;
    } else if (monthlySalary < 11250) {
      msc = 11000;
    } else if (monthlySalary < 11750) {
      msc = 11500;
    } else if (monthlySalary < 12250) {
      msc = 12000;
    } else if (monthlySalary < 12750) {
      msc = 12500;
    } else if (monthlySalary < 13250) {
      msc = 13000;
    } else if (monthlySalary < 13750) {
      msc = 13500;
    } else if (monthlySalary < 14250) {
      msc = 14000;
    } else if (monthlySalary < 14750) {
      msc = 14500;
    } else if (monthlySalary < 15250) {
      msc = 15000;
    } else if (monthlySalary < 15750) {
      msc = 15500;
    } else if (monthlySalary < 16250) {
      msc = 16000;
    } else if (monthlySalary < 16750) {
      msc = 16500;
    } else if (monthlySalary < 17250) {
      msc = 17000;
    } else if (monthlySalary < 17750) {
      msc = 17500;
    } else if (monthlySalary < 18250) {
      msc = 18000;
    } else if (monthlySalary < 18750) {
      msc = 18500;
    } else if (monthlySalary < 19250) {
      msc = 19000;
    } else if (monthlySalary < 19750) {
      msc = 19500;
    } else if (monthlySalary < 20250) {
      msc = 20000;
    } else if (monthlySalary < 20750) {
      msc = 20500;
    } else if (monthlySalary < 21250) {
      msc = 21000;
    } else if (monthlySalary < 21750) {
      msc = 21500;
    } else if (monthlySalary < 22250) {
      msc = 22000;
    } else if (monthlySalary < 22750) {
      msc = 22500;
    } else if (monthlySalary < 23250) {
      msc = 23000;
    } else if (monthlySalary < 23750) {
      msc = 23500;
    } else if (monthlySalary < 24250) {
      msc = 24000;
    } else if (monthlySalary < 24750) {
      msc = 24500;
    } else if (monthlySalary < 25250) {
      msc = 25000;
    } else if (monthlySalary < 25750) {
      msc = 25500;
    } else if (monthlySalary < 26250) {
      msc = 26000;
    } else if (monthlySalary < 26750) {
      msc = 26500;
    } else if (monthlySalary < 27250) {
      msc = 27000;
    } else if (monthlySalary < 27750) {
      msc = 27500;
    } else if (monthlySalary < 28250) {
      msc = 28000;
    } else if (monthlySalary < 28750) {
      msc = 28500;
    } else if (monthlySalary < 29250) {
      msc = 29000;
    } else if (monthlySalary < 29750) {
      msc = 29500;
    } else if (monthlySalary < 30250) {
      msc = 30000;
    } else if (monthlySalary < 30750) {
      msc = 30500;
    } else if (monthlySalary < 31250) {
      msc = 31000;
    } else if (monthlySalary < 31750) {
      msc = 31500;
    } else if (monthlySalary < 32250) {
      msc = 32000;
    } else if (monthlySalary < 32750) {
      msc = 32500;
    } else if (monthlySalary < 33250) {
      msc = 33000;
    } else if (monthlySalary < 33750) {
      msc = 33500;
    } else {
      // Maximum MSC for 2025: ₱35,000
      msc = 35000;
    }

    // Calculate SSS contributions based on MSC
    // 2025 rates: 5% employee, 10% employer
    sssEmployee = msc * 0.05; // 5%
    sssEmployer = msc * 0.1; // 10%

    // EC (Employee Compensation) contribution - paid by employer only
    let ecContribution = 0;
    if (msc < 15000) {
      ecContribution = 10;
    } else {
      ecContribution = 30;
    }

    // Add EC to employer's total contribution
    sssEmployer += ecContribution;

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

    // Withholding Tax (TRAIN, Monthly)
    // Taxable income = gross - mandatory contributions (employee share)
    const taxableIncome =
      monthlySalary - (sssEmployee + philhealthEmployee + pagibigEmployee);

    const withholdingTax = Number(
      PayrollService.calculateWithholdingTax(taxableIncome).toFixed(2)
    );

    const totalEmployeeShare =
      sssEmployee + philhealthEmployee + pagibigEmployee + withholdingTax;
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
      withholdingTax,
    };
  }

  /**
   * Compute PH withholding tax (TRAIN monthly table, 2025)
   * Uses taxable monthly income (after SSS/PhilHealth/Pag-IBIG employee shares)
   * @param {number} taxableIncome
   * @returns {number}
   */
  static calculateWithholdingTax(taxableIncome) {
    if (!taxableIncome || taxableIncome <= 20833) return 0;
    if (taxableIncome <= 33333) return (taxableIncome - 20833) * 0.15;
    if (taxableIncome <= 66667) return 1875 + (taxableIncome - 33333) * 0.2;
    if (taxableIncome <= 166667) return 8541.8 + (taxableIncome - 66667) * 0.25;
    if (taxableIncome <= 666667)
      return 33541.8 + (taxableIncome - 166667) * 0.3;
    return 183541.8 + (taxableIncome - 666667) * 0.35;
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
