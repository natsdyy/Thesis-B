<script setup>
  import { ref } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { useAttendanceStore } from '../stores/attendanceStore';
  import { useRouter } from 'vue-router';
  import {
    Eye,
    EyeOff,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
  } from 'lucide-vue-next';
  import { nextTick } from 'vue';
  import { QrcodeStream } from 'vue-qrcode-reader';
  import { computed } from 'vue';

  // Attendance scanner state
  const isScannerOpen = ref(false);
  const scanResult = ref('');
  const scanError = ref('');
  const isScanning = ref(false);
  const torchSupported = ref(false);
  const torchOn = ref(false);
  const availableCameras = ref([]);
  const selectedDeviceId = ref('');

  // Real-time details
  const nowTime = ref(new Date());
  const sessionStart = ref(null);
  const elapsedSeconds = ref(0);
  let clockIntervalId = null;

  const scanCount = ref(0);
  const lastScanAt = ref(null);
  const isCopying = ref(false);
  const copyMessage = ref('');

  // Attendance processing state
  const attendanceStore = useAttendanceStore();
  const isProcessingAttendance = ref(false);
  const attendanceResult = ref(null);
  const showAttendanceResult = ref(false);

  const currentCameraLabel = computed(() => {
    const found = availableCameras.value.find(
      (c) => c.id === selectedDeviceId.value
    );
    return found?.label || 'Default camera';
  });

  const formattedDate = computed(() =>
    nowTime.value.toLocaleDateString('en-PH', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    })
  );

  const startClock = () => {
    stopClock();
    sessionStart.value = new Date();
    nowTime.value = new Date();
    elapsedSeconds.value = 0;
    clockIntervalId = setInterval(() => {
      nowTime.value = new Date();
      if (sessionStart.value) {
        elapsedSeconds.value = Math.floor(
          (Date.now() - sessionStart.value.getTime()) / 1000
        );
      }
    }, 1000);
  };

  const stopClock = () => {
    if (clockIntervalId) {
      clearInterval(clockIntervalId);
      clockIntervalId = null;
    }
  };

  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // noop
    }
  };

  const openScanner = async () => {
    scanResult.value = '';
    scanError.value = '';
    torchOn.value = false;
    isScannerOpen.value = true;
    scanCount.value = 0;
    lastScanAt.value = null;
    startClock();
    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        availableCameras.value = videoInputs.map((d) => ({
          id: d.deviceId,
          label: d.label || 'Camera',
        }));
        if (!selectedDeviceId.value && videoInputs[0]?.deviceId) {
          selectedDeviceId.value = videoInputs[0].deviceId;
        }
      }
    } catch (err) {
      // Non-blocking; user can still try to scan
    }
    document.getElementById('attendance_scanner_modal')?.showModal();
  };

  const closeScanner = () => {
    isScannerOpen.value = false;
    isScanning.value = false;
    scanError.value = '';
    torchOn.value = false;
    stopClock();
    document.getElementById('attendance_scanner_modal')?.close();
  };

  const onDetect = (detectedCodes) => {
    // detectedCodes: Array of DetectedBarcode
    const value = detectedCodes?.[0]?.rawValue || '';
    if (value) {
      scanResult.value = value;
      isScanning.value = false;
      scanCount.value += 1;
      lastScanAt.value = new Date();
      playBeep();
    }
  };

  const onInit = async (promise) => {
    try {
      isScanning.value = true;
      scanError.value = '';
      await promise;
    } catch (error) {
      isScanning.value = false;
      // Map common camera errors to user-friendly text
      if (error?.name === 'NotAllowedError') {
        scanError.value =
          'Camera access was denied. Please allow camera permissions in your browser settings.';
      } else if (error?.name === 'NotFoundError') {
        scanError.value = 'No camera device found.';
      } else if (error?.name === 'NotReadableError') {
        scanError.value = 'Camera is already in use by another application.';
      } else if (error?.name === 'OverconstrainedError') {
        scanError.value =
          'The selected camera constraints are not supported by your device.';
      } else {
        scanError.value = error?.message || 'Unable to start camera.';
      }
    }
  };

  const onCameraOn = (cameraCapabilities) => {
    // cameraCapabilities: { torch?: boolean }
    torchSupported.value = !!cameraCapabilities?.torch;
  };

  const toggleTorch = () => {
    if (torchSupported.value) {
      torchOn.value = !torchOn.value;
    }
  };

  const copyScanResult = async () => {
    if (!scanResult.value) return;
    try {
      isCopying.value = true;
      await navigator.clipboard.writeText(scanResult.value);
      copyMessage.value = 'Copied';
      setTimeout(() => (copyMessage.value = ''), 1500);
    } catch (e) {
      copyMessage.value = 'Copy failed';
      setTimeout(() => (copyMessage.value = ''), 1500);
    } finally {
      isCopying.value = false;
    }
  };

  const processAttendance = async () => {
    if (!scanResult.value) return;

    try {
      isProcessingAttendance.value = true;
      attendanceResult.value = null;

      // Try to parse the QR code data
      let qrData;
      try {
        qrData = JSON.parse(scanResult.value);
      } catch (parseError) {
        // If it's not JSON, treat it as a simple QR code string
        qrData = {
          qr_code: scanResult.value,
          action: 'time-in', // Default action
          employee_id: 'MANUAL_SCAN', // This will need to be handled differently
          location: 'Manual Scan',
          timestamp: new Date().toISOString(),
          valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        };
      }

      // Use the public scan endpoint (no authentication required)
      let result;
      if (typeof qrData === 'object' && qrData.action && qrData.employee_id) {
        // This is a properly formatted mobile app QR code
        result = await attendanceStore.scanQRCode(qrData);
      } else {
        // Fallback for simple QR codes - try to process as time-in
        const fallbackQRData = {
          qr_code: scanResult.value,
          action: 'time-in',
          employee_id: 'MANUAL_SCAN',
          location: 'Manual Scan',
          timestamp: new Date().toISOString(),
          valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
        result = await attendanceStore.scanQRCode(fallbackQRData);
      }

      attendanceResult.value = {
        success: true,
        message: result.message,
        data: result.data,
      };

      // Close scanner and show result
      closeScanner();
      showAttendanceResult.value = true;

      // Auto-close result after 5 seconds
      setTimeout(() => {
        showAttendanceResult.value = false;
        attendanceResult.value = null;
      }, 5000);
    } catch (error) {
      console.error('Attendance processing error:', error);
      attendanceResult.value = {
        success: false,
        message: error.message || 'Failed to process attendance',
      };

      // Close scanner and show error
      closeScanner();
      showAttendanceResult.value = true;

      // Auto-close error after 5 seconds
      setTimeout(() => {
        showAttendanceResult.value = false;
        attendanceResult.value = null;
      }, 5000);
    } finally {
      isProcessingAttendance.value = false;
    }
  };

  const closeAttendanceResult = () => {
    showAttendanceResult.value = false;
    attendanceResult.value = null;
  };

  const authStore = useAuthStore();
  const router = useRouter();

  const email = ref('');
  const password = ref('');
  const showPassword = ref(false);
  const errorMessage = ref('');
  const isLoading = ref(false);

  const togglePasswordVisibility = () => {
    showPassword.value = !showPassword.value;
  };

  // Enhanced error message mapping
  const getErrorMessage = (error) => {
    if (error.response?.data?.code) {
      const code = error.response.data.code;
      const message = error.response.data.message;

      switch (code) {
        case 'MISSING_CREDENTIALS':
          return 'Please enter both email and password';
        case 'MISSING_EMAIL':
          return 'Please enter your email address';
        case 'MISSING_PASSWORD':
          return 'Please enter your password';
        case 'EMPTY_EMAIL':
          return 'Email address cannot be empty';
        case 'EMPTY_PASSWORD':
          return 'Password cannot be empty';
        case 'INVALID_EMAIL_FORMAT':
          return 'Please enter a valid email address';
        case 'INVALID_CREDENTIALS':
          return 'Invalid email or password. Please check your credentials and try again.';
        case 'ACCOUNT_DEACTIVATED':
          return 'Your account has been deactivated. Please contact your administrator.';
        case 'ACCOUNT_INACTIVE':
          return 'Your account is currently inactive. Please contact your administrator.';
        case 'NO_ROLE_ASSIGNED':
          return 'No role has been assigned to your account. Please contact your administrator.';
        case 'ROLE_DELETED':
          return 'Your assigned role has been removed. Please contact your administrator for role reassignment.';
        case 'ROLE_DEACTIVATED':
          return 'Your assigned role has been temporarily deactivated. Please contact your administrator.';
        case 'ROLE_VALIDATION_ERROR':
          return 'Unable to verify your role permissions. Please try again or contact your administrator.';
        case 'AUTHENTICATION_ERROR':
          return 'Authentication service is temporarily unavailable. Please try again.';
        case 'ACCESS_DENIED':
          return message || 'Access denied. Please contact your administrator.';
        case 'USER_NOT_FOUND':
          return 'User account not found. Please check your credentials.';
        case 'INTERNAL_SERVER_ERROR':
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return message || 'Login failed. Please try again.';
      }
    }

    // Fallback for other error types
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      return error.message;
    }

    return 'Login failed. Please try again.';
  };

  const goBackHome = () => {
    router.push('/');
  };

  const login = async () => {
    errorMessage.value = '';

    // Client-side validation
    if (!email.value?.trim()) {
      errorMessage.value = 'Please enter your email address';
      return;
    }

    if (!password.value) {
      errorMessage.value = 'Please enter your password';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
      errorMessage.value = 'Please enter a valid email address';
      return;
    }

    isLoading.value = true;
    await nextTick();

    try {
      await authStore.login({
        email: email.value.trim(),
        password: password.value,
      });

      // Redirect based on user role/department
      const userDepartment = authStore.userDepartment;
      const userRole = authStore.userRole;

      if (userRole === 'Super Admin' || userDepartment === 'Admin') {
        router.push('/admin');
      } else if (userDepartment === 'Human Resource') {
        router.push('/hr');
      } else if (userDepartment === 'Finance') {
        router.push('/finance');
      } else if (userDepartment === 'Supply Chain') {
        router.push('/scm');
      } else if (userDepartment === 'Production') {
        router.push('/production');
      } else if (userDepartment === 'Customer Relationship') {
        router.push('/crm');
      } else if (userDepartment === 'Branch') {
        // All Branch department users should go to branch dashboard
        // Super Admin can switch branches, others will be handled by BranchLayout
        router.push('/branch/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage.value = getErrorMessage(error);
    } finally {
      isLoading.value = false;
    }
  };
</script>

<template>
  <!-- Background with blur effect -->
  <div
    class="min-h-screen relative bg-accentColor flex items-center justify-center p-4 overflow-hidden bg-center"
  >
    <!-- Blurred background overlay -->
    <div class="absolute inset-0 blur-lg bg-secondaryColor/10">
      <img
        src="/logo1.png"
        alt=""
        class="w-full h-full object-cover lg:object-contain object-center"
      />
    </div>

    <!-- Back Button - positioned outside the card -->
    <button
      @click="goBackHome"
      class="absolute top-8 left-8 text-gray-600 hover:text-gray-800 transition-colors z-10 cursor-pointer flex items-center space-x-2 hover:bg-white/20 rounded-lg px-3 py-2"
    >
      <ArrowLeft class="w-5 h-5" />
      <span class="text-sm font-medium">Back to Home</span>
    </button>

    <button
      @click="openScanner"
      class="absolute top-8 right-8 text-gray-600 hover:text-gray-800 transition-colors z-10 cursor-pointer flex items-center space-x-2 hover:bg-white/20 rounded-lg px-3 py-2 hover:underline text-sm"
    >
      Scan for Attendance
    </button>

    <!-- Attendance Scanner Modal (DaisyUI dialog for consistency) -->
    <dialog id="attendance_scanner_modal" class="modal">
      <div
        class="modal-box bg-accentColor text-black/50 shadow-lg max-w-1xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-lg text-primaryColor">
            Attendance Scanner
          </h3>
          <button
            @click="closeScanner"
            class="btn btn-xs shadow-none font-thin hover:bg-black/10 border-none"
          >
            ✕
          </button>
        </div>

        <p class="text-sm mb-3">
          Position the QR code within the frame. The scan will happen
          automatically.
        </p>

        <!-- Real-time info bar -->
        <div
          class="flex flex-wrap items-center gap-2 text-xs mb-3 justify-between flex-col"
        >
          <div class="">
            <h1 class="text-lg font-bold text-primaryColor">
              {{ formattedDate }}
            </h1>
          </div>
          <div class="">
            <h1 class="text-lg font-bold text-primaryColor">
              {{ formatDuration(elapsedSeconds) }}
            </h1>
          </div>

          <div class="">
            <h1 class="text-sm font-bold text-primaryColor">
              Scans: {{ scanCount }}
            </h1>
          </div>
          <div v-if="lastScanAt" class="">
            <h1 class="text-sm font-bold text-primaryColor">
              Last scan: {{ lastScanAt.toLocaleTimeString() }}
            </h1>
          </div>
        </div>

        <!-- Camera selection -->
        <div v-if="availableCameras.length > 1" class="mb-2">
          <label class="label mb-1"
            ><span class="label-text text-sm">Camera:</span></label
          >
          <select
            v-model="selectedDeviceId"
            class="select select-sm select-bordered w-full"
          >
            <option
              v-for="cam in availableCameras"
              :key="cam.id"
              :value="cam.id"
            >
              {{ cam.label }}
            </option>
          </select>
        </div>

        <div v-if="scanError" class="alert alert-error text-sm mb-3">
          {{ scanError }}
        </div>

        <div class="card bg-white border border-black/10 mb-3">
          <div class="card-body p-2">
            <div class="relative rounded-lg overflow-hidden border">
              <QrcodeStream
                :constraints="
                  selectedDeviceId
                    ? { deviceId: { exact: selectedDeviceId } }
                    : { facingMode: 'environment' }
                "
                :torch="torchSupported ? torchOn : undefined"
                @init="onInit"
                @detect="onDetect"
                @camera-on="onCameraOn"
              />
            </div>
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-sm"
                  :class="torchOn ? 'btn-warning' : ''"
                  :disabled="!torchSupported"
                  @click="toggleTorch"
                >
                  {{
                    torchSupported
                      ? torchOn
                        ? 'Turn torch off'
                        : 'Turn torch on'
                      : 'Torch not supported'
                  }}
                </button>
                <span class="text-xs" v-if="isScanning">Camera active…</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="scanResult" class="card bg-white border border-black/10">
          <div class="card-body p-3">
            <div class="text-sm font-medium text-primaryColor mb-1">
              Last scanned code
            </div>
            <div class="text-sm break-all">{{ scanResult }}</div>
            <div class="mt-2 text-xs">
              Scanned at: {{ lastScanAt?.toLocaleString?.() }}
            </div>
            <div class="mt-3 flex gap-2">
              <button
                @click="processAttendance"
                :disabled="isProcessingAttendance"
                class="btn btn-primary btn-sm bg-primaryColor hover:bg-primaryColor/80 border-none shadow-none font-thin"
              >
                {{ isProcessingAttendance ? 'Processing...' : 'Use this scan' }}
              </button>
              <button
                class="btn btn-outline btn-sm shadow-none font-thin"
                @click="scanResult = ''"
              >
                Scan again
              </button>
              <button
                class="btn btn-ghost btn-sm shadow-none font-thin hover:bg-black/1"
                @click="copyScanResult"
                :disabled="isCopying"
              >
                {{ copyMessage || 'Copy' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Current time footer -->
        <div class="mt-3 text-center text-xs text-gray-600">
          Time: {{ nowTime.toLocaleTimeString() }}
        </div>

        <div class="modal-action">
          <button
            @click="closeScanner"
            class="btn btn-sm btn-outline font-thin"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeScanner">close</button>
      </form>
    </dialog>

    <!-- Attendance Result Modal -->
    <div v-if="showAttendanceResult" class="modal modal-open">
      <div class="modal-box max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">
            {{
              attendanceResult?.success
                ? 'Attendance Recorded'
                : 'Attendance Error'
            }}
          </h3>
          <button
            @click="closeAttendanceResult"
            class="btn btn-xs btn-circle btn-ghost"
          >
            ✕
          </button>
        </div>

        <!-- Success State -->
        <div v-if="attendanceResult?.success" class="text-center">
          <div
            class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle class="w-8 h-8 text-green-600" />
          </div>
          <h4 class="text-lg font-semibold text-green-600 mb-2">Success!</h4>
          <p class="text-gray-700 mb-4">{{ attendanceResult.message }}</p>

          <!-- Show additional data if available -->
          <div
            v-if="attendanceResult.data"
            class="bg-gray-50 rounded-lg p-3 text-sm text-left"
          >
            <div v-if="attendanceResult.data.employee" class="mb-2">
              <span class="font-medium">Employee:</span>
              {{ attendanceResult.data.employee.name }}
            </div>
            <div v-if="attendanceResult.data.action" class="mb-2">
              <span class="font-medium">Action:</span>
              {{ attendanceResult.data.action.replace('-', ' ').toUpperCase() }}
            </div>
            <div v-if="attendanceResult.data.time" class="mb-2">
              <span class="font-medium">Time:</span>
              {{ new Date(attendanceResult.data.time).toLocaleString() }}
            </div>
            <div v-if="attendanceResult.data.location" class="mb-2">
              <span class="font-medium">Location:</span>
              {{ attendanceResult.data.location }}
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="text-center">
          <div
            class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <XCircle class="w-8 h-8 text-red-600" />
          </div>
          <h4 class="text-lg font-semibold text-red-600 mb-2">Error</h4>
          <p class="text-gray-700 mb-4">
            {{ attendanceResult?.message || 'Failed to process attendance' }}
          </p>
        </div>

        <div class="modal-action">
          <button @click="closeAttendanceResult" class="btn btn-primary">
            {{ attendanceResult?.success ? 'Close' : 'Try Again' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeAttendanceResult">close</button>
      </form>
    </div>

    <!-- Desktop Layout -->
    <div
      class="relative z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full max-h-[600px] hidden lg:flex"
    >
      <!-- Left Side - Logo/Branding -->
      <div
        class="w-1/2 flex items-center bg-secondaryColor justify-center p-8 h-full"
        style="height: 600px"
      >
        <img
          src="/logo1.png"
          alt="logo"
          class="w-full h-[70%] object-contain"
        />
      </div>

      <!-- Right Side - Login Form -->
      <div class="w-1/2 p-12 flex items-center justify-center">
        <div class="w-full max-w-sm">
          <!-- Welcome Section -->
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-primaryColor mb-2 font-poppins">
              Welcome
            </h1>
            <p class="text-gray-500 text-sm font-roboto">
              Fill your data to continue. Thank You!
            </p>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="login" class="space-y-8 mt-10">
            <!-- Email Field with Floating Label -->
            <div class="form-control">
              <label class="label">
                <span class="label-text sr-only">Email</span>
              </label>
              <div class="relative">
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  name="email"
                  autocomplete="username"
                  class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 placeholder-transparent"
                  :class="{ '!border-red-500': errorMessage }"
                  placeholder="johnmarco@gmail.com"
                />
                <label
                  for="email"
                  class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
                >
                  Email
                </label>
              </div>
            </div>

            <!-- Password Field with Floating Label -->
            <div class="form-control">
              <label class="label">
                <span class="label-text sr-only">Password</span>
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  autocomplete="current-password"
                  class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 pr-10 placeholder-transparent"
                  :class="{ '!border-red-500': errorMessage }"
                  placeholder="lovekosi_e"
                />
                <label
                  for="password"
                  class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
                >
                  Password
                </label>
                <button
                  type="button"
                  @click="togglePasswordVisibility"
                  class="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <Eye v-if="showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>

              <!-- Forgot Password Link -->
              <div class="mt-3 text-right">
                <a
                  href="#"
                  class="text-sm text-primaryColor hover:text-primaryColor/80 transition-colors font-poppins"
                >
                  recover password
                </a>
              </div>
            </div>

            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="text-red-500 text-sm text-center mt-2 font-poppins"
            >
              {{ errorMessage }}
            </div>

            <!-- Login Button -->
            <div class="mt-8 flex justify-center">
              <button
                type="submit"
                :disabled="isLoading"
                class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-[50%]"
              >
                <template v-if="isLoading">
                  <span
                    class="loading loading-spinner loading-sm text-white mr-2"
                  ></span>
                  <span class="font-poppins">Logging in...</span>
                </template>
                <template v-else>
                  <span class="font-poppins">Login</span>
                </template>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div class="relative z-10 w-full max-w-md mx-auto lg:hidden mt-10">
      <div class="flex justify-center">
        <img
          src="/logo1.png"
          alt=""
          class="w-70 h-70 object-cover object-center"
        />
      </div>
      <!-- Mobile Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 h-[500px] mt-10">
        <!-- Welcome Section -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-primaryColor mb-2 font-poppins">
            Welcome
          </h1>
          <p class="text-gray-500 text-sm font-roboto">
            Fill your data to continue. Thank You!
          </p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="login" class="space-y-6">
          <!-- Email Field with Floating Label -->
          <div class="form-control mt-10">
            <div class="relative">
              <input
                id="email-mobile"
                v-model="email"
                type="email"
                name="email"
                autocomplete="username"
                class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 placeholder-transparent"
                :class="{ '!border-red-500': errorMessage }"
                placeholder="johnmarco@gmail.com"
              />
              <label
                for="email-mobile"
                class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
              >
                Email
              </label>
            </div>
          </div>

          <!-- Password Field with Floating Label -->
          <div class="form-control mt-10">
            <div class="relative">
              <input
                id="password-mobile"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 pr-10 placeholder-transparent"
                :class="{ '!border-red-500': errorMessage }"
                placeholder="lovekosi_e"
              />
              <label
                for="password-mobile"
                class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
              >
                Password
              </label>
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <Eye v-if="showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>

            <!-- Forgot Password Link -->
            <div class="mt-3 text-right">
              <a
                href="#"
                class="text-sm text-primaryColor hover:text-primaryColor/80 transition-colors font-poppins"
              >
                recover password
              </a>
            </div>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="text-red-500 text-sm text-center mt-2 font-poppins"
          >
            {{ errorMessage }}
          </div>

          <!-- Login Button -->
          <div class="mt-8 flex justify-center">
            <button
              type="submit"
              :disabled="isLoading"
              class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-[50%]"
            >
              <template v-if="isLoading">
                <span
                  class="loading loading-spinner loading-sm text-white mr-2"
                ></span>
                <span class="font-poppins">Logging in...</span>
              </template>
              <template v-else>
                <span class="font-poppins">Login</span>
              </template>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Remove input autofill styling */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px white inset;
    -webkit-text-fill-color: #374151;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* Custom floating label styles */
  .input:focus ~ label,
  .input:not(:placeholder-shown) ~ label {
    transform: translateY(-1.5rem) scale(0.9);
    color: var(--primaryColor, #466114);
  }

  /* Override DaisyUI input styles for floating labels */
  .input.input-bordered {
    font-family: Roboto;
    color: var(--color-neutralColor, #000000);
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid #d1d5db !important;
    border-radius: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .input.input-bordered:focus {
    border-bottom-color: var(--primaryColor, #466114) !important;
    outline: none !important;
    box-shadow: none !important;
  }

  /* Mobile specific styles */
  @media (max-width: 1023px) {
    /* Let the overlay image handle the background visuals */
    .min-h-screen {
      background-image: none;
    }
  }
</style>
