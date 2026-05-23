import { useCustomAlert } from './use-custom-alert';
import { useReservationForm, PortalMode } from './useReservationForm';
import { useReservationQueries } from './useReservationQueries';
import { useReservationActions } from './useReservationActions';
import { formatCPF, formatPhone } from '@/lib/utils';

export { type PortalMode };

export function useReservation() {
  const { showAlert, alertProps } = useCustomAlert();
  
  const formProps = useReservationForm();
  
  const queryProps = useReservationQueries(
    formProps.date,
    formProps.portalMode,
    showAlert
  );
  
  const actionProps = useReservationActions(
    formProps,
    showAlert
  );

  const resetAll = () => {
    formProps.resetForm();
    actionProps.setIsSuccess(false);
    queryProps.setReservedLocations([]);
  };

  return {
    ...formProps,
    ...queryProps,
    ...actionProps,
    resetAll,
    formatCPF,
    formatPhone,
    alertProps,
    showAlert
  };
}
