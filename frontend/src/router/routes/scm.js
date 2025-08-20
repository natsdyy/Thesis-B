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
    path: 'inventory',
    name: 'Inventory',
    component: () => import('../../views/scm/Inventory.vue'),
    meta: { title: 'Inventory' },
  },
  {
    path: 'suppliers',
    name: 'Suppliers',
    component: () => import('../../views/scm/Suppliers.vue'),
    meta: { title: 'Suppliers' },
  },
];
