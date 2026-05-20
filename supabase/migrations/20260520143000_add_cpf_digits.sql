-- Migration: Add normalized CPF digits column
-- Description: Adds a `cpf_digits` column to `customers` and `blacklist` tables.
--              It populates `cpf_digits` by extracting only numeric characters from the `cpf` column.
--              Also adds indexes and triggers to keep `cpf_digits` automatically normalized on insert/update.
--              Corrects the reservations_customer_id_fkey relation to point to customers.

-- 1. Create normalization function if it doesn't exist
CREATE OR REPLACE FUNCTION public.normalize_cpf_digits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL THEN
    NEW.cpf_digits := regexp_replace(NEW.cpf, '[^0-9]', '', 'g');
  ELSE
    NEW.cpf_digits := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Modify customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf_digits VARCHAR(11);

-- Populate existing rows
UPDATE public.customers
SET cpf_digits = regexp_replace(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL AND (cpf_digits IS NULL OR cpf_digits = '');

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_customers_cpf_digits ON public.customers(cpf_digits);

-- Create trigger for automatic normalization
DROP TRIGGER IF EXISTS trg_normalize_customers_cpf ON public.customers;
CREATE TRIGGER trg_normalize_customers_cpf
BEFORE INSERT OR UPDATE OF cpf ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_cpf_digits();

-- 3. Modify blacklist table
ALTER TABLE public.blacklist ADD COLUMN IF NOT EXISTS cpf_digits VARCHAR(11);

-- Populate existing rows
UPDATE public.blacklist
SET cpf_digits = regexp_replace(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL AND (cpf_digits IS NULL OR cpf_digits = '');

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_blacklist_cpf_digits ON public.blacklist(cpf_digits);

-- Create trigger for automatic normalization
DROP TRIGGER IF EXISTS trg_normalize_blacklist_cpf ON public.blacklist;
CREATE TRIGGER trg_normalize_blacklist_cpf
BEFORE INSERT OR UPDATE OF cpf ON public.blacklist
FOR EACH ROW
EXECUTE FUNCTION public.normalize_cpf_digits();

-- 4. Correct foreign key reservations_customer_id_fkey
ALTER TABLE public.reservations 
  DROP CONSTRAINT IF EXISTS reservations_customer_id_fkey;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE SET NULL;
