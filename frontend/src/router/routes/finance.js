export default [
  {
    path: 'dashboard',
    name: 'FinanceDashboard',
    component: () => import('../../views/finance/Dashboard.vue'),
    meta: { title: 'Finance Dashboard' },
  },

  {
    path: 'request-approval',
    name: 'RequestApproval',
    component: () => import('../../views/finance/RequestApproval.vue'),
    meta: { title: 'Request Approval' },
  },
  {
    path: 'budget-release',
    name: 'BudgetRelease',
    component: () => import('../../views/finance/BudgetRelease.vue'),
    meta: { title: 'Budget Release' },
  },
  {
    path: 'sales',
    name: 'Sales',
    component: () => import('../../views/finance/Sales.vue'),
    meta: { title: 'Sales' },
  },

  {
    path: 'attendance',
    name: 'FinanceAttendance',
    component: () => import('../../views/common/DepartmentAttendance.vue'),
    meta: { title: 'My Attendance' },
  },
  {
    path: 'profile',
    name: 'FinanceProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: { title: 'Finance Profile' },
  },

];
