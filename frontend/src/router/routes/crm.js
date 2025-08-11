export default [
  {
    path: 'dashboard',
    name: 'CRMDashboard',
    component: () => import('../../views/crm/Dashboard.vue'),
    meta: { title: 'CRM Dashboard' },
  },
];
