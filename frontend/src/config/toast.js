// Custom toast configuration to match the design in the image
export const toastConfig = {
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
  icon: {
    success: 'fas fa-check',
    error: 'fas fa-times',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info',
  },
  rtl: false,
  transition: 'Vue-Toastification__bounce',
  maxToasts: 5,
  newestOnTop: true,
  filterBeforeCreate: (toast, toasts) => {
    if (toasts.filter((t) => t.type === toast.type).length !== 0) {
      return false;
    }
    return toast;
  },
  // Custom toast classes
  toastClassName: 'custom-toast',
  bodyClassName: 'custom-toast-body',
  progressClassName: 'custom-toast-progress',
  // Custom toast content
  toastDefaults: {
    success: {
      title: 'Success!',
      timeout: 4000,
    },
    error: {
      title: 'Error!',
      timeout: 6000,
    },
    warning: {
      title: 'Warning!',
      timeout: 5000,
    },
    info: {
      title: 'Information!',
      timeout: 4000,
    },
  },
};
