import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  UserCog,
  Factory,
  BarChart3,
  Shield,
  Settings,
  ReceiptText,
  Store,
  PhilippinePeso,
  ShoppingBag,
  Calendar,
  BookOpen,
  ClipboardList,
  Trash2,
  ChefHat,
  UserCheck,
} from 'lucide-vue-next';

export const menuItems = [
  // Human Resource Department
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/hr/dashboard',
    department: 'Human Resource',
  },
  {
    name: 'Employees Management',
    icon: Users,
    route: '/hr/employees',
    department: 'Human Resource',
    subItems: [
      { name: 'Employee List', route: '/hr/employee-manager' },
      { name: 'Schedules', route: '/hr/schedules' },
      { name: 'Positions', route: '/hr/positions' },
      { name: 'Manage Employee', route: '/hr/add-employee' },
    ],
  },

  {
    name: 'Approval Management',
    icon: UserCheck,
    route: '/hr/approval-management',
    department: 'Human Resource',
    subItems: [
      { name: 'Overtime Approvals', route: '/hr/overtime-approval' },
      { name: 'Leave Approvals', route: '/hr/leave-approvals' },
    ],
  },

  {
    name: 'Payroll',
    icon: PhilippinePeso,
    route: '/hr/payroll',
    department: 'Human Resource',
  },

  // Supply Chain Management
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/scm/dashboard',
    department: 'SCM',
  },
  {
    name: 'Inventory',
    icon: Package,
    route: '/scm/main-inventory',
    department: 'SCM',
  },
  {
    name: 'Supply Request',
    icon: ReceiptText,
    route: '/scm/request-supply',
    department: 'SCM',
  },
  {
    name: 'Purchase Order',
    icon: ShoppingBag,
    route: '/scm/purchase-order',
    department: 'SCM',
  },
  {
    name: 'Goods Receipt Notes',
    icon: ReceiptText,
    route: '/scm/grn',
    department: 'SCM',
  },
  {
    name: 'Suppliers',
    icon: Truck,
    route: '/scm/suppliers',
    department: 'SCM',
  },

  // Finance Department
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/finance/dashboard',
    department: 'Finance',
  },
  {
    name: 'Approval Request',
    icon: ReceiptText,
    route: '/finance/request-approval',
    department: 'Finance',
  },

  {
    name: 'Budget Release',
    icon: PhilippinePeso,
    route: '/finance/budget-release',
    department: 'Finance',
  },
  {
    name: 'Sales',
    icon: BarChart3,
    route: '/finance/sales',
    department: 'Finance',
  },

  // Production Department
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/production/dashboard',
    department: 'Production',
  },
  {
    name: 'Menu Management',
    icon: ChefHat,
    route: '/production/menu-creation',
    department: 'Production',
    subItems: [
      { name: 'Menu Creation', route: '/production/menu-creation' },
      { name: 'Sample Planning', route: '/production/sample-planning' },
      { name: 'Quality Inspection', route: '/production/quality-inspection' },
      {
        name: 'Production Execution',
        route: '/production/production-execution',
      },
    ],
  },
  {
    name: 'Recipe Management',
    icon: BookOpen,
    route: '/production/recipes',
    department: 'Production',
  },
  {
    name: 'Production Inventory',
    icon: Package,
    route: '/production/production-inventory',
    department: 'Production',
  },

  // Customer Relationship
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/crm/dashboard',
    department: 'CRM',
  },
  {
    name: 'Customers',
    icon: Users,
    route: '/crm/customers',
    department: 'CRM',
  },

  // Admin Department (Super Admin only)
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/admin/dashboard',
    department: 'Administration',
    superAdminOnly: true,
  },
  {
    name: 'User Management',
    icon: Users,
    route: '/admin/users',
    department: 'Administration',
    superAdminOnly: true,
  },
  {
    name: 'Role Management',
    icon: UserCog,
    route: '/admin/roles',
    department: 'Administration',
    superAdminOnly: true,
  },
  {
    name: 'Branch Management',
    icon: Store,
    route: '/admin/branch-manager',
    department: 'Administration',
    superAdminOnly: true,
  },
  {
    name: 'System Settings',
    icon: Settings,
    route: '/admin/settings',
    department: 'Administration',
    superAdminOnly: true,
  },
];

// Group menu items by department
export const menusByDepartment = menuItems.reduce((acc, item) => {
  if (!acc[item.department]) {
    acc[item.department] = [];
  }
  acc[item.department].push(item);
  return acc;
}, {});

// Department icons for dropdowns
export const departmentIcons = {
  'Human Resource': UserCog,
  SCM: Truck,
  Finance: PhilippinePeso,
  Production: Factory,
  CRM: Users,
  Administration: Settings, // Add admin department icon
};
