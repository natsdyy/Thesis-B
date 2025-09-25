export default [
  {
    path: 'dashboard',
    name: 'HRDashboard',
    component: () => import('../../views/hr/Dashboard.vue'),
    meta: { title: 'HR Dashboard' },
  },

  {
    path: 'employee',
    name: 'HREmployee',
    component: () => import('../../views/hr/Employee.vue'),
    meta: { title: 'Employee Management' },
  },

  {
    path: 'employee-manager',
    name: 'HREmployeeManager',
    component: () => import('../../views/hr/EmployeeManager.vue'),
    meta: { title: 'Employee Manager' },
  },

  {
    path: 'add-employee',
    name: 'HRAddEmployee',
    component: () => import('../../views/hr/AddEmployee.vue'),
    meta: { title: 'Add Employee' },
  },
  {
    path: 'attendance',
    name: 'HRAttendance',
    component: () => import('../../views/hr/AttendanceManagement.vue'),
    meta: { title: 'Attendance Management' },
  },
  {
    path: 'employee-attendance',
    name: 'HREmployeeAttendance',
    component: () => import('../../views/hr/EmployeeAttendance.vue'),
    meta: { title: 'Employee Attendance' },
  },
  {
    path: 'attendance-records',
    name: 'HRAttendanceRecords',
    component: () => import('../../views/hr/AttendanceRecords.vue'),
    meta: { title: 'Attendance Records' },
  },
  {
    path: 'schedules',
    name: 'HRSchedules',
    component: () => import('../../views/hr/Schedules.vue'),
    meta: { title: 'Employee Schedules' },
  },
  {
    path: 'profile',
    name: 'HRProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: { title: 'HR Profile' },
  },
];
