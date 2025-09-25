export default [
  {
    path: 'dashboard',
    name: 'ProductionDashboard',
    component: () => import('../../views/production/Dashboard.vue'),
    meta: { title: 'Production Dashboard' },
  },
  {
    path: 'menu-creation',
    name: 'MenuCreation',
    component: () => import('../../views/production/MenuCreation.vue'),
    meta: { title: 'Menu Creation' },
  },
  {
    path: 'recipes',
    name: 'RecipeManagement',
    component: () => import('../../views/production/RecipeManagement.vue'),
    meta: { title: 'Recipe Management' },
  },
  {
    path: 'sample-planning',
    name: 'SampleProductionPlanning',
    component: () =>
      import('../../views/production/SampleProductionPlanning.vue'),
    meta: { title: 'Sample Production Planning' },
  },
  {
    path: 'quality-inspection',
    name: 'QualityInspection',
    component: () => import('../../views/production/QualityInspection.vue'),
    meta: { title: 'Quality Inspection' },
  },
  {
    path: 'production-inventory',
    name: 'ProductionInventory',
    component: () => import('../../views/production/ProductionInventory.vue'),
    meta: { title: 'Production Inventory' },
  },
  {
    path: 'production-execution',
    name: 'ProductionExecution',
    component: () => import('../../views/production/ProductionExecution.vue'),
    meta: { title: 'Production Execution' },
  },
  {
    path: 'profile',
    name: 'ProductionProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: { title: 'Production Profile' },
  },
];
