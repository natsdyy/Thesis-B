<template>
  <div class="qr-scanner-container">
    <div class="scanner-header">
      <h3 class="text-lg font-semibold mb-4">Scan QR Code</h3>
      <p class="text-sm text-gray-600 mb-4">Position the QR code within the camera view</p>
    </div>

    <div class="scanner-wrapper">
      <div v-if="!cameraActive" class="scanner-placeholder">
        <div class="scanner-icon">
          <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
          </svg>
        </div>
        <button 
          @click="startCamera" 
          class="btn btn-primary mt-4"
          :disabled="loading"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          {{ loading ? 'Starting Camera...' : 'Start Camera' }}
        </button>
      </div>

      <div v-else class="camera-container">
        <video 
          ref="videoElement" 
          class="camera-video"
          autoplay 
          playsinline
        ></video>
        
        <div class="scanner-overlay">
          <div class="scanner-frame"></div>
          <div class="scanner-corners">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
          </div>
        </div>

        <div class="scanner-controls">
          <button 
            @click="stopCamera" 
            class="btn btn-outline btn-sm"
          >
            Stop Camera
          </button>
        </div>
      </div>
    </div>

    <div v-if="scannedData" class="scanned-result mt-4">
      <div class="alert alert-success">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>
          <h4 class="font-semibold">QR Code Scanned Successfully!</h4>
          <p class="text-sm">{{ scannedData.location_name }}</p>
          <p v-if="scannedData.description" class="text-sm text-gray-600">{{ scannedData.description }}</p>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message mt-4">
      <div class="alert alert-error">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <div>
          <h4 class="font-semibold">Error</h4>
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Manual QR Code Input (Fallback) -->
    <div class="manual-input mt-6">
      <div class="divider">OR</div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Enter QR Code Manually</span>
        </label>
        <div class="input-group">
          <input 
            v-model="manualQRInput" 
            type="text" 
            placeholder="Paste QR code here..."
            class="input input-bordered flex-1"
            @keyup.enter="submitManualQR"
          />
          <button 
            @click="submitManualQR" 
            class="btn btn-primary"
            :disabled="!manualQRInput.trim()"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAttendanceStore } from '../stores/attendanceStore';
import QrScanner from 'qr-scanner';

const props = defineProps({
  onScan: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['scan', 'error']);

const attendanceStore = useAttendanceStore();

// State
const videoElement = ref(null);
const cameraActive = ref(false);
const loading = ref(false);
const error = ref(null);
const scannedData = ref(null);
const qrScanner = ref(null);

// Methods
const startCamera = async () => {
  try {
    loading.value = true;
    error.value = null;
    scannedData.value = null;

    if (!videoElement.value) {
      throw new Error('Video element not found');
    }

    // Check if camera is supported
    if (!QrScanner.hasCamera()) {
      throw new Error('No camera found on this device');
    }

    // Create QR scanner instance
    qrScanner.value = new QrScanner(
      videoElement.value,
      (result) => handleQRScan(result.data),
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment', // Use back camera on mobile
        maxScansPerSecond: 5, // Limit scan rate
        returnDetailedScanResult: true
      }
    );

    // Start scanning
    await qrScanner.value.start();
    cameraActive.value = true;
    console.log('QR Scanner started successfully');
  } catch (err) {
    console.error('QR Scanner error:', err);
    error.value = err.message;
    emit('error', err.message);
  } finally {
    loading.value = false;
  }
};

const stopCamera = () => {
  if (qrScanner.value) {
    qrScanner.value.stop();
    qrScanner.value.destroy();
    qrScanner.value = null;
  }
  cameraActive.value = false;
  scannedData.value = null;
  error.value = null;
};

// Remove the old startQRDetection method as it's now handled by the qr-scanner library

const handleQRScan = async (qrCode) => {
  try {
    console.log('QR Code scanned:', qrCode);
    
    const result = await attendanceStore.validateQRCode(qrCode);
    console.log('QR Code validation result:', result);
    
    scannedData.value = result;
    
    // Pass the QR code data with the qr_code property for time-in
    const qrData = {
      ...result,
      qr_code: qrCode
    };
    
    emit('scan', qrData);
    props.onScan(qrData);
    
    // Stop the scanner after successful scan
    stopCamera();
  } catch (err) {
    console.error('QR Code validation error:', err);
    error.value = err.message;
    emit('error', err.message);
  }
};

// Manual QR code input for testing
const manualQRInput = ref('');
const submitManualQR = async () => {
  if (manualQRInput.value.trim()) {
    await handleQRScan(manualQRInput.value.trim());
    manualQRInput.value = '';
  }
};

// Lifecycle
onMounted(() => {
  // Check camera permissions
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'camera' }).then(result => {
      if (result.state === 'denied') {
        error.value = 'Camera access denied. Please enable camera permissions.';
      }
    });
  }
});

onUnmounted(() => {
  stopCamera();
});
</script>

<style scoped>
.qr-scanner-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 1rem;
}

.scanner-wrapper {
  position: relative;
  background: #f3f4f6;
  border-radius: 12px;
  overflow: hidden;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-placeholder {
  text-align: center;
  padding: 2rem;
}

.scanner-icon {
  margin-bottom: 1rem;
}

.camera-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-frame {
  width: 250px;
  height: 250px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  position: relative;
}

.scanner-corners {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #10b981;
}

.corner.top-left {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.corner.top-right {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.corner.bottom-left {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
}

.corner.bottom-right {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
}

.scanner-controls {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
}

.scanned-result {
  animation: slideIn 0.3s ease-out;
}

.error-message {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .qr-scanner-container {
    padding: 0.5rem;
  }
  
  .scanner-frame {
    width: 200px;
    height: 200px;
  }
  
  .scanner-placeholder {
    padding: 1rem;
  }
}
</style>
