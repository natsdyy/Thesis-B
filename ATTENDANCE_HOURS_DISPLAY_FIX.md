# Attendance Hours Display Fix

## Problem

The attendance table in the Employee Manager was showing incorrect hours in the "Hours" column. The UI was calculating hours based on the time difference between `time_in` and `time_out`, but the database stores a fixed `hours_worked` value of 8.00 hours.

### Example of the Issue:

- **Database**: `hours_worked: "8.00"`, `overtime_hours: "1.00"` (Total: 9 hours)
- **UI Display**: "10h 0m" (calculated from 08:13 AM to 05:13 PM = 9 hours + 1 hour break)
- **Expected**: "9h 0m" (8 regular + 1 overtime)

## Root Cause

The `calculateHoursWorked` function in `EmployeeAttendanceViewer.vue` was calculating hours based on time difference instead of using the database values:

```javascript
// OLD CODE - Calculated from time difference
const calculateHoursWorked = (timeIn, timeOut) => {
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const diffMs = end - start;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHours}h ${diffMinutes}m`;
};
```

## Solution

Updated the function to use the database `hours_worked` and `overtime_hours` fields:

```javascript
// NEW CODE - Uses database values
const calculateHoursWorked = (attendanceRecord) => {
  if (
    !attendanceRecord ||
    !attendanceRecord.time_in ||
    !attendanceRecord.time_out
  )
    return "—";

  // Use the hours_worked field from the database
  const hours = parseFloat(attendanceRecord.hours_worked) || 0;
  const overtimeHours = parseFloat(attendanceRecord.overtime_hours) || 0;
  const totalHours = hours + overtimeHours;

  if (totalHours === 0) return "—";

  const wholeHours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - wholeHours) * 60);

  return `${wholeHours}h ${minutes}m`;
};
```

## Files Modified

- `frontend/src/components/hr/EmployeeAttendanceViewer.vue`
  - Updated `calculateHoursWorked` function to use database values
  - Updated template to pass attendance record instead of individual time fields
  - Updated CSV export to use the same logic

## Result

Now the "Hours" column will display the correct hours based on the database values:

- **Regular work**: 8h 0m (from `hours_worked: "8.00"`)
- **With overtime**: 9h 0m (from `hours_worked: "8.00"` + `overtime_hours: "1.00"`)
- **Absent/Leave**: — (no time recorded)

## Testing

The fix ensures that:

1. ✅ Hours display matches database values
2. ✅ Overtime hours are included in total
3. ✅ CSV export uses the same calculation
4. ✅ Absent/leave days show "—" correctly
