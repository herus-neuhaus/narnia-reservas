-- Migration para sincronizar automaticamente auth.users com public.team_members

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  -- Extrair o nome do raw_user_meta_data
  v_name := new.raw_user_meta_data->>'name';
  
  -- Fallback seguro: se não houver nome, usa a primeira parte do email
  IF v_name IS NULL OR btrim(v_name) = '' THEN
    v_name := COALESCE(split_part(new.email, '@', 1), 'Usuário do Sistema');
  END IF;

  -- Inserir ou atualizar na tabela team_members
  -- ON CONFLICT no ID garante idempotência (caso o script/função rode mais de uma vez)
  INSERT INTO public.team_members (id, name, email, role, status)
  VALUES (
    new.id,
    v_name,
    new.email,
    'receptionist', -- Papel padrão seguro
    'active'
  )
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Garante que falhas no sincronismo não impeçam a criação do usuário no Supabase Auth
    RAISE LOG 'Falha na trigger handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Remover a trigger caso já exista para recriá-la limpamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar a trigger para disparar APÓS a inserção em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- OPCIONAL (Backfill): Sincronizar usuários antigos que já existem em auth.users mas não em team_members
INSERT INTO public.team_members (id, name, email, role, status)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Usuário do Sistema'),
  email,
  'receptionist',
  'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.team_members)
ON CONFLICT (id) DO NOTHING;
