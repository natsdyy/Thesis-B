# Payroll System - Quick Start Guide

## 🚀 Getting Started with Payroll Management

### Prerequisites

1. Employees must be added to the system with:
   - Valid position/role (with `rate_per_hour`)
   - Assigned to a department or branch
   - Employee type (Full-time/Part-time)
   - Hire date (for SIL calculation)

2. Attendance records must exist for the payroll period
   - Time-in/Time-out records
   - Overtime hours tracked
   - Leave records

3. Roles:
   - **HR**: Can generate, review, and release payroll
   - **Finance**: Can approve/reject payroll

---

## 📋 Step-by-Step Workflow

### Step 1: Generate Payroll (HR)

1. **Navigate to Employee Manager**

   ```
   Dashboard → HR → Employee Manager
   ```

2. **Choose Scope**
   - Click on **"Department Employees"** tab for department payroll
   - OR click on **"Branch Employees"** tab for branch payroll

3. **Select Department/Branch**
   - Use the dropdown to select the specific department or branch

4. **Click "Generate Payroll"**
   - Purple button will appear once department/branch is selected

5. **Configure Payroll Period**
   - **Period Type**: Choose Weekly, Bi-Weekly, Monthly, or Custom
   - **Date From**: Start date of payroll period
   - **Date To**: End date of payroll period
   - **Period Name**: Auto-generated (editable)
   - **Remarks**: Optional notes

6. **Review Summary**
   - Estimated employee count
   - Number of days in period
   - Verify all details

7. **Generate**
   - Click **"Generate Payroll"**
   - System automatically calculates all salaries
   - You'll be redirected to Payroll Management

---

### Step 2: Review Payroll (HR)

1. **Navigate to Payroll Management**

   ```
   Dashboard → HR → Payroll
   ```

2. **View Draft Payroll**
   - All generated payrolls appear in **"Draft"** status
   - Click **"View"** on any payroll period

3. **Review Details**
   - Check period summary (employees, total amounts)
   - Review individual employee records
   - Verify calculations

4. **Edit if Necessary**
   - Click **"Edit"** on individual employee records
   - Adjust hours worked, overtime, or add manual adjustments
   - System recalculates automatically

5. **Submit to Finance**
   - Once reviewed, click **"Submit to Finance"**
   - Status changes to **"Pending Approval"**
   - Finance team will be notified

---

### Step 3: Approve Payroll (Finance)

1. **Navigate to Payroll Management**

   ```
   Dashboard → Finance → Payroll (or HR → Payroll)
   ```

2. **View Pending Approvals**
   - Click on **"Pending Approval"** tab
   - All payrolls waiting for approval will appear

3. **Review Payroll Details**
   - Click **"View"** on a payroll period
   - Verify all employee records
   - Check total amounts

4. **Approve Payroll**
   - Click **"Approve Payroll"** button
   - System will:
     - Check current finance balance
     - Verify sufficient funds
     - Create budget release automatically
     - Update status to **"Budget Released"**

5. **If Insufficient Balance**
   - System will show error message
   - Add capital to finance balance first
   - Then retry approval

---

### Step 4: Release Payroll (HR)

1. **Navigate to Payroll Management**

   ```
   Dashboard → HR → Payroll
   ```

2. **View Approved Payroll**
   - Click on **"Approved"** tab
   - All budget-released payrolls will appear

3. **Final Review**
   - Click **"View"** on a payroll period
   - Verify budget release is complete

4. **Release to Employees**
   - Click **"Release Payroll"** button
   - Confirm action
   - System will:
     - Mark all records as **"Paid"**
     - Create cash movement records
     - Update finance balances
     - Send email notifications to ALL employees
     - Update status to **"Released"**

5. **Email Notifications**
   - Each employee receives a beautiful HTML payslip
   - Includes full breakdown: earnings, deductions, net salary
   - Payment date included

---

## 💡 Pro Tips

### Generating Payroll

- **Best Practice**: Generate payroll at the end of the pay period
- **Bi-Weekly**: Most common for Philippines (15th and end of month)
- **Custom Range**: Use for special payrolls (bonuses, 13th month)

### Reviewing Payroll

- **Check Attendance**: Verify all employees have attendance records
- **Holiday Pay**: System automatically detects PH holidays
- **Late Policy**: 3 consecutive lates = 1 absent (automatically calculated)
- **SIL**: Employees with 1+ year service get SIL conversion

