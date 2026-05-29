export interface ClientRecord {
  id?: string;
  cpf: string;
  name: string;
  whatsapp: string;
  birth_date: string | null;
  reservations: any[];
  isBlacklisted: boolean;
  blacklistInfo: any | null;
  photo?: string | null;
}
