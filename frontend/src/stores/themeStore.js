import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDarkMode: false,
    themes: {
      light: 'light',
      dark: 'dark'
    }
  }),

  getters: {
    currentTheme: (state) => state.isDarkMode ? 'dark' : 'light',
    themeClasses: (state) => ({
      // Background classes
      mainBg: state.isDarkMode ? 'bg-purple-900' : 'bg-gray-50',
      cardBg: state.isDarkMode ? 'bg-purple-800' : 'bg-white',
      headerBg: state.isDarkMode ? 'bg-purple-900 border-purple-700' : 'bg-white border-gray-200',
      sidebarBg: state.isDarkMode ? 'bg-purple-900' : 'bg-white',
      
      // Text classes
      textPrimary: state.isDarkMode ? 'text-white' : 'text-gray-900',
      textSecondary: state.isDarkMode ? 'text-purple-100' : 'text-gray-600',
      textMuted: state.isDarkMode ? 'text-purple-200' : 'text-gray-500',
      
      // Border classes
      border: state.isDarkMode ? 'border-purple-700' : 'border-gray-200',
      borderLight: state.isDarkMode ? 'border-purple-600' : 'border-gray-100',
      
      // Hover states
      hoverBg: state.isDarkMode ? 'hover:bg-purple-800' : 'hover:bg-gray-50',
      hoverBgLight: state.isDarkMode ? 'hover:bg-purple-900' : 'hover:bg-gray-100',
      
      // Input styles
      input: state.isDarkMode 
        ? 'bg-purple-900 border-purple-700 text-white placeholder-purple-300' 
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
      
      // Table styles
      tableRow: state.isDarkMode ? 'hover:bg-purple-800' : 'hover:bg-gray-50',
      tableHeader: state.isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-gray-50 text-gray-900',
      
      // Modal styles
      modal: state.isDarkMode ? 'bg-purple-900 text-white' : 'bg-white text-gray-900',
      modalBackdrop: state.isDarkMode ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-50'
    })
  },

  actions: {
    initializeTheme() {
      // Check for saved theme preference or default to system preference
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark'
      } else {
        this.isDarkMode = prefersDark
      }
      
      this.applyTheme()
    },

    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      this.applyTheme()
      this.saveThemePreference()
    },

    setTheme(theme) {
      this.isDarkMode = theme === 'dark'
      this.applyTheme()
      this.saveThemePreference()
    },

    applyTheme() {
      const theme = this.isDarkMode ? 'dark' : 'light'
      
      // Apply to document element for DaisyUI
      document.documentElement.setAttribute('data-theme', theme)
      
      // Apply to html element for custom classes
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      // Update CSS custom properties for smooth transitions
      document.documentElement.style.setProperty('--theme-transition', 'all 0.3s ease')
    },

    saveThemePreference() {
      const theme = this.isDarkMode ? 'dark' : 'light'
      localStorage.setItem('theme', theme)
    },

    // Listen for system theme changes
    watchSystemTheme() {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      mediaQuery.addEventListener('change', (e) => {
        // Only update if user hasn't set a manual preference
        if (!localStorage.getItem('theme')) {
          this.isDarkMode = e.matches
          this.applyTheme()
        }
      })
    }
  }
})
