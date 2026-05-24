export const getPortoVelhoTime = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Porto_Velho',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${getValue('year')}-${getValue('month')}-${getValue('day')} ${getValue('hour')}:${getValue('minute')}:${getValue('second')}`;
};

export const isCortesiaExpired = (event: any, selectedDate: string) => {
  if (!event || !event.list_limit_time) return false;
  
  const limitDate = new Date(event.list_limit_time);
  if (isNaN(limitDate.getTime())) return false;
  
  const now = new Date();
  return now > limitDate;
};
