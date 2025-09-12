import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import PikaDay from 'pikaday';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import Toast from 'vue-toastification';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Configure toast notifications
const toastOptions = {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__bounce',
  maxToasts: 20,
  newestOnTop: true,
  filterBeforeCreate: (toast, toasts) => {
    if (toasts.filter((t) => t.type === toast.type).length !== 0) {
      return false;
    }
    return toast;
  },
};

app.use(Toast, toastOptions);

// Initialize authentication
const authStore = useAuthStore();
authStore.initializeAuth();

// Initialize theme system
const themeStore = useThemeStore();
themeStore.initializeTheme();
themeStore.watchSystemTheme();

// Initialize PikaDay
const pikaDay = new PikaDay({
  field: document.getElementById('pikaday-input'),
  format: 'YYYY-MM-DD',
  onSelect: (date) => {
    console.log('Selected date:', date);
  },
});

library.add(fas, far, fab);
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');
