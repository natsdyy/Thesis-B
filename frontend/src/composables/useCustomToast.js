import { useToast } from 'vue-toastification';

export function useCustomToast() {
  const toast = useToast();

  const showSuccess = (message, title = 'Success!') => {
    return toast.success(message, {
      title,
      timeout: 4000,
    });
  };

  const showError = (message, title = 'Error!') => {
    return toast.error(message, {
      title,
      timeout: 6000,
    });
  };

  const showWarning = (message, title = 'Warning!') => {
    return toast.warning(message, {
      title,
      timeout: 5000,
    });
  };

  const showInfo = (message, title = 'Information!') => {
    return toast.info(message, {
      title,
      timeout: 4000,
    });
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
    showLoading,
    dismiss,
    dismissAll,
    toast, // Expose the original toast instance for advanced usage
  };
}
