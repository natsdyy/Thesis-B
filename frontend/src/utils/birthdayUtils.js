/**
 * Birthday utility functions for filtering employees by birthday date
 */

/**
 * Get current date in Asia/Manila timezone
 * @returns {Date} Current date in Asia/Manila timezone
 */
export function getCurrentDateInManila() {
  const now = new Date();
  // Convert to Asia/Manila timezone string
  const manilaTimeStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Create a date object using the formatted string (this creates a date at midnight local time)
  // We need to manually construct it to ensure correct date
  const [year, month, day] = manilaTimeStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Extract month and day from a date string, converting to Asia/Manila timezone
 * @param {string} dateString - Date string (e.g., "1990-05-14T16:00:00.000Z" or "1990-05-14")
 * @returns {Object} Object with month and day, or null if invalid
 */
export function getMonthDay(dateString) {
  if (!dateString) return null;

  // Parse the date string
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  // Convert to Asia/Manila timezone and extract date parts
  const manilaDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const [year, month, day] = manilaDateStr.split('-').map(Number);

  return {
    month: month, // Month is 1-12
    day: day,
  };
}

/**
 * Check if a birthday matches a specific date (month and day only)
 * @param {string} birthday - Birthday date string
 * @param {Date} targetDate - Target date to compare
 * @returns {boolean} True if birthday matches target date
 */
export function isBirthdayOnDate(birthday, targetDate) {
  if (!birthday) return false;

  const birthdayMD = getMonthDay(birthday);
  if (!birthdayMD) return false;

  const targetMD = {
    month: targetDate.getMonth() + 1,
    day: targetDate.getDate(),
  };

  return birthdayMD.month === targetMD.month && birthdayMD.day === targetMD.day;
}

/**
 * Get date for N days from today in Asia/Manila timezone
 * @param {number} daysOffset - Number of days from today (0 = today, 1 = tomorrow, etc.)
 * @returns {Date} Date object for the specified day
 */
export function getDateDaysFromToday(daysOffset) {
  const today = getCurrentDateInManila();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysOffset);
  return targetDate;
}

/**
 * Format birthday date for display
 * @param {string} birthday - Birthday date string
 * @param {Date} referenceDate - Reference date (usually today)
 * @returns {string} Formatted date string ("Today", "Tomorrow", or day name)
 */
export function formatBirthdayDisplay(birthday, targetDate) {
  if (!targetDate) return '';

  const today = getCurrentDateInManila();

  // Calculate days difference between target date and today
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays > 1 && diffDays <= 7) {
    // Return day name (e.g., "Monday", "Tuesday")
    return targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    // Return date (e.g., "May 14")
    return targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Get the next occurrence of a birthday date (this year or next year)
 * @param {string} birthday - Birthday date string
 * @param {Date} referenceDate - Reference date (usually today)
 * @returns {Date} Next occurrence of the birthday
 */
export function getNextBirthdayDate(birthday, referenceDate) {
  if (!birthday) return null;

  const birthdayMD = getMonthDay(birthday);
  if (!birthdayMD) return null;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  // Create birthday for this year
  let nextBirthday = new Date(
    currentYear,
    birthdayMD.month - 1,
    birthdayMD.day
  );

  // If birthday already passed this year, use next year
  if (
    birthdayMD.month < currentMonth ||
    (birthdayMD.month === currentMonth && birthdayMD.day < currentDay)
  ) {
    nextBirthday = new Date(
      currentYear + 1,
      birthdayMD.month - 1,
      birthdayMD.day
    );
  }

  return nextBirthday;
}

/**
 * Filter employees by birthday for today and upcoming week
 * @param {Array} employees - Array of employee objects with birthday field
 * @returns {Object} Object with todayBirthdays and upcomingBirthdays arrays
 */
export function getBirthdayEmployees(employees) {
  if (!employees || !Array.isArray(employees)) {
    return { todayBirthdays: [], upcomingBirthdays: [] };
  }

  const today = getCurrentDateInManila();
  const todayBirthdays = [];
  const upcomingBirthdays = [];
  const processedEmployeeIds = new Set(); // Track processed employees to avoid duplicates

  // Debug: Log today's date (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Birthday Filter] Today in Manila:', {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
      dateString: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      rawDate: today.toString(),
    });
  }

  // Get today's birthdays
  employees.forEach((employee) => {
    if (!employee.birthday) return;
    if (employee.deleted_at) return; // Skip deleted employees

    const birthdayMD = getMonthDay(employee.birthday);
    const isToday = isBirthdayOnDate(employee.birthday, today);

    // Debug: Log for employee ID 18 (can be removed in production)
    if (process.env.NODE_ENV === 'development' && employee.id === 18) {
      console.log('[Birthday Filter] Employee 18:', {
        birthday: employee.birthday,
        birthdayMD,
        todayMD: { month: today.getMonth() + 1, day: today.getDate() },
        isToday,
      });
    }

    if (isToday) {
      todayBirthdays.push({
        ...employee,
        birthdayDisplay: 'Today',
      });
      processedEmployeeIds.add(employee.id);
    }
  });

  // Get upcoming week birthdays (next 7 days, excluding today)
  for (let i = 1; i <= 7; i++) {
    const futureDate = getDateDaysFromToday(i);

    employees.forEach((employee) => {
      if (!employee.birthday) return;
      if (employee.deleted_at) return; // Skip deleted employees
      if (processedEmployeeIds.has(employee.id)) return; // Skip if already in today's list

      // Get the next occurrence of this employee's birthday
      const nextBirthday = getNextBirthdayDate(employee.birthday, today);

      if (!nextBirthday) return;

      // Check if the next birthday falls on this future date
      if (
        nextBirthday.getMonth() === futureDate.getMonth() &&
        nextBirthday.getDate() === futureDate.getDate()
      ) {
        // Check if already in upcoming list
        const alreadyAdded = upcomingBirthdays.some(
          (emp) => emp.id === employee.id
        );
        if (!alreadyAdded) {
          upcomingBirthdays.push({
            ...employee,
            birthdayDisplay: formatBirthdayDisplay(
              employee.birthday,
              futureDate
            ),
            birthdayDate: futureDate,
          });
        }
      }
    });
  }

  // Sort upcoming birthdays by date
  upcomingBirthdays.sort((a, b) => {
    if (!a.birthdayDate || !b.birthdayDate) return 0;
    return a.birthdayDate - b.birthdayDate;
  });

  return { todayBirthdays, upcomingBirthdays };
}

/**
 * Check if user's birthday is today
 * @param {string} userBirthday - User's birthday date string
 * @returns {boolean} True if user's birthday is today
 */
export function isMyBirthdayToday(userBirthday) {
  if (!userBirthday) return false;
  const today = getCurrentDateInManila();
  return isBirthdayOnDate(userBirthday, today);
}
