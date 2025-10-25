# Overtime Hours Display Fix

## Problem

The OT (Overtime) column in the attendance table was showing "—" (dash) for all records, even when employees had overtime hours recorded in the database.

### Example of the Issue:

- **Database**: `overtime_hours: "2.00"`, `is_overtime: true`
- **UI Display**: "—" (dash) in OT column
- **Expected**: "2h" in OT column

## Root Cause

The OT column was looking for a separate `record.overtime` object, but overtime hours are actually stored directly in the attendance record as `overtime_hours` field.

### Old Code:

```javascript
// OT Hours Column - Looking for separate overtime record
<div v-if="record.overtime" class="flex items-center gap-1">
  <TrendingUp class="w-3 h-3 text-warning" />
  <span class="text-sm font-medium">
    {{ record.overtime.hours_worked }}h
  </span>
</div>
```

## Solution

Updated the OT column to check for `overtime_hours` in the attendance record itself:

### New Code:

```javascript
// OT Hours Column - Check attendance record for overtime_hours
<div v-if="record.attendance?.overtime_hours && parseFloat(record.attendance.overtime_hours) > 0" class="flex items-center gap-1">
  <TrendingUp class="w-3 h-3 text-warning" />
  <span class="text-sm font-medium">
    {{ parseFloat(record.attendance.overtime_hours) }}h
  </span>
</div>
```

## Files Modified

- `frontend/src/components/hr/EmployeeAttendanceViewer.vue`
  - Updated OT column template to use `record.attendance.overtime_hours`
  - Updated CSV export to use the same logic
  - Added proper null/zero checks

## Result

Now the OT column will correctly display overtime hours:

- **No overtime**: "—" (dash)
- **With overtime**: "2h", "3h", etc. (from `overtime_hours` field)
- **CSV export**: Includes overtime hours in the OT column

## Testing

The fix ensures that:

1. ✅ OT column displays overtime hours from attendance records
2. ✅ Only shows overtime when `overtime_hours > 0`
3. ✅ CSV export includes overtime hours
4. ✅ Proper formatting (e.g., "2h" instead of "2.00h")

## Data Examples

Based on the JSON data provided:

- **Oct 28, 2025**: `overtime_hours: "2.00"` → OT column shows "2h"
- **Oct 21, 2025**: `overtime_hours: "3.00"` → OT column shows "3h"
- **Oct 6, 2025**: `overtime_hours: "1.00"` → OT column shows "1h"
- **Regular days**: `overtime_hours: "0.00"` → OT column shows "—"
