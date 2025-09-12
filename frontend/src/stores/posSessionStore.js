import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePOSSessionStore = defineStore('posSession', () => {
  // State
  const isManagerLoggedIn = ref(false);
  const managerInfo = ref(null);
  const sessionStartTime = ref(null);
  const sessionTimeout = ref(30 * 60 * 1000); // 30 minutes in milliseconds

  // Getters
  const isSessionActive = computed(() => {
    if (!isManagerLoggedIn.value || !sessionStartTime.value) return false;

    const now = Date.now();
    const sessionAge = now - sessionStartTime.value;

    return sessionAge < sessionTimeout.value;
  });

  const sessionTimeRemaining = computed(() => {
    if (!isSessionActive.value) return 0;

    const now = Date.now();
    const sessionAge = now - sessionStartTime.value;

    return Math.max(0, sessionTimeout.value - sessionAge);
  });

  const sessionTimeRemainingMinutes = computed(() => {
    return Math.ceil(sessionTimeRemaining.value / (60 * 1000));
  });

  // Actions
  const startManagerSession = (managerData) => {
    isManagerLoggedIn.value = true;
    managerInfo.value = managerData;
    sessionStartTime.value = Date.now();

    // Store in localStorage for persistence
    localStorage.setItem(
      'posManagerSession',
      JSON.stringify({
        isManagerLoggedIn: true,
        managerInfo: managerData,
        sessionStartTime: sessionStartTime.value,
      })
    );
  };

  const endManagerSession = () => {
    isManagerLoggedIn.value = false;
    managerInfo.value = null;
    sessionStartTime.value = null;

    // Clear from localStorage
    localStorage.removeItem('posManagerSession');
  };

  const checkSessionFromStorage = () => {
    try {
      const stored = localStorage.getItem('posManagerSession');
      if (stored) {
        const sessionData = JSON.parse(stored);
        const now = Date.now();
        const sessionAge = now - sessionData.sessionStartTime;

        if (sessionAge < sessionTimeout.value) {
          isManagerLoggedIn.value = sessionData.isManagerLoggedIn;
          managerInfo.value = sessionData.managerInfo;
          sessionStartTime.value = sessionData.sessionStartTime;
        } else {
          // Session expired, clear it
          endManagerSession();
        }
      }
    } catch (error) {
      console.error('Error checking POS session from storage:', error);
      endManagerSession();
    }
  };

  const extendSession = () => {
    if (isManagerLoggedIn.value) {
      sessionStartTime.value = Date.now();

      // Update localStorage
      localStorage.setItem(
        'posManagerSession',
        JSON.stringify({
          isManagerLoggedIn: true,
          managerInfo: managerInfo.value,
          sessionStartTime: sessionStartTime.value,
        })
      );
    }
  };

  // Initialize session from storage on store creation
  checkSessionFromStorage();

  return {
    // State
    isManagerLoggedIn,
    managerInfo,
    sessionStartTime,
    sessionTimeout,

    // Getters
    isSessionActive,
    sessionTimeRemaining,
    sessionTimeRemainingMinutes,

    // Actions
    startManagerSession,
    endManagerSession,
    checkSessionFromStorage,
    extendSession,
  };
});
