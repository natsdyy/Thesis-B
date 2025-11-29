# Branch Employees Setup

## Overview
This document describes the automated creation of employees for each branch with standardized roles.

## Created Script
- **Location**: `backend/scripts/create_branch_employees.js`
- **Execution**: Run via `create_branch_employees.bat` or directly with `node backend/scripts/create_branch_employees.js`

## Branch Roles Created

Each branch has been assigned employees with the following roles:

| Role | Role ID | Department | Rate per Hour |
|------|---------|------------|---------------|
| Manager | 12 | Branch | ₱80.00 |
| Cook | 13 | Branch | ₱60.00 |
| Kitchen Assistant | 14 | Branch | ₱50.00 |
| Cashier | 15 | Branch | ₱50.00 |
| Waiter | 16 | Branch | ₱40.00 |

## Execution Results

### Summary
- **Branches Processed**: 4 active branches
- **Employees Created**: 15 new employees
- **Employees Skipped**: 5 (already existed)

### Branch Details

#### 1. Burol Main Branch (ID: 6)
- ✅ Cashier: EMP000033 (ana.santos.brn001@branch.com)
- ✅ Cook: EMP000034 (elena.hernandez.brn001@branch.com)
- ✅ Kitchen Assistant: EMP000035 (luis.ortiz.brn001@branch.com)
- ⏭️ Manager: EMP000032 (already existed)
- ✅ Waiter: EMP000036 (javier.alvarez.brn001@branch.com)

#### 2. NCST Branch (ID: 7)
- ⏭️ Cashier: EMP000008 (already existed)
- ✅ Cook: EMP000037 (diego.torres.brn002@branch.com)
- ✅ Kitchen Assistant: EMP000038 (isabella.ruiz.brn002@branch.com)
- ⏭️ Manager: EMP000013 (already existed)
- ✅ Waiter: EMP000039 (gabriel.sanchez.brn002@branch.com)

#### 3. Bahay Namin (ID: 8)
- ✅ Cashier: EMP000040 (rosa.fernandez.brn003@branch.com)
- ✅ Cook: EMP000041 (carmen.flores.brn003@branch.com)
- ✅ Kitchen Assistant: EMP000042 (fernando.perez.brn003@branch.com)
- ⏭️ Manager: EMP000010 (already existed)
- ✅ Waiter: EMP000043 (valentina.rivera.brn003@branch.com)

#### 4. NCST 2 (ID: 9)
- ✅ Cashier: EMP000044 (pedro.gonzales.brn004@branch.com)
- ✅ Cook: EMP000045 (ricardo.morales.brn004@branch.com)
- ✅ Kitchen Assistant: EMP000046 (jose.ramirez.brn004@branch.com)
- ⏭️ Manager: EMP000027 (already existed)
- ✅ Waiter: EMP000047 (daniel.gomez.brn004@branch.com)

## Login Credentials

All newly created employees use their **last name** as the default password.

### Example Logins:
- Waiter: daniel.gomez.brn004@branch.com / **Gomez**
- Kitchen Assistant: jose.ramirez.brn004@branch.com / **Ramirez**
- Cook: ricardo.morales.brn004@branch.com / **Morales**
- Cashier: pedro.gonzales.brn004@branch.com / **Gonzales**

## Features

### Automatic Data Generation
The script automatically generates:
- ✅ Unique employee IDs (sequential)
- ✅ Branch-specific email addresses
- ✅ Valid Philippine phone numbers (09XXXXXXXXX format)
- ✅ Unique government benefit numbers (Pag-IBIG, SSS, PhilHealth)
- ✅ Complete emergency contact information
- ✅ Proper branch assignment

### Smart Duplicate Detection
The script:
- ✅ Checks if employees with the same role already exist in a branch
- ✅ Skips creation if role is already filled
- ✅ Prevents duplicate government benefit numbers
- ✅ Ensures unique email addresses

### Database Validation
Each employee creation validates:
- ✅ Role exists and is active
- ✅ Role belongs to Branch department
- ✅ Phone numbers follow proper format
- ✅ Required fields are present

## Re-running the Script

The script is **idempotent** - you can run it multiple times safely:
- It will skip creating employees for roles that already exist in each branch
- It will only create missing role assignments
- It prevents duplicate entries

### To Re-run:
```bash
# Using batch file
create_branch_employees.bat

# Or directly
cd backend
node scripts/create_branch_employees.js
```

## Adding New Branches

When you create a new branch, simply run the script again:
1. The script will detect the new branch
2. It will create all 5 role-based employees for the new branch
3. Existing branches will be skipped (no duplicates)

## Employee Data Structure

Each employee has:
- **Personal Info**: First name, last name, email, phone
- **Employment**: Department (Branch), role, employee type (Full-time), branch assignment
- **Contact**: Address, postal code (inherited from branch)
- **Demographics**: Civil status, sex, birthday, age, citizenship
- **Benefits**: Pag-IBIG, SSS, PhilHealth numbers
- **Emergency Contact**: Name, relationship, phone, address, email
- **Authentication**: Email login with last name as default password

## Security Note

⚠️ **Important**: All employees are created with their last name as the default password. It is recommended that employees change their password upon first login.

## Troubleshooting

### If creation fails:
1. Ensure the database is running
2. Verify that user_roles table has the branch roles (IDs 12-16)
3. Check that branches exist and are active
4. Review the console output for specific error messages

### Common Issues:
- **Phone number validation error**: Fixed in current version (uses 09XXXXXXXXX format)
- **Duplicate government numbers**: Script generates unique numbers using timestamps
- **Missing roles**: Ensure migrations have run and roles are seeded

## Next Steps

1. ✅ Employees can now log in using their email and last name
2. 📋 Assign specific schedules to branch employees
3. 📊 Configure payroll settings per branch
4. 🔐 Remind employees to change their default passwords


