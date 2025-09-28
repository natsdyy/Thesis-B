<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    User,
    Users,
    Building,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Heart,
    Shield,
    DollarSign,
    UserPlus,
    Save,
    X,
    AlertTriangle,
    CheckCircle,
    Info,
    Clock,
    Target,
    Activity,
    PhilippinePeso,
    PhoneCall,
    ChevronLeft,
    ChevronRight,
  } from 'lucide-vue-next';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useEmployeeStore } from '../../stores/employeeStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { usePositionsStore } from '../../stores/positionsStore.js';
  import { apiConfig } from '../../config/api.js';

  const authStore = useAuthStore();
  const employeeStore = useEmployeeStore();
  const branchStore = useBranchStore();
  const positionsStore = usePositionsStore();

  // Reactive state
  const currentStep = ref(0);
  const loading = ref(false);
  const saving = ref(false);
  // Photo upload state
  const photoFile = ref(null);
  const photoPreview = ref('');

  // Access store data
  const employeeStats = computed(() => employeeStore.employeeStats);
  const storeLoading = computed(() => employeeStore.loading);

  // Form data
  const employeeForm = ref({
    // Basic Information
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    postal_code: '',
    civil_status: '',
    sex: '',
    birthday: '',
    age: '',
    citizenship: '',
    department: '',
    role_id: '',
    employee_type: '',
    // Branch Assignment
    branch_id: '',

    // Salary Information
    pagibig_number: '',
    sss_number: '',
    philhealth_number: '',

    // Emergency Contact Information
    emergency_contact_name: '',
    emergency_relationship: '',
    emergency_contact_number: '',
    alternate_contact_number: '',
    emergency_contact_address: '',
    emergency_contact_email: '',
  });

  // Form validation errors
  const formErrors = ref({});

  // Confirmation modal state
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    confirmText: '',
    confirmClass: '',
    onConfirm: null,
  });

  // Success modal state
  const successModal = ref({
    show: false,
    employeeData: null,
  });

  // Departments and roles data
  const departmentsWithRoles = ref({});
  const departments = computed(() => Object.keys(departmentsWithRoles.value));

  const civilStatuses = ['Single', 'Married'];

  const sexOptions = ['Male', 'Female'];
  const employeeTypes = ['Full-time', 'Part-time'];

  // Wizard steps
  const steps = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: User,
      description: 'Personal and professional information',
    },
    {
      id: 'salary',
      title: 'Salary Information',
      icon: PhilippinePeso,
      description: 'Salary and government benefit information',
    },
    {
      id: 'emergency',
      title: 'Emergency Contact',
      icon: PhoneCall,
      description: 'Emergency contact details',
    },
  ];

  // Computed properties
  const availableRoles = computed(() => {
    return employeeForm.value.department
      ? departmentsWithRoles.value[employeeForm.value.department] || []
      : [];
  });

  // Wizard navigation computed properties
  const currentStepData = computed(() => steps[currentStep.value]);
  const isFirstStep = computed(() => currentStep.value === 0);
  const isLastStep = computed(() => currentStep.value === steps.length - 1);
  const canGoNext = computed(() => {
    // Check if current step is valid
    if (currentStep.value === 0) {
      // Basic information validation
      const form = employeeForm.value;
      return (
        form.first_name &&
        form.last_name &&
        form.phone_number &&
        form.address &&
        form.postal_code &&
        form.civil_status &&
        form.sex &&
        form.birthday &&
        form.age &&
        form.citizenship &&
        form.department &&
        form.role_id &&
        form.employee_type &&
        (form.department !== 'Branch' ? true : !!form.branch_id)
      );
    } else if (currentStep.value === 1) {
      // Benefits validation
      const form = employeeForm.value;
      return form.pagibig_number && form.sss_number && form.philhealth_number;
    } else if (currentStep.value === 2) {
      // Emergency contact validation
      const form = employeeForm.value;
      return (
        form.emergency_contact_name &&
        form.emergency_relationship &&
        form.emergency_contact_number &&
        form.emergency_contact_address
      );
    }
    return true;
  });

  // Active branches for assignment (used when department is Branch)
  const activeBranches = computed(() => branchStore.activeBranches || []);

  // Base salary calculation based on role and employee type
  const baseSalary = computed(() => {
    if (!employeeForm.value.role_id || !employeeForm.value.employee_type) {
      return {
        hourly: 0,
        daily: 0,
        monthly: 0,
        formatted: {
          hourly: '₱0.00',
          daily: '₱0.00',
          monthly: '₱0.00',
        },
      };
    }

    // Find the selected role from available roles
    const selectedRole = availableRoles.value.find(
      (role) => role.role_id == employeeForm.value.role_id
    );

    if (!selectedRole || !selectedRole.rate_per_hour) {
      return {
        hourly: 0,
        daily: 0,
        monthly: 0,
        formatted: {
          hourly: '₱0.00',
          daily: '₱0.00',
          monthly: '₱0.00',
        },
      };
    }

    const hourlyRate = parseFloat(selectedRole.rate_per_hour);
    const hoursPerDay =
      employeeForm.value.employee_type === 'Full-time' ? 8 : 4; // Part-time is typically 4 hours
    const workingDaysPerMonth = 26; // Company works 6 days per week (1 day off)

    const dailyRate = hourlyRate * hoursPerDay;
    const monthlyRate = dailyRate * workingDaysPerMonth;

    return {
      hourly: hourlyRate,
      daily: dailyRate,
      monthly: monthlyRate,
      formatted: {
        hourly: `₱${hourlyRate.toFixed(2)}`,
        daily: `₱${dailyRate.toFixed(2)}`,
        monthly: `₱${monthlyRate.toFixed(2)}`,
      },
    };
  });

  const isFormValid = computed(() => {
    const form = employeeForm.value;

    // Basic Information - Required fields
    const basicValid =
      form.first_name &&
      form.last_name &&
      form.phone_number &&
      form.address &&
      form.postal_code &&
      form.civil_status &&
      form.sex &&
      form.birthday &&
      form.age &&
      form.citizenship &&
      form.department &&
      form.role_id &&
      form.employee_type &&
      // Require branch assignment when department is Branch
      (form.department !== 'Branch' ? true : !!form.branch_id);

    // Salary Information - Required fields
    const salaryValid =
      form.pagibig_number && form.sss_number && form.philhealth_number;

    // Emergency Contact - Required fields
    const emergencyValid =
      form.emergency_contact_name &&
      form.emergency_relationship &&
      form.emergency_contact_number &&
      form.emergency_contact_address;

    return basicValid && salaryValid && emergencyValid;
  });

  const completionPercentage = computed(() => {
    const form = employeeForm.value;
    const totalFields = 21; // Total required fields (includes conditional branch when needed)
    let completedFields = 0;

    // Count completed required fields
    if (form.first_name) completedFields++;
    if (form.last_name) completedFields++;
    if (form.phone_number) completedFields++;
    if (form.address) completedFields++;
    if (form.postal_code) completedFields++;
    if (form.civil_status) completedFields++;
    if (form.sex) completedFields++;
    if (form.birthday) completedFields++;
    if (form.age) completedFields++;
    if (form.citizenship) completedFields++;
    if (form.department) completedFields++;
    if (form.role_id) completedFields++;
    if (form.employee_type) completedFields++;
    if (form.department === 'Branch' && form.branch_id) completedFields++;
    if (form.pagibig_number) completedFields++;
    if (form.sss_number) completedFields++;
    if (form.philhealth_number) completedFields++;
    if (form.emergency_contact_name) completedFields++;
    if (form.emergency_relationship) completedFields++;
    if (form.emergency_contact_number) completedFields++;
    if (form.emergency_contact_address) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  });

  // Watch for birthday changes to auto-calculate age
  watch(
    () => employeeForm.value.birthday,
    (newBirthday) => {
      if (newBirthday) {
        const today = new Date();
        const birthDate = new Date(newBirthday);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        employeeForm.value.age = age.toString();
      }
    }
  );

  // Watch for department changes to reset role
  watch(
    () => employeeForm.value.department,
    () => {
      employeeForm.value.role_id = '';
      // Reset branch when switching out of Branch department
      if (employeeForm.value.department !== 'Branch') {
        employeeForm.value.branch_id = '';
      }
    }
  );

  // Form validation
  const validateForm = () => {
    const errors = {};
    const form = employeeForm.value;

    // Validate phone number format (Philippine) - allow 09XXXXXXXXX or +639XXXXXXXXX
    if (form.phone_number) {
      const isLocalPH = /^09\d{9}$/.test(form.phone_number);
      const isIntlPH = /^\+639\d{9}$/.test(form.phone_number);
      if (!isLocalPH && !isIntlPH) {
        errors.phone_number = 'Use 09XXXXXXXXX or +639XXXXXXXXX';
      }
    }

    // Validate emergency contact number format
    if (form.emergency_contact_number) {
      const isLocalPH = /^09\d{9}$/.test(form.emergency_contact_number);
      const isIntlPH = /^\+639\d{9}$/.test(form.emergency_contact_number);
      if (!isLocalPH && !isIntlPH) {
        errors.emergency_contact_number = 'Use 09XXXXXXXXX or +639XXXXXXXXX';
      }
    }

    // Validate email format
    if (form.email && !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate emergency contact email format
    if (
      form.emergency_contact_email &&
      !form.emergency_contact_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      errors.emergency_contact_email = 'Please enter a valid email address';
    }

    // Validate age
    if (form.age && (parseInt(form.age) < 18 || parseInt(form.age) > 65)) {
      errors.age = 'Age must be between 18 and 65';
    }

    formErrors.value = errors;
    return Object.keys(errors).length === 0;
  };

  // Wizard navigation functions
  const nextStep = () => {
    if (canGoNext.value && !isLastStep.value) {
      currentStep.value++;
    }
  };

  const previousStep = () => {
    if (!isFirstStep.value) {
      currentStep.value--;
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      currentStep.value = stepIndex;
    }
  };

  // Philippine phone input handler: accepts only 09XXXXXXXXX or +639XXXXXXXXX
  const handlePHPhoneInput = (rawInput, field) => {
    const input = String(rawInput || '');

    // If starts with +, normalize to +639XXXXXXXXX
    if (input.trim().startsWith('+')) {
      // Keep only digits, remember it is intended as +63
      let digits = input.replace(/\D/g, '');
      if (!digits.startsWith('63')) {
        // Force country code 63
        digits = '63' + digits.replace(/^\+?/, '').replace(/^63?/, '');
      }
      // Keep country code + 10 digits for mobile
      digits = digits.substring(0, 12); // 63 + 10 digits
      const localPart = digits.substring(2); // after 63
      employeeForm.value[field] = '+63' + localPart;
      return;
    }

    // Local format: keep digits only
    let local = input.replace(/\D/g, '');

    // If user types starting with 63, convert to international
    if (local.startsWith('63')) {
      const afterCC = local.substring(2).substring(0, 10);
      employeeForm.value[field] = '+63' + afterCC;
      return;
    }

    // Ensure it starts with 09 for local numbers
    if (local.startsWith('9')) {
      local = '0' + local;
    }
    if (!local.startsWith('0')) {
      // If doesn't start with 0, just keep as is until it does
      // Limit to 11 digits regardless
      employeeForm.value[field] = local.substring(0, 11);
      return;
    }
    // Limit to 11 digits for local
    local = local.substring(0, 11);
    employeeForm.value[field] = local;
  };

  // Modal functions
  const openConfirmModal = () => {
    if (!validateForm() || !isFormValid.value) {
      showToast('error', 'Please fill in all required fields correctly');
      return;
    }

    confirmModal.value = {
      show: true,
      title: 'Add New Employee',
      message: `Are you sure you want to add ${employeeForm.value.first_name} ${employeeForm.value.last_name} as a new employee?`,
      confirmText: 'Add Employee',
      confirmClass:
        'bg-primaryColor text-white hover:bg-primaryColor/80 border-none',
      onConfirm: handleSubmitEmployee,
    };
    document.getElementById('confirmation_modal').showModal();
  };

  const closeConfirmModal = () => {
    document.getElementById('confirmation_modal')?.close();
    confirmModal.value = {
      show: false,
      title: '',
      message: '',
      confirmText: '',
      confirmClass: '',
      onConfirm: null,
    };
  };

  const openSuccessModal = (employeeData) => {
    successModal.value = {
      show: true,
      employeeData: employeeData,
    };
    document.getElementById('success_modal').showModal();
  };

  const closeSuccessModal = () => {
    document.getElementById('success_modal')?.close();
    successModal.value = {
      show: false,
      employeeData: null,
    };
  };

  // Form submission
  const handleSubmitEmployee = async () => {
    try {
      saving.value = true;
      closeConfirmModal();

      let newEmployee;
      if (photoFile.value) {
        const formData = new FormData();
        Object.entries(employeeForm.value).forEach(([key, val]) => {
          formData.append(key, val == null ? '' : val);
        });
        formData.append('photo', photoFile.value);

        if (typeof employeeStore.createEmployeeWithPhoto === 'function') {
          newEmployee = await employeeStore.createEmployeeWithPhoto(formData);
        } else {
          // Fallback direct multipart request if store method isn't available (HMR/desync safety)
          const res = await fetch(`${apiConfig.baseURL}/employees/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(
              data.message || `HTTP error! status: ${res.status}`
            );
          }
          newEmployee = data.data;
        }
      } else {
        newEmployee = await employeeStore.createEmployee(employeeForm.value);
      }

      showToast('success', 'Employee added successfully!');
      openSuccessModal(newEmployee);

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error adding employee:', error);
      showToast(
        'error',
        error.message || 'Failed to add employee. Please try again.'
      );
    } finally {
      saving.value = false;
    }
  };

  const resetForm = () => {
    employeeForm.value = {
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      postal_code: '',
      civil_status: '',
      sex: '',
      birthday: '',
      age: '',
      citizenship: '',
      department: '',
      role_id: '',
      employee_type: '',
      branch_id: '',
      pagibig_number: '',
      sss_number: '',
      philhealth_number: '',
      emergency_contact_name: '',
      emergency_relationship: '',
      emergency_contact_number: '',
      alternate_contact_number: '',
      emergency_contact_address: '',
      emergency_contact_email: '',
    };
    formErrors.value = {};
    currentStep.value = 0;
    photoFile.value = null;
    photoPreview.value = '';
  };

  // Toast notification
  const showToast = (type, message) => {
    // Implementation would depend on your toast system
    console.log(`${type}: ${message}`);
  };

  const onPhotoSelected = (event) => {
    const file = event.target.files?.[0];
    photoFile.value = file || null;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => (photoPreview.value = e.target?.result || '');
      reader.readAsDataURL(file);
    } else {
      photoPreview.value = '';
    }
  };

  // Fetch employee stats
  const fetchEmployeeStats = async () => {
    try {
      await employeeStore.fetchEmployeeStats();
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  };

  // Fetch departments with roles
  const fetchDepartmentsWithRoles = async () => {
    try {
      const response = await fetch(
        `${apiConfig.baseURL}/employees/departments-with-roles`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        departmentsWithRoles.value = data.data;
      } else {
        throw new Error(
          data.message || 'Failed to fetch departments with roles'
        );
      }
    } catch (error) {
      console.error('Error fetching departments with roles:', error);
      showToast('error', 'Failed to load departments and roles');
    }
  };

  onMounted(() => {
    fetchEmployeeStats();
    fetchDepartmentsWithRoles();
    // Load branches for assignment
    branchStore.fetchActiveBranches().catch((e) => {
      console.error('Failed to load branches', e);
    });
    // Load positions data for salary calculation
    positionsStore.fetchPositions().catch((e) => {
      console.error('Failed to load positions', e);
    });
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Add Employee
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Add a new employee to the Countryside Steakhouse.
      </p>
    </div>

    <!-- Stats Cards -->
    <div
      class="stats shadow w-full mb-4 sm:mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal xl:stats-horizontal rounded-lg"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Users
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Employees
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ employeeStats.total_employees }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          All employees in system
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Activity class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Active Employees
        </div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ employeeStats.active_employees }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Currently active
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Building class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Departments
        </div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ employeeStats.departments }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Active departments
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Target class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          New This Month
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ employeeStats.new_this_month }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Recently hired
        </div>
      </div>
    </div>

    <!-- Progress Indicator -->
    <div class="card bg-accentColor shadow-xl mb-6 border border-black/10">
      <div class="card-body p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-primaryColor"
            >Form Completion</span
          >
          <span class="text-sm text-gray-600">{{ completionPercentage }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-primaryColor h-2 rounded-full transition-all duration-300"
            :style="{ width: completionPercentage + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Wizard Progress -->
    <div class="card bg-accentColor shadow-xl mb-6 border border-black/10">
      <div class="card-body p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-primaryColor">
            Step {{ currentStep + 1 }} of {{ steps.length }}
          </h3>
          <span class="text-sm text-gray-600"
            >{{ Math.round(((currentStep + 1) / steps.length) * 100) }}%
            Complete</span
          >
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            class="bg-primaryColor h-2 rounded-full transition-all duration-300"
            :style="{ width: ((currentStep + 1) / steps.length) * 100 + '%' }"
          ></div>
        </div>

        <!-- Step Indicators -->
        <div class="flex justify-between items-center">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="flex flex-col items-center flex-1 cursor-pointer"
            @click="goToStep(index)"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200"
              :class="{
                'bg-primaryColor text-white': index <= currentStep,
                'bg-gray-200 text-gray-500': index > currentStep,
                'ring-4 ring-primaryColor/30': index === currentStep,
              }"
            >
              <component :is="step.icon" class="w-5 h-5" />
            </div>
            <div class="text-center">
              <div
                class="text-xs font-medium"
                :class="{
                  'text-primaryColor': index <= currentStep,
                  'text-gray-500': index > currentStep,
                }"
              >
                {{ step.title }}
              </div>
              <div class="text-xs text-gray-400 mt-1 hidden sm:block">
                {{ step.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Content -->
    <div class="card bg-accentColor shadow-xl border border-black/10">
      <div class="card-body p-6">
        <!-- Photo Upload -->
        <div class="mb-6">
          <h2 class="card-title text-primaryColor text-xl mb-2">Photo</h2>
          <div class="flex items-center gap-4">
            <div class="avatar">
              <div
                class="w-16 rounded-full ring ring-primaryColor ring-offset-base-100 ring-offset-2 overflow-hidden bg-gray-100"
              >
                <img v-if="photoPreview" :src="photoPreview" alt="Preview" />
                <div
                  v-else
                  class="w-16 h-16 flex items-center justify-center text-xs text-gray-400"
                >
                  No photo
                </div>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              class="file-input file-input-bordered file-input-sm"
              @change="onPhotoSelected"
            />
          </div>
        </div>
        <!-- Current Step Header -->
        <div class="mb-6">
          <h2
            class="card-title text-primaryColor text-xl mb-2 flex items-center"
          >
            <component :is="currentStepData.icon" class="w-6 h-6 mr-2" />
            {{ currentStepData.title }}
          </h2>
          <p class="text-sm text-gray-600">
            {{ currentStepData.description }}
          </p>
        </div>

        <!-- Basic Information Step -->
        <div v-if="currentStep === 0" class="space-y-6">
          <!-- Personal Information Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- First Name -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >First Name <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="employeeForm.first_name"
                type="text"
                placeholder="Enter first name"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
            </div>

            <!-- Middle Name -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Middle Name</span>
              </label>
              <input
                v-model="employeeForm.middle_name"
                type="text"
                placeholder="Enter middle name (optional)"
                class="input input-sm sm:input-md input-bordered w-full"
              />
            </div>

            <!-- Last Name -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Last Name <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="employeeForm.last_name"
                type="text"
                placeholder="Enter last name"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
            </div>

            <!-- Email Address -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Email Address</span>
              </label>
              <input
                v-model="employeeForm.email"
                type="email"
                placeholder="Enter email address"
                class="input input-sm sm:input-md input-bordered w-full"
              />
            </div>

            <!-- Phone Number -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Phone Number <span class="text-red-500">*</span></span
                >
              </label>
              <input
                :value="employeeForm.phone_number"
                @input="handlePHPhoneInput($event.target.value, 'phone_number')"
                type="text"
                placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
              <span class="text-xs text-gray-500 mt-1"
                >Use Philippine mobile format only</span
              >
            </div>

            <!-- Leave blank column to balance -->
            <div></div>

            <!-- Address -->
            <div class="form-control lg:col-span-3">
              <label class="label mb-1">
                <span class="label-text"
                  >Address <span class="text-red-500">*</span></span
                >
              </label>
              <textarea
                v-model="employeeForm.address"
                placeholder="Enter complete address"
                class="textarea textarea-bordered w-full min-h-[80px]"
                :class="{ 'textarea-error': formErrors.address }"
                required
              ></textarea>
              <label v-if="formErrors.address" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.address
                }}</span>
              </label>
            </div>

            <!-- Postal Code -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Postal Code <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="employeeForm.postal_code"
                type="text"
                placeholder="Enter postal code"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
            </div>

            <!-- Civil Status -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Civil Status <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="employeeForm.civil_status"
                class="select select-sm sm:select-md select-bordered w-full"
                required
              >
                <option value="">Select civil status</option>
                <option
                  v-for="status in civilStatuses"
                  :key="status"
                  :value="status"
                >
                  {{ status }}
                </option>
              </select>
            </div>

            <!-- Leave blank column to balance -->
            <div></div>

            <!-- Sex -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Sex <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="employeeForm.sex"
                class="select select-sm sm:select-md select-bordered w-full"
                required
              >
                <option value="">Select sex</option>
                <option v-for="sex in sexOptions" :key="sex" :value="sex">
                  {{ sex }}
                </option>
              </select>
            </div>

            <!-- Birthday -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Birthday <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="employeeForm.birthday"
                type="date"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
            </div>

            <!-- Age -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Age <span class="text-red-500">*</span></span
                >
                <span class="text-xs text-gray-500 ml-2"
                  >(Auto-calculated from birthday)</span
                >
              </label>
              <input
                v-model="employeeForm.age"
                type="number"
                placeholder="Auto-calculated"
                class="input input-sm sm:input-md input-bordered w-full bg-gray-50 cursor-not-allowed"
                readonly
              />
            </div>

            <!-- Citizenship -->
            <div class="form-control lg:col-span-3">
              <label class="label mb-1">
                <span class="label-text"
                  >Citizenship <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="employeeForm.citizenship"
                type="text"
                placeholder="Enter citizenship"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
            </div>
          </div>

          <!-- Professional Information Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- Department -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Department <span class="text-red-500">*</span>
                </span>
              </label>
              <div class="relative">
                <Building
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <select
                  v-model="employeeForm.department"
                  class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor pl-10"
                  :class="{ 'select-error': formErrors.department }"
                  required
                >
                  <option value="">Select department</option>
                  <option v-for="dept in departments" :key="dept" :value="dept">
                    {{ dept }}
                  </option>
                </select>
              </div>
              <label v-if="formErrors.department" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.department
                }}</span>
              </label>
            </div>

            <!-- Role -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Role <span class="text-red-500">*</span>
                </span>
              </label>
              <select
                v-model="employeeForm.role_id"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :class="{ 'select-error': formErrors.role_id }"
                :disabled="!employeeForm.department"
                required
              >
                <option value="">Select role</option>
                <option
                  v-for="role in availableRoles"
                  :key="role.role_id"
                  :value="role.role_id"
                >
                  {{ role.role }}
                </option>
              </select>
              <span class="text-xs text-gray-500 mt-1">
                {{ !employeeForm.department ? 'Select department first' : '' }}
              </span>
              <label v-if="formErrors.role_id" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.role_id
                }}</span>
              </label>
            </div>

            <!-- Assign to Branch (only when department is Branch) -->
            <div
              class="form-control lg:col-span-2"
              v-if="employeeForm.department === 'Branch'"
            >
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Assign to Branch <span class="text-red-500">*</span>
                </span>
              </label>
              <div class="relative">
                <Building
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <select
                  v-model="employeeForm.branch_id"
                  class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor pl-10"
                  required
                >
                  <option value="">Select branch</option>
                  <option
                    v-for="branch in activeBranches"
                    :key="branch.id"
                    :value="branch.id"
                  >
                    {{ branch.name }} ({{ branch.code }})
                  </option>
                </select>
                <span class="text-xs text-gray-500 mt-1"
                  >Only active branches are shown</span
                >
              </div>
            </div>

            <!-- Employee Type -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Employee Type <span class="text-red-500">*</span>
                </span>
              </label>
              <div class="flex gap-4 mt-2">
                <label class="label cursor-pointer">
                  <input
                    v-model="employeeForm.employee_type"
                    type="radio"
                    value="Full-time"
                    class="radio checked:text-primaryColor radio-sm border-black/50"
                  />
                  <span class="label-text ml-2">Full-time</span>
                </label>
                <label class="label cursor-pointer">
                  <input
                    v-model="employeeForm.employee_type"
                    type="radio"
                    value="Part-time"
                    class="radio checked:text-primaryColor radio-sm border-black/50"
                  />
                  <span class="label-text ml-2">Part-time</span>
                </label>
              </div>
              <label v-if="formErrors.employee_type" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.employee_type
                }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Benefits Information Step -->
        <div v-if="currentStep === 1" class="space-y-6">
          <!-- Base Salary Information -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <h3
              class="text-lg font-semibold text-primaryColor mb-4 flex items-center"
            >
              <DollarSign class="w-5 h-5 mr-2" />
              Base Salary Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="text-sm text-gray-600 mb-1">Hourly Rate</div>
                <div class="text-lg font-semibold text-primaryColor">
                  {{ baseSalary.formatted.hourly }}
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="text-sm text-gray-600 mb-1">Daily Rate</div>
                <div class="text-lg font-semibold text-primaryColor">
                  {{ baseSalary.formatted.daily }}
                </div>
                <div class="text-xs text-gray-500">
                  {{
                    employeeForm.employee_type === 'Full-time'
                      ? '8 hours'
                      : '4 hours'
                  }}
                  per day
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="text-sm text-gray-600 mb-1">Monthly Rate</div>
                <div class="text-lg font-semibold text-primaryColor">
                  {{ baseSalary.formatted.monthly }}
                </div>
                <div class="text-xs text-gray-500">26 working days</div>
              </div>
            </div>
            <div
              v-if="!employeeForm.role_id || !employeeForm.employee_type"
              class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div class="text-sm text-yellow-800">
                <Info class="w-4 h-4 inline mr-1" />
                Please select a role and employee type to calculate base salary
              </div>
            </div>
          </div>

          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- PAG-IBIG Number -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium"
                  >PAG-IBIG Number <span class="text-error">*</span></span
                >
              </label>
              <div class="relative">
                <Shield
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="employeeForm.pagibig_number"
                  type="text"
                  placeholder="Enter PAG-IBIG number"
                  class="input input-bordered pl-10 w-full"
                  :class="{ 'input-error': formErrors.pagibig_number }"
                  required
                />
              </div>
              <label v-if="formErrors.pagibig_number" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.pagibig_number
                }}</span>
              </label>
            </div>

            <!-- SSS Number -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium"
                  >SSS Number <span class="text-error">*</span></span
                >
              </label>
              <div class="relative">
                <Shield
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="employeeForm.sss_number"
                  type="text"
                  placeholder="Enter SSS number"
                  class="input input-bordered pl-10 w-full"
                  :class="{ 'input-error': formErrors.sss_number }"
                  required
                />
              </div>
              <label v-if="formErrors.sss_number" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.sss_number
                }}</span>
              </label>
            </div>

            <!-- PhilHealth Number (spans full width) -->
            <div class="form-control lg:col-span-2">
              <label class="label">
                <span class="label-text font-medium"
                  >PhilHealth Number <span class="text-error">*</span></span
                >
              </label>
              <div class="relative">
                <Shield
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="employeeForm.philhealth_number"
                  type="text"
                  placeholder="Enter PhilHealth number"
                  class="input input-bordered pl-10 w-full"
                  :class="{ 'input-error': formErrors.philhealth_number }"
                  required
                />
              </div>
              <label v-if="formErrors.philhealth_number" class="label">
                <span class="label-text-alt text-error">{{
                  formErrors.philhealth_number
                }}</span>
              </label>
            </div>
          </div>

          <div class="alert alert-success bg-success/10 border-success/30">
            <CheckCircle class="w-5 h-5" />
            <div>
              <h3 class="font-bold">Important Information</h3>
              <div class="text-xs">
                Please ensure all government benefit numbers are accurate and
                valid. These will be used for payroll and benefit processing.
              </div>
            </div>
          </div>
        </div>

        <!-- Emergency Contact Step -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Emergency Contact Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">
                  Emergency Contact Name <span class="text-error">*</span>
                </span>
              </label>
              <div class="relative">
                <User
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="employeeForm.emergency_contact_name"
                  type="text"
                  placeholder="Enter emergency contact name"
                  class="input input-bordered pl-10 w-full"
                  :class="{ 'input-error': formErrors.emergency_contact_name }"
                  required
                />
              </div>
              <label v-if="formErrors.emergency_contact_name" class="label">
                <span class="label-text-alt text-error">
                  {{ formErrors.emergency_contact_name }}
                </span>
              </label>
            </div>

            <!-- Relationship -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">
                  Relationship <span class="text-error">*</span>
                </span>
              </label>
              <input
                v-model="employeeForm.emergency_relationship"
                type="text"
                placeholder="e.g., Spouse, Parent, Sibling"
                class="input input-bordered w-full"
                :class="{ 'input-error': formErrors.emergency_relationship }"
                required
              />
              <label v-if="formErrors.emergency_relationship" class="label">
                <span class="label-text-alt text-error">
                  {{ formErrors.emergency_relationship }}
                </span>
              </label>
            </div>

            <!-- Emergency Contact Number -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">
                  Emergency Contact Number <span class="text-error">*</span>
                </span>
              </label>
              <div class="relative">
                <Phone
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  :value="employeeForm.emergency_contact_number"
                  @input="
                    handlePHPhoneInput(
                      $event.target.value,
                      'emergency_contact_number'
                    )
                  "
                  type="text"
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  class="input input-bordered pl-10 w-full"
                  :class="{
                    'input-error': formErrors.emergency_contact_number,
                  }"
                  required
                />
              </div>
              <label class="label">
                <span class="label-text-alt text-gray-500"
                  >Philippine number format only</span
                >
              </label>
              <label v-if="formErrors.emergency_contact_number" class="label">
                <span class="label-text-alt text-error">
                  {{ formErrors.emergency_contact_number }}
                </span>
              </label>
            </div>

            <!-- Alternate Contact Number -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium"
                  >Alternate Contact Number</span
                >
              </label>
              <div class="relative">
                <Phone
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  :value="employeeForm.alternate_contact_number"
                  @input="
                    handlePHPhoneInput(
                      $event.target.value,
                      'alternate_contact_number'
                    )
                  "
                  type="text"
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX (optional)"
                  class="input input-bordered pl-10 w-full"
                />
              </div>
              <label class="label">
                <span class="label-text-alt text-gray-500"
                  >Optional alternate number</span
                >
              </label>
            </div>

            <!-- Emergency Contact Address -->
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium">
                  Emergency Contact Address <span class="text-error">*</span>
                </span>
              </label>
              <div class="relative">
                <MapPin class="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <textarea
                  v-model="employeeForm.emergency_contact_address"
                  placeholder="Enter emergency contact address"
                  class="textarea textarea-bordered pl-10 min-h-[80px] w-full"
                  :class="{
                    'textarea-error': formErrors.emergency_contact_address,
                  }"
                  required
                ></textarea>
              </div>
              <label v-if="formErrors.emergency_contact_address" class="label">
                <span class="label-text-alt text-error">
                  {{ formErrors.emergency_contact_address }}
                </span>
              </label>
            </div>

            <!-- Emergency Contact Email -->
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium"
                  >Emergency Contact Email</span
                >
              </label>
              <div class="relative">
                <Mail
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="employeeForm.emergency_contact_email"
                  type="email"
                  placeholder="Enter emergency contact email (optional)"
                  class="input input-bordered pl-10 w-full"
                  :class="{ 'input-error': formErrors.emergency_contact_email }"
                />
              </div>
              <label v-if="formErrors.emergency_contact_email" class="label">
                <span class="label-text-alt text-error">
                  {{ formErrors.emergency_contact_email }}
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Wizard Navigation Buttons -->
        <div
          class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200"
        >
          <div class="text-sm text-gray-600">
            <span class="font-medium">Form Completion:</span>
            {{ completionPercentage }}%
          </div>

          <div class="flex gap-3">
            <!-- Previous Button -->
            <button
              v-if="!isFirstStep"
              @click="previousStep"
              class="btn btn-outline btn-sm text-gray-600 hover:bg-gray-100 font-thin"
              :disabled="saving"
            >
              <ChevronLeft class="w-4 h-4 mr-1" />
              Previous
            </button>

            <!-- Next Button -->
            <button
              v-if="!isLastStep"
              @click="nextStep"
              class="btn btn-primary btn-sm bg-primaryColor hover:bg-primaryColor/90 font-thin border-none shadow-none"
              :disabled="!canGoNext || saving"
            >
              Next
              <ChevronRight class="w-4 h-4 ml-1" />
            </button>

            <!-- Submit Button (only on last step) -->
            <button
              v-if="isLastStep"
              @click="openConfirmModal"
              class="btn btn-primary btn-sm bg-primaryColor hover:bg-primaryColor/90 font-thin border-none shadow-none"
              :disabled="!isFormValid || saving"
            >
              <Save class="w-4 h-4 mr-1" />
              <span
                v-if="saving"
                class="loading loading-spinner loading-sm"
              ></span>
              {{ saving ? 'Adding Employee...' : 'Add Employee' }}
            </button>

            <!-- Reset Button -->
            <button
              @click="resetForm"
              class="btn btn-outline btn-sm text-gray-600 hover:bg-gray-100 font-thin"
              :disabled="saving"
            >
              <X class="w-4 h-4 mr-1" />
              Reset Form
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <dialog id="confirmation_modal" class="modal">
      <div class="modal-box bg-accentColor text-black/50 shadow-lg">
        <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>

        <div class="py-4">
          <p class="mb-4">{{ confirmModal.message }}</p>

          <!-- Employee Summary -->
          <div class="bg-white/10 p-4 rounded-lg mb-4 border border-black/10">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Name:</strong> {{ employeeForm.first_name }}
                {{ employeeForm.last_name }}
              </div>
              <div>
                <strong>Department:</strong> {{ employeeForm.department }}
              </div>
              <div>
                <strong>Role:</strong>
                {{
                  availableRoles.find((r) => r.role_id == employeeForm.role_id)
                    ?.role || 'N/A'
                }}
              </div>
              <div><strong>Type:</strong> {{ employeeForm.employee_type }}</div>
            </div>
          </div>

          <div class="alert alert-info bg-info/10 border-info/30">
            <Info class="w-5 h-5" />
            <div>
              <div class="text-sm">
                Please verify all information is correct before adding the
                employee.
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="confirmModal.onConfirm"
            :class="confirmModal.confirmClass"
            class="btn btn-sm font-thin"
            :disabled="saving"
          >
            <span
              v-if="saving"
              class="loading loading-spinner loading-sm mr-1"
            ></span>
            {{ confirmModal.confirmText }}
          </button>
          <button
            @click="closeConfirmModal"
            class="btn btn-sm btn-outline font-thin"
            :disabled="saving"
          >
            Cancel
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeConfirmModal">close</button>
      </form>
    </dialog>

    <!-- Success Modal -->
    <dialog id="success_modal" class="modal">
      <div class="modal-box bg-accentColor text-black/50 shadow-lg">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 bg-success/10 rounded-full">
            <CheckCircle class="w-6 h-6 text-success" />
          </div>
          <h3 class="font-bold text-lg">Employee Added Successfully!</h3>
        </div>

        <div class="py-4">
          <p class="mb-4">
            {{ successModal.employeeData?.first_name }}
            {{ successModal.employeeData?.last_name }}
            has been successfully added to the system.
          </p>

          <div class="bg-white/10 p-4 rounded-lg mb-4">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Employee ID:</strong>
                {{ successModal.employeeData?.employee_id }}
              </div>
              <div>
                <strong>Department:</strong>
                {{ successModal.employeeData?.department }}
              </div>
              <div>
                <strong>Role:</strong>
                {{
                  availableRoles.find((r) => r.role_id == employeeForm.role_id)
                    ?.role || 'N/A'
                }}
              </div>
              <div>
                <strong>Status:</strong> {{ successModal.employeeData?.status }}
              </div>
            </div>
          </div>

          <div class="alert alert-success bg-success/10 border-success/30">
            <CheckCircle class="w-5 h-5" />
            <div>
              <div class="text-sm">
                The employee can now access the system and their profile is
                active.
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeSuccessModal"
            class="btn btn-sm btn-primary bg-primaryColor font-thin hover:bg-primaryColor/80 border-none shadow-none"
          >
            Continue
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>
