import { useState } from 'react';
import { CustomAlertDialogProps } from '@/app/components/CustomAlertDialog';

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<Omit<CustomAlertDialogProps, 'isOpen' | 'onClose'> & { isOpen: boolean } | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    isConfirm = false,
    onConfirm?: () => void
  ) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type,
      isConfirm,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        hideAlert();
      }
    });
  };

  const hideAlert = () => {
    setAlertState(prev => prev ? { ...prev, isOpen: false } : null);
  };

  const alertProps: CustomAlertDialogProps = alertState ? {
    isOpen: alertState.isOpen,
    title: alertState.title,
    message: alertState.message,
    type: alertState.type,
    isConfirm: alertState.isConfirm,
    onConfirm: alertState.onConfirm,
    onClose: hideAlert
  } : {
    isOpen: false,
    title: '',
    message: '',
    onClose: () => {}
  };

  return { showAlert, alertProps };
}
