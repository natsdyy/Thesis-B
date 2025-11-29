const { db } = require("../config/database");
const {
  getCurrentPhilippineTime,
  getCurrentPhilippineDate,
  createPhilippineDate,
} = require("../utils/timezoneUtils");

class EmployeeScheduleService {
  /**
   * Get employee schedule for a specific date
   * @param {number} employeeId - Employee ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object|null} - Schedule object or null if not found
   */
  static async getEmployeeScheduleForDate(employeeId, date) {
    try {
      console.log(
        "Querying schedule for employee:",
        employeeId,
        "on date:",
        date
      );

      // Convert the Philippine date to UTC for database query
      const philippineDate = new Date(date + "T00:00:00+08:00"); // Philippine timezone
      const utcDate = new Date(philippineDate.toISOString().split("T")[0]); // Convert to UTC date

      console.log("Philippine date:", philippineDate);
      console.log("UTC date for query:", utcDate);

      const schedule = await db("employee_schedules")
        .select(
          "id",
          "employee_id",
          "branch_id",
          "schedule_date",
          "shift_name",
          "start_time",
          "end_time",
          "notes",
          "is_active",
          "is_rest_day_override"
        )
        .where("employee_id", employeeId)
        .whereRaw("DATE(schedule_date) = ?", [date]) // Use DATE() function to match date part only
        .where("is_active", true)
        .first();

      console.log("Query result:", schedule);
      return schedule;
    } catch (error) {
      console.error("Error fetching employee schedule:", error);
      throw new Error("Failed to fetch employee schedule");
    }
  }

  /**
   * Validate if current time is within employee's scheduled hours
   *
   * CRITICAL TIMEZONE HANDLING:
   * - Database stores schedule_date as UTC timestamps
   * - For Philippine timezone validation, we must convert UTC to PH timezone
   * - This ensures schedule day matches actual Philippine day
   * - Prevents false "outside scheduled hours" rejections
   *
   * @param {number} employeeId - Employee ID
   * @param {Date} currentTime - Current time (optional, defaults to now)
   * @returns {Object} - Validation result with details
   */
  static async validateTimeInSchedule(
    employeeId,
    currentTime = getCurrentPhilippineTime()
  ) {
    try {
      const date = getCurrentPhilippineDate(); // YYYY-MM-DD format in Philippine timezone
      console.log("Looking for schedule on date:", date);
      let schedule = await this.getEmployeeScheduleForDate(employeeId, date);
      console.log("Found schedule for today:", schedule);

      // If no schedule found for today, check for Night Shift from yesterday
      if (!schedule) {
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const yesterdaySchedule = await this.getEmployeeScheduleForDate(
          employeeId,
          yesterdayStr
        );

        // Check if yesterday's schedule is a Night Shift that spans midnight
        if (yesterdaySchedule) {
          const [yesterdayYear, yesterdayMonth, yesterdayDay] = yesterdayStr
            .split("-")
            .map(Number);
          const [startHour, startMin, startSec] = yesterdaySchedule.start_time
            .split(":")
            .map(Number);
          const [endHour, endMin, endSec] = yesterdaySchedule.end_time
            .split(":")
            .map(Number);

          const scheduleStart = createPhilippineDate(
            yesterdayYear,
            yesterdayMonth,
            yesterdayDay,
            startHour,
            startMin,
            startSec
          );
          const scheduleEnd = createPhilippineDate(
            yesterdayYear,
            yesterdayMonth,
            yesterdayDay,
            endHour,
            endMin,
            endSec
          );

          // If end time is before start time, it's an overnight shift
          if (scheduleEnd <= scheduleStart) {
            scheduleEnd.setDate(scheduleEnd.getDate() + 1);

            // Check if current time is still within the Night Shift period
            if (currentTime >= scheduleStart && currentTime <= scheduleEnd) {
              schedule = yesterdaySchedule; // Use yesterday's schedule
            }
          }
        }
      }

      // If still no schedule found (including Night Shifts)
      if (!schedule) {
        return {
          isValid: false,
          message: "No schedule found for today",
          schedule: null,
          currentTime: currentTime.toTimeString().split(" ")[0], // HH:MM:SS format
          reason: "NO_SCHEDULE",
        };
      }

      // Check if employee has "Day Off" shift
      // If is_rest_day_override is true, it means Day Off was overridden with a working shift
      // In that case, allow check-in (the shift_name will be a working shift, not "Day Off")
      if (schedule.shift_name === "Day Off" && !schedule.is_rest_day_override) {
        return {
          isValid: false,
          message: "You are scheduled for Day Off today",
          schedule: {
            id: schedule.id,
            shift_name: schedule.shift_name,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            date: schedule.schedule_date,
          },
          currentTime: currentTime.toTimeString().split(" ")[0],
          reason: "DAY_OFF",
        };
      }

      // Parse schedule times using the schedule's actual date in Philippine timezone
      //
      // TIMEZONE CONVERSION FIX:
      // The `schedule_date` from database is stored as UTC timestamp (e.g., "2025-10-01T16:00:00.000Z").
      // If we extract the date portion directly, we get UTC day ("2025-10-01").
      // However, for Philippine timezone validation, we need the PH day (UTC+8).
      // In the example above, the PH day would be "2025-10-02" (16:00 UTC = 00:00 next day in PH).
      //
      // SOLUTION: Convert UTC timestamp to Philippine timezone, then extract date components
      // This ensures schedule validation uses the correct Philippine day.
      const scheduleDatePh =
        require("../utils/timezoneUtils").convertUTCToPhilippine(
          schedule.schedule_date || date
        );

      // Extract date components from Philippine timezone date
      const scheduleYear = scheduleDatePh.getFullYear();
      const scheduleMonth = scheduleDatePh.getMonth() + 1; // JavaScript months are 0-based
      const scheduleDay = scheduleDatePh.getDate();
      const [startHour, startMin, startSec] = schedule.start_time
        .split(":")
        .map(Number);
      const [endHour, endMin, endSec] = schedule.end_time
        .split(":")
        .map(Number);

      // Create schedule times in Philippine timezone
      const scheduleStart = createPhilippineDate(
        scheduleYear,
        scheduleMonth,
        scheduleDay,
        startHour,
        startMin,
        startSec
      );
      const scheduleEnd = createPhilippineDate(
        scheduleYear,
        scheduleMonth,
        scheduleDay,
        endHour,
        endMin,
        endSec
      );

      // Handle overnight shifts (e.g., 22:00 to 06:00)
      if (scheduleEnd <= scheduleStart) {
        scheduleEnd.setDate(scheduleEnd.getDate() + 1);
      }

      // Debug logging for timezone validation (can be removed in production)
      console.log("Schedule validation debug:");
      console.log(
        "Current time:",
        currentTime.toISOString(),
        currentTime.toTimeString()
      );
      console.log(
        "Schedule start:",
        scheduleStart.toISOString(),
        scheduleStart.toTimeString()
      );
      console.log(
        "Schedule end:",
        scheduleEnd.toISOString(),
        scheduleEnd.toTimeString()
      );
      console.log("Current >= Start:", currentTime >= scheduleStart);
      console.log("Current <= End:", currentTime <= scheduleEnd);
      console.log("Timezone fix applied: Using PH timezone for schedule date");

      const isValid =
        currentTime >= scheduleStart && currentTime <= scheduleEnd;

      // Calculate time difference for better error messages
      let timeDifference = null;
      let direction = null;

      if (!isValid) {
        if (currentTime < scheduleStart) {
          timeDifference = Math.abs(currentTime - scheduleStart);
          direction = "before";
        } else if (currentTime > scheduleEnd) {
          timeDifference = Math.abs(currentTime - scheduleEnd);
          direction = "after";
        }
      }

      return {
        isValid,
        message: isValid
          ? `Time-in is within scheduled hours (${schedule.start_time} - ${schedule.end_time})`
          : `Time-in is outside scheduled hours. Schedule: ${schedule.start_time} - ${schedule.end_time}`,
        schedule: {
          id: schedule.id,
          shift_name: schedule.shift_name,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          date: schedule.schedule_date,
        },
        currentTime: currentTime.toTimeString().split(" ")[0],
        timeDifference: timeDifference
          ? Math.round(timeDifference / (1000 * 60))
          : null, // minutes
        direction,
        reason: isValid ? "WITHIN_SCHEDULE" : "OUTSIDE_SCHEDULE",
      };
    } catch (error) {
      console.error("Error validating schedule:", error);
      throw new Error("Failed to validate employee schedule");
    }
  }

