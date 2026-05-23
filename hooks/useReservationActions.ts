import { useState } from 'react';
import { format, differenceInYears, parse } from 'date-fns';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { createReservationAtomic } from '@/src/services/reservations';

export function useReservationActions(formProps: any, showAlert: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<any | null>(null);

  const {
    formData, setFormErrors, portalMode, policyAccepted, date, time, guests, locationId, notes
  } = formProps;

  const validateForm = () => {
    const { reservationSchema } = require('@/src/schemas/reservationSchema');
    const result = reservationSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue: any) => {
        const path = issue.path[0] as string;
        if (!errors[path]) {
          errors[path] = issue.message;
        }
      });
      setFormErrors(errors);

      if (errors.birth_date === 'Apenas maiores de 18 anos podem reservar') {
        showAlert('Acesso Restrito', 'O Nárnia Club permite a entrada apenas para pessoas com 18 anos ou mais.', 'error');
      }

      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    
    if ((portalMode === 'mesa' || portalMode === 'camarote') && !policyAccepted) {
      showAlert('Termo de Aceite', 'Você precisa aceitar os termos e a política de reserva para continuar.', 'info');
      setIsSubmitting(false);
      return;
    }

    let expiresAt: string | null = null;
    if (portalMode === 'mesa') {
      expiresAt = `${date} 23:30:00`;
    } else if (portalMode === 'camarote') {
      try {
        const d = new Date(date + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        expiresAt = `${format(d, 'yyyy-MM-dd')} 02:00:00`;
      } catch (e) {
        expiresAt = `${date} 02:00:00`;
      }
    }

    try {
      const toIsoDate = (brDate: string) => {
        if (!brDate || brDate.length !== 10) return brDate;
        const [d, m, y] = brDate.split('/');
        return `${y}-${m}-${d}`;
      };

      const res = await createReservationAtomic({
        cpf: formData.cpf.replace(/\\D/g, ''),
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        birthDate: toIsoDate(formData.birth_date),
        date: date || format(new Date(), 'yyyy-MM-dd'),
        time: time || '22:00',
        guests: guests || 1,
        type: portalMode,
        locationId: locationId || '',
        notes,
        expiresAt
      });

      if (res && res.success) {
        setIsSuccess(true);
      } else {
        const errType = res?.error;
        const errMsg = res?.message || 'Erro desconhecido ao processar reserva.';
        
        if (errType === 'BLACKLISTED') {
          setBlacklistAlert({
            id: '',
            name: formData.name,
            cpf: formData.cpf.replace(/\\D/g, ''),
            cpf_digits: formData.cpf.replace(/\\D/g, ''),
            reason: res.reason || 'Consta na blacklist',
            end_date: res.end_date || '',
            created_at: null,
            start_date: null,
            blocked_by: null
          });
        } else if (errType === 'CPF_DUPLICATE') {
          showAlert('Cadastro Duplicado', errMsg, 'warning');
        } else if (errType === 'LOCATION_OCCUPIED') {
          showAlert('Mesa/Camarote Ocupado', errMsg, 'warning');
        } else if (errType === 'LIST_FULL') {
          showAlert('Lista de Evento Esgotada', errMsg, 'warning');
        } else {
          showAlert('Falha na Reserva', errMsg, 'error');
        }
      }
    } catch (e: any) {
      console.error('Erro ao enviar reserva:', e);
      showAlert('Erro de Processamento', 'Ocorreu uma falha na transação de reserva: ' + (e.message || e), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isSuccess,
    setIsSuccess,
    blacklistAlert,
    setBlacklistAlert,
    handleSubmit
  };
}
