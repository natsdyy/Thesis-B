const { db } = require("./backend/config/database");

/**
 * Script to generate attendance records for all Human Resource department employees
 * for September 2025 with realistic working patterns including overtime and late days
 */

async function generateSeptemberAttendanceHR() {
  try {
    console.log(
      "🚀 Starting September 2025 attendance generation for HR Department..."
    );

    // Get all active Human Resource employees
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
      .where("employees.department", "Human Resource")
      .where("employees.status", "Active")
      .whereNull("employees.deleted_at");

    if (!employees.length) {
      throw new Error("No active Human Resource employees found!");
    }

    console.log(`✅ Found ${employees.length} HR employees:`);
    employees.forEach((emp, index) => {
      console.log(
        `   ${index + 1}. ${emp.employee_id} - ${emp.first_name} ${emp.last_name} (${emp.role_name || "No role"})`
      );
      console.log(
        `      Branch: ${emp.branch_name || "No branch"} | Rate: ₱${emp.rate_per_hour || 0}/hr`
      );
    });

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
          qr_code: "HR_DEPT_ATTENDANCE_QR",
          location_name: "HR Department - Main Office",
          description: "Human Resource Department attendance QR code",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      qrCode = newQrCode;
    }

    console.log(`✅ Using QR Code: ${qrCode.location_name} (ID: ${qrCode.id})`);

    // September 2025 working days (Monday to Saturday, Sunday off)
    // 26 working days for the month
    const allWorkingDays = [
      // Week 1: Sep 1-6 (Mon-Sat)
      "2025-09-01",
      "2025-09-02",
      "2025-09-03",
      "2025-09-04",
      "2025-09-05",
      "2025-09-06",
      // Week 2: Sep 8-13 (Mon-Sat, Sun 7 off)
      "2025-09-08",
      "2025-09-09",
      "2025-09-10",
      "2025-09-11",
      "2025-09-12",
      "2025-09-13",
      // Week 3: Sep 15-20 (Mon-Sat, Sun 14 off)
      "2025-09-15",
      "2025-09-16",
      "2025-09-17",
      "2025-09-18",
      "2025-09-19",
      "2025-09-20",
      // Week 4: Sep 22-27 (Mon-Sat, Sun 21 off)
      "2025-09-22",
      "2025-09-23",
      "2025-09-24",
      "2025-09-25",
      "2025-09-26",
      "2025-09-27",
      // Week 5: Sep 29-30 (Mon-Tue, Sun 28 off)
      "2025-09-29",
      "2025-09-30",
    ]; // 26 working days total

    console.log(
      `\n📅 Generating attendance for ${allWorkingDays.length} working days (Sep 1-30, 2025)`
    );
    console.log(`👥 Processing ${employees.length} employees...`);

    let totalRecordsCreated = 0;
    const employeeSummaries = [];

    // Process each employee
    for (const employee of employees) {
      console.log(
        `\n📝 Processing: ${employee.first_name} ${employee.last_name} (${employee.employee_id})`
      );

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

      console.log(
        `   ⏰ Late days (${lateDays.length}): ${lateDays.join(", ")}`
      );
      console.log(
        `   🕐 Overtime days (${overtimeDays.length}): ${overtimeDays.join(", ")}`
      );

      const attendanceRecords = [];

      for (const dateStr of allWorkingDays) {
        const date = new Date(dateStr);
        const isLate = lateDays.includes(dateStr);
        const isOvertime = overtimeDays.includes(dateStr);

        // Standard working hours: 8:00 AM - 5:00 PM (8 hours with 1 hour break)
        let timeIn = new Date(date);
        let timeOut = new Date(date);

        // Add some realistic time variation (±15 minutes)
        const timeVariation = Math.floor(Math.random() * 31) - 15; // -15 to +15 minutes

        if (isLate) {
          // Late arrival: 8:30 AM to 9:30 AM (30-90 minutes late)
          const lateMinutes = 30 + Math.floor(Math.random() * 61); // 30-90 minutes late
          timeIn.setHours(8, lateMinutes, 0, 0);
          timeOut.setHours(17, lateMinutes, 0, 0); // Still work 8 hours
        } else {
          // On time: 7:45 AM - 8:15 AM (with variation)
          timeIn.setHours(8, timeVariation, 0, 0);
          timeOut.setHours(17, timeVariation, 0, 0);
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
        if (isLate) {
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
            "Recruitment process",
            "Employee training",
            "Payroll processing",
            "HR documentation",
            "Policy review meeting",
            "Employee onboarding",
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

      // Check for existing attendance records for this employee in September 2025
      const existingRecords = await db("attendance_records")
        .where("employee_id", employee.id)
        .whereBetween("created_at", [
          new Date("2025-09-01T00:00:00"),
          new Date("2025-09-30T23:59:59"),
        ]);

      if (existingRecords.length > 0) {
        console.log(
          `   ⚠️  Found ${existingRecords.length} existing records - Skipping ${employee.employee_id}`
        );
        continue;
      }

      // Insert all attendance records for this employee
      await db("attendance_records").insert(attendanceRecords);
      totalRecordsCreated += attendanceRecords.length;

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

      employeeSummaries.push({
        employeeId: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name}`,
        workingDays: attendanceRecords.length,
        lateDays: lateDays.length,
        overtimeDays: overtimeDays.length,
        regularHours: totalRegularHours.toFixed(2),
        overtimeHours: totalOvertimeHours.toFixed(2),
        totalHours: (totalRegularHours + totalOvertimeHours).toFixed(2),
        tardiness: totalTardiness,
      });

      console.log(
        `   ✅ Created ${attendanceRecords.length} attendance records`
      );
    }

    // Display comprehensive summary
    console.log("\n" + "=".repeat(80));
    console.log(
      "📊 SEPTEMBER 2025 ATTENDANCE SUMMARY - HUMAN RESOURCE DEPARTMENT"
    );
    console.log("=".repeat(80));
    console.log(`📅 Period: September 1-30, 2025`);
    console.log(`🏢 Department: Human Resource`);
    console.log(`👥 Total Employees Processed: ${employeeSummaries.length}`);
    console.log(`📈 Total Records Created: ${totalRecordsCreated}`);
    console.log(`📋 Working Days: ${allWorkingDays.length} days`);

    console.log("\n" + "-".repeat(80));
    console.log("EMPLOYEE BREAKDOWN:");
    console.log("-".repeat(80));

    employeeSummaries.forEach((summary, index) => {
      console.log(`\n${index + 1}. ${summary.name} (${summary.employeeId})`);
      console.log(`   📅 Working Days: ${summary.workingDays}`);
      console.log(`   ⏰ Late Days: ${summary.lateDays}`);
      console.log(`   🕐 Overtime Days: ${summary.overtimeDays}`);
      console.log(`   ⏱️  Regular Hours: ${summary.regularHours} hrs`);
      console.log(`   ⏱️  Overtime Hours: ${summary.overtimeHours} hrs`);
      console.log(`   📊 Total Hours: ${summary.totalHours} hrs`);
      console.log(
        `   🕒 Total Tardiness: ${summary.tardiness} min (${(summary.tardiness / 60).toFixed(2)} hrs)`
      );
    });

    // Calculate department totals
    const deptTotalRegularHours = employeeSummaries.reduce(
      (sum, emp) => sum + parseFloat(emp.regularHours),
      0
    );
    const deptTotalOvertimeHours = employeeSummaries.reduce(
      (sum, emp) => sum + parseFloat(emp.overtimeHours),
      0
    );
    const deptTotalHours = employeeSummaries.reduce(
      (sum, emp) => sum + parseFloat(emp.totalHours),
      0
    );
    const deptTotalLateDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.lateDays,
      0
    );
    const deptTotalOvertimeDays = employeeSummaries.reduce(
      (sum, emp) => sum + emp.overtimeDays,
      0
    );
    const deptTotalTardiness = employeeSummaries.reduce(
      (sum, emp) => sum + emp.tardiness,
      0
    );

    console.log("\n" + "=".repeat(80));
    console.log("📊 DEPARTMENT TOTALS:");
    console.log("=".repeat(80));
    console.log(
      `⏱️  Total Regular Hours: ${deptTotalRegularHours.toFixed(2)} hrs`
    );
    console.log(
      `⏱️  Total Overtime Hours: ${deptTotalOvertimeHours.toFixed(2)} hrs`
    );
    console.log(`📊 Grand Total Hours: ${deptTotalHours.toFixed(2)} hrs`);
    console.log(
      `📈 Average Hours per Employee: ${(deptTotalHours / employeeSummaries.length).toFixed(2)} hrs`
    );
    console.log(`⏰ Total Late Instances: ${deptTotalLateDays} days`);
    console.log(`🕐 Total Overtime Instances: ${deptTotalOvertimeDays} days`);
    console.log(
      `🕒 Total Department Tardiness: ${deptTotalTardiness} min (${(deptTotalTardiness / 60).toFixed(2)} hrs)`
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

// Run the script
if (require.main === module) {
  generateSeptemberAttendanceHR()
    .then(() => {
      console.log("✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { generateSeptemberAttendanceHR };
