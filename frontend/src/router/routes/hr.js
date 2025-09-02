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
];
