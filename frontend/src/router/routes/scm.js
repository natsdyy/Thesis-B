export default [
  {
    path: 'dashboard',
    name: 'SCMDashboard',
    component: () => import('../../views/scm/Dashboard.vue'),
    meta: { title: 'SCM Dashboard' },
  },
  {
    path: 'request-supply',
    name: 'RequestSupply',
    component: () => import('../../views/scm/RequestSupply.vue'),
    meta: { title: 'Request Supply' },
  },
  {
    path: 'purchase-order',
    name: 'PurchaseOrder',
    component: () => import('../../views/scm/PurchaseOrder.vue'),
    meta: { title: 'Purchase Order' },
  },
  {
    path: 'main-inventory',
    name: 'MainInventory',
    component: () => import('../../views/scm/MainInventory.vue'),
    meta: { title: 'Inventory' },
  },
  {
    path: 'suppliers',
    name: 'Suppliers',
    component: () => import('../../views/scm/Suppliers.vue'),
    meta: { title: 'Suppliers' },
  },
  {
    path: 'grn',
    name: 'GRNManager',
    component: () => import('../../views/scm/GRNManager.vue'),
    meta: { title: 'Goods Receipt Notes' },
  },
  {
    path: 'profile',
    name: 'SCMProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: { title: 'SCM Profile' },
  },
];
