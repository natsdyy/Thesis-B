import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // Light mode only - dark mode removed
  }),

  getters: {
    // Light mode theme classes only
    themeClasses: () => ({
      // Background classes
      mainBg: 'bg-gray-50',
      cardBg: 'bg-white',
      headerBg: 'bg-white border-gray-200',
      sidebarBg: 'bg-white',
      
      // Text classes
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      
      // Border classes
      border: 'border-gray-200',
      borderLight: 'border-gray-100',
      
      // Hover states
      hoverBg: 'hover:bg-gray-50',
      hoverBgLight: 'hover:bg-gray-100',
      
      // Input styles
      input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
      
      // Table styles
      tableRow: 'hover:bg-gray-50',
      tableHeader: 'bg-gray-50 text-gray-900',
      
      // Modal styles
      modal: 'bg-white text-gray-900',
      modalBackdrop: 'bg-black bg-opacity-50'
    }),
    
    // Keep isDarkMode as a getter for backwards compatibility (always returns false)
    isDarkMode: () => false
  },

  actions: {
    // Minimal initialization - just set light theme
    initializeTheme() {
      // Apply light theme only
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.classList.remove('dark')
    }
  }
})
