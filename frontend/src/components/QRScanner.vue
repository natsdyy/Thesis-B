<template>
  <div class="qr-scanner">
    <div class="scanner-container">
      <div v-if="!isScanning" class="scanner-placeholder">
        <div class="placeholder-content">
          <div class="qr-icon">
            <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">QR Code Scanner</h3>
          <p class="text-gray-600 mb-4">Click the button below to start scanning QR codes</p>
          <button 
            @click="startScanning" 
            class="btn btn-primary"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm mr-2"></span>
            Start Scanning
          </button>
        </div>
      </div>

      <div v-else class="scanner-wrapper">
        <div class="scanner-header">
          <h3 class="text-lg font-medium text-gray-900">Scan QR Code</h3>
          <button 
            @click="stopScanning" 
            class="btn btn-sm btn-ghost"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="scanner-video-container">
          <video 
            ref="videoElement" 
            class="scanner-video"
            autoplay
            muted
            playsinline
          ></video>
          <div class="scanner-overlay">
            <div class="scanner-frame"></div>
            <div class="scanner-instructions">
              <p class="text-white text-sm">Position the QR code within the frame</p>
            </div>
          </div>
        </div>

        <div class="scanner-actions">
          <button 
            @click="stopScanning" 
            class="btn btn-outline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Error Modal -->
    <div v-if="error" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Scanner Error</h3>
        <p class="text-gray-700 mb-4">{{ error }}</p>
        <div class="modal-action">
          <button @click="clearError" class="btn btn-primary">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import QrScanner from 'qr-scanner'

// Props
const props = defineProps({
  onScan: {
    type: Function,
    required: true
  }
})

// Reactive data
const videoElement = ref(null)
const isScanning = ref(false)
const loading = ref(false)
const error = ref('')
let qrScanner = null

// Methods
const startScanning = async () => {
  try {
    loading.value = true
    error.value = ''

    // Check if camera is available
    const hasCamera = await QrScanner.hasCamera()
    if (!hasCamera) {
      throw new Error('No camera found. Please ensure your device has a camera.')
    }

    // Create QR scanner instance
    qrScanner = new QrScanner(
      videoElement.value,
      (result) => {
        console.log('QR Code detected:', result.data)
        props.onScan(result.data)
        stopScanning()
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment' // Use back camera if available
      }
    )

    // Start scanning
    await qrScanner.start()
    isScanning.value = true
    loading.value = false

  } catch (err) {
    console.error('Error starting QR scanner:', err)
    error.value = err.message || 'Failed to start camera. Please check permissions.'
    loading.value = false
  }
}

const stopScanning = () => {
  if (qrScanner) {
    qrScanner.stop()
    qrScanner.destroy()
    qrScanner = null
  }
  isScanning.value = false
  loading.value = false
}

const clearError = () => {
  error.value = ''
}

// Cleanup on unmount
onUnmounted(() => {
  stopScanning()
})
</script>

<style scoped>
.qr-scanner {
  @apply w-full mx-auto;
  max-width: 28rem;
}

.scanner-container {
  @apply bg-white rounded-lg shadow-lg overflow-hidden;
}

.scanner-placeholder {
  @apply p-8 text-center;
}

.placeholder-content {
  @apply flex flex-col items-center;
}

.qr-icon {
  @apply mb-4;
}

.scanner-wrapper {
  @apply p-4;
}

.scanner-header {
  @apply flex justify-between items-center mb-4;
}

.scanner-video-container {
  @apply relative bg-black rounded-lg overflow-hidden mb-4;
  aspect-ratio: 1;
}

.scanner-video {
  @apply w-full h-full object-cover;
}

.scanner-overlay {
  @apply absolute inset-0 flex items-center justify-center;
}

.scanner-frame {
  @apply w-48 h-48 border-2 border-white rounded-lg;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

.scanner-instructions {
  @apply absolute bottom-4 left-0 right-0 text-center;
}

.scanner-actions {
  @apply flex justify-center gap-2;
}

/* QR Scanner specific styles */
:deep(.qr-scanner__scan-region-highlight) {
  @apply border-2 border-green-400;
}

:deep(.qr-scanner__code-outline) {
  @apply border-2 border-green-400;
}
</style>
