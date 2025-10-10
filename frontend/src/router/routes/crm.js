export default [
  {
    path: 'dashboard',
    name: 'CRMDashboard',
    component: () => import('../../views/crm/Dashboard.vue'),
    meta: { title: 'CRM Dashboard' },
  },
  {
    path: 'feedback',
    name: 'FeedbackManagement',
    component: () => import('../../views/crm/FeedbackManagement.vue'),
    meta: { title: 'Feedback Management' },
  },
  {
    path: 'customers-feedback',
    name: 'CustomersFeedback',
    component: () => import('../../views/crm/CustomersFeedback.vue'),
    meta: { title: 'Customers Feedback' },
  },
  {
    path: 'analytics',
    name: 'CRMAnalytics',
    component: () => import('../../views/crm/Analytics.vue'),
    meta: { title: 'Analytics Dashboard' },
  },
  {
    path: 'attendance',
    name: 'CRMAttendance',
    component: () => import('../../views/common/DepartmentAttendance.vue'),
    meta: { title: 'My Attendance' },
  },
  {
    path: 'profile',
    name: 'CRMProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: { title: 'CRM Profile' },
  },

];
