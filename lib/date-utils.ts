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
  
  const currentPvTime = getPortoVelhoTime();
  const [currentDate, currentTime] = currentPvTime.split(' ');
  const limitTime = event.list_limit_time;
  
  const [limitH] = limitTime.split(':').map(Number);
  const limitDayOffset = limitH < 12 ? 1 : 0;
  
  const buildAbsolute = (dateStr: string, timeStr: string, dayOffset: number) => {
     const d = new Date(dateStr + 'T12:00:00Z');
     d.setDate(d.getDate() + dayOffset);
     const yyyy = d.getFullYear();
     const mm = String(d.getMonth() + 1).padStart(2, '0');
     const dd = String(d.getDate()).padStart(2, '0');
     return `${yyyy}${mm}${dd}${timeStr.replace(/:/g, '')}`;
  };
  
  const currentAbs = currentDate.replace(/-/g, '') + currentTime.replace(/:/g, '');
  const limitAbs = buildAbsolute(selectedDate, limitTime, limitDayOffset);
  
  return currentAbs > limitAbs;
};
