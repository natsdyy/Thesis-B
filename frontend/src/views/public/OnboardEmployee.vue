<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import {
    User,
    PhoneCall,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    X,
    AlertTriangle,
    Info,
    FileText,
  } from 'lucide-vue-next';
  import { apiConfig } from '../../config/api.js';
  import Logo from '../../assets/crm/Logo.png';

  const route = useRoute();
  const router = useRouter();

  // Reactive state
  const currentStep = ref(0);
  const loading = ref(true);
  const saving = ref(false);
  const onboardingToken = ref('');
  const onboardingData = ref(null);
  const errorMessage = ref('');
  const photoFile = ref(null);
  const photoPreview = ref('');
  const validIdFile = ref(null);
  const validIdPreview = ref('');
  const medicalCertFile = ref(null);
  const medicalCertPreview = ref('');
  const clearanceFile = ref(null);
  const clearancePreview = ref('');
  const previewModal = ref({
    show: false,
    title: '',
    file: null,
    preview: '',
  });
  const hoverPreview = ref({
    show: false,
    title: '',
    file: null,
    preview: '',
    x: 0,
    y: 0,
  });
  let hoverPreviewTimeout = null;

  // Completion notice modal state
  const showCompletionNotice = ref(false);

  // Close completion notice and redirect
  const closeCompletionNotice = () => {
    showCompletionNotice.value = false;
    router.push('/');
  };

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
    // Pre-filled and locked
    department: '',
    role_id: '',
    employee_type: '',
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

  // Steps configuration
  const steps = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Personal and professional information',
      icon: User,
    },
    {
      id: 'salary',
      title: 'Salary Information',
      description: 'Salary and government benefit information',
      icon: 'font-awesome-peso',
    },
    {
      id: 'emergency',
      title: 'Emergency Contact',
      description: 'Emergency contact details',
      icon: PhoneCall,
    },
  ];

  const currentStepData = computed(() => steps[currentStep.value]);

  // Available roles for salary calculation (will be fetched if needed)
  const availableRoles = ref([]);

  // Verify token and load onboarding data
  const verifyToken = async () => {
    try {
      loading.value = true;
      const token = route.query.token || route.params.token;

      if (!token) {
        errorMessage.value =
          'No onboarding token provided. Please use the link from your hire email.';
        return;
      }

      onboardingToken.value = token;

      const response = await fetch(
        `${apiConfig.baseURL}/onboarding/verify/${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        errorMessage.value =
          data.message || 'Invalid or expired onboarding link';
        return;
      }

      if (data.alreadyOnboarded) {
        errorMessage.value = 'You have already completed onboarding.';
        return;
      }

      onboardingData.value = data.data;

      // Pre-fill form with locked fields
      employeeForm.value.department = data.data.department;
      employeeForm.value.role_id = data.data.role_id;
      employeeForm.value.employee_type = data.data.employee_type || 'Full-time';
      employeeForm.value.branch_id = data.data.branch_id;
      employeeForm.value.email = data.data.email;

      // If this is a resubmission, pre-fill all existing employee data
      if (data.isResubmission) {
        employeeForm.value.first_name = data.data.first_name || '';
        employeeForm.value.last_name = data.data.last_name || '';
        employeeForm.value.middle_name = data.data.middle_name || '';
        employeeForm.value.phone_number = data.data.phone_number || '';
        employeeForm.value.address = data.data.address || '';
        employeeForm.value.postal_code = data.data.postal_code || '';
        employeeForm.value.civil_status = data.data.civil_status || '';
        employeeForm.value.sex = data.data.sex || '';
        employeeForm.value.birthday = data.data.birthday || '';
        employeeForm.value.age = data.data.age || '';
        employeeForm.value.citizenship = data.data.citizenship || '';
        employeeForm.value.sss_number = data.data.sss_number || '';
        employeeForm.value.pagibig_number = data.data.pagibig_number || '';
        employeeForm.value.philhealth_number =
          data.data.philhealth_number || '';
        employeeForm.value.emergency_contact_name =
          data.data.emergency_contact_name || '';
        employeeForm.value.emergency_relationship =
          data.data.emergency_relationship || '';
        employeeForm.value.emergency_contact_number =
          data.data.emergency_contact_number || '';
        employeeForm.value.emergency_contact_address =
          data.data.emergency_contact_address || '';
      }

      // Fetch role details for salary calculation
      if (data.data.role_id) {
        await fetchRoleDetails(data.data.role_id);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      errorMessage.value =
        'Failed to verify onboarding link. Please contact HR.';
    } finally {
      loading.value = false;
    }
  };

  // Fetch role details for salary calculation
  const fetchRoleDetails = async (roleId) => {
    try {
      // Try to get role details from onboarding data first (if available)
      if (onboardingData.value?.rate_per_hour) {
        availableRoles.value = [
          {
            role_id: roleId,
            rate_per_hour: parseFloat(onboardingData.value.rate_per_hour),
          },
        ];
        return;
      }

      // Fallback: fetch from API
      const response = await fetch(`${apiConfig.baseURL}/roles/positions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          availableRoles.value = data.data;
        } else {
          // If API doesn't return data, try to get rate from onboarding data
          console.warn(
            'Roles API returned no data, checking onboarding data...'
          );
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      // On error, try to use onboarding data if available
      if (onboardingData.value?.rate_per_hour && roleId) {
        availableRoles.value = [
          {
            role_id: roleId,
            rate_per_hour: parseFloat(onboardingData.value.rate_per_hour),
          },
        ];
      }
    }
  };

  // Base salary calculation - always returns a valid structure
  const baseSalary = computed(() => {
    // Default return structure
    const defaultSalary = {
      hourly: 0,
      daily: 0,
      monthly: 0,
      formatted: {
        hourly: '₱0.00',
        daily: '₱0.00',
        monthly: '₱0.00',
      },
    };

    if (!employeeForm.value.role_id || !employeeForm.value.employee_type) {
      return defaultSalary;
    }

    // Try to find role from availableRoles
    let selectedRole = null;
    if (availableRoles.value && availableRoles.value.length > 0) {
      selectedRole = availableRoles.value.find(
        (role) => role.role_id == employeeForm.value.role_id
      );
    }

    // If not found in availableRoles, try onboardingData
    if (!selectedRole && onboardingData.value?.rate_per_hour) {
      selectedRole = {
        role_id: employeeForm.value.role_id,
        rate_per_hour: parseFloat(onboardingData.value.rate_per_hour),
      };
    }

    if (!selectedRole || !selectedRole.rate_per_hour) {
      return defaultSalary;
    }

    const hourlyRate = parseFloat(selectedRole.rate_per_hour) || 0;
    const hoursPerDay =
      employeeForm.value.employee_type === 'Full-time' ? 8 : 4;
    const workingDaysPerMonth = 26;

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

  // Form validation
  const isFormValid = computed(() => {
    const form = employeeForm.value;

    // Step 0: Basic Information (includes documents)
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
      (form.department !== 'Branch' ? true : !!form.branch_id);

    const documentsValid =
      validIdFile.value && medicalCertFile.value && clearanceFile.value;

    // Step 1: Salary Information
    const salaryValid =
      form.pagibig_number && form.sss_number && form.philhealth_number;

    // Step 2: Emergency Contact
    const emergencyValid =
      form.emergency_contact_name &&
      form.emergency_relationship &&
      form.emergency_contact_number &&
      form.emergency_contact_address;

    // Validate based on current step
    if (currentStep.value === 0) {
      // Step 1: Basic info + documents required
      return basicValid && documentsValid;
    } else if (currentStep.value === 1) {
      // Step 2: Previous step + salary required
      return basicValid && documentsValid && salaryValid;
    } else if (currentStep.value === 2) {
      // Step 3: All fields required
      return basicValid && documentsValid && salaryValid && emergencyValid;
    }

    return false;
  });

  const completionPercentage = computed(() => {
    const form = employeeForm.value;
    const totalFields = 24; // Added 3 document fields
    let completedFields = 0;

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
    // Document fields
    if (validIdFile.value) completedFields++;
    if (medicalCertFile.value) completedFields++;
    if (clearanceFile.value) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  });

  // Watch for birthday changes to auto-calculate age
  watch(
    () => employeeForm.value.birthday,
    (newBirthday) => {
      if (newBirthday) {
        try {
          const today = new Date();
          const birthDate = new Date(newBirthday);

          // Validate date
          if (isNaN(birthDate.getTime())) {
            console.warn('Invalid birthday date:', newBirthday);
            return;
          }

          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }

          // Ensure age is not negative
          if (age < 0) {
            age = 0;
          }

          employeeForm.value.age = age.toString();
        } catch (error) {
          console.error('Error calculating age:', error);
        }
      } else {
        // Clear age if birthday is cleared
        employeeForm.value.age = '';
      }
    },
    { immediate: false }
  );

  // Philippine phone input handler
  const handlePHPhoneInput = (rawInput, field) => {
    const input = String(rawInput || '');
    let digits = input.replace(/\D/g, '');

    if (digits.startsWith('9') && !digits.startsWith('09')) {
      digits = '0' + digits;
    }

    if (digits.startsWith('63')) {
      digits = '0' + digits.substring(2);
    }

    if (digits.length > 0 && !digits.startsWith('09')) {
      if (digits.length > 1) {
        digits = '';
      }
    }

    digits = digits.substring(0, 11);

    if (digits.startsWith('09') && digits.length <= 11) {
      employeeForm.value[field] = digits;
    } else if (digits.length === 0) {
      employeeForm.value[field] = '';
    }
  };

  // Navigation
  const nextStep = () => {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++;
    }
  };

  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--;
    }
  };

  const goToStep = (index) => {
    if (index >= 0 && index < steps.length) {
      currentStep.value = index;
    }
  };

  // Photo upload
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

  // Document upload handlers with preview
  const onValidIdSelected = (event) => {
    const file = event.target.files?.[0] || null;
    validIdFile.value = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        validIdPreview.value = e.target?.result || '';
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        validIdPreview.value = '';
      }
    } else {
      validIdPreview.value = '';
    }
  };

  const onMedicalCertSelected = (event) => {
    const file = event.target.files?.[0] || null;
    medicalCertFile.value = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        medicalCertPreview.value = e.target?.result || '';
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        medicalCertPreview.value = '';
      }
    } else {
      medicalCertPreview.value = '';
    }
  };

  const onClearanceSelected = (event) => {
    const file = event.target.files?.[0] || null;
    clearanceFile.value = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        clearancePreview.value = e.target?.result || '';
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        clearancePreview.value = '';
      }
    } else {
      clearancePreview.value = '';
    }
  };

  // Preview modal functions
  const showPreview = (title, file, preview) => {
    previewModal.value = {
      show: true,
      title: title,
      file: file,
      preview: preview,
    };
    document.getElementById('document_preview_modal')?.showModal();
  };

  const closePreview = () => {
    previewModal.value = {
      show: false,
      title: '',
      file: null,
      preview: '',
    };
    document.getElementById('document_preview_modal')?.close();
  };

  // Hover preview functions
  const showHoverPreview = (event, title, file, preview) => {
    if (!file) return;

    // Clear any existing timeout
    if (hoverPreviewTimeout) {
      clearTimeout(hoverPreviewTimeout);
      hoverPreviewTimeout = null;
    }

    // Calculate position with viewport bounds checking
    const offset = 15;
    let x = event.clientX + offset;
    let y = event.clientY + offset;

    // Adjust if tooltip would go off screen
    const tooltipWidth = 300;
    const tooltipHeight = 250;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + tooltipWidth > viewportWidth) {
      x = event.clientX - tooltipWidth - offset;
    }
    if (y + tooltipHeight > viewportHeight) {
      y = event.clientY - tooltipHeight - offset;
    }

    // Ensure tooltip stays within viewport
    x = Math.max(offset, Math.min(x, viewportWidth - tooltipWidth - offset));
    y = Math.max(offset, Math.min(y, viewportHeight - tooltipHeight - offset));

    hoverPreview.value = {
      show: true,
      title: title,
      file: file,
      preview: preview,
      x: x,
      y: y,
    };
  };

  const hideHoverPreview = () => {
    // Add a small delay to prevent flickering when moving between button and tooltip
    hoverPreviewTimeout = setTimeout(() => {
      hoverPreview.value = {
        show: false,
        title: '',
        file: null,
        preview: '',
        x: 0,
        y: 0,
      };
      hoverPreviewTimeout = null;
    }, 100);
  };

  // Helper function to create object URL for PDFs
  const createFileUrl = (file) => {
    if (!file) return '#';
    try {
      return window.URL.createObjectURL(file);
    } catch (error) {
      console.error('Error creating object URL:', error);
      return '#';
    }
  };

  // Get PDF preview URL
  const getPdfPreviewUrl = computed(() => {
    if (
      previewModal.value.file &&
      previewModal.value.file.type === 'application/pdf'
    ) {
      return createFileUrl(previewModal.value.file);
    }
    return '';
  });

  // Submit form
  const handleSubmit = async () => {
    if (!isFormValid.value) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      saving.value = true;

      // Submit via onboarding endpoint (photo can be added later if needed)
      const response = await fetch(`${apiConfig.baseURL}/onboarding/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...employeeForm.value,
          token: onboardingToken.value,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        // Show detailed error message
        const errorMsg =
          data.error || data.message || 'Failed to submit onboarding form';
        console.error('Submission error:', data);
        throw new Error(errorMsg);
      }

      // If photo was provided, upload it separately after employee creation
      // Note: Photo upload endpoint may not exist, so this is optional
      if (photoFile.value && data.data?.id) {
        try {
          const formData = new FormData();
          formData.append('photo', photoFile.value);

          const photoResponse = await fetch(
            `${apiConfig.baseURL}/employees/${data.data.id}/photo`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!photoResponse.ok) {
            console.warn(
              'Photo upload endpoint not available or failed:',
              photoResponse.status
            );
          }
        } catch (photoError) {
          console.warn(
            'Photo upload failed, but employee was created:',
            photoError
          );
          // Don't fail the entire process if photo upload fails
        }
      }

      // Upload required documents if provided
      if (data.data?.id) {
        const documentsToUpload = [
          { file: validIdFile.value, name: 'valid_id', label: 'Valid ID' },
          {
            file: medicalCertFile.value,
            name: 'medical_cert',
            label: 'Medical Certificate',
          },
          { file: clearanceFile.value, name: 'clearance', label: 'Clearance' },
        ];

        let uploadedCount = 0;
        const uploadErrors = [];

        for (const doc of documentsToUpload) {
          if (doc.file) {
            try {
              console.log(`Uploading ${doc.label}...`);
              const formData = new FormData();
              formData.append('document', doc.file);
              formData.append('document_type', doc.name);

              const uploadResponse = await fetch(
                `${apiConfig.baseURL}/employees/${data.data.id}/documents`,
                {
                  method: 'POST',
                  body: formData,
                }
              );

              console.log(
                `${doc.label} upload response status:`,
                uploadResponse.status
              );

              if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                let errorData;
                try {
                  errorData = JSON.parse(errorText);
                } catch {
                  errorData = { message: errorText || 'Upload failed' };
                }
                console.error(`${doc.label} upload failed:`, errorData);
                uploadErrors.push(
                  `${doc.label}: ${errorData.message || 'Upload failed'}`
                );
              } else {
                const uploadResult = await uploadResponse.json();
                console.log(
                  `${doc.label} uploaded successfully:`,
                  uploadResult
                );
                uploadedCount++;
              }
            } catch (docError) {
              console.error(`${doc.label} upload error:`, docError);
              uploadErrors.push(
                `${doc.label}: ${docError.message || 'Network error'}`
              );
            }
          } else {
            console.warn(`${doc.label} file not provided`);
          }
        }

        if (uploadErrors.length > 0) {
          console.warn('Some documents failed to upload:', uploadErrors);
          // Still show success, but log the errors
        }

        console.log(
          `Document upload complete: ${uploadedCount}/${documentsToUpload.length} uploaded`
        );
      } else {
        console.error(
          'Employee ID not returned from server, cannot upload documents'
        );
      }

      // Show completion notice modal instead of immediate redirect
      showCompletionNotice.value = true;
    } catch (error) {
      console.error('Error submitting onboarding form:', error);
      alert(error.message || 'Failed to submit form. Please try again.');
    } finally {
      saving.value = false;
    }
  };

  // Get department and role names for display
  const departmentName = computed(() => {
    return onboardingData.value?.department || '';
  });

  const roleName = computed(() => {
    return onboardingData.value?.role_name || '';
  });

  const branchName = computed(() => {
    return onboardingData.value?.branch_name || 'Main Branch';
  });

  const containerStyle = computed(() => ({
    background: `linear-gradient(135deg, #4a6b3a 0%, #3a5530 100%)`,
  }));

  // Initialize on mount
  onMounted(async () => {
    await verifyToken();
  });
