import {
  LayoutDashboard,
  Users,
  PhilippinePeso,
  Package,
  Truck,
  UserCog,
  Factory,
  BarChart3,
  Shield,
  Settings,
  ReceiptText,
  Store,
  ShoppingBag,
  Calendar,
  BookOpen,
  ChefHat,
  UserCheck,
} from 'lucide-vue-next';

export const menuItems = [
  // Human Resource Department

  {
    name: 'Employee Management',
    icon: Users,
    route: '/hr/employees',
    department: 'Human Resource',
    managerOnly: true,
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
    managerOnly: true,
    subItems: [
      { name: 'Overtime Approvals', route: '/hr/overtime-approval' },
      { name: 'Leave Approvals', route: '/hr/leave-approvals' },
    ],
  },

  {
    name: 'Payroll Management',
    icon: PhilippinePeso,
    route: '/hr/payroll-management',
    department: 'Human Resource',
    managerOnly: true,
  },
  {
    name: 'My Attendance',
    icon: UserCheck,
    route: '/hr/attendance',
    department: 'Human Resource',
  },

  // Supply Chain Management
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/scm/dashboard',
    department: 'SCM',
    managerOnly: true,
  },
  {
    name: 'Inventory',
    icon: Package,
    route: '/scm/main-inventory',
    department: 'SCM',
    managerOnly: true,
  },
  {
    name: 'Supply Request',
    icon: ReceiptText,
    route: '/scm/request-supply',
    department: 'SCM',
    managerOnly: true,
  },
  {
    name: 'Purchase Order',
    icon: ShoppingBag,
    route: '/scm/purchase-order',
    department: 'SCM',
    managerOnly: true,
  },
  {
    name: 'Goods Receipt Notes',
    icon: ReceiptText,
    route: '/scm/grn',
    department: 'SCM',
    managerOnly: true,
  },
  {
    name: 'Suppliers',
    icon: Truck,
    route: '/scm/suppliers',
    department: 'SCM',
    managerOnly: true,
  },
  {
    name: 'My Attendance',
    icon: UserCheck,
    route: '/scm/attendance',
    department: 'SCM',
  },
  {
    name: 'Employee Schedules',
    icon: Calendar,
    route: '/hr/schedules',
    department: 'SCM',
    managerOnly: true,
  },

  // Finance Department
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/finance/dashboard',
    department: 'Finance',
    managerOnly: true,
  },
  {
    name: 'Financial Management',
    icon: PhilippinePeso,
    route: '/finance/financial-management',
    department: 'Finance',
    managerOnly: true,
    subItems: [
      { name: 'Request Approval', route: '/finance/request-approval' },
      { name: 'Payroll Approval', route: '/finance/payroll-approval' },
      { name: 'Budget Release', route: '/finance/budget-release' },
      { name: 'Cash Management', route: '/finance/cash-management' },
    ],
  },
  {
    name: 'Sales',
    icon: BarChart3,
    route: '/finance/sales',
    department: 'Finance',
    managerOnly: true,
  },
  {
    name: 'My Attendance',
    icon: UserCheck,
    route: '/finance/attendance',
    department: 'Finance',
  },
  {
    name: 'Employee Schedules',
    icon: Calendar,
    route: '/hr/schedules',
    department: 'Finance',
    managerOnly: true,
  },

  // Production Department
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/production/dashboard',
    department: 'Production',
    managerOnly: true,
  },
  {
    name: 'Menu Management',
    icon: ChefHat,
    route: '/production/menu-creation',
    department: 'Production',
    managerOnly: true,
    subItems: [
      { name: 'Menu Creation', route: '/production/menu-creation' },
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
    managerOnly: true,
  },
  {
    name: 'Production Inventory',
    icon: Package,
    route: '/production/production-inventory',
    department: 'Production',
    managerOnly: true,
  },
  {
    name: 'My Attendance',
    icon: UserCheck,
    route: '/production/attendance',
    department: 'Production',
  },
  
  {
    name: 'Employee Schedules',
    icon: Calendar,
    route: '/hr/schedules',
    department: 'Production',
    managerOnly: true,
  },

  // Customer Relationship Management
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/crm/dashboard',
    department: 'CRM',
    managerOnly: true,
  },
  {
    name: 'Customers Feedback',
    icon: Users,
    route: '/crm/customers-feedback',
    department: 'CRM',
    managerOnly: true,
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    route: '/crm/analytics',
    department: 'CRM',
    managerOnly: true,
  },
  {
    name: 'My Attendance',
    icon: UserCheck,
    route: '/crm/attendance',
    department: 'CRM',
  },
  {
    name: 'Employee Schedules',
    icon: Calendar,
    route: '/hr/schedules',
    department: 'CRM',
    managerOnly: true,
  },

  // Admin Department (Super Admin only)
  {
    name: 'Executive Dashboard',
    icon: LayoutDashboard,
    route: '/super-admin',
    department: 'Administration',
    superAdminOnly: true,
  },
  {
    name: 'Financial Statement',
    icon: BarChart3,
    route: '/super-admin/financial-statement',
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