### Finance Approval

- **Balance Check**: System won't approve if insufficient funds
- **Bulk Approval**: Approve entire payroll period at once
- **Rejection**: Can reject with remarks for HR to fix

### Releasing Payroll

- **Final Step**: Once released, cannot be undone
- **Email Verification**: Check that all employees have valid email addresses
- **Cash Tracking**: All amounts tracked in cash movements

---

## 🔍 Common Scenarios

### Scenario 1: New Employee Mid-Period

- Generate payroll normally
- System calculates pro-rated salary based on days worked
- First payroll will be partial

### Scenario 2: Employee on Leave

- System deducts absent days from salary
- Paid leaves (SIL) don't affect salary
- Unpaid leaves reduce total hours worked

### Scenario 3: Overtime Work

- Overtime hours tracked in attendance
- System pays 1.25× regular hourly rate
- Holiday overtime pays even higher rates

### Scenario 4: Holiday Pay

- System detects PH holidays automatically
- If employee worked on holiday: 200% rate (regular holiday)
- If employee didn't work: 100% rate
- No manual holiday configuration needed!

### Scenario 5: Corrections After Release

- **Cannot edit released payroll**
- Create adjustment in next payroll period
- OR generate a separate "Adjustment" payroll

---

## 📊 Understanding the Payslip

### Earnings Section

- **Basic Salary**: Hours worked × Hourly rate
- **Overtime Pay**: OT hours × 1.25 rate
- **Regular Holiday Pay**: Automatic for PH holidays
- **Special Holiday Pay**: For special non-working days
- **SIL Conversion**: Cash equivalent of unused leave
- **Total Gross**: Sum of all earnings

### Deductions Section

- **SSS**: Social Security contribution (employee share)
- **PhilHealth**: Health insurance (employee share)
- **Pag-IBIG**: Housing fund (employee share)
- **Total Deductions**: Sum of all deductions

### Net Salary

- **Formula**: Gross Salary - Total Deductions
- **Payment Method**: Cash (as per business process)

### Employer Contributions (Not shown to employee)

- SSS employer share
- PhilHealth employer share
- Pag-IBIG employer share
- These are company expenses, not deducted from employee

---

## ⚠️ Troubleshooting

### Payroll Generation Fails

- **Check**: Employees have valid positions with `rate_per_hour`
- **Check**: Attendance records exist for the period
- **Solution**: Add missing data and retry

### Cannot Submit to Finance

- **Check**: Payroll status is "draft"
- **Check**: All employee records are valid
- **Solution**: Review and fix any errors in payroll

### Finance Cannot Approve

- **Check**: Current finance balance
- **Reason**: Insufficient funds
- **Solution**: Add capital to finance balance

### Employees Not Receiving Emails

- **Check**: Employee email addresses are valid
- **Check**: Email service is configured (SendGrid)
- **Check**: `email_sent` flag in payroll_records table

---

## 📞 Need Help?

### Support Resources

1. **Implementation Guide**: `PAYROLL_SYSTEM_IMPLEMENTATION_COMPLETE.md`
2. **API Documentation**: Check `/backend/routes/payroll.js`
3. **Calculation Logic**: Review `/backend/services/PayrollService.js`

### Common Questions

**Q: Can I edit payroll after submission?**
A: No, once submitted to Finance, HR cannot edit. Finance must reject it first.

**Q: How are holidays detected?**
A: Automatically using the `date-holidays` npm package for Philippines.

**Q: Can I generate payroll for specific employees?**
A: Currently by department/branch only. Filter employees before generating.

**Q: What if an employee is terminated mid-period?**
A: Generate payroll normally. System calculates pro-rated final salary.

**Q: Can Finance approve individual employees?**
A: Yes! Click on individual employee and approve separately.

---

## ✅ Quick Checklist Before Release

Before releasing payroll, verify:

- [ ] All employee calculations reviewed
- [ ] Holiday pay correctly applied
- [ ] Government deductions calculated
- [ ] Total amounts match expectations
- [ ] Finance balance sufficient
- [ ] All employee emails are valid
- [ ] No pending edits or corrections
- [ ] Final approval from management

---

_Happy Payroll Processing! 🎉_
