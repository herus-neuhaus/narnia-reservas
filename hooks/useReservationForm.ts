import { useState } from 'react';

export type PortalMode = 'landing' | 'mesa' | 'camarote' | 'lista' | 'promocoes' | 'check';

export function useReservationForm() {
  const [portalMode, setPortalMode] = useState<PortalMode>('landing');
  const [activeStep, setActiveStep] = useState(1);
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    whatsapp: '', 
    cpf: '', 
    birth_date: '' 
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchCpf, setSearchCpf] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [isCpfLoading, setIsCpfLoading] = useState(false);

  const resetForm = () => {
    setActiveStep(1);
    setDate('');
    setGuests(null);
    setTime('');
    setLocationId(null);
    setNotes('');
    setPolicyAccepted(false);
    setFormData({ name: '', email: '', whatsapp: '', cpf: '', birth_date: '' });
    setFormErrors({});
    setPortalMode('landing');
  };

  const handleModeChange = (mode: PortalMode) => {
    resetForm();
    setPortalMode(mode);
  };

  return {
    portalMode, setPortalMode,
    activeStep, setActiveStep,
    date, setDate,
    guests, setGuests,
    time, setTime,
    notes, setNotes,
    locationId, setLocationId,
    formData, setFormData,
    formErrors, setFormErrors,
    searchCpf, setSearchCpf,
    policyAccepted, setPolicyAccepted,
    isCpfLoading, setIsCpfLoading,
    resetForm, handleModeChange
  };
}
