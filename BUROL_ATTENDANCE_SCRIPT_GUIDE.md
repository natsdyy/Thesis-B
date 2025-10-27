# Burol Main Branch Attendance Generation Script

## Overview

This script generates realistic attendance records for all employees in Burol Main Branch for October 2025. It includes comprehensive safety features to protect employees on leave and prevents data conflicts.

## Features

### 🛡️ Safety Features

- **Leave Protection**: Automatically detects employees on approved leave and skips them
- **Conflict Prevention**: Checks for existing attendance records and skips employees with data
- **Comprehensive Logging**: Detailed console output for monitoring and debugging
- **Cleanup Function**: Safe cleanup function to remove generated data if needed

### 📊 Attendance Types Generated

Based on PayrollService.js logic, the script generates:

- **Present**: Regular attendance with standard hours
- **Late**: Attendance with tardiness (30-90 minutes late)
- **Absent**: No-show days (1-2 per employee)
- **Overtime**: Extended hours (1-3 hours extra)
- **On Leave**: Automatically detected and skipped

### 🎯 Realistic Patterns

- **Late Days**: 2-3 per employee with realistic reasons
- **Overtime Days**: 2-4 per employee with restaurant-specific reasons
- **Absent Days**: 1-2 per employee
- **Time Variations**: ±15 minutes for realistic timing
- **Restaurant Context**: Notes and reasons specific to restaurant operations

## Usage

### 1. Safety Check (Recommended First Step)

```bash
node generate_october_attendance_burol_branch.js --safety-check
```

This will:

- Verify Burol Main Branch exists
- Check for existing attendance records
- Identify employees on leave
- Ensure the script can run safely

### 2. Generate Attendance Records

```bash
node generate_october_attendance_burol_branch.js
```

This will:

- Generate attendance for all active Burol Main Branch employees
- Skip employees on leave
- Skip employees with existing October 2025 records
- Create realistic attendance patterns

### 3. Cleanup (If Needed)

```bash
node generate_october_attendance_burol_branch.js --cleanup
```

⚠️ **WARNING**: This will delete ALL October 2025 attendance records for Burol Main Branch employees.

## Script Output

### Employee Processing

For each employee, the script shows:

- Employee details (ID, name, role, hourly rate)
- Leave status (if on leave)
- Attendance pattern (late days, overtime days, absent days)
- Record creation status

### Summary Report

The script provides a comprehensive summary including:

- Total employees processed
- Employees skipped (on leave)
- Records created
- Individual employee statistics
- Branch totals

## Database Impact

### Tables Affected

- `attendance_records`: New attendance records
- `attendance_qr_codes`: Uses existing or creates new QR code

### Data Generated Per Employee

- **27 working days** (October 1-31, 2025, excluding Sundays)
- **Realistic time patterns** with variations
- **Multiple attendance types** (present, late, absent, overtime)
- **Restaurant-specific notes** and reasons

## Safety Mechanisms

### Leave Detection

The script checks for approved leave requests:

```sql
SELECT * FROM leave_requests
WHERE employee_id = ?
AND status IN ('approved_by_manager', 'approved_by_hr')
AND (from_date <= '2025-10-31' AND to_date >= '2025-10-01')
```

### Conflict Prevention

Checks for existing records:

```sql
SELECT * FROM attendance_records
WHERE employee_id = ?
AND created_at BETWEEN '2025-10-01' AND '2025-10-31'
```

### Branch Validation

Ensures Burol Main Branch exists before processing.

## Error Handling

### Common Issues

1. **Branch Not Found**: Verify "Burol Main Branch" exists in database
2. **No Employees**: Check if branch has active employees
3. **Database Connection**: Ensure database is accessible
4. **Permission Issues**: Verify database write permissions

### Troubleshooting

- Check console output for detailed error messages
- Run safety check first to identify issues
- Verify database connection and permissions
- Ensure no conflicting processes are running

## Example Output

```
🚀 Starting September 2025 attendance generation for Burol Main Branch...
✅ Found branch: Burol Main Branch (ID: 1)
✅ Found 6 Burol Main Branch employees:
   1. EMP001 - Javier Alvarez (Waiter)
      Branch: Burol Main Branch | Rate: ₱150/hr
   2. EMP002 - Luis Ortiz (Kitchen Assistant)
      Branch: Burol Main Branch | Rate: ₱140/hr
   ...

📝 Processing: Javier Alvarez (EMP001)
   ⏰ Late days (2): 2025-09-05, 2025-09-15
   🕐 Overtime days (3): 2025-09-08, 2025-09-20, 2025-09-25
   ❌ Absent days (1): 2025-09-12
   ✅ Created 26 attendance records

📊 OCTOBER 2025 ATTENDANCE SUMMARY - BUROL MAIN BRANCH
📅 Period: October 1-31, 2025
🏢 Branch: Burol Main Branch
👥 Total Employees Processed: 5
👥 Employees on Leave (Skipped): 1
📈 Total Records Created: 108
📋 Working Days: 27 days
```

## Best Practices

1. **Always run safety check first**
2. **Backup database before running**
3. **Run during off-peak hours**
4. **Monitor console output for errors**
5. **Verify results after completion**
6. **Keep logs for audit purposes**

## Integration with PayrollService.js

The generated attendance records are fully compatible with the PayrollService.js calculations:

- **Hours worked**: Regular hours for basic salary calculation
- **Overtime hours**: Separate tracking for overtime pay
- **Tardiness**: Minutes tracked for payroll deductions
- **Status types**: Compatible with payroll status logic
- **Leave integration**: Respects approved leave requests

This ensures seamless integration with the existing payroll system.
