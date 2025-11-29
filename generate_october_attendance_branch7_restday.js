const { db } = require("./backend/config/database");

/**
 * Script to generate attendance records for branch ID 7 employees
 * for October 2025 with realistic working patterns including:
 * - Regular working days
 * - Late days
 * - Overtime days
 * - Absent days
 * - REST DAY WORK (working on scheduled Day Off days)
 *
 * SAFETY FEATURES:
 * - Checks for employees on leave and skips them
 * - Prevents overriding existing attendance records
 * - Updates schedules to mark rest day overrides
 * - Comprehensive cleanup functionality
 * - Detailed logging and error handling
 */

async function generateOctoberAttendanceBranch7WithRestDay() {
  try {
    console.log(
      "🚀 Starting October 2025 attendance generation for Branch ID 7 (with Rest Day Work)..."
    );

    // Get branch ID 7
    const branch = await db("branches").where("id", 7).first();

    if (!branch) {
      throw new Error("Branch ID 7 not found!");
    }

    console.log(`✅ Found branch: ${branch.name} (ID: ${branch.id})`);

    // Get all active employees from Branch ID 7
    const employees = await db("employees")
      .select(
        "employees.*",
        "branches.name as branch_name",
        "branches.id as branch_id",
        "user_roles.role as role_name",
        "user_roles.rate_per_hour"
      )
      .leftJoin("branches", "employees.branch_id", "branches.id")
      .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
      .where("employees.branch_id", 7)
      .where("employees.status", "Active")
      .whereNull("employees.deleted_at");

    if (!employees.length) {
      throw new Error("No active employees found in Branch ID 7!");
    }

    console.log(`✅ Found ${employees.length} Branch ID 7 employees:`);
    employees.forEach((emp, index) => {
      console.log(
        `   ${index + 1}. ${emp.employee_id} - ${emp.first_name} ${emp.last_name} (${emp.role_name || "No role"})`
      );
      console.log(
        `      Branch: ${emp.branch_name || "No branch"} | Rate: ₱${emp.rate_per_hour || 0}/hr`
      );
    });

    // Get shift types to find a regular working shift
    const shiftTypes = await db("shift_types")
      .where("is_active", true)
      .whereNot("name", "Day Off")
      .orderBy("start_time", "asc");

    if (!shiftTypes.length) {
      throw new Error("No working shift types found!");
    }

    // Use "Regular Shift" if available, otherwise use the first shift type
    const workingShift =
      shiftTypes.find((st) => st.name === "Regular Shift") || shiftTypes[0];
    console.log(
      `✅ Using shift type for rest day work: ${workingShift.name} (${workingShift.start_time} - ${workingShift.end_time})`
    );

    // Get existing QR codes from the database
    const existingQrCodes = await db("attendance_qr_codes")
      .where("is_active", true)
      .orderBy("created_at", "desc");

    console.log(`\n📱 Found ${existingQrCodes.length} existing QR codes`);

    // Use the first available QR code, or create one if none exist
    let qrCode = existingQrCodes[0];

    if (!qrCode) {
      console.log("📱 No QR codes found. Creating default QR code...");
      const [newQrCode] = await db("attendance_qr_codes")
        .insert({
          qr_code: "BRANCH_7_ATTENDANCE_QR",
          location_name: "Branch 7 - Restaurant Floor",
          description: "Branch 7 attendance QR code",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      qrCode = newQrCode;
    }

    console.log(`✅ Using QR Code: ${qrCode.location_name} (ID: ${qrCode.id})`);

    // October 2025 all days (for checking schedules)
    const allDays = [];
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2025-10-${String(day).padStart(2, "0")}`;
      allDays.push(dateStr);
    }

    // October 2025 working days (Monday to Saturday, Sunday off)
    // 26 working days for the month
    const allWorkingDays = [
      // Week 1: Oct 1-4 (Mon-Thu, Fri 3 off)
      "2025-10-01",
      "2025-10-02",
      "2025-10-03",
      "2025-10-04",
      // Week 2: Oct 6-11 (Mon-Sat, Sun 5 off)
      "2025-10-06",
      "2025-10-07",
      "2025-10-08",
      "2025-10-09",
      "2025-10-10",
      "2025-10-11",
      // Week 3: Oct 13-18 (Mon-Sat, Sun 12 off)
      "2025-10-13",
      "2025-10-14",
      "2025-10-15",
      "2025-10-16",
      "2025-10-17",
      "2025-10-18",
      // Week 4: Oct 20-25 (Mon-Sat, Sun 19 off)
      "2025-10-20",
      "2025-10-21",
      "2025-10-22",
      "2025-10-23",
      "2025-10-24",
      "2025-10-25",
      // Week 5: Oct 27-31 (Mon-Fri, Sun 26 off)
      "2025-10-27",
      "2025-10-28",
      "2025-10-29",
      "2025-10-30",
      "2025-10-31",
    ]; // 26 working days total

    console.log(
      `\n📅 Generating attendance for October 2025 (all 31 days for schedule checking)`
    );
    console.log(`👥 Processing ${employees.length} employees...`);

    let totalRecordsCreated = 0;
    let totalSchedulesUpdated = 0;
    const employeeSummaries = [];
    const employeesOnLeave = new Set(); // Track employees on leave

    // Process each employee
    for (const employee of employees) {
      console.log(
        `\n📝 Processing: ${employee.first_name} ${employee.last_name} (${employee.employee_id})`
      );

      // Get employee schedules for October 2025
      const employeeSchedules = await db("employee_schedules")
        .where("employee_id", employee.id)
        .whereBetween("schedule_date", ["2025-10-01", "2025-10-31"])
        .where("is_active", true);

      // Create a map of schedules by date string
      const scheduleMap = new Map();
      employeeSchedules.forEach((schedule) => {
        const scheduleDate = new Date(schedule.schedule_date);
        const dateStr = scheduleDate.toISOString().split("T")[0];
        scheduleMap.set(dateStr, schedule);
      });

      console.log(
        `   📋 Found ${employeeSchedules.length} schedules for October`
      );

      // Identify Day Off schedules
      const dayOffSchedules = employeeSchedules.filter(
        (s) => s.shift_name === "Day Off" && !s.is_rest_day_override
      );
      console.log(`   📅 Found ${dayOffSchedules.length} Day Off schedules`);

      // Randomly select 2-4 Day Off days to be worked (rest day work)
      const restDayWorkCount = Math.min(
        2 + Math.floor(Math.random() * 3), // 2-4 rest day work days
        dayOffSchedules.length
      );

      const restDayWorkSchedules = [];
      if (dayOffSchedules.length > 0 && restDayWorkCount > 0) {
        // Shuffle and pick random Day Off schedules
        const shuffled = [...dayOffSchedules].sort(() => Math.random() - 0.5);
        restDayWorkSchedules.push(...shuffled.slice(0, restDayWorkCount));
      }

      const restDayWorkDates = restDayWorkSchedules.map((s) => {
        const scheduleDate = new Date(s.schedule_date);
        return scheduleDate.toISOString().split("T")[0];
      });

      if (restDayWorkDates.length > 0) {
        console.log(
          `   🏖️  Rest Day Work days (${restDayWorkDates.length}): ${restDayWorkDates.join(", ")}`
        );
      }

      // Check if employee is on leave during October 2025
      const leaveRequests = await db("leave_requests")
        .where("employee_id", employee.id)
        .whereIn("status", ["approved_by_manager", "approved_by_hr"])
        .where(function () {
          this.whereBetween("from_date", ["2025-10-01", "2025-10-31"])
            .orWhereBetween("to_date", ["2025-10-01", "2025-10-31"])
            .orWhere(function () {
              this.where("from_date", "<=", "2025-10-01").andWhere(
                "to_date",
                ">=",
                "2025-10-31"
              );
            });
        })
        .whereNull("deleted_at");

      // Create a set of leave dates for this employee
      const leaveDates = new Set();
      if (leaveRequests.length > 0) {
        console.log(`   📋 Employee has leave during October:`);
        leaveRequests.forEach((leave) => {
          console.log(
            `      - ${leave.leave_type}: ${leave.from_date} to ${leave.to_date}`
          );

          // Add all dates in the leave range to the set
          const fromDate = new Date(leave.from_date);
          const toDate = new Date(leave.to_date);
          const currentDate = new Date(fromDate);

          while (currentDate <= toDate) {
            const dateStr = currentDate.toISOString().split("T")[0];
            leaveDates.add(dateStr);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
      }

      // Get existing attendance records for this employee in October 2025
      const existingRecords = await db("attendance_records")
        .where("employee_id", employee.id)
        .whereBetween("created_at", [
          new Date("2025-10-01T00:00:00"),
          new Date("2025-10-31T23:59:59"),
        ]);

      // Create a set of dates that already have attendance records
      const existingDates = new Set();
      if (existingRecords.length > 0) {
        console.log(
          `   📋 Employee has ${existingRecords.length} existing attendance records`
        );
        existingRecords.forEach((record) => {
          const recordDate = new Date(record.created_at);
          const dateStr = recordDate.toISOString().split("T")[0];
          existingDates.add(dateStr);
        });
      }

      // Randomly assign 2-3 late days per employee (realistic scenario)
      const lateDaysCount = 2 + Math.floor(Math.random() * 2); // 2-3 late days
      const lateDayIndices = [];
      while (lateDayIndices.length < lateDaysCount) {
        const randomIndex = Math.floor(Math.random() * allWorkingDays.length);
        if (!lateDayIndices.includes(randomIndex)) {
          lateDayIndices.push(randomIndex);
        }
      }
      const lateDays = lateDayIndices.map((i) => allWorkingDays[i]);

      // Randomly assign 2-4 overtime days per employee
      const overtimeDaysCount = 2 + Math.floor(Math.random() * 3); // 2-4 overtime days
      const overtimeDayIndices = [];
      while (overtimeDayIndices.length < overtimeDaysCount) {
        const randomIndex = Math.floor(Math.random() * allWorkingDays.length);
        // Don't overlap with late days
        if (
          !overtimeDayIndices.includes(randomIndex) &&
          !lateDayIndices.includes(randomIndex)
        ) {
          overtimeDayIndices.push(randomIndex);
        }
      }
      const overtimeDays = overtimeDayIndices.map((i) => allWorkingDays[i]);

      // Randomly assign 1-2 absent days per employee (realistic scenario)
      const absentDaysCount = 1 + Math.floor(Math.random() * 2); // 1-2 absent days
      const absentDayIndices = [];
      while (absentDayIndices.length < absentDaysCount) {
        const randomIndex = Math.floor(Math.random() * allWorkingDays.length);
        // Don't overlap with late or overtime days
        if (
          !absentDayIndices.includes(randomIndex) &&
          !lateDayIndices.includes(randomIndex) &&
          !overtimeDayIndices.includes(randomIndex)
        ) {
          absentDayIndices.push(randomIndex);
        }
      }
      const absentDays = absentDayIndices.map((i) => allWorkingDays[i]);

      console.log(
        `   ⏰ Late days (${lateDays.length}): ${lateDays.join(", ")}`
      );
      console.log(
        `   🕐 Overtime days (${overtimeDays.length}): ${overtimeDays.join(", ")}`
      );
      console.log(
        `   ❌ Absent days (${absentDays.length}): ${absentDays.join(", ")}`
      );

      // Update schedules for rest day work
      for (const schedule of restDayWorkSchedules) {
        try {
          await db("employee_schedules").where("id", schedule.id).update({
            shift_name: workingShift.name,
            start_time: workingShift.start_time,
            end_time: workingShift.end_time,
            is_rest_day_override: true,
            updated_at: db.fn.now(),
          });
          totalSchedulesUpdated++;
          console.log(
            `   ✅ Updated schedule ${schedule.id} to ${workingShift.name} (Rest Day Override)`
          );
        } catch (error) {
          console.error(
            `   ⚠️  Error updating schedule ${schedule.id}:`,
            error.message
          );
        }
      }

      const attendanceRecords = [];

      // Process all working days
      for (const dateStr of allWorkingDays) {
        const date = new Date(dateStr);
        const isLate = lateDays.includes(dateStr);
        const isOvertime = overtimeDays.includes(dateStr);
        const isAbsent = absentDays.includes(dateStr);
        const isOnLeave = leaveDates.has(dateStr);
        const hasExistingRecord = existingDates.has(dateStr);
        const isRestDayWork = restDayWorkDates.includes(dateStr);
        const schedule = scheduleMap.get(dateStr);

        // Skip if on leave - don't create any record for leave days
        if (isOnLeave) {
          console.log(`      📅 ${dateStr}: On leave - skipping`);
          continue;
        }

        // Skip if already has attendance record for this date
        if (hasExistingRecord) {
          console.log(
            `      📅 ${dateStr}: Already has attendance record - skipping`
          );
          continue;
        }

        // Skip if absent
        if (isAbsent) {
          const attendanceRecord = {
            employee_id: employee.id,
            qr_code_id: qrCode.id,
            time_in: null,
            time_out: null,
            status: "absent",
            hours_worked: 0,
            overtime_hours: 0,
            is_overtime: false,
            tardiness_minutes: 0,
            notes: "Absent - No show",
            branch_id: employee.branch_id,
            created_at: date,
            updated_at: date,
          };
          attendanceRecords.push(attendanceRecord);
          continue;
        }

        // Get shift times from schedule or use default
        let startTime = "08:00:00";
        let endTime = "17:00:00";

        if (schedule && schedule.shift_name !== "Day Off") {
          startTime = schedule.start_time || startTime;
          endTime = schedule.end_time || endTime;
        } else if (isRestDayWork) {
          // Use the working shift times for rest day work
          startTime = workingShift.start_time || startTime;
          endTime = workingShift.end_time || endTime;
        }

        // Standard working hours
        let timeIn = new Date(dateStr + "T" + startTime);
        let timeOut = new Date(dateStr + "T" + endTime);

        // Handle overnight shifts (end_time < start_time)
        if (timeOut <= timeIn) {
          timeOut.setDate(timeOut.getDate() + 1);
        }

        // Add some realistic time variation (±15 minutes)
        const timeVariation = Math.floor(Math.random() * 31) - 15; // -15 to +15 minutes

        if (isLate) {
          // Late arrival: 8:30 AM to 9:30 AM (30-90 minutes late)
          const lateMinutes = 30 + Math.floor(Math.random() * 61); // 30-90 minutes late
          timeIn.setHours(8, lateMinutes, 0, 0);
          // Still work full shift
          const shiftHours = (timeOut - timeIn) / (1000 * 60 * 60);
          timeOut = new Date(timeIn);
          timeOut.setHours(
            timeIn.getHours() + Math.round(shiftHours),
            timeIn.getMinutes(),
            0,
            0
          );
        } else {
          // On time: with variation
          const [hours, minutes] = startTime.split(":").map(Number);
          timeIn.setHours(hours, minutes + timeVariation, 0, 0);
          // Adjust timeOut to maintain same shift duration
          const [endHours, endMinutes] = endTime.split(":").map(Number);
          timeOut = new Date(dateStr + "T" + endTime);
          if (timeOut <= timeIn) {
            timeOut.setDate(timeOut.getDate() + 1);
          }
          timeOut.setHours(endHours, endMinutes + timeVariation, 0, 0);
        }

        if (isOvertime) {
          // Overtime: work 1-3 hours extra
          const overtimeHours = 1 + Math.floor(Math.random() * 3); // 1-3 hours overtime
          timeOut.setHours(
            timeOut.getHours() + overtimeHours,
            timeOut.getMinutes(),
            0,
            0
          );
        }

        // Calculate hours worked (minus 1 hour lunch break)
        let totalHours = (timeOut - timeIn) / (1000 * 60 * 60);
        totalHours -= 1; // Subtract 1 hour for lunch break

        // Calculate regular hours (8 hours max) and overtime hours separately
        let regularHours = Math.min(8, totalHours);
        let overtimeHours = Math.max(0, totalHours - 8);

        // For overtime days, ensure we have actual overtime
        if (isOvertime && overtimeHours < 1) {
          overtimeHours = 1 + Math.floor(Math.random() * 3); // 1-3 hours overtime
          totalHours = regularHours + overtimeHours;
          // Adjust timeOut to reflect actual overtime
          timeOut = new Date(timeIn);
          timeOut.setHours(
            timeIn.getHours() + Math.round(totalHours) + 1,
            timeIn.getMinutes(),
            0,
            0
          ); // +1 for lunch break
        }

        // Ensure minimum of 7 hours and maximum of 11 hours total
        totalHours = Math.max(7, Math.min(11, totalHours));
        if (totalHours > 8) {
          regularHours = 8;
          overtimeHours = totalHours - 8;
        }

        // Calculate tardiness minutes
        const tardinessMinutes = isLate
          ? 30 + Math.floor(Math.random() * 61)
          : 0;

        // Determine status
        let status = "present";
        if (isLate) {
          status = "late";
        }

        // Generate realistic notes
        let notes = "Regular attendance";
        if (isRestDayWork) {
          notes = "Worked on scheduled rest day - Rest day pay applies";
        } else if (isLate) {
          const lateReasons = [
            "Traffic jam",
            "Late arrival",
            "Personal emergency",
            "Transportation delay",
            "Medical appointment",
          ];
          notes = lateReasons[Math.floor(Math.random() * lateReasons.length)];
        } else if (isOvertime) {
          const overtimeReasons = [
            "Customer service",
            "Inventory management",
            "Cleaning duties",
            "Training new staff",
            "Special event preparation",
            "Kitchen maintenance",
          ];
          notes =
            overtimeReasons[Math.floor(Math.random() * overtimeReasons.length)];
        }

        const attendanceRecord = {
          employee_id: employee.id,
          qr_code_id: qrCode.id,
          time_in: timeIn,
          time_out: timeOut,
          status: status,
          hours_worked: parseFloat(regularHours.toFixed(2)), // Only regular hours
          overtime_hours: parseFloat(overtimeHours.toFixed(2)), // Separate overtime hours
          is_overtime: overtimeHours > 0, // Boolean flag for overtime
          tardiness_minutes: tardinessMinutes,
          notes: notes,
          branch_id: employee.branch_id, // Include the employee's branch_id
          created_at: timeIn,
          updated_at: timeOut,
        };

        attendanceRecords.push(attendanceRecord);
      }

      // Also create attendance for rest day work days (if not already in allWorkingDays)
      for (const dateStr of restDayWorkDates) {
        // Skip if already processed in allWorkingDays
        if (allWorkingDays.includes(dateStr)) {
          continue;
        }

        const date = new Date(dateStr);
        const isOnLeave = leaveDates.has(dateStr);
        const hasExistingRecord = existingDates.has(dateStr);

        // Skip if on leave or already has record
        if (isOnLeave || hasExistingRecord) {
          continue;
        }

        // Create attendance for rest day work
        let timeIn = new Date(dateStr + "T" + workingShift.start_time);
        let timeOut = new Date(dateStr + "T" + workingShift.end_time);

        // Handle overnight shifts
        if (timeOut <= timeIn) {
          timeOut.setDate(timeOut.getDate() + 1);
        }

        // Add time variation
        const timeVariation = Math.floor(Math.random() * 31) - 15;
        const [hours, minutes] = workingShift.start_time.split(":").map(Number);
        timeIn.setHours(hours, minutes + timeVariation, 0, 0);
        const [endHours, endMinutes] = workingShift.end_time
          .split(":")
          .map(Number);
        timeOut = new Date(dateStr + "T" + workingShift.end_time);
        if (timeOut <= timeIn) {
          timeOut.setDate(timeOut.getDate() + 1);
        }
        timeOut.setHours(endHours, endMinutes + timeVariation, 0, 0);

        // Calculate hours worked
        let totalHours = (timeOut - timeIn) / (1000 * 60 * 60);
        totalHours -= 1; // Subtract 1 hour for lunch break

        let regularHours = Math.min(8, totalHours);
        let overtimeHours = Math.max(0, totalHours - 8);

        const attendanceRecord = {
          employee_id: employee.id,
          qr_code_id: qrCode.id,
          time_in: timeIn,
          time_out: timeOut,
          status: "present",
          hours_worked: parseFloat(regularHours.toFixed(2)),
          overtime_hours: parseFloat(overtimeHours.toFixed(2)),
          is_overtime: overtimeHours > 0,
          tardiness_minutes: 0,
          notes: "Worked on scheduled rest day - Rest day pay applies",
          branch_id: employee.branch_id,
          created_at: timeIn,
          updated_at: timeOut,
        };

        attendanceRecords.push(attendanceRecord);
      }

      // Insert all attendance records for this employee
      if (attendanceRecords.length > 0) {
        await db("attendance_records").insert(attendanceRecords);
        totalRecordsCreated += attendanceRecords.length;
      }

      // Calculate statistics for this employee
      const totalRegularHours = attendanceRecords.reduce(
        (sum, record) => sum + record.hours_worked,
        0
      );
      const totalOvertimeHours = attendanceRecords.reduce(
        (sum, record) => sum + record.overtime_hours,
        0
      );
      const totalTardiness = attendanceRecords.reduce(
        (sum, record) => sum + record.tardiness_minutes,
        0
      );
      const actualAbsentDays = attendanceRecords.filter(
        (record) => record.status === "absent"
      ).length;
      const restDayWorkRecords = attendanceRecords.filter((record) =>
        record.notes.includes("rest day")
      ).length;
      const leaveDaysCount = leaveDates.size;
      const existingRecordDaysCount = existingDates.size;

      employeeSummaries.push({
        employeeId: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name}`,
        workingDays: attendanceRecords.length - actualAbsentDays,
        lateDays: lateDays.length,
        overtimeDays: overtimeDays.length,
        absentDays: actualAbsentDays,
        restDayWorkDays: restDayWorkDates.length,
        leaveDays: leaveDaysCount,
        existingRecordDays: existingRecordDaysCount,
        regularHours: totalRegularHours.toFixed(2),
        overtimeHours: totalOvertimeHours.toFixed(2),
        totalHours: (totalRegularHours + totalOvertimeHours).toFixed(2),
        tardiness: totalTardiness,
      });

      console.log(
        `   ✅ Created ${attendanceRecords.length} attendance records (${restDayWorkRecords} rest day work)`
      );
    }

    // Display comprehensive summary
    console.log("\n" + "=".repeat(80));
    console.log(
      "📊 OCTOBER 2025 ATTENDANCE SUMMARY - BRANCH ID 7 (WITH REST DAY WORK)"
    );
    console.log("=".repeat(80));
    console.log(`📅 Period: October 1-31, 2025`);
    console.log(`🏢 Branch: ${branch.name} (ID: ${branch.id})`);
    console.log(`👥 Total Employees Processed: ${employeeSummaries.length}`);
    console.log(`👥 Employees on Leave (Skipped): ${employeesOnLeave.size}`);
    console.log(`📈 Total Records Created: ${totalRecordsCreated}`);
    console.log(
      `📋 Schedules Updated (Rest Day Override): ${totalSchedulesUpdated}`
    );
    console.log(`📋 Working Days: ${allWorkingDays.length} days`);

    console.log("\n" + "-".repeat(80));
    console.log("EMPLOYEE BREAKDOWN:");
    console.log("-".repeat(80));

    employeeSummaries.forEach((summary, index) => {
      console.log(`\n${index + 1}. ${summary.name} (${summary.employeeId})`);
      console.log(`   📅 Working Days: ${summary.workingDays}`);
      console.log(`   ⏰ Late Days: ${summary.lateDays}`);
      console.log(`   🕐 Overtime Days: ${summary.overtimeDays}`);
      console.log(`   ❌ Absent Days: ${summary.absentDays}`);
      console.log(`   🏖️  Rest Day Work Days: ${summary.restDayWorkDays}`);
      console.log(`   🏖️  Leave Days: ${summary.leaveDays}`);
      console.log(`   📋 Existing Record Days: ${summary.existingRecordDays}`);
      console.log(`   ⏱️  Regular Hours: ${summary.regularHours} hrs`);
      console.log(`   ⏱️  Overtime Hours: ${summary.overtimeHours} hrs`);
      console.log(`   📊 Total Hours: ${summary.totalHours} hrs`);
      console.log(
        `   🕒 Total Tardiness: ${summary.tardiness} min (${(summary.tardiness / 60).toFixed(2)} hrs)`
      );
    });

    // Calculate branch totals
    const branchTotalRegularHours = employeeSummaries.reduce(
      (sum, emp) => sum + parseFloat(emp.regularHours),
      0
    );
    const branchTotalOvertimeHours = employeeSummaries.reduce(
      (sum, emp) => sum + parseFloat(emp.overtimeHours),
      0
    );
    const branchTotalHours = employeeSummaries.reduce(
      (sum, emp) => sum + parseFloat(emp.totalHours),
      0
    );
    const branchTotalLateDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.lateDays,
      0
    );
    const branchTotalOvertimeDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.overtimeDays,
      0
    );
    const branchTotalAbsentDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.absentDays,
      0
    );
    const branchTotalRestDayWorkDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.restDayWorkDays,
      0
    );
    const branchTotalLeaveDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.leaveDays,
      0
    );
    const branchTotalExistingRecordDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.existingRecordDays,
      0
    );
    const branchTotalTardiness = employeeSummaries.reduce(
      (sum, emp) => sum + emp.tardiness,
      0
    );

    console.log("\n" + "=".repeat(80));
    console.log("📊 BRANCH TOTALS:");
    console.log("=".repeat(80));
    console.log(
      `⏱️  Total Regular Hours: ${branchTotalRegularHours.toFixed(2)} hrs`
    );
    console.log(
      `⏱️  Total Overtime Hours: ${branchTotalOvertimeHours.toFixed(2)} hrs`
    );
    console.log(`📊 Grand Total Hours: ${branchTotalHours.toFixed(2)} hrs`);
    console.log(
      `📈 Average Hours per Employee: ${(branchTotalHours / employeeSummaries.length).toFixed(2)} hrs`
    );
    console.log(`⏰ Total Late Instances: ${branchTotalLateDays} days`);
    console.log(`🕐 Total Overtime Instances: ${branchTotalOvertimeDays} days`);
    console.log(`❌ Total Absent Instances: ${branchTotalAbsentDays} days`);
    console.log(
      `🏖️  Total Rest Day Work Instances: ${branchTotalRestDayWorkDays} days`
    );
    console.log(`🏖️  Total Leave Days: ${branchTotalLeaveDays} days`);
    console.log(
      `📋 Total Existing Record Days: ${branchTotalExistingRecordDays} days`
    );
    console.log(
      `📋 Total Schedules Updated (Rest Day Override): ${totalSchedulesUpdated}`
    );
    console.log(
      `🕒 Total Branch Tardiness: ${branchTotalTardiness} min (${(branchTotalTardiness / 60).toFixed(2)} hrs)`
    );

    console.log("\n🎉 Attendance generation completed successfully!");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error generating attendance:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Cleanup function to remove all October 2025 attendance records for Branch ID 7
 * Use this function with caution - it will delete all attendance data for the period
 */
