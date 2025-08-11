export default [
  {
    path: 'dashboard',
    name: 'FinanceDashboard',
    component: () => import('../../views/finance/Dashboard.vue'),
    meta: { title: 'Finance Dashboard' },
  },
];
