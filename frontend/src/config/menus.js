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
      { name: 'Employees', route: '/hr/employees' },
      { name: 'Manage Schedules', route: '/hr/schedules' },
      { name: 'Add Schedules', route: '/hr/schedules/add' },
      { name: 'Positions', route: '/hr/positions' },
      { name: 'Leave Management', route: '/hr/leave' },
      { name: 'Add Employee', route: '/hr/employees/add' },
    ],
  },
  {
    name: 'Attendance',
    icon: Clock,
    route: '/hr/attendance',
    department: 'Human Resource',
  },
  {
    name: 'Payroll',
    icon: PhilippinePeso,
    route: '/hr/payroll',
    department: 'Human Resource',
  },
  {
    name: 'User Role',
    icon: UserCog,
    route: '/hr/user-role',
    department: 'Human Resource',
  },

  // Supply Chain Management
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/scm/dashboard',
    department: 'Supply Chain',
  },
  {
    name: 'Inventory',
    icon: Package,
    route: '/scm/main-inventory',
    department: 'Supply Chain',
  },
  {
    name: 'Request Supply',
    icon: ReceiptText,
    route: '/scm/request-supply',
    department: 'Supply Chain',
  },
  {
    name: 'Purchase Order',
    icon: ShoppingBag,
    route: '/scm/purchase-order',
    department: 'Supply Chain',
  },
  {
    name: 'Suppliers',
    icon: Truck,
    route: '/scm/suppliers',
    department: 'Supply Chain',
  },
  {
    name: 'Goods Receipt Notes',
    icon: ReceiptText,
    route: '/scm/grn',
    department: 'Supply Chain',
  },

  // Finance Department
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/finance/dashboard',
    department: 'Finance',
  },
  {
    name: 'Request Approval',
    icon: ReceiptText,
    route: '/finance/request-approval',
    department: 'Finance',
  },
  {
    name: 'Accounting',
    icon: BarChart3,
    route: '/finance/accounting',
    department: 'Finance',
  },
  {
    name: 'Budget Release',
    icon: PhilippinePeso,
    route: '/finance/budget-release',
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
    department: 'Customer Relationship',
  },
  {
    name: 'Customers',
    icon: Users,
    route: '/crm/customers',
    department: 'Customer Relationship',
  },
  {
    name: 'Sales',
    icon: BarChart3,
    route: '/crm/sales',
    department: 'Customer Relationship',
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
    route: '/admin/branches',
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
  'Supply Chain': Truck,
  Finance: PhilippinePeso,
  Production: Factory,
  'Customer Relationship': Users,
  Administration: Settings, // Add admin department icon
};
