import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import PikaDay from 'pikaday';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

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

app.mount('#app');

