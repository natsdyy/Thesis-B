export default [
  {
    path: 'dashboard',
    name: 'SCMDashboard',
    component: () => import('../../views/scm/Dashboard.vue'),
    meta: { title: 'SCM Dashboard' },
  },
];
