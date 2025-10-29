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
import { toastConfig } from './config/toast.js';
import './styles/toast.css';
import Vue3PrintNb from 'vue3-print-nb';

const app = createApp(App);
const pinia = createPinia();

// Enable Vue DevTools in development
if (import.meta.env.DEV) {
  app.config.devtools = true;
}

app.use(pinia);
app.use(router);
app.use(Vue3PrintNb);

// Configure toast notifications with custom styling
app.use(Toast, toastConfig);

// Initialize authentication
const authStore = useAuthStore();
authStore.initializeAuth();

// Initialize theme system (light mode only)
const themeStore = useThemeStore();
themeStore.initializeTheme();

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
