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
    path: 'analytics',
    name: 'CRMAnalytics',
    component: () => import('../../views/crm/Analytics.vue'),
    meta: { title: 'Analytics Dashboard' },
  },
];
