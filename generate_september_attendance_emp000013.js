const { db } = require("./backend/config/database");

/**
 * Script to generate attendance records for EMP000013 (Nathaniel Vasquez)
 * for September 2025 with 26 working days, including 2 overtime and 2 late days
 */

async function generateSeptemberAttendance() {
  try {
    console.log(
      "🚀 Starting September 2025 attendance generation for EMP000013..."
    );

    // First, get the employee's database ID and branch information
    const employee = await db("employees")
      .select(
        "employees.*",
        "branches.name as branch_name",
        "branches.id as branch_id"
      )
      .leftJoin("branches", "employees.branch_id", "branches.id")
      .where("employees.employee_id", "EMP000013")
      .first();

    if (!employee) {
      throw new Error("Employee EMP000013 not found!");
    }

    console.log(
      `✅ Found employee: ${employee.first_name} ${employee.last_name} (ID: ${employee.id})`
    );
    console.log(
      `🏢 Branch: ${employee.branch_name || "No branch assigned"} (ID: ${employee.branch_id || "N/A"})`
    );

    // Get existing QR codes from the database
    const existingQrCodes = await db("attendance_qr_codes")
      .where("is_active", true)
      .orderBy("created_at", "desc");

    console.log(`📱 Found ${existingQrCodes.length} existing QR codes:`);
    existingQrCodes.forEach((qr, index) => {
      console.log(
        `   ${index + 1}. ID: ${qr.id} - ${qr.location_name} (${qr.qr_code})`
      );
    });

    // Use the first available QR code, or create one if none exist
    let qrCode = existingQrCodes[0];

    if (!qrCode) {
      console.log("📱 No QR codes found. Creating default QR code...");
      const [newQrCode] = await db("attendance_qr_codes")
        .insert({
          qr_code: "DEFAULT_ATTENDANCE_QR",
          location_name: "Main Office",
          description: "Default attendance QR code",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      qrCode = newQrCode;
    }

    console.log(`✅ Using QR Code: ${qrCode.location_name} (ID: ${qrCode.id})`);

    // September 2025 working days for 24/7 company (6 days work, 1 day off per week)
    // Employee works 6 days and gets 1 day off per week
    const allWorkingDays = [
      // Week 1: Sep 1-7 (Sunday off)
      "2025-09-01",
      "2025-09-02",
      "2025-09-03",
      "2025-09-04",
      "2025-09-05",
      "2025-09-06",
      // Week 2: Sep 8-14 (Monday off)
      "2025-09-08",
      "2025-09-09",
      "2025-09-10",
      "2025-09-11",
      "2025-09-12",
      "2025-09-13",
      // Week 3: Sep 15-21 (Tuesday off)
      "2025-09-15",
      "2025-09-16",
      "2025-09-17",
      "2025-09-18",
      "2025-09-19",
      "2025-09-20",
      // Week 4: Sep 22-28 (Wednesday off)
      "2025-09-22",
      "2025-09-23",
      "2025-09-24",
      "2025-09-25",
      "2025-09-26",
      "2025-09-27",
      // Week 5: Sep 29-30 (Thursday and Friday off next week)
      "2025-09-29",
      "2025-09-30",
    ]; // 26 working days (6 days per week × 4 weeks + 2 days)

    // Define late days (2 days)
    const lateDays = ["2025-09-03", "2025-09-17"];

    // Define overtime days (2 days)
    const overtimeDays = ["2025-09-10", "2025-09-24"];

    console.log(
      `📅 Generating attendance for ${allWorkingDays.length} working days`
    );
    console.log(`⏰ Late days: ${lateDays.join(", ")}`);
    console.log(`🕐 Overtime days: ${overtimeDays.join(", ")}`);

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
        // Late arrival: 9:00 AM to 9:30 AM (1-1.5 hours late)
        const lateMinutes = 60 + Math.floor(Math.random() * 31); // 60-90 minutes late
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

      // Calculate hours worked (8 hours standard, minus 1 hour lunch break)
      let totalHours = (timeOut - timeIn) / (1000 * 60 * 60);
      totalHours -= 1; // Subtract 1 hour for lunch break

      // Calculate regular hours (8 hours max) and overtime hours separately
      let regularHours = Math.min(8, totalHours);
      let overtimeHours = Math.max(0, totalHours - 8);

      // For overtime days, ensure we have actual overtime
      if (isOvertime && overtimeHours < 1) {
        overtimeHours = 1 + Math.floor(Math.random() * 3); // 1-3 hours overtime
        totalHours = regularHours + overtimeHours;
      }

      // Ensure minimum of 7 hours and maximum of 11 hours total
      totalHours = Math.max(7, Math.min(11, totalHours));
      if (totalHours > 8) {
        regularHours = 8;
        overtimeHours = totalHours - 8;
      }

      // Calculate tardiness minutes
      const tardinessMinutes = isLate ? 60 + Math.floor(Math.random() * 31) : 0;

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
        ];
        notes = lateReasons[Math.floor(Math.random() * lateReasons.length)];
      } else if (isOvertime) {
        const overtimeReasons = [
          "Project deadline",
          "Overtime work",
          "Extra tasks",
          "Client meeting",
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
        `⚠️  Found ${existingRecords.length} existing attendance records for September 2025`
      );
      console.log(
        "   Existing records will be kept. New records will be added."
      );
    }

    // Insert all attendance records
    console.log("💾 Inserting attendance records...");
    await db("attendance_records").insert(attendanceRecords);

    // Display summary
    console.log("\n📊 ATTENDANCE SUMMARY FOR EMP000013 (Nathaniel Vasquez)");
    console.log("======================================================");
    console.log(`📅 Period: September 1-30, 2025`);
    console.log(`📈 Total Working Days: ${allWorkingDays.length}`);
    console.log(`✅ Present Days: ${allWorkingDays.length - lateDays.length}`);
    console.log(`⏰ Late Days: ${lateDays.length} (${lateDays.join(", ")})`);
    console.log(
      `🕐 Overtime Days: ${overtimeDays.length} (${overtimeDays.join(", ")})`
    );
    console.log(`📋 Status: All records inserted successfully!`);

    // Show detailed statistics
    console.log("\n📈 DETAILED STATISTICS:");
    console.log("========================");

    const allRecords = await db("attendance_records")
      .where("employee_id", employee.id)
      .whereBetween("created_at", [
        new Date("2025-09-01T00:00:00"),
        new Date("2025-09-30T23:59:59"),
      ])
      .orderBy("created_at", "asc");

    const totalRegularHours = allRecords.reduce(
      (sum, record) => sum + (parseFloat(record.hours_worked) || 0),
      0
    );
    const totalOvertimeHours = allRecords.reduce(
      (sum, record) => sum + (parseFloat(record.overtime_hours) || 0),
      0
    );
    const totalHours = totalRegularHours + totalOvertimeHours;
    const totalTardiness = allRecords.reduce(
      (sum, record) => sum + (parseInt(record.tardiness_minutes) || 0),
      0
    );
    const avgHoursPerDay = totalHours / allRecords.length;
    const lateRecords = allRecords.filter((r) => r.status === "late");
    const overtimeRecords = allRecords.filter(
      (r) => (parseFloat(r.overtime_hours) || 0) > 0
    );

    console.log(
      `📊 Total Regular Hours: ${totalRegularHours.toFixed(2)} hours`
    );
    console.log(
      `📊 Total Overtime Hours: ${totalOvertimeHours.toFixed(2)} hours`
    );
    console.log(`📊 Total Hours Worked: ${totalHours.toFixed(2)} hours`);
    console.log(`📊 Average Hours per Day: ${avgHoursPerDay.toFixed(2)} hours`);
    console.log(
      `📊 Total Tardiness: ${totalTardiness} minutes (${(totalTardiness / 60).toFixed(2)} hours)`
    );
    console.log(`📊 Late Records: ${lateRecords.length} days`);
    console.log(`📊 Overtime Records: ${overtimeRecords.length} days`);

    // Show some sample records
    console.log("\n📝 SAMPLE RECORDS:");
    console.log("==================");

    const sampleRecords = allRecords.slice(0, 5);
    sampleRecords.forEach((record, index) => {
      const date = new Date(record.created_at).toLocaleDateString();
      const timeIn = new Date(record.time_in).toLocaleTimeString();
      const timeOut = new Date(record.time_out).toLocaleTimeString();
      const notes = record.notes ? ` (${record.notes})` : "";
      console.log(
        `${index + 1}. ${date}: ${timeIn} - ${timeOut} (${record.status}, ${record.hours_worked}h)${notes}`
      );
    });

    // Show late and overtime records specifically
    if (lateRecords.length > 0) {
      console.log("\n⏰ LATE ARRIVAL RECORDS:");
      console.log("========================");
      lateRecords.forEach((record, index) => {
        const date = new Date(record.created_at).toLocaleDateString();
        const timeIn = new Date(record.time_in).toLocaleTimeString();
        console.log(
          `${index + 1}. ${date}: ${timeIn} (${record.tardiness_minutes} min late) - ${record.notes}`
        );
      });
    }

    if (overtimeRecords.length > 0) {
      console.log("\n🕐 OVERTIME RECORDS:");
      console.log("====================");
      overtimeRecords.forEach((record, index) => {
        const date = new Date(record.created_at).toLocaleDateString();
        const timeOut = new Date(record.time_out).toLocaleTimeString();
        console.log(
          `${index + 1}. ${date}: ${timeOut} (${record.hours_worked}h worked) - ${record.notes}`
        );
      });
    }

    console.log("\n🎉 Attendance generation completed successfully!");
  } catch (error) {
    console.error("❌ Error generating attendance:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the script
if (require.main === module) {
  generateSeptemberAttendance()
    .then(() => {
      console.log("✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { generateSeptemberAttendance };
