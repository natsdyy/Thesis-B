<template>
  <div class="qr-code-container">
    <canvas
      ref="qrCanvas"
      :width="size"
      :height="size"
      class="qr-canvas"
    ></canvas>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue';
  import QRCode from 'qrcode';

  const props = defineProps({
    data: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 200,
    },
    margin: {
      type: Number,
      default: 2,
    },
    color: {
      type: Object,
      default: () => ({
        dark: '#000000',
        light: '#FFFFFF',
      }),
    },
  });

  const qrCanvas = ref(null);

  const generateQR = async () => {
    if (!qrCanvas.value || !props.data) return;

    try {
      await QRCode.toCanvas(qrCanvas.value, props.data, {
        width: props.size,
        margin: props.margin,
        color: props.color,
        errorCorrectionLevel: 'H',
        scale: 8,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  onMounted(() => {
    generateQR();
  });

  watch(
    () => props.data,
    () => {
      generateQR();
    },
    { immediate: true }
  );
</script>

<style scoped>
  .qr-code-container {
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 120px;
    max-height: 1200px;
    overflow: hidden;
  }

  .qr-canvas {
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    max-width: 120px;
    max-height: 120px;
    object-fit: contain;
  }
</style>
