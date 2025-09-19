export default [
  {
    path: 'dashboard',
    name: 'CRMDashboard',
    component: () => import('../../views/crm/Dashboard.vue'),
    meta: { title: 'CRM Dashboard' },
  },
  {
    path: 'customers',
    name: 'CustomerManagement',
    component: () => import('../../views/crm/CustomerManagement.vue'),
    meta: { title: 'Customer Management' },
  },
  {
    path: 'analytics',
    name: 'CRMAnalytics',
    component: () => import('../../views/crm/Analytics.vue'),
    meta: { title: 'Analytics Dashboard' },
  },
];