  /**
   * Get employee schedule information for display purposes
   * @param {number} employeeId - Employee ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} - Schedule information for display
   */
  static async getScheduleDisplayInfo(employeeId, date) {
    try {
      const schedule = await this.getEmployeeScheduleForDate(employeeId, date);

      if (!schedule) {
        return {
          hasSchedule: false,
          message: "No schedule assigned for this date",
          schedule: null,
        };
      }

      return {
        hasSchedule: true,
        message: `Scheduled for ${schedule.shift_name}`,
        schedule: {
          shift_name: schedule.shift_name,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          date: schedule.schedule_date,
          notes: schedule.notes,
          is_rest_day_override: schedule.is_rest_day_override || false,
        },
      };
    } catch (error) {
      console.error("Error getting schedule display info:", error);
      return {
        hasSchedule: false,
        message: "Error retrieving schedule information",
        schedule: null,
      };
    }
  }

  /**
   * Check if employee has any schedule for the given date range
   * @param {number} employeeId - Employee ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Array} - Array of schedules
   */
  static async getEmployeeSchedulesInRange(employeeId, startDate, endDate) {
    try {
      const schedules = await db("employee_schedules")
        .select(
          "id",
          "employee_id",
          "branch_id",
          "schedule_date",
          "shift_name",
          "start_time",
          "end_time",
          "notes",
          "is_active"
        )
        .where("employee_id", employeeId)
        .whereBetween("schedule_date", [startDate, endDate])
        .where("is_active", true)
        .orderBy("schedule_date");

      return schedules;
    } catch (error) {
      console.error("Error fetching employee schedules in range:", error);
      throw new Error("Failed to fetch employee schedules");
    }
  }
}

module.exports = EmployeeScheduleService;