</script>

<template>
  <div
    class="min-h-screen py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-4 onboarding-container"
    :style="containerStyle"
  >
    <div class="max-w-5xl mx-auto">
      <!-- Header with Logo -->
      <div class="text-center mb-6 sm:mb-8">
        <div class="flex justify-center mb-4 sm:mb-5">
          <div class="relative">
            <!-- Circular logo background -->
            <div
              class="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center shadow-2xl ring-4 ring-white/20"
            >
              <div
                class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-primaryColor flex items-center justify-center bg-white"
              >
                <img
                  :src="Logo"
                  alt="Countryside Steak House"
                  class="h-16 w-16 sm:h-20 sm:w-20 md:h-20 md:w-20 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
        <h1
          class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg"
        >
          Employee Onboarding
        </h1>
        <p class="text-base sm:text-lg text-green-100 font-medium mb-1">
          Welcome to Countryside Steak House
        </p>
        <p class="text-xs sm:text-sm text-green-50/80">
          Complete the required information to get hired.
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="bg-white rounded-2xl shadow-xl border border-gray-100"
      >
        <div class="text-center py-16 px-6">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
          <p class="mt-6 text-gray-700 font-medium text-lg">
            Verifying your onboarding link...
          </p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="errorMessage"
        class="bg-white rounded-2xl shadow-xl border border-red-200"
      >
        <div class="p-6">
          <div class="alert alert-error shadow-lg rounded-xl">
            <AlertTriangle class="w-6 h-6" />
            <span class="font-medium">{{ errorMessage }}</span>
          </div>
        </div>
      </div>

      <!-- Onboarding Form -->
      <div v-else class="space-y-4 sm:space-y-5">
        <!-- Progress Indicator -->
        <div
          class="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-gray-700"
              >Form Completion</span
            >
            <span class="text-base font-bold text-primaryColor"
              >{{ completionPercentage }}%</span
            >
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              class="bg-gradient-to-r from-primaryColor to-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              :style="{ width: completionPercentage + '%' }"
            ></div>
          </div>
        </div>

        <!-- Wizard Progress -->
        <div
          class="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6"
        >
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0"
          >
            <h3 class="text-lg font-bold text-gray-800">
              Step {{ currentStep + 1 }} of {{ steps.length }}
            </h3>
            <span
              class="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full"
            >
              {{ Math.round(((currentStep + 1) / steps.length) * 100) }}%
              Complete
            </span>
          </div>

          <!-- Progress Bar -->
          <div
            class="w-full bg-gray-200 rounded-full h-2.5 mb-6 sm:mb-8 overflow-hidden"
          >
            <div
              class="bg-gradient-to-r from-primaryColor to-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              :style="{ width: ((currentStep + 1) / steps.length) * 100 + '%' }"
            ></div>
          </div>

          <!-- Step Indicators -->
          <div class="flex justify-between items-start gap-2 sm:gap-4">
            <div
              v-for="(step, index) in steps"
              :key="step.id"
              class="flex flex-col items-center flex-1 cursor-pointer group"
              @click="goToStep(index)"
            >
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-all duration-300 shadow-md"
                :class="{
                  'bg-gradient-to-br from-primaryColor to-green-600 text-white shadow-lg shadow-primaryColor/30 scale-105':
                    index <= currentStep,
                  'bg-gray-200 text-gray-400 group-hover:bg-gray-300':
                    index > currentStep,
                  'ring-4 ring-primaryColor/30 ring-offset-2 ring-offset-white scale-110':
                    index === currentStep,
                }"
              >
                <font-awesome-icon
                  v-if="typeof step.icon === 'string'"
                  :icon="
                    step.icon === 'font-awesome-peso'
                      ? 'fa-solid fa-peso-sign'
                      : 'fa-solid'
                  "
                  class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
                />
                <component
                  v-else
                  :is="step.icon"
                  class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
                />
              </div>
              <div class="text-center w-full">
                <div
                  class="text-xs font-semibold mb-1"
                  :class="{
                    'text-primaryColor': index <= currentStep,
                    'text-gray-500': index > currentStep,
                  }"
                >
                  {{ step.title }}
                </div>
                <div
                  class="text-[10px] leading-tight"
                  :class="{
                    'text-gray-600': index <= currentStep,
                    'text-gray-400': index > currentStep,
                  }"
                >
                  {{ step.description }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <div
          class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div class="p-4 sm:p-6 md:p-8">
            <!-- Photo Upload -->
            <div class="mb-6 sm:mb-8 pb-6 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-800 mb-4">Photo</h2>
              <div
                class="flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <div class="avatar">
                  <div
                    class="w-20 h-20 rounded-full ring-2 ring-primaryColor ring-offset-2 ring-offset-white overflow-hidden bg-gray-100 shadow-md"
                  >
                    <img
                      v-if="photoPreview"
                      :src="photoPreview"
                      alt="Preview"
                      class="w-full h-full object-cover"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium"
                    >
                      No photo
                    </div>
                  </div>
                </div>
                <div class="flex-1 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    class="file-input file-input-bordered file-input-sm w-full sm:max-w-xs"
                    @change="onPhotoSelected"
                  />
                  <p v-if="!photoFile" class="text-xs text-gray-500 mt-2">
                    No file selected
                  </p>
                </div>
              </div>
            </div>

            <!-- Current Step Header -->
            <div class="mb-6">
              <h2
                class="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2"
              >
                <font-awesome-icon
                  v-if="typeof currentStepData.icon === 'string'"
                  :icon="
                    currentStepData.icon === 'font-awesome-peso'
                      ? 'fa-solid fa-peso-sign'
                      : 'fa-solid'
                  "
                  class="w-6 h-6 text-primaryColor"
                />
                <component
                  v-else
                  :is="currentStepData.icon"
                  class="w-6 h-6 text-primaryColor"
                />
                {{ currentStepData.title }}
              </h2>
              <p class="text-sm text-gray-600 mt-1">
                {{ currentStepData.description }}
              </p>
            </div>

            <!-- Step 1: Basic Information -->
            <div v-if="currentStep === 0" class="space-y-4 sm:space-y-6">
              <!-- Pre-filled Information Alert -->

              <!-- Personal Information -->
              <div
                class="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-2xl shadow-inner border border-gray-200"
              >
                <!-- First Name -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >First Name <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.first_name"
                    type="text"
                    placeholder="Enter first name"
                    class="input input-bordered w-full focus:input-primary focus:ring-2 focus:ring-primaryColor/50 transition-all"
                  />
                </div>

                <!-- Middle Name -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Middle Name</span>
                  </label>
                  <input
                    v-model="employeeForm.middle_name"
                    type="text"
                    placeholder="Enter middle name (optional)"
                    class="input input-bordered w-full focus:input-primary focus:ring-2 focus:ring-primaryColor/50 transition-all"
                  />
                </div>

                <!-- Last Name -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Last Name <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.last_name"
                    type="text"
                    placeholder="Enter last name"
                    class="input input-bordered w-full focus:input-primary focus:ring-2 focus:ring-primaryColor/50 transition-all"
                  />
                </div>
              </div>

              <!-- Contact Information -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 sm:mt-6">
                <!-- Email -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Email Address</span>
                  </label>
                  <input
                    v-model="employeeForm.email"
                    type="email"
                    placeholder="Enter email address"
                    class="input input-bordered w-full"
                    disabled
                  />
                  <label class="label">
                    <span class="label-text-alt text-gray-500"
                      >Email is pre-filled from your application</span
                    >
                  </label>
                </div>

                <!-- Phone Number -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Phone Number <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.phone_number"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    maxlength="11"
                    class="input input-bordered w-full focus:input-primary focus:ring-2 focus:ring-primaryColor/50 transition-all"
                    @input="
                      handlePHPhoneInput($event.target.value, 'phone_number')
                    "
                  />
                </div>
              </div>

              <!-- Address -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text"
                    >Address <span class="text-red-500">*</span></span
                  >
                </label>
                <textarea
                  v-model="employeeForm.address"
                  placeholder="Enter complete address"
                  class="textarea textarea-bordered h-24 focus:input-primary focus:ring-2 focus:ring-primaryColor/50 transition-all"
                ></textarea>
              </div>

              <!-- Postal Code and Civil Status -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Postal Code -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Postal Code <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.postal_code"
                    type="text"
                    placeholder="Enter postal code"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- Civil Status -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Civil Status <span class="text-red-500">*</span></span
                    >
                  </label>
                  <select
                    v-model="employeeForm.civil_status"
                    class="select select-bordered w-full"
                  >
                    <option value="">Select civil status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                  </select>
                </div>
              </div>

              <!-- Sex, Birthday, Age -->
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Sex -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Sex <span class="text-red-500">*</span></span
                    >
                  </label>
                  <select
                    v-model="employeeForm.sex"
                    class="select select-bordered w-full"
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <!-- Birthday -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Birthday <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.birthday"
                    type="date"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- Age -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Age <span class="text-red-500">*</span>
                      <span class="text-gray-500 text-xs"
                        >(Auto-calculated)</span
                      ></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.age"
                    type="text"
                    placeholder="Auto-calculated"
                    class="input input-bordered w-full"
                    disabled
                  />
                </div>
              </div>

              <!-- Citizenship -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text"
                    >Citizenship <span class="text-red-500">*</span></span
                  >
                </label>
                <input
                  v-model="employeeForm.citizenship"
                  type="text"
                  placeholder="Enter citizenship"
                  class="input input-bordered w-full"
                />
              </div>

              <!-- Locked Fields Display -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Department (Locked) -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Department <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    :value="departmentName"
                    type="text"
                    class="input input-bordered w-full bg-gray-100"
                    disabled
                  />
                </div>

                <!-- Role (Locked) -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Role <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    :value="roleName"
                    type="text"
                    class="input input-bordered w-full bg-gray-100"
                    disabled
                  />
                </div>
              </div>

              <!-- Branch and Employee Type (Locked) -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Branch (Locked) -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Branch <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    :value="branchName"
                    type="text"
                    class="input input-bordered w-full bg-gray-100"
                    disabled
                  />
                </div>

                <!-- Employee Type (Locked) -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Employee Type <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    :value="employeeForm.employee_type"
                    type="text"
                    class="input input-bordered w-full bg-gray-100"
                    disabled
                  />
                </div>
              </div>

              <!-- Required Documents Section -->
              <div class="mt-6 space-y-4">
                <h3 class="font-bold text-lg mb-3 text-gray-800">
                  Required Documents
                </h3>
                <p class="text-sm text-gray-600 mb-4">
                  Please attach the following required documents. All documents
                  must be clear and readable.
                </p>

                <!-- Valid ID -->
                <div class="mb-4">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Valid ID <span class="text-red-500">*</span>
                  </label>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      capture="environment"
                      class="file-input file-input-bordered flex-1"
                      @change="onValidIdSelected"
                    />
                    <button
                      v-if="validIdFile"
                      type="button"
                      @click="
                        showPreview('Valid ID', validIdFile, validIdPreview)
                      "
                      @mouseenter="
                        showHoverPreview(
                          $event,
                          'Valid ID',
                          validIdFile,
                          validIdPreview
                        )
                      "
                      @mouseleave="hideHoverPreview"
                      class="btn btn-sm btn-outline btn-primary relative w-full sm:w-auto"
                    >
                      <Info class="w-4 h-4 mr-1" />
                      Preview
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, JPG, PNG (Max 5MB) | Use camera or
                    browse
                  </p>
                  <p
                    v-if="validIdFile"
                    class="text-xs text-green-600 mt-1 font-medium cursor-pointer hover:underline"
                    @mouseenter="
                      showHoverPreview(
                        $event,
                        'Valid ID',
                        validIdFile,
                        validIdPreview
                      )
                    "
                    @mouseleave="hideHoverPreview"
                  >
                    ✓ Selected: {{ validIdFile.name }} ({{
                      (validIdFile.size / 1024 / 1024).toFixed(2)
                    }}
                    MB)
                  </p>
                </div>

                <!-- Medical Certificate -->
                <div class="mb-4">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Medical Certificate or Pre-employment Medical Exam
                    <span class="text-red-500">*</span>
                  </label>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      capture="environment"
                      class="file-input file-input-bordered flex-1"
                      @change="onMedicalCertSelected"
                    />
                    <button
                      v-if="medicalCertFile"
                      type="button"
                      @click="
                        showPreview(
                          'Medical Certificate',
                          medicalCertFile,
                          medicalCertPreview
                        )
                      "
                      @mouseenter="
                        showHoverPreview(
                          $event,
                          'Medical Certificate',
                          medicalCertFile,
                          medicalCertPreview
                        )
                      "
                      @mouseleave="hideHoverPreview"
                      class="btn btn-sm btn-outline btn-primary relative w-full sm:w-auto"
                    >
                      <Info class="w-4 h-4 mr-1" />
                      Preview
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, JPG, PNG (Max 5MB) | Use camera or
                    browse
                  </p>
                  <p
                    v-if="medicalCertFile"
                    class="text-xs text-green-600 mt-1 font-medium cursor-pointer hover:underline"
                    @mouseenter="
                      showHoverPreview(
                        $event,
                        'Medical Certificate',
                        medicalCertFile,
                        medicalCertPreview
                      )
                    "
                    @mouseleave="hideHoverPreview"
                  >
                    ✓ Selected: {{ medicalCertFile.name }} ({{
                      (medicalCertFile.size / 1024 / 1024).toFixed(2)
                    }}
                    MB)
                  </p>
                </div>

                <!-- Clearance -->
                <div class="mb-4">
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Barangay Clearance, Police Clearance or NBI Clearance
                    <span class="text-red-500">*</span>
                  </label>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      capture="environment"
                      class="file-input file-input-bordered flex-1"
                      @change="onClearanceSelected"
                    />
                    <button
                      v-if="clearanceFile"
                      type="button"
                      @click="
                        showPreview(
                          'Clearance',
                          clearanceFile,
                          clearancePreview
                        )
                      "
                      @mouseenter="
                        showHoverPreview(
                          $event,
                          'Clearance',
                          clearanceFile,
                          clearancePreview
                        )
                      "
                      @mouseleave="hideHoverPreview"
                      class="btn btn-sm btn-outline btn-primary relative w-full sm:w-auto"
                    >
                      <Info class="w-4 h-4 mr-1" />
                      Preview
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, JPG, PNG (Max 5MB) | Use camera or
                    browse
                  </p>
                  <p
                    v-if="clearanceFile"
                    class="text-xs text-green-600 mt-1 font-medium cursor-pointer hover:underline"
                    @mouseenter="
                      showHoverPreview(
                        $event,
                        'Clearance',
                        clearanceFile,
                        clearancePreview
                      )
                    "
                    @mouseleave="hideHoverPreview"
                  >
                    ✓ Selected: {{ clearanceFile.name }} ({{
                      (clearanceFile.size / 1024 / 1024).toFixed(2)
                    }}
                    MB)
                  </p>
                </div>

                <div
                  class="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-4"
                >
                  <p class="text-xs text-gray-700">
                    <strong>Note:</strong> All documents will be securely stored
                    and used for employment verification purposes only.
                  </p>
                </div>
              </div>
            </div>

            <!-- Step 2: Salary Information -->
            <div v-if="currentStep === 1" class="space-y-6">
              <!-- Base Salary Information -->
              <div
                class="bg-gradient-to-br from-primaryColor/10 to-green-50 p-6 rounded-2xl shadow-lg border-2 border-primaryColor/30"
              >
                <h3
                  class="font-bold text-xl mb-6 text-gray-800 flex items-center"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-peso-sign"
                    class="w-6 h-6 mr-2 text-primaryColor"
                  />
                  Base Salary Information
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    class="bg-white p-4 rounded-xl shadow-md border border-primaryColor/20"
                  >
                    <label class="text-sm font-medium text-gray-600 mb-2 block"
                      >Hourly Rate</label
                    >
                    <div class="text-3xl font-bold text-primaryColor">
                      {{ baseSalary?.formatted?.hourly || '₱0.00' }}
                    </div>
                  </div>
                  <div
                    class="bg-white p-4 rounded-xl shadow-md border border-primaryColor/20"
                  >
                    <label class="text-sm font-medium text-gray-600 mb-2 block"
                      >Daily Rate</label
                    >
                    <div class="text-3xl font-bold text-primaryColor">
                      {{ baseSalary?.formatted?.daily || '₱0.00' }}
                    </div>
                    <p class="text-xs text-gray-600 mt-2 font-medium">
                      {{
                        employeeForm.employee_type === 'Full-time' ? '8' : '4'
                      }}
                      hours per day
                    </p>
                  </div>
                  <div
                    class="bg-white p-4 rounded-xl shadow-md border border-primaryColor/20"
                  >
                    <label class="text-sm font-medium text-gray-600 mb-2 block"
                      >Monthly Rate</label
                    >
                    <div class="text-3xl font-bold text-primaryColor">
                      {{ baseSalary?.formatted?.monthly || '₱0.00' }}
                    </div>
                    <p class="text-xs text-gray-600 mt-2 font-medium">
                      26 working days
                    </p>
                  </div>
                </div>
                <div
                  v-if="!employeeForm.role_id || !employeeForm.employee_type"
                  class="alert alert-warning mt-4"
                >
                  <Info class="w-5 h-5" />
                  <span
                    >Please select a role and employee type to calculate base
                    salary.</span
                  >
                </div>
              </div>

              <!-- Government Benefit Numbers -->
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                <!-- PAG-IBIG -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >PAG-IBIG Number <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.pagibig_number"
                    type="text"
                    placeholder="Enter PAG-IBIG number"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- SSS -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >SSS Number <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.sss_number"
                    type="text"
                    placeholder="Enter SSS number"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- PhilHealth -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >PhilHealth Number
                      <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.philhealth_number"
                    type="text"
                    placeholder="Enter PhilHealth number"
                    class="input input-bordered w-full"
                  />
                </div>
              </div>

              <!-- Info Alert -->
              <div
                class="alert alert-success shadow-lg border-2 border-green-200"
              >
                <CheckCircle class="w-6 h-6" />
                <span class="font-medium"
                  >Please ensure all government benefit numbers are accurate and
                  valid. These will be used for payroll and benefit
                  processing.</span
                >
              </div>
            </div>

            <!-- Step 3: Emergency Contact -->
            <div v-if="currentStep === 2" class="space-y-6">
              <div
                class="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4"
              >
                <p class="text-sm text-gray-700">
                  <Info class="w-4 h-4 inline mr-2 text-blue-600" />
                  Please provide accurate emergency contact information. This
                  will be used in case of emergencies.
                </p>
              </div>

              <!-- Emergency Contact Name and Relationship -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Emergency Contact Name -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Emergency Contact Name
                      <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.emergency_contact_name"
                    type="text"
                    placeholder="Enter emergency contact name"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- Relationship -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Relationship <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.emergency_relationship"
                    type="text"
                    placeholder="e.g., Spouse, Parent, Sibling"
                    class="input input-bordered w-full"
                  />
                </div>
              </div>

              <!-- Emergency Contact Number and Alternate -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Emergency Contact Number -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Emergency Contact Number
                      <span class="text-red-500">*</span></span
                    >
                  </label>
                  <input
                    v-model="employeeForm.emergency_contact_number"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    maxlength="11"
                    class="input input-bordered w-full"
                    @input="
                      handlePHPhoneInput(
                        $event.target.value,
                        'emergency_contact_number'
                      )
                    "
                  />
                </div>

                <!-- Alternate Contact Number -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Alternate Contact Number</span>
                  </label>
                  <input
                    v-model="employeeForm.alternate_contact_number"
                    type="tel"
                    placeholder="09XXXXXXXXX (optional)"
                    maxlength="11"
                    class="input input-bordered w-full"
                    @input="
                      handlePHPhoneInput(
                        $event.target.value,
                        'alternate_contact_number'
                      )
                    "
                  />
                </div>
              </div>

              <!-- Emergency Contact Address and Email -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Emergency Contact Address -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text"
                      >Emergency Contact Address
                      <span class="text-red-500">*</span></span
                    >
                  </label>
                  <textarea
                    v-model="employeeForm.emergency_contact_address"
                    placeholder="Enter emergency contact address"
                    class="textarea textarea-bordered h-24"
                  ></textarea>
                </div>

                <!-- Emergency Contact Email -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Emergency Contact Email</span>
                  </label>
                  <input
                    v-model="employeeForm.emergency_contact_email"
                    type="email"
                    placeholder="Enter emergency contact email (optional)"
                    class="input input-bordered w-full"
                  />
                </div>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div
              class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-8 sm:mt-10 pt-6 border-t border-gray-200 gap-4"
            >
              <div
                class="text-xs font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-full text-center sm:text-left"
              >
                Form Completion:
                <span class="text-primaryColor font-bold"
                  >{{ completionPercentage }}%</span
                >
              </div>
              <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  v-if="currentStep > 0"
                  @click="prevStep"
                  class="btn btn-outline hover:bg-gray-50 font-medium border-gray-300 text-gray-700 w-full sm:w-auto"
                >
                  <ChevronLeft class="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  v-if="currentStep < steps.length - 1"
                  @click="nextStep"
                  class="btn bg-primaryColor hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0 w-full sm:w-auto"
                  :disabled="!isFormValid"
                >
                  Next
                  <ChevronRight class="w-4 h-4 ml-1" />
                </button>
                <button
                  v-else
                  @click="handleSubmit"
                  class="btn bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0 w-full sm:w-auto"
                  :disabled="!isFormValid || saving"
                >
                  <CheckCircle class="w-5 h-5 mr-2" />
                  {{ saving ? 'Submitting...' : 'Complete Onboarding' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Preview Modal -->
    <dialog id="document_preview_modal" class="modal">
      <div class="modal-box max-w-4xl w-full">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg text-primaryColor">
            Preview: {{ previewModal.title }}
          </h3>
          <button @click="closePreview" class="btn btn-sm btn-circle btn-ghost">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="mb-4">
          <p class="text-sm text-gray-600">
            <strong>File Name:</strong> {{ previewModal.file?.name }}<br />
            <strong>File Size:</strong>
            {{
              previewModal.file
                ? (previewModal.file.size / 1024 / 1024).toFixed(2)
                : '0'
            }}
            MB<br />
            <strong>File Type:</strong> {{ previewModal.file?.type || 'N/A' }}
          </p>
        </div>

        <!-- Preview Content -->
        <div class="w-full max-h-[70vh] overflow-auto">
          <div
            v-if="
              previewModal.preview &&
              previewModal.file?.type?.startsWith('image/')
            "
            class="flex justify-center"
          >
            <img
              :src="previewModal.preview"
              :alt="previewModal.title"
              class="max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
          <div
            v-else-if="previewModal.file?.type === 'application/pdf'"
            class="w-full"
          >
            <!-- PDF Preview with iframe -->
            <div class="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
              <div class="flex justify-between items-center mb-2">
                <p class="text-sm font-semibold text-gray-700">
                  {{ previewModal.file?.name }}
                </p>
                <a
                  v-if="previewModal.file && getPdfPreviewUrl"
                  :href="getPdfPreviewUrl"
                  target="_blank"
                  class="btn btn-xs btn-outline btn-primary"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
            <div
              class="w-full bg-gray-100 rounded-lg overflow-hidden"
              style="height: 600px"
            >
              <iframe
                v-if="getPdfPreviewUrl"
                :src="getPdfPreviewUrl"
                class="w-full h-full border-0"
                frameborder="0"
                type="application/pdf"
              >
                <div class="p-8 text-center">
                  <FileText class="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p class="text-gray-600 font-medium mb-2">PDF Preview</p>
                  <p class="text-sm text-gray-500 mb-4">
                    Your browser doesn't support PDF preview.
                  </p>
                  <a
                    :href="getPdfPreviewUrl"
                    target="_blank"
                    class="btn btn-sm btn-primary"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              </iframe>
              <div v-else class="p-8 text-center">
                <FileText class="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p class="text-gray-600 font-medium">PDF Document</p>
                <p class="text-sm text-gray-500 mt-2">
                  {{ previewModal.file?.name }}
                </p>
                <p class="text-xs text-gray-400 mt-4">
                  PDF preview is loading...
                </p>
              </div>
            </div>
          </div>
          <div v-else class="bg-gray-100 p-8 rounded-lg text-center">
            <div class="mb-4">
              <FileText class="w-16 h-16 mx-auto text-gray-400" />
            </div>
            <p class="text-gray-600 font-medium">File Preview Not Available</p>
            <p class="text-sm text-gray-500 mt-2">
              {{ previewModal.file?.name }}
            </p>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closePreview" class="btn btn-primary">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePreview">close</button>
      </form>
    </dialog>

    <!-- Completion Notice Modal -->
    <dialog
      id="completion_notice_modal"
      class="modal"
      :open="showCompletionNotice"
    >
      <div class="modal-box max-w-xl w-full text-center">
        <div
          class="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
        >
          <CheckCircle class="w-10 h-10 text-green-600" />
        </div>
        <h3 class="text-2xl font-bold text-primaryColor mb-2">
          Onboarding Submitted
        </h3>
        <p class="text-gray-700 leading-relaxed">
          This form will be reviewed by HR. Please wait for approval. If you
          have concerns, please email
          <a
            href="mailto:hr@countryside-steakhouse.site"
            class="text-primaryColor underline"
            >hr@countryside-steakhouse.site</a
          >.
        </p>
        <div class="modal-action justify-center mt-6">
          <button class="btn btn-primary" @click="closeCompletionNotice">
            OK
          </button>
        </div>
      </div>
    </dialog>

    <!-- Hover Preview Tooltip -->
    <Transition name="fade">
      <div
        v-if="hoverPreview.show && hoverPreview.file"
        class="fixed z-[9999] bg-white rounded-lg shadow-2xl border-2 border-green-500/30 overflow-hidden transition-all duration-200"
        :style="{
          left: hoverPreview.x + 'px',
          top: hoverPreview.y + 'px',
          maxWidth: '300px',
          minWidth: '250px',
          pointerEvents: 'auto',
          transform: 'translateZ(0)',
        }"
        @mouseenter="
          () => {
            if (hoverPreviewTimeout) clearTimeout(hoverPreviewTimeout);
            hoverPreviewTimeout = null;
          }
        "
        @mouseleave="hideHoverPreview"
      >
        <!-- Preview Image -->
        <div
          v-if="
            hoverPreview.preview &&
            hoverPreview.file?.type?.startsWith('image/')
          "
          class="w-full"
        >
          <img
            :src="hoverPreview.preview"
            :alt="hoverPreview.title"
            class="w-full h-auto max-h-[200px] object-contain"
          />
        </div>
        <!-- PDF Preview -->
        <div
          v-else-if="hoverPreview.file?.type === 'application/pdf'"
          class="p-4 bg-gray-50"
        >
          <div class="flex items-center justify-center mb-2">
            <FileText class="w-12 h-12 text-gray-400" />
          </div>
          <p class="text-xs font-semibold text-gray-700 text-center">
            PDF Document
          </p>
        </div>
        <!-- Other File Types -->
        <div v-else class="p-4 bg-gray-50">
          <div class="flex items-center justify-center mb-2">
            <FileText class="w-12 h-12 text-gray-400" />
          </div>
          <p class="text-xs font-semibold text-gray-700 text-center">
            {{ hoverPreview.file?.name }}
          </p>
        </div>

        <!-- File Info -->
        <div class="p-3 bg-white border-t border-gray-200">
          <p class="text-xs font-semibold text-gray-800 mb-1">
            {{ hoverPreview.title }}
          </p>
          <p class="text-xs text-gray-600 truncate">
            {{ hoverPreview.file?.name }}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {{
              hoverPreview.file
                ? (hoverPreview.file.size / 1024).toFixed(1)
                : '0'
            }}
            KB
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .text-primaryColor {
    color: #16a34a;
  }

  /* Fade transition for hover preview */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
  .bg-primaryColor {
    background-color: #16a34a;
  }
  .btn-primary {
    background-color: #16a34a;
    border-color: #16a34a;
  }
  .btn-primary:hover {
    background-color: #15803d;
    border-color: #15803d;
  }

  /* Background with gradient */
  .onboarding-container {
    position: relative;
    overflow-x: hidden;
  }

  .onboarding-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('../../assets/crm/Logo.png');
    background-size: 600px 600px;
    background-position: center center;
    background-repeat: no-repeat;
    opacity: 0.05;
    z-index: 0;
    pointer-events: none;
  }

  .onboarding-container > div {
    position: relative;
    z-index: 1;
  }

  /* Card hover effects */
  .onboarding-container .bg-white:hover {
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  /* Input focus styles - enhanced for all inputs */
  .onboarding-container .input:focus,
  .onboarding-container .select:focus,
  .onboarding-container .textarea:focus {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
    outline: none;
  }

  .onboarding-container .input:not(:disabled):hover,
  .onboarding-container .select:not(:disabled):hover,
  .onboarding-container .textarea:not(:disabled):hover {
    border-color: #16a34a;
  }

  /* Enhanced labels */
  .onboarding-container .label-text {
    font-weight: 500;
    color: #374151;
  }

  /* Photo upload section enhancement */
  .onboarding-container .avatar {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  /* Smooth transitions */
  * {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
</style>
