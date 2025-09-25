# Department Employee Creation Scripts

This collection of scripts automatically creates employees for the HR, SCM, CRM, Finance, and Production departments with proper role assignments.

## 📋 What the Scripts Do

- **`add_department_employees.js`**: Main script that creates 10 employees total (2 per department)
- **`add_remaining_employees.js`**: Creates employees with unique benefit numbers to avoid conflicts
- **`check_existing_benefits.js`**: Utility script to check existing benefit numbers and conflicts
- Each department gets:
  - 1 Manager employee
  - 1 Staff employee
- All employees are properly assigned to their respective departments
- Department employees have `branch_id: null` (no branch assignment)
- Includes complete employee information (personal, benefits, emergency contact)

## 🏢 Departments and Roles Created

| Department     | Manager Role ID | Staff Role ID | Manager         | Staff                |
| -------------- | --------------- | ------------- | --------------- | -------------------- |
| Human Resource | 2               | 3             | Sarah Johnson   | Michael Rodriguez    |
| SCM            | 6               | 7             | David Chen      | Ana Santos           |
| CRM            | 10              | 11            | Jennifer Lee    | James Wilson         |
| Finance        | 4               | 5             | Patricia Garcia | Christopher Martinez |
| Production     | 8               | 9             | Lisa Anderson   | Daniel Taylor        |

## 🚀 How to Run

### Prerequisites

1. **Get your admin token:**
   - Log in to the system as an admin user
   - Open browser developer tools (F12)
   - Go to Application/Storage tab
   - Find localStorage and copy the 'token' value

2. **Ensure backend server is running** on port 5000 (or update API_BASE_URL)

### Method 1: Using Environment Variables (Recommended)

```bash
cd backend/scripts
set ADMIN_TOKEN=YOUR_ADMIN_TOKEN_HERE
set API_BASE_URL=http://localhost:5000
node add_department_employees.js
```

### Method 2: Using the Batch File (Windows)

```bash
cd backend/scripts
run_add_employees.bat YOUR_ADMIN_TOKEN_HERE
```

### Method 3: Using PowerShell

```powershell
cd backend/scripts
$env:ADMIN_TOKEN="YOUR_ADMIN_TOKEN_HERE"
$env:API_BASE_URL="http://localhost:5000"
node add_department_employees.js
```

## 📝 Additional Scripts

### Check Existing Benefits

```bash
set ADMIN_TOKEN=YOUR_ADMIN_TOKEN_HERE
node check_existing_benefits.js
```

### Add Remaining Employees (if conflicts occur)

```bash
set ADMIN_TOKEN=YOUR_ADMIN_TOKEN_HERE
node add_remaining_employees.js
```

## 📋 Prerequisites

- Node.js installed
- Backend server running on port 5000 (or update API_BASE_URL)
- Valid admin user token
- `axios` package installed (run `npm install axios` if needed)

## 🔧 Configuration

### Environment Variables

- `API_BASE_URL`: Backend API URL (default: http://localhost:5000)
- `ADMIN_TOKEN`: Admin user authentication token

### Script Configuration

You can modify the employee data in the scripts:

**Main Script (`add_department_employees.js`):**

```javascript
const employeeData = {
  "Human Resource": [
    {
      first_name: "Sarah",
      last_name: "Johnson",
      // ... other employee details
    },
  ],
  // ... other departments
};
```

**Remaining Employees Script (`add_remaining_employees.js`):**

```javascript
const remainingEmployees = [
  {
    first_name: "Sarah",
    last_name: "Johnson",
    // ... with unique benefit numbers
  },
  // ... other employees
];
```

## 📊 Sample Employee Data

Each employee includes:

- **Personal Information**: Name, contact, address, civil status, etc.
- **Professional Information**: Department, role, employee type
- **Benefits**: PAG-IBIG, SSS, PhilHealth numbers
- **Emergency Contact**: Name, relationship, contact details

## 🔍 Verification

After running the script:

1. Check the console output for success/failure messages
2. Log in to the admin panel and verify employees were created
3. Check that department assignments are correct
4. Verify that roles are properly assigned

## ⚠️ Important Notes

- **No Branch Assignment**: Department employees have `branch_id: null`
- **Duplicate Prevention**: The script will show errors if employees with the same details already exist
- **API Rate Limiting**: Script includes 500ms delay between requests
- **Token Security**: Never commit admin tokens to version control
- **Environment Variables**: Always use environment variables for sensitive data
- **Multiple Scripts**: Use `check_existing_benefits.js` first to avoid conflicts

## 🛠️ Troubleshooting

### Common Issues

1. **"Please set the ADMIN_TOKEN"**
   - Get a valid admin token from localStorage
   - Make sure you're logged in as an admin user

2. **"Failed to create employee"**
   - Check if employee with same details already exists
   - Verify API server is running
   - Check token permissions

3. **"Connection refused"**
   - Ensure backend server is running on port 5000
   - Update API_BASE_URL if server runs on different port

### Getting Admin Token

1. Open browser developer tools (F12)
2. Go to Application tab
3. Expand Local Storage
4. Find your domain (usually localhost:3000 or localhost:5000)
5. Look for 'token' key and copy its value

## 📈 Expected Output

```
🚀 Starting to add department employees...

📋 Processing Human Resource Department:
==================================================
Creating employee: Sarah Johnson (Human Resource)
✅ Successfully created employee: Sarah Johnson
   Employee ID: EMP001
   Department: Human Resource
   Role: Manager

Creating employee: Michael Rodriguez (Human Resource)
✅ Successfully created employee: Michael Rodriguez
   Employee ID: EMP002
   Department: Human Resource
   Role: Staff

... (continues for all departments)

============================================================
📊 SUMMARY:
============================================================
✅ Total employees created: 10
❌ Total employees failed: 0
📈 Success rate: 100.0%

🎉 All employees have been successfully created!
```

## 🔄 Re-running the Script

- The script can be run multiple times safely
- Duplicate employees will show error messages but won't break the script
- To create different employees, modify the `employeeData` object in the script
