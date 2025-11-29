const { db } = require("../config/database");
const PayrollPeriod = require("../models/PayrollPeriod");
const PayrollRecord = require("../models/PayrollRecord");
const Holidays = require("date-holidays");
const {
  formatForDatabase,
  formatDateOnlyForDatabase,
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
    // Include Active employees OR Terminated employees whose last_working_day is AFTER the payroll period start
    // (meaning they worked during the payroll period)
    const employees = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .leftJoin("employee_terminations as et", "e.id", "et.employee_id")
      .where("e.department", department)
      .whereNull("e.deleted_at")
      .where(function () {
        this.where("e.status", "Active").orWhere(function () {
          this.where("e.status", "Terminated").andWhere(function () {
            // Include terminated employees if their last_working_day is on or after the period start
            // This means they worked during the payroll period (from period start until their last day)
            // Example: Employee with last_working_day = Nov 1 should be included in October payroll
            // The actual payroll calculation will cap attendance at their last_working_day
            this.whereNotNull("et.last_working_day").andWhere(
              "et.last_working_day",
              ">=",
              formatForDatabase(dateFrom)
            );
          });
        });
      })
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
      date_from: formatDateOnlyForDatabase(dateFrom),
      date_to: formatDateOnlyForDatabase(dateTo),
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
    // Include Active employees OR Terminated employees whose last_working_day is AFTER the payroll period start
    // (meaning they worked during the payroll period)
    const employees = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .leftJoin("employee_terminations as et", "e.id", "et.employee_id")
      .where("e.branch_id", branchId)
      .whereNull("e.deleted_at")
      .where(function () {
        this.where("e.status", "Active").orWhere(function () {
          this.where("e.status", "Terminated").andWhere(function () {
            // Include terminated employees if their last_working_day is on or after the period start
            // This means they worked during the payroll period (from period start until their last day)
            // Example: Employee with last_working_day = Nov 1 should be included in October payroll
            // The actual payroll calculation will cap attendance at their last_working_day
            this.whereNotNull("et.last_working_day").andWhere(
              "et.last_working_day",
              ">=",
              formatForDatabase(dateFrom)
            );
          });
        });
      })
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
      date_from: formatDateOnlyForDatabase(dateFrom),
      date_to: formatDateOnlyForDatabase(dateTo),
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

    // Check if employee is terminated and get last working day
    let lastWorkingDay = null;
    if (employee.status === "Terminated") {
      const termination = await db("employee_terminations")
        .where("employee_id", employee.id)
        .select("last_working_day")
        .first();

      if (termination && termination.last_working_day) {
        lastWorkingDay = new Date(termination.last_working_day);
      }
    }

    // Determine the effective end date for attendance calculation
    // If employee was terminated, only count attendance up to last_working_day
    const effectiveDateTo =
      lastWorkingDay && lastWorkingDay < dateTo ? lastWorkingDay : dateTo;

    // Get attendance records for the period (up to last_working_day if terminated)
    const attendanceRecords = await db("attendance_records")
      .where("employee_id", employee.id)
      .whereBetween("created_at", [
        formatForDatabase(dateFrom),
        formatForDatabase(effectiveDateTo),
      ])
      .select("*");

    // Calculate hours worked and overtime
    let totalHoursWorked = 0;
    let totalOvertimeHours = 0;
    let holidayOvertimeHours = 0; // Track OT hours on holidays separately
    let totalNightDiffHours = 0;
    let totalNightDiffPay = 0;
    let lateCount = 0;
    let leaveDays = 0;
    let regularHolidayPay = 0;
    let specialHolidayPay = 0;
    let doubleHolidayPay = 0;
    let holidayHoursWorked = 0;
    let restDayPay = 0; // Track total rest day pay (130% of regular rate) - USER-FRIENDLY: shows full compensation
    let regularRestDayPay = 0; // Track total regular rest day pay (non-holiday) - 130% compensation
    let holidayRestDayPay = 0; // Track holiday+rest day pay (already included in holiday pay, tracked for transparency)
    let restDayHours = 0; // Track rest day hours separately (excluded from basic salary)

    // Get Philippine holidays in the period
    const holidays = this.getPhilippineHolidays(dateFrom, dateTo);

    // Track consecutive lates for absence calculation
    let consecutiveLates = 0;
    let absentFromLates = 0;

    for (const record of attendanceRecords) {
      const recordDate = new Date(record.created_at);

      // Skip attendance records after last working day (if terminated)
      // Compare at date level (ignoring time) to include the full last working day
      if (lastWorkingDay) {
        const recordDateOnly = new Date(
          recordDate.getFullYear(),
          recordDate.getMonth(),
          recordDate.getDate()
        );
        const lastWorkingDayOnly = new Date(
          lastWorkingDay.getFullYear(),
          lastWorkingDay.getMonth(),
          lastWorkingDay.getDate()
        );
        if (recordDateOnly > lastWorkingDayOnly) {
          continue;
        }
      }
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
              // Check if this is a rest day (Day Off shift)
              const isRestDay = await this.isRestDay(employee.id, recordDate);

              if (isRestDay) {
                // Worked on regular holiday + rest day: 200% × 130% = 260%
                const holidayBasePay = dailyRate * 2; // 200% for regular holiday
                const restDayPremium = dailyRate * 0.6; // 60% rest day premium (260% - 200%)
                regularHolidayPay += holidayBasePay + restDayPremium;
                holidayRestDayPay += restDayPremium; // Track holiday+rest day premium separately (for transparency)

                // OT on regular holiday + rest day: 200% × 130% × 130% = 338%
                if (overtimeHours > 0) {
                  const holidayOTBase = hourlyRate * overtimeHours * 2.6; // 200% × 130%
                  const restDayOTPremium = hourlyRate * overtimeHours * 0.78; // 338% - 260% = 78%
                  regularHolidayPay += holidayOTBase + restDayOTPremium;
                  holidayRestDayPay += restDayOTPremium; // Track holiday+rest day OT premium
                }
              } else {
                // Worked on regular holiday: 200% of daily rate
                regularHolidayPay += dailyRate * 2;
                // OT on regular holiday: 200% × 130% = 260% per hour (DOLE standard)
                if (overtimeHours > 0) {
                  regularHolidayPay += hourlyRate * overtimeHours * 2.6;
                }
              }
            } else {
              // Did not work: 100% of daily rate
              regularHolidayPay += dailyRate;
            }
            break;

          case "special_non_working":
            if (hoursWorked > 0) {
              // Check if this is a rest day (Day Off shift)
              const isRestDay = await this.isRestDay(employee.id, recordDate);

              if (isRestDay) {
                // Worked on special non-working + rest day: 150% for first 8 hrs
                const holidayBasePay = dailyRate * 1.3; // 130% for special holiday
                const restDayPremium = dailyRate * 0.2; // 20% rest day premium (150% - 130%)
                specialHolidayPay += holidayBasePay + restDayPremium;
                holidayRestDayPay += restDayPremium; // Track holiday+rest day premium

                // OT on special non-working + rest day: 150% × 130% = 195%
                if (overtimeHours > 0) {
                  const holidayOTBase = hourlyRate * overtimeHours * 1.69; // 130% × 130%
                  const restDayOTPremium = hourlyRate * overtimeHours * 0.26; // 195% - 169% = 26%
                  specialHolidayPay += holidayOTBase + restDayOTPremium;
                  holidayRestDayPay += restDayOTPremium; // Track holiday+rest day OT premium
                }
              } else {
                // Worked on special non-working: 130% of daily rate
                specialHolidayPay += dailyRate * 1.3;
                // OT on special non-working: 130% × 130% = 169% per hour (DOLE standard)
                if (overtimeHours > 0) {
                  specialHolidayPay += hourlyRate * overtimeHours * 1.69;
                }
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
              // Check if this is a rest day (Day Off shift)
              const isRestDay = await this.isRestDay(employee.id, recordDate);

              if (isRestDay) {
                // Worked on double holiday + rest day: 300% × 130% = 390%
                const holidayBasePay = dailyRate * 3; // 300% for double holiday
                const restDayPremium = dailyRate * 0.9; // 90% rest day premium (390% - 300%)
                doubleHolidayPay += holidayBasePay + restDayPremium;
                holidayRestDayPay += restDayPremium; // Track holiday+rest day premium

                // OT on double holiday + rest day: 300% × 130% × 130% = 507%
                if (overtimeHours > 0) {
                  const holidayOTBase = hourlyRate * overtimeHours * 3.9; // 300% × 130%
                  const restDayOTPremium = hourlyRate * overtimeHours * 1.17; // 507% - 390% = 117%
                  doubleHolidayPay += holidayOTBase + restDayOTPremium;
                  holidayRestDayPay += restDayOTPremium; // Track holiday+rest day OT premium
                }
              } else {
                // Worked on double holiday: 300% of daily rate
                doubleHolidayPay += dailyRate * 3;
                // OT on double holiday: 300% × 130% = 390% per hour (DOLE standard)
                if (overtimeHours > 0) {
                  doubleHolidayPay += hourlyRate * overtimeHours * 3.9;
                }
              }
            } else {
              // Did not work: 200% of daily rate
              doubleHolidayPay += dailyRate * 2;
            }
            break;
        }

        // Track holiday OT hours separately (already paid in holiday pay calculation)
        holidayOvertimeHours += overtimeHours;
        // Still add to totalOvertimeHours for reporting (but won't calculate regular OT pay on it)
        totalOvertimeHours += overtimeHours;
      } else {
        // Regular workday - check if it's a rest day (Day Off or rest day override)
        const isRestDay = await this.isRestDay(employee.id, recordDate);

        // Split hours_worked into regular hours (max hoursPerDay) and overtime hours
        // Some attendance records may have incorrect data where hours_worked includes overtime
        const regularHoursForDay = Math.min(hoursWorked, hoursPerDay);
        const excessHoursAsOT = Math.max(0, hoursWorked - hoursPerDay);
        const effectiveOvertimeHours = overtimeHours + excessHoursAsOT;

        if (isRestDay && hoursWorked > 0) {
          // Working on regular rest day (non-holiday): 130% of regular hourly rate (DOLE rule)
          // USER-FRIENDLY: Calculate TOTAL rest day pay (130%) so users see full compensation
          // Rest day hourly rate = hourlyRate × 1.3
          const restDayTotalPay = hourlyRate * regularHoursForDay * 1.3; // 130% of regular rate (total compensation)
          regularRestDayPay += restDayTotalPay; // Track total regular rest day pay
          restDayHours += regularHoursForDay; // Track rest day hours (exclude from basic salary)

          // For overtime on regular rest day: 130% × 130% = 169% per hour
          // Regular OT on rest day: 125% × 130% = 162.5% per hour
          // Calculate total OT pay on rest day (162.5% total, not just premium)
          if (effectiveOvertimeHours > 0) {
            const restDayOTTotalPay =
              hourlyRate * effectiveOvertimeHours * 1.625; // 162.5% total (125% × 130%)
            regularRestDayPay += restDayOTTotalPay; // Add total OT pay on rest day
            // Note: Overtime on rest days is NOT added to regular overtimePay below
          }

          // DO NOT add rest day hours to totalHoursWorked (excluded from basic salary)
          // DO NOT add rest day OT hours to totalOvertimeHours (included in restDayPay above)
          continue; // Skip adding to totalHoursWorked and totalOvertimeHours
        }

        // Add only regular hours to totalHoursWorked, not the full hours_worked value
        // (Rest day hours are tracked separately above and excluded from basic salary)
        totalHoursWorked += regularHoursForDay;
        totalOvertimeHours += effectiveOvertimeHours;
      }
    }

    // Calculate days worked
    const daysWorked = totalHoursWorked / hoursPerDay;

    // Calculate basic salary
    const basicSalary = totalHoursWorked * hourlyRate;

    // Calculate overtime pay (1.25x for regular OT only)
    // Holiday OT is already calculated in holiday pay, so exclude it from regular OT calculation
    const regularOvertimeHours = totalOvertimeHours - holidayOvertimeHours;
    // Note: Rest day OT premium is tracked separately in restDayPay
    // Regular OT rate is 1.25x, but on rest days it becomes 1.625x (125% × 130%)
    // The 0.375x premium is already added to restDayPay above
    const overtimePay = regularOvertimeHours * hourlyRate * 1.25;

    // Calculate SIL used days from approved leave requests in this period
    const silUsedDays = await this.calculateSILUsedDays(
      employee.id,
      dateFrom,
      dateTo
    );

    // Calculate SIL leave pay (employee gets paid for SIL days used)
    const dailyRate = hourlyRate * hoursPerDay;
    const silLeavePay = silUsedDays * dailyRate;

    // Calculate SIL conversion if applicable (for unused credits at year-end)
    const silConversionResult = await this.calculateSILConversion(
      employee.id,
      dateFrom,
      dateTo
    );

    // Calculate gross salary
    // USER-FRIENDLY APPROACH:
    // - basicSalary includes ONLY regular working hours (rest day hours excluded)
    // - restDayPay shows TOTAL compensation for rest day work (130% of regular rate)
    // - This makes it clear to users: "Rest Day Pay: ₱286.00" = total compensation for that day
    // Note: holidayRestDayPay is already included in holiday pay amounts (tracked separately for transparency only)
    restDayPay = regularRestDayPay + holidayRestDayPay; // Total rest day pay (130% compensation) for reporting

    const grossSalary =
      basicSalary + // Regular hours only (rest day hours excluded)
      overtimePay + // Regular OT only (rest day OT excluded, already in restDayPay)
      totalNightDiffPay +
      regularHolidayPay + // Includes holiday+rest day combinations
      specialHolidayPay + // Includes holiday+rest day combinations
      doubleHolidayPay + // Includes holiday+rest day combinations
      silLeavePay +
      silConversionResult.conversionPay +
      regularRestDayPay; // Add total rest day pay (130% compensation) - USER-FRIENDLY: full amount visible

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
      sil_used_days: silUsedDays,
      sil_converted_days: silConversionResult.convertedDays,
      basic_salary: basicSalary,
      regular_holiday_pay: regularHolidayPay,
      special_holiday_pay: specialHolidayPay,
      double_holiday_pay: doubleHolidayPay,
      holiday_hours_worked: holidayHoursWorked,
      rest_day_pay: restDayPay, // Rest day premium (tracked separately for transparency)
      overtime_pay: overtimePay,
      sil_leave_pay: silLeavePay,
      sil_conversion_pay: silConversionResult.conversionPay,
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
   * Check if a date is an employee's rest day (Day Off)
   * This includes days that were originally Day Off but overridden with working shifts
   * @param {number} employeeId
   * @param {Date} date
   * @returns {Promise<boolean>}
   */
  static async isRestDay(employeeId, date) {
    try {
      // Normalize date to YYYY-MM-DD format
      const normalizeDate = (d) => {
        const dateObj = d instanceof Date ? d : new Date(d);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const dateStr = normalizeDate(date);
      const schedule = await db("employee_schedules")
        .where("employee_id", employeeId)
        .whereRaw("DATE(schedule_date) = ?", [dateStr])
        .where("is_active", true)
        .first();

      if (!schedule) {
        return false;
      }

      // Check if shift name is "Day Off" OR if it was originally Day Off (rest day override)
      return (
        schedule.shift_name === "Day Off" ||
        schedule.is_rest_day_override === true
      );
    } catch (error) {
      console.error("Error checking rest day:", error);
      return false; // Default to not a rest day on error
    }
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

    // If no earnings in the payroll period, no deductions apply
    if (monthlySalary <= 0) {
      return {
        sssEmployee: 0,
        sssEmployer: 0,
        philhealthEmployee: 0,
        philhealthEmployer: 0,
        pagibigEmployee: 0,
        pagibigEmployer: 0,
        totalEmployeeShare: 0,
        totalEmployerShare: 0,
        withholdingTax: 0,
      };
    }

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
   * Calculate SIL used days from approved leave requests in payroll period
   * @param {number} employeeId
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Promise<number>}
   */
  static async calculateSILUsedDays(employeeId, dateFrom, dateTo) {
    try {
      // Get approved leave requests that overlap with the payroll period
      // and have use_sil = true
      const leaveRequests = await db("leave_requests")
        .where("employee_id", employeeId)
        .where("status", "approved_by_hr")
        .where("use_sil", true)
        .where("sil_days", ">", 0)
        .whereNull("deleted_at")
        .select("from_date", "to_date", "sil_days");

      if (!leaveRequests || leaveRequests.length === 0) {
        return 0;
      }

      let totalSilUsed = 0;

      // Normalize dates to date-only (ignore time) for comparison
      const normalizeDate = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const payrollStart = normalizeDate(dateFrom);
      const payrollEnd = normalizeDate(dateTo);

      for (const leave of leaveRequests) {
        const leaveStart = normalizeDate(leave.from_date);
        const leaveEnd = normalizeDate(leave.to_date);
        const leaveSilDays = parseFloat(leave.sil_days || 0);

        if (leaveSilDays <= 0) continue;

        // Check if leave overlaps with payroll period
        // Overlap exists if: leaveStart <= payrollEnd AND leaveEnd >= payrollStart
        if (leaveStart <= payrollEnd && leaveEnd >= payrollStart) {
          // Calculate overlap range
          const overlapStart =
            leaveStart > payrollStart ? leaveStart : payrollStart;
          const overlapEnd = leaveEnd < payrollEnd ? leaveEnd : payrollEnd;

          if (overlapStart <= overlapEnd) {
            // Calculate overlap days (inclusive)
            const overlapDays =
              Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) +
              1;

            // Calculate total leave days (inclusive)
            const totalLeaveDays =
              Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

            // If leave is fully within payroll period, use full SIL days
            // Otherwise, proportionally calculate based on overlap
            if (
              leaveStart >= payrollStart &&
              leaveEnd <= payrollEnd &&
              totalLeaveDays > 0
            ) {
              // Leave is fully within payroll period - use all SIL days
              totalSilUsed += leaveSilDays;
            } else if (totalLeaveDays > 0) {
              // Partial overlap - calculate proportional SIL days
              const proportionalSilDays =
                (overlapDays / totalLeaveDays) * leaveSilDays;
              totalSilUsed += proportionalSilDays;
            }
          }
        }
      }

      return parseFloat(totalSilUsed.toFixed(2));
    } catch (error) {
      console.error("Error calculating SIL used days:", error);
      return 0; // Return 0 on error to not break payroll calculation
    }
  }

  /**
   * Calculate SIL conversion to cash for unused credits at year-end
   * @param {number} employeeId
   * @param {Date} dateFrom
   * @param {Date} dateTo
   * @returns {Promise<Object>} { conversionPay: number, convertedDays: number }
   */
  static async calculateSILConversion(employeeId, dateFrom, dateTo) {
    // Check if this is a year-end payroll
    // Year-end conversion should happen when the payroll period includes December 31st
    // This ensures we only convert once at the definitive end of the year
    const endDate = new Date(dateTo);
    const startDate = new Date(dateFrom);

    // Get date components in Philippine timezone using Intl.DateTimeFormat
    const getDateInPH = (date) => {
      const d = date instanceof Date ? date : new Date(date);
      // Use Intl.DateTimeFormat to get correct date components in Philippine timezone
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(d);

      const partsMap = {};
      parts.forEach((part) => {
        partsMap[part.type] = part.value;
      });

      return {
        year: parseInt(partsMap.year, 10),
        month: parseInt(partsMap.month, 10) - 1, // Month is 0-indexed in JS
        date: parseInt(partsMap.day, 10),
      };
    };

    const startPH = getDateInPH(startDate);
    const endPH = getDateInPH(endDate);

    // Check if this payroll period includes December 31st of the year in Philippine timezone
    const includesDec31 =
      startPH.year <= endPH.year && // Cross-year periods
      endPH.year && // Must be after Dec 31st
      (endPH.month > 11 || (endPH.month === 11 && endPH.date === 31)); // Includes Dec 31

    if (!includesDec31) {
      return { conversionPay: 0, convertedDays: 0 };
    }

    const year = endPH.year;

    // Get employee SIL credits for the year
    const silRecord = await db("employee_sil_credits")
      .where("employee_id", employeeId)
      .where("year", year)
      .first();

    if (!silRecord) {
      return { conversionPay: 0, convertedDays: 0 };
    }

    // Check if credits have already been converted (available_credits should be 0 if converted)
    const availableCredits = parseFloat(silRecord.available_credits || 0);

    if (availableCredits <= 0) {
      // Credits already converted or none available
      return { conversionPay: 0, convertedDays: 0 };
    }

    // Get employee hourly rate
    const employee = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .where("e.id", employeeId)
      .select("e.employee_type", "r.rate_per_hour")
      .first();

    if (!employee) {
      return { conversionPay: 0, convertedDays: 0 };
    }

    const hourlyRate = Number(employee.rate_per_hour || 0);
    const hoursPerDay = employee.employee_type === "Full-time" ? 8 : 4;
    const dailyRate = hourlyRate * hoursPerDay;

    // Calculate cash equivalent for unused SIL credits
    // Formula: available_credits (days) × daily_rate
    const silConversionPay = availableCredits * dailyRate;
    const convertedDays = availableCredits;

    // Update SIL credits to show they've been converted to cash
    // This prevents double conversion if payroll is regenerated
    await db("employee_sil_credits")
      .where("id", silRecord.id)
      .update({
        used_credits: silRecord.total_credits,
        available_credits: 0,
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      });

    return {
      conversionPay: parseFloat(silConversionPay.toFixed(2)),
      convertedDays: parseFloat(convertedDays.toFixed(2)),
    };
  }
}

module.exports = PayrollService;
