export default [
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
    path: 'schedules',
    name: 'HRSchedules',
    component: () => import('../../views/hr/Schedules.vue'),
    meta: { title: 'Employee Schedules' },
  },
  {
    path: 'attendance',
    name: 'HRAttendance',
    component: () => import('../../views/common/DepartmentAttendance.vue'),
    meta: { title: 'My Attendance' },
  },
  {
    path: 'profile',
    name: 'HRProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: { title: 'HR Profile' },
  },
  {
    path: 'overtime-approval',
    name: 'HROvertimeApproval',
    component: () => import('../../views/hr/OvertimeApproval.vue'),
    meta: { title: 'Overtime Approval' },
  },
  {
    path: 'leave-approvals',
    name: 'HRLeaveApprovals',
    component: () => import('../../views/hr/LeaveApprovals.vue'),
    meta: { title: 'Leave Approvals' },
  },
  {
    path: 'positions',
    name: 'HRPositions',
    component: () => import('../../views/hr/Positions.vue'),
    meta: { title: 'Positions' },
  },
  {
    path: 'payroll-management',
    name: 'HRPayrollManagement',
    component: () => import('../../views/hr/PayrollManagement.vue'),
    meta: { title: 'Payroll Management' },
  },
];
