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
  import { computed, watch } from 'vue';

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
  const resultDialogRef = ref(null);

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

  // Human-readable rendering of the last scanned code for better UX
  const scanResultDisplay = computed(() => {
    const raw = scanResult.value;
    if (!raw) return '';
    // Try parse as JSON
    try {
      const data = JSON.parse(raw);
      if (data && (data.employee_id || data.employee_name || data.first_name)) {
        const displayName =
          [
            data.employee_name,
            [data.first_name, data.middle_name, data.last_name]
              .filter(Boolean)
              .join(' '),
          ].find((v) => v && v.trim().length > 0) || 'Unknown';
        const action = (data.action || '').replace('-', ' ');
        const loc =
          data.branch_name || data.location_name || data.location || '';
        return [displayName, action, loc].filter(Boolean).join(' — ');
      }
    } catch {}
    // Try parse as URL with ?data=
    try {
      const url = new URL(raw);
      const param = url.searchParams.get('data');
      if (param) {
        const data = JSON.parse(decodeURIComponent(param));
        const displayName =
          [
            data.employee_name,
            [data.first_name, data.middle_name, data.last_name]
              .filter(Boolean)
              .join(' '),
          ].find((v) => v && v.trim().length > 0) || 'Unknown';
        const action = (data.action || '').replace('-', ' ');
        const loc =
          data.branch_name || data.location_name || data.location || '';
        return [displayName, action, loc].filter(Boolean).join(' — ');
      }
    } catch {}
    // Fallback to raw when not recognized
    return raw;
  });

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

  // Open/close the result dialog above the scanner dialog
  watch(
    () => showAttendanceResult.value,
    (isOpen) => {
      const dlg = resultDialogRef.value;
      if (!dlg) return;
      try {
        if (isOpen) {
          if (!dlg.open) dlg.showModal();
        } else {
          if (dlg.open) dlg.close();
        }
      } catch {
        // ignore dialog errors
      }
    }
  );

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

      // Parse the QR code data; support raw JSON or URL with ?data=
      let qrData;
      const raw = scanResult.value;
      try {
        // Try direct JSON
        qrData = JSON.parse(raw);
      } catch (parseError) {
        // Try URL with encoded data
        try {
          const url = new URL(raw);
          const dataParam = url.searchParams.get('data');
          if (!dataParam) throw new Error('Missing data param');
          qrData = JSON.parse(decodeURIComponent(dataParam));
        } catch (e) {
          throw new Error(
            'Invalid QR format. Please scan your official employee QR.'
          );
        }
      }

      // Validate required fields
      if (!qrData?.employee_id || !qrData?.action) {
        throw new Error(
          'QR missing required fields. Please regenerate your employee QR.'
        );
      }

      // Validate supported action
      const allowedActions = ['time-in', 'time-out'];
      if (!allowedActions.includes(qrData.action)) {
        throw new Error('Invalid action in QR. Must be time-in or time-out.');
      }

      // Optional: basic employee identity validation (either full name or EMP code)
      const hasName =
        typeof qrData.employee_name === 'string' && qrData.employee_name.trim();
      const empPattern = /^EMP\d{3,}$/; // e.g., EMP000013
      const hasValidId =
        typeof qrData.employee_id === 'string' &&
        empPattern.test(qrData.employee_id.trim());
      if (!hasName && !hasValidId) {
        throw new Error('QR is missing a valid employee identity.');
      }

      // Optional UX: validate expiry
      if (qrData.valid_until) {
        const now = new Date();
        const expiry = new Date(qrData.valid_until);
        if (now > expiry) {
          throw new Error(
            'QR has expired. Please regenerate your employee QR.'
          );
        }
      }

      // Optional sanity check: timestamp not more than 10 minutes in the future
      if (qrData.timestamp) {
        const ts = new Date(qrData.timestamp);
        const now = new Date();
        if (ts.getTime() - now.getTime() > 10 * 60 * 1000) {
          throw new Error(
            'QR timestamp appears invalid (too far in the future).'
          );
        }
      }

      // Proceed with public scan endpoint (no authentication required)
      const result = await attendanceStore.scanQRCode(qrData);

      attendanceResult.value = {
        success: true,
        message: result.message,
        data: result.data,
      };

      // Show result; keep scanner open for manual control
      showAttendanceResult.value = true;
    } catch (error) {
      console.error('Attendance processing error:', error);
      attendanceResult.value = {
        success: false,
        message:
          error?.response?.data?.message ||
          error.message ||
          'Failed to process attendance',
      };

      // Show error; keep scanner open for manual control
      showAttendanceResult.value = true;
    } finally {
      isProcessingAttendance.value = false;
    }
  };

  const closeAttendanceResult = () => {
    showAttendanceResult.value = false;
    attendanceResult.value = null;
  };

  // Helper function to detect schedule-related errors
  const isScheduleError = (message) => {
    if (!message) return false;
    const scheduleKeywords = [
      'schedule',
      'scheduled hours',
      'work schedule',
      'supervisor',
      'outside your scheduled',
      'No work schedule assigned',
      'before your scheduled time',
      'after your scheduled time',
    ];
    return scheduleKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
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

      if (userDepartment === 'Branch') {
        // All Branch department users should go to branch dashboard
        router.push('/branch/dashboard');
      } else {
        // All other departments (HR, SCM, Finance, CRM, Admin) go to main dashboard (HomePage)
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
            <div class="text-sm break-all">{{ scanResultDisplay }}</div>
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

    <!-- Attendance Result Modal (dialog above scanner) -->
    <dialog ref="resultDialogRef" id="attendance_result_modal" class="modal">
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
            :class="[
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              isScheduleError(attendanceResult?.message)
                ? 'bg-orange-100'
                : 'bg-red-100',
            ]"
          >
            <XCircle
              :class="[
                'w-8 h-8',
                isScheduleError(attendanceResult?.message)
                  ? 'text-orange-600'
                  : 'text-red-600',
              ]"
            />
          </div>
          <h4
            :class="[
              'text-lg font-semibold mb-2',
              isScheduleError(attendanceResult?.message)
                ? 'text-orange-600'
                : 'text-red-600',
            ]"
          >
            {{
              isScheduleError(attendanceResult?.message)
                ? 'Schedule Issue'
                : 'Error'
            }}
          </h4>
          <p class="text-gray-700 mb-4">
            {{ attendanceResult?.message || 'Failed to process attendance' }}
          </p>

          <!-- Additional info for schedule errors -->
          <div
            v-if="isScheduleError(attendanceResult?.message)"
            class="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-left"
          >
            <div class="flex items-start space-x-2">
              <Clock class="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p class="font-medium text-orange-800">Schedule Information</p>
                <p class="text-orange-700 text-xs mt-1">
                  Please check your work schedule or contact your Manager for
                  assistance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closeAttendanceResult" class="btn bg-gray-200 btn-sm">
            {{ attendanceResult?.success ? 'Close' : 'Try Again' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeAttendanceResult">close</button>
      </form>
    </dialog>

    <!-- Desktop Layout -->
    <div
      class="relative z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full max-h-[600px] hidden lg:flex"
    >
      <!-- Left Side - Logo/Branding -->
      <div
        class="w-1/2 flex items-center bg-secondaryColor justify-center p-6 lg:p-8 h-full"
        style="height: 600px"
      >
        <img
          src="/logo1.png"
          alt="logo"
          class="w-full h-[70%] object-contain"
        />
      </div>

      <!-- Right Side - Login Form -->
      <div class="w-1/2 p-6 lg:p-12 flex items-center justify-center">
        <div class="w-full max-w-sm lg:max-w-md xl:max-w-lg">
          <!-- Welcome Section -->
          <div class="text-center mb-6 lg:mb-8">
            <h1
              class="text-2xl lg:text-3xl font-bold text-primaryColor mb-2 font-poppins"
            >
              Welcome
            </h1>
            <p class="text-gray-500 text-sm font-roboto">
              Fill your data to continue. Thank You!
            </p>
          </div>

          <!-- Login Form -->
          <form
            @submit.prevent="login"
            class="space-y-6 lg:space-y-8 mt-8 lg:mt-10"
          >
            <!-- Email Field -->
            <div class="relative w-full">
              <label
                class="input validator flex items-center gap-3 w-full h-12"
                :class="{
                  '!border-primaryColor !focus-within:border-primaryColor': true,
                  '!border-error': errorMessage,
                }"
              >
                <!-- Email Icon -->
                <svg
                  class="h-5 w-5 opacity-50 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <g
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    stroke-width="2.5"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
                </svg>

                <!-- Input -->
                <input
                  v-model="email"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  autocomplete="username"
                  class="flex-1 bg-transparent focus:outline-none text-base"
                  :class="{ 'text-error placeholder-error': errorMessage }"
                />
              </label>
            </div>

            <!-- Validation Hint -->
            <div
              v-if="errorMessage"
              class="validator-hint text-error text-sm mt-1 text-center"
            >
              Enter a valid email address
            </div>

            <!-- Password Field -->
            <div class="relative w-full">
              <label
                class="input validator flex items-center gap-3 w-full h-12"
                :class="{
                  '!border-primaryColor !focus-within:border-primaryColor': true,
                  '!border-error': errorMessage,
                }"
              >
                <!-- Password Icon -->
                <svg
                  class="h-5 w-5 opacity-50 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                  />
                </svg>

                <!-- Input -->
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  id="password"
                  name="password"
                  placeholder="Password"
                  required
                  autocomplete="current-password"
                  class="flex-1 bg-transparent focus:outline-none text-base pr-10"
                  :class="{ 'text-error placeholder-error': errorMessage }"
                />

                <!-- Toggle Eye -->
                <button
                  type="button"
                  @click="togglePasswordVisibility"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Eye v-if="showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </label>
            </div>

            <!-- Forgot Password -->
            <div class="text-right">
              <router-link
                to="/forgot-password"
                class="text-sm text-primaryColor hover:text-primaryColor/80 transition-colors font-poppins"
              >
                Forgot password
              </router-link>
            </div>

            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="text-error text-sm text-center mt-2 font-poppins"
            >
              {{ errorMessage }}
            </div>

            <!-- Login Button -->
            <div class="mt-6 lg:mt-8 flex justify-center">
              <button
                type="submit"
                :disabled="isLoading"
                class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-full sm:w-[80%] lg:w-[60%] xl:w-[50%]"
              >
                <template v-if="isLoading">
                  <span
                    class="loading loading-spinner loading-sm text-white mr-2"
                  ></span>
                  <span>Logging in...</span>
                </template>
                <template v-else>
                  <span>Login</span>
                </template>
              </button>
            </div>

            <!-- Supplier Login -->
            <div class="mt-6 text-center">
              <p class="text-sm text-gray-600 font-poppins">
                Are you a supplier?
                <router-link
                  to="/supplier/login"
                  class="text-primaryColor hover:text-primaryColor/80 font-medium transition-colors ml-1"
                >
                  Login here
                </router-link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div
      class="relative z-10 w-full max-w-sm sm:max-w-md mx-auto lg:hidden mt-4 sm:mt-6 lg:mt-10"
    >
      <div class="flex justify-center mb-4">
        <img
          src="/logo1.png"
          alt=""
          class="mobile-logo w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain object-center"
        />
      </div>
      <!-- Mobile Login Card -->
      <div
        class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 min-h-[400px] sm:min-h-[450px] mt-4 sm:mt-6"
      >
        <!-- Welcome Section -->
        <div class="text-center mb-6 sm:mb-8">
          <h1
            class="text-xl sm:text-2xl font-bold text-primaryColor mb-2 font-poppins"
          >
            Welcome
          </h1>
          <p class="text-gray-500 text-xs sm:text-sm font-roboto">
            Fill your data to continue. Thank You!
          </p>
        </div>

        <!-- Login Form -->
        <form
          @submit.prevent="login"
          class="space-y-4 sm:space-y-6 mt-6 sm:mt-8"
        >
          <!-- Email Field -->
          <div class="relative w-full">
            <label
              class="input validator flex items-center gap-3 w-full h-12"
              :class="{
                '!border-primaryColor !focus-within:border-primaryColor': true,
                '!border-error': errorMessage,
              }"
            >
              <!-- Email Icon -->
              <svg
                class="h-5 w-5 opacity-50 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  stroke-width="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </g>
              </svg>

              <!-- Input -->
              <input
                id="email-mobile"
                v-model="email"
                type="email"
                name="email"
                placeholder="Email"
                required
                autocomplete="username"
                class="flex-1 bg-transparent focus:outline-none text-base"
                :class="{ 'text-error placeholder-error': errorMessage }"
              />
            </label>
          </div>

          <!-- Validation Hint -->
          <div
            v-if="errorMessage"
            class="validator-hint text-error text-sm mt-1 text-center"
          >
            Enter a valid email address
          </div>

          <!-- Password Field -->
          <div class="relative w-full">
            <label
              class="input validator flex items-center gap-3 w-full h-12"
              :class="{
                '!border-primaryColor !focus-within:border-primaryColor': true,
                '!border-error': errorMessage,
              }"
            >
              <!-- Password Icon -->
              <svg
                class="h-5 w-5 opacity-50 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                />
              </svg>

              <!-- Input -->
              <input
                id="password-mobile"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                placeholder="Password"
                required
                autocomplete="current-password"
                class="flex-1 bg-transparent focus:outline-none text-base pr-10"
                :class="{ 'text-error placeholder-error': errorMessage }"
              />

              <!-- Toggle Password -->
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Eye v-if="showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </label>
          </div>

          <!-- Forgot Password -->
          <div class="text-right">
            <router-link
              to="/forgot-password"
              class="text-sm text-primaryColor hover:text-primaryColor/80 transition-colors font-poppins"
            >
              Forgot password
            </router-link>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="text-error text-sm text-center mt-2 font-poppins"
          >
            {{ errorMessage }}
          </div>

          <!-- Login Button -->
          <div class="mt-6 sm:mt-8 flex justify-center">
            <button
              type="submit"
              :disabled="isLoading"
              class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-full sm:w-[80%]"
            >
              <template v-if="isLoading">
                <span
                  class="loading loading-spinner loading-sm text-white mr-2"
                ></span>
                <span>Logging in...</span>
              </template>
              <template v-else>
                <span>Login</span>
              </template>
            </button>
          </div>

          <!-- Supplier Login -->
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600 font-poppins">
              Are you a supplier?
              <router-link
                to="/supplier/login"
                class="text-primaryColor hover:text-primaryColor/80 font-medium transition-colors ml-1"
              >
                Login here
              </router-link>
            </p>
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
    transform: translateY(-1.5rem) scale(0.9) !important;
    color: var(--primaryColor, #466114) !important;
  }

  /* Override DaisyUI input styles for floating labels */
  .input.input-bordered {
    font-family: Roboto;
    color: var(--color-neutralColor, #000000) !important;
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

  /* Enhanced responsive input styles */
  .input {
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  @media (max-width: 640px) {
    .input {
      min-height: 44px;
    }
  }

  /* Ensure proper text wrapping and overflow handling */
  .input input {
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.5;
  }

  /* Better touch targets for mobile */
  @media (max-width: 768px) {
    button {
      min-height: 44px;
    }
  }

  /* Perfect alignment for input elements */
  .input svg {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input input {
    display: flex;
    align-items: center;
    height: 100%;
  }

  /* Ensure consistent spacing */
  .input {
    padding: 0 12px;
  }

  /* Mobile logo responsive sizing */
  @media (max-width: 375px) {
    .mobile-logo {
      width: 10rem;
      height: 10rem;
    }
  }

  @media (min-width: 376px) and (max-width: 640px) {
    .mobile-logo {
      width: 6rem;
      height: 6rem;
    }
  }

  @media (min-width: 641px) and (max-width: 768px) {
    .mobile-logo {
      width: 7rem;
      height: 7rem;
    }
  }
</style>
