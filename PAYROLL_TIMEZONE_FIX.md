# Payroll Timezone & SIL Conversion Fix

## Issues Fixed

All three issues have been resolved:

### Issue 1: Timezone Conversion in Payroll Generation

**Problem:** When generating payroll with dates "December 1-31, 2025", the system was storing dates shifted by timezone, causing dates to appear as "November 30 to December 30" in the API response.

**Root Cause:**

1. The `formatForDatabase()` function was converting dates to ISO strings with `+08:00` offset
2. When stored in PostgreSQL `DATE` columns, the database stored the date correctly
3. However, when retrieved by Knex and serialized via JSON, the dates were converted back to UTC, causing the date to shift backward by 8 hours
4. Example: Dec 1 00:00:00+08:00 → stored as Dec 1 → retrieved as Date object → serialized as Dec 1 00:00:00Z → interpreted as Nov 30 16:00:00 in UTC

**Example:**

```
Frontend sends: "2025-12-01"
Old code: formatForDatabase() → "2025-12-01T00:00:00.000+08:00" → PostgreSQL stores as DATE → Knex retrieves as Date → JSON.stringify → "2025-11-30T16:00:00.000Z"
Result: Dates shifted incorrectly in API response
```

**Solution:**

1. Created `formatDateOnlyForDatabase()` helper function that extracts date components using Philippine timezone
2. Used this function to store dates as `YYYY-MM-DD` strings directly instead of full ISO timestamps
3. Applied formatting to both storage and retrieval to ensure consistent YYYY-MM-DD format throughout

**Files Changed:**

- `backend/utils/timezoneUtils.js` - Added `formatDateOnlyForDatabase()` function
- `backend/services/PayrollService.js` - Updated to use `formatDateOnlyForDatabase()` for date_from and date_to
- `backend/models/PayrollPeriod.js` - Added date formatting on retrieval to ensure YYYY-MM-DD format in API responses
- `backend/routes/payroll.js` - Updated to use `parsePhilippineDateString()` instead of `new Date()`
- `frontend/src/utils/timezoneUtils.js` - Added `formatDateOnly()` function
- `frontend/src/components/payroll/PayrollGenerationModal.vue` - Updated to use `formatDateOnly()` instead of `toISOString().split('T')[0]` to prevent timezone shifts

### Issue 2: SIL Year-End Conversion Not Triggering

**Problem:** Year-end SIL (Service Incentive Leave) conversion to cash was not triggering for December payrolls.

**Root Cause:** The `calculateSILConversion()` function was using local date components instead of Philippine timezone date components when checking if Dec 31 is included in the payroll period.

**Example:**

```
Date stored in DB: 2025-12-30T16:00:00.000Z (Dec 31 midnight PH time)
Old code: Used getFullYear(), getMonth(), getDate() on Date object
Result: Read as Dec 30 instead of Dec 31 in local timezone
SIL conversion check: Failed to detect Dec 31
```

**Solution:** Modified `calculateSILConversion()` to extract date components in Philippine timezone using `toLocaleString()` with `Asia/Manila` timezone.

**Files Changed:**

- `backend/services/PayrollService.js` - Fixed SIL conversion date comparison logic

### Issue 3: Deductions Applied to Zero Salary

**Problem:** Employees with ₱0 gross salary (no attendance during payroll period) were still charged ₱250 SSS deductions.

**Root Cause:** The `calculateGovernmentDeductions()` function didn't check for zero salary before calculating deductions, causing it to use minimum MSC of ₱5,000 even when no earnings occurred.

**Solution:** Added an early return in `calculateGovernmentDeductions()` to return all zeros when gross salary is ₱0 or less.

**Files Changed:**

- `backend/services/PayrollService.js` - Added zero salary check before calculating deductions

## Technical Details

### New Helper Functions

**Backend (`formatDateOnlyForDatabase`):**

```javascript
function formatDateOnlyForDatabase(date = new Date()) {
  if (!date) return "";

  // If it's a string in YYYY-MM-DD format, return it as-is
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const d = date instanceof Date ? date : new Date(date);

  // Use Intl.DateTimeFormat to get Philippine timezone date components
  // This ensures we get the correct date regardless of the Date object's internal representation
  const options = {
    timeZone: PHILIPPINE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  // Format returns YYYY-MM-DD in en-CA locale
  return new Intl.DateTimeFormat("en-CA", options).format(d);
}
```

**Backend (`parsePhilippineDateString`):**

```javascript
function parsePhilippineDateString(dateString) {
  if (!dateString) return new Date();

  // Check if already YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return createPhilippineDate(year, month, day, 0, 0, 0);
  }

  // Fallback: parse as regular date and convert
  return parseFromDatabase(dateString);
}
```

**Frontend (`formatDateOnly`):**

```javascript
export function formatDateOnly(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

### Updated SIL Conversion Logic

```javascript
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
  startPH.year <= endPH.year &&
  endPH.year &&
  (endPH.month > 11 || (endPH.month === 11 && endPH.date === 31));
```

### Zero Salary Deduction Fix

```javascript
static calculateGovernmentDeductions(grossSalary, employee) {
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

  // Continue with normal deduction calculation...
}
```

## Impact

### Fixed Issues

1. ✅ Payroll periods now correctly parse and store dates from frontend (Dec 1-31 stays as Dec 1-31 PH time)
2. ✅ API responses now return dates in correct YYYY-MM-DD format without timezone shifts
3. ✅ Database DATE columns now store dates correctly using `formatDateOnlyForDatabase()` helper
4. ✅ SIL year-end conversion now triggers correctly when payroll period includes Dec 31 in Philippine timezone
5. ✅ Attendance records match the correct payroll period
6. ✅ Date comparisons work correctly regardless of server timezone

### All Issues Fixed

1. ✅ **Timezone Conversion** - Payroll dates now correctly parsed and stored in Philippine timezone
2. ✅ **SIL Year-End Conversion** - Now triggers correctly when payroll period includes Dec 31 in Philippine timezone
3. ✅ **Zero Salary Deductions** - No deductions applied when gross salary is ₱0 (employee didn't work during the period)

### Note

**SIL Credits Required** - SIL conversion only works if employee has available SIL credits for the year (this is expected behavior)

## Testing

To verify the fixes:

1. **Timezone Fix:**
   - Generate a payroll for December 1-31, 2025
   - Check that `date_from` and `date_to` in the API response are correct
   - Verify frontend displays "Dec 1, 2025 - Dec 31, 2025"

2. **SIL Conversion Fix:**
   - Ensure employee has SIL credits available for 2025
   - Generate a payroll for December 1-31, 2025
   - Check that SIL conversion pay appears in the payroll record
   - Verify `sil_converted_days` and `sil_conversion_pay` are non-zero

3. **Zero Salary Deductions Fix:**
   - Generate a payroll for an employee with no attendance records
   - Check that gross salary is ₱0.00
   - Verify that all deductions (SSS, PhilHealth, Pag-IBIG, Withholding Tax) are ₱0.00
   - Confirm net salary is also ₱0.00

## Future Considerations

Consider applying the same timezone parsing approach to other endpoints that receive date inputs from the frontend to prevent similar issues across the application.
