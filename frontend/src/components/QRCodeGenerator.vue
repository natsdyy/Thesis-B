<template>
  <div class="qr-generator">
    <div class="qr-display">
      <div v-if="qrCodeData" class="qr-code-container">
        <canvas ref="qrCanvas" class="qr-canvas"></canvas>
        <div class="qr-info">
          <h3 class="font-semibold">{{ qrCodeData.location_name }}</h3>
          <p v-if="qrCodeData.description" class="text-sm text-gray-600">{{ qrCodeData.description }}</p>
          <p class="text-xs text-gray-500 mt-2">Code: {{ qrCodeData.qr_code }}</p>
        </div>
      </div>
      
      <div v-else class="qr-placeholder">
        <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
        </svg>
        <p class="text-gray-500 mt-2">No QR code generated</p>
      </div>
    </div>
    
    <div class="qr-actions">
      <button 
        v-if="qrCodeData"
        @click="downloadQR"
        class="btn btn-outline btn-sm"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Download
      </button>
      
      <button 
        v-if="qrCodeData"
        @click="printQR"
        class="btn btn-outline btn-sm"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        Print
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  qrCodeData: {
    type: Object,
    default: null
  }
});

const qrCanvas = ref(null);

// Generate QR code when data changes
watch(() => props.qrCodeData, async (newData) => {
  if (newData && qrCanvas.value) {
    await generateQRCode(newData.qr_code);
  }
}, { immediate: true });

const generateQRCode = async (text) => {
  if (!qrCanvas.value) return;
  
  try {
    const canvas = qrCanvas.value;
    const options = {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    await QRCode.toCanvas(canvas, text, options);
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
};

const downloadQR = () => {
  if (!qrCanvas.value) return;
  
  const link = document.createElement('a');
  link.download = `qr-code-${props.qrCodeData.location_name.replace(/\s+/g, '-').toLowerCase()}.png`;
  link.href = qrCanvas.value.toDataURL();
  link.click();
};

const printQR = () => {
  if (!qrCanvas.value) return;
  
  const printWindow = window.open('', '_blank');
  const qrDataURL = qrCanvas.value.toDataURL();
  
  printWindow.document.write(`
    <html>
      <head>
        <title>QR Code - ${props.qrCodeData.location_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
          }
          .qr-container {
            display: inline-block;
            border: 2px solid #000;
            padding: 20px;
            margin: 20px;
          }
          .qr-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .qr-description {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .qr-code {
            margin: 10px 0;
          }
          .qr-code-text {
            font-size: 12px;
            color: #999;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <div class="qr-title">${props.qrCodeData.location_name}</div>
          ${props.qrCodeData.description ? `<div class="qr-description">${props.qrCodeData.description}</div>` : ''}
          <div class="qr-code">
            <img src="${qrDataURL}" alt="QR Code" />
          </div>
          <div class="qr-code-text">${props.qrCodeData.qr_code}</div>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
};
</script>

<style scoped>
.qr-generator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.qr-display {
  text-align: center;
}

.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.qr-canvas {
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.qr-info {
  text-align: center;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
}

.qr-actions {
  display: flex;
  gap: 0.5rem;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .qr-code-container {
    padding: 0.5rem;
  }
  
  .qr-canvas {
    width: 200px;
    height: 200px;
  }
}
</style>
