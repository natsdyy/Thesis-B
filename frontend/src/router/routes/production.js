export default [
  {
    path: 'dashboard',
    name: 'ProductionDashboard',
    component: () => import('../../views/production/Dashboard.vue'),
    meta: { title: 'Production Dashboard' },
  },
];
