export default [
  {
    path: 'dashboard',
    name: 'HRDashboard',
    component: () => import('../../views/hr/Dashboard.vue'),
    meta: { title: 'HR Dashboard' },
  },

  {
    path: 'employee',
    name: 'HREmployee',
    component: () => import('../../views/hr/Employee.vue'),
    meta: { title: 'Employee Management' },
  },
];
