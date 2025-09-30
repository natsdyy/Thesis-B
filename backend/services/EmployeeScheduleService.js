const { db } = require("../config/database");
const {
  getCurrentPhilippineTime,
  getCurrentPhilippineDate,
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
          "is_active"
        )
        .where("employee_id", employeeId)
        .where("schedule_date", date)
        .where("is_active", true)
        .first();

      return schedule;
    } catch (error) {
      console.error("Error fetching employee schedule:", error);
      throw new Error("Failed to fetch employee schedule");
    }
  }

  /**
   * Validate if current time is within employee's scheduled hours
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
      let schedule = await this.getEmployeeScheduleForDate(employeeId, date);

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
          const scheduleStart = new Date(
            `${yesterdayStr}T${yesterdaySchedule.start_time}`
          );
          const scheduleEnd = new Date(
            `${yesterdayStr}T${yesterdaySchedule.end_time}`
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
      if (schedule.shift_name === "Day Off") {
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

      // Parse schedule times using the schedule's actual date
      const scheduleDate = schedule.schedule_date || date;
      const scheduleStart = new Date(`${scheduleDate}T${schedule.start_time}`);
      const scheduleEnd = new Date(`${scheduleDate}T${schedule.end_time}`);

      // Handle overnight shifts (e.g., 22:00 to 06:00)
      if (scheduleEnd <= scheduleStart) {
        scheduleEnd.setDate(scheduleEnd.getDate() + 1);
      }

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