async function cleanupOctoberAttendanceBranch7() {
  try {
    console.log(
      "🧹 Starting cleanup of October 2025 attendance records for Branch ID 7..."
    );

    // Get all employees from Branch ID 7
    const employees = await db("employees")
      .where("branch_id", 7)
      .where("status", "Active")
      .whereNull("deleted_at")
      .select("id");

    if (!employees.length) {
      console.log("No employees found in Branch ID 7");
      return;
    }

    const employeeIds = employees.map((emp) => emp.id);

    // Delete attendance records for October 2025
    const deletedRecords = await db("attendance_records")
      .whereIn("employee_id", employeeIds)
      .whereBetween("created_at", [
        new Date("2025-10-01T00:00:00"),
        new Date("2025-10-31T23:59:59"),
      ])
      .del();

    // Reset rest day override flags for October 2025 schedules
    const resetSchedules = await db("employee_schedules")
      .whereIn("employee_id", employeeIds)
      .whereBetween("schedule_date", ["2025-10-01", "2025-10-31"])
      .where("is_rest_day_override", true)
      .update({
        is_rest_day_override: false,
        updated_at: db.fn.now(),
      });

    console.log(
      `✅ Cleaned up ${deletedRecords} attendance records for October 2025`
    );
    console.log(
      `✅ Reset ${resetSchedules} rest day override flags for October 2025`
    );
    console.log(`👥 Affected employees: ${employeeIds.length}`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Safety check function to verify the script can run safely
 */
async function safetyCheck() {
  try {
    console.log("🔍 Running safety checks...");

    // Check if Branch ID 7 exists
    const branch = await db("branches").where("id", 7).first();

    if (!branch) {
      throw new Error("❌ Branch ID 7 not found!");
    }
    console.log(`✅ Branch found: ${branch.name} (ID: ${branch.id})`);

    // Check if there are any existing October 2025 records
    const employees = await db("employees")
      .where("branch_id", 7)
      .where("status", "Active")
      .whereNull("deleted_at")
      .select("id");

    if (!employees.length) {
      throw new Error("❌ No active employees found in Branch ID 7!");
    }
    console.log(`✅ Found ${employees.length} active employees`);

    const employeeIds = employees.map((emp) => emp.id);
    const existingRecords = await db("attendance_records")
      .whereIn("employee_id", employeeIds)
      .whereBetween("created_at", [
        new Date("2025-10-01T00:00:00"),
        new Date("2025-10-31T23:59:59"),
      ])
      .count("* as count")
      .first();

    const recordCount = parseInt(existingRecords.count);
    if (recordCount > 0) {
      console.log(
        `⚠️  Found ${recordCount} existing attendance records for October 2025`
      );
      console.log("   The script will skip employees with existing records");
    } else {
      console.log("✅ No existing attendance records found for October 2025");
    }

    // Check for employees on leave
    const leaveRequests = await db("leave_requests")
      .whereIn("employee_id", employeeIds)
      .whereIn("status", ["approved_by_manager", "approved_by_hr"])
      .where(function () {
        this.whereBetween("from_date", ["2025-10-01", "2025-10-31"])
          .orWhereBetween("to_date", ["2025-10-01", "2025-10-31"])
          .orWhere(function () {
            this.where("from_date", "<=", "2025-10-01").andWhere(
              "to_date",
              ">=",
              "2025-10-31"
            );
          });
      })
      .whereNull("deleted_at")
      .count("* as count")
      .first();

    const leaveCount = parseInt(leaveRequests.count);
    if (leaveCount > 0) {
      console.log(
        `⚠️  Found ${leaveCount} approved leave requests for October 2025`
      );
      console.log("   Employees on leave will be skipped");
    } else {
      console.log("✅ No employees on leave for October 2025");
    }

    // Check for Day Off schedules
    const dayOffSchedules = await db("employee_schedules")
      .whereIn("employee_id", employeeIds)
      .whereBetween("schedule_date", ["2025-10-01", "2025-10-31"])
      .where("shift_name", "Day Off")
      .where("is_active", true)
      .where("is_rest_day_override", false)
      .count("* as count")
      .first();

    const dayOffCount = parseInt(dayOffSchedules.count);
    if (dayOffCount > 0) {
      console.log(`✅ Found ${dayOffCount} Day Off schedules for October 2025`);
      console.log("   Some of these may be selected for rest day work");
    } else {
      console.log("⚠️  No Day Off schedules found for October 2025");
      console.log("   Rest day work scenarios will not be generated");
    }

    console.log("✅ Safety checks completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Safety check failed:", error);
    return false;
  } finally {
    await db.destroy();
  }
}

// Run the script
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--cleanup")) {
    cleanupOctoberAttendanceBranch7()
      .then(() => {
        console.log("✅ Cleanup completed successfully!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Cleanup failed:", error.message);
        process.exit(1);
      });
  } else if (args.includes("--safety-check")) {
    safetyCheck()
      .then((success) => {
        if (success) {
          console.log("✅ Safety check passed!");
          process.exit(0);
        } else {
          console.log("❌ Safety check failed!");
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error("❌ Safety check error:", error.message);
        process.exit(1);
      });
  } else {
    generateOctoberAttendanceBranch7WithRestDay()
      .then(() => {
        console.log("✅ Script completed successfully!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Script failed:", error.message);
        process.exit(1);
      });
  }
}

module.exports = {
  generateOctoberAttendanceBranch7WithRestDay,
  cleanupOctoberAttendanceBranch7,
  safetyCheck,
};
