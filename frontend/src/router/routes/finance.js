export default [
  {
    path: 'dashboard',
    name: 'FinanceDashboard',
    component: () => import('../../views/finance/Dashboard.vue'),
    meta: { title: 'Finance Dashboard' },
  },
  {
    path: 'request-supply',
    name: 'RequestSupply',
    component: () => import('../../views/finance/RequestSupply.vue'),
    meta: { title: 'Request Supply' },
  },
];
