export default [
  {
    path: 'dashboard',
    name: 'ProductionDashboard',
    component: () => import('../../views/production/Dashboard.vue'),
    meta: { title: 'Production Dashboard' },
  },
  {
    path: 'planning',
    name: 'ProductionPlanning',
    component: () => import('../../views/production/ProductionPlanning.vue'),
    meta: { title: 'Production Planning' },
  },
  {
    path: 'recipes',
    name: 'RecipeManagement',
    component: () => import('../../views/production/RecipeManagement.vue'),
    meta: { title: 'Recipe Management' },
  },
  {
    path: 'work-orders',
    name: 'WorkOrders',
    component: () => import('../../views/production/WorkOrders.vue'),
    meta: { title: 'Work Orders' },
  },
  {
    path: 'quality-control',
    name: 'QualityControl',
    component: () => import('../../views/production/QualityControl.vue'),
    meta: { title: 'Quality Control' },
  },
  {
    path: 'monitoring',
    name: 'ProductionMonitoring',
    component: () => import('../../views/production/ProductionMonitoring.vue'),
    meta: { title: 'Real-time Monitoring' },
  },
  {
    path: 'maintenance',
    name: 'MaintenanceManagement',
    component: () => import('../../views/production/MaintenanceManagement.vue'),
    meta: { title: 'Maintenance Management' },
  },
  {
    path: 'waste-management',
    name: 'WasteManagement',
    component: () => import('../../views/production/WasteManagement.vue'),
    meta: { title: 'Waste Management' },
  },
  {
    path: 'analytics',
    name: 'ProductionAnalytics',
    component: () => import('../../views/production/ProductionAnalytics.vue'),
    meta: { title: 'Analytics & Reporting' },
  },
  {
    path: 'traceability',
    name: 'TraceabilityCompliance',
    component: () =>
      import('../../views/production/TraceabilityCompliance.vue'),
    meta: { title: 'Traceability & Compliance' },
  },
];
