import { z } from 'zod';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { differenceInYears, parse } from 'date-fns';

export const reservationSchema = z.object({
  name: z.string().trim().min(1, { message: 'Nome é obrigatório' }),
  cpf: z.string().trim().min(1, { message: 'CPF é obrigatório' }).refine(
    (val) => cpfValidator.isValid(val),
    { message: 'CPF inválido' }
  ),
  whatsapp: z.string().trim().min(14, { message: 'Telefone inválido' }),
  birth_date: z.string().min(10, { message: 'Data de nascimento inválida' }).refine(
    (val) => {
      if (val.length !== 10) return false;
      const age = differenceInYears(new Date(), parse(val, 'dd/MM/yyyy', new Date()));
      return age >= 18;
    },
    { message: 'Apenas maiores de 18 anos podem reservar' }
  )
});
