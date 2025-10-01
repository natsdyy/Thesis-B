import { useToast } from 'vue-toastification';

export function useCustomToast() {
  const toast = useToast();

  const showSuccess = (message, title = 'Success!') => {
    return toast.success(message, {
      title,
      timeout: 4000,
      icon: 'fas fa-check',
    });
  };

  const showError = (message, title = 'Error!') => {
    return toast.error(message, {
      title,
      timeout: 6000,
      icon: 'fas fa-times',
    });
  };

  const showWarning = (message, title = 'Warning!') => {
    return toast.warning(message, {
      title,
      timeout: 5000,
      icon: 'fas fa-exclamation-triangle',
    });
  };

  const showInfo = (message, title = 'Information!') => {
    return toast.info(message, {
      title,
      timeout: 4000,
      icon: 'fas fa-info',
    });
  };

  // Generic helper to keep legacy calls working: showToast(message, type)
  const showToast = (message, type = 'info') => {
    const t = String(type || 'info').toLowerCase();
    if (t === 'success') return showSuccess(message);
    if (t === 'error') return showError(message);
    if (t === 'warning') return showWarning(message);
    return showInfo(message);
  };

  const showLoading = (message, title = 'Loading...') => {
    return toast.info(message, {
      title,
      timeout: 0, // No auto-close for loading
      icon: 'fas fa-spinner fa-spin',
      closeOnClick: false,
      draggable: false,
    });
  };

  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  const dismissAll = () => {
    toast.clear();
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
    showLoading,
    dismiss,
    dismissAll,
    toast, // Expose the original toast instance for advanced usage
  };
}
