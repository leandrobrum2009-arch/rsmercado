-- 1. Atualizar função is_admin com bypass e segurança correta
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth 
AS $BODY$
BEGIN
  -- 1. Master bypass por email (JWT check)
  IF (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- 2. Verificar tabela de roles
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END; $BODY$;

-- 2. Garantir que o administrador principal esteja na tabela user_roles
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;
END $$;

-- 3. Limpar políticas antigas da tabela orders
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;

-- 4. Criar novas políticas unificadas para orders
-- Permite que qualquer pessoa insira um pedido (checkout)
CREATE POLICY "Anyone can insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Permite que usuários vejam seus próprios pedidos ou administradores vejam todos
CREATE POLICY "Users and admins can view orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

-- Permite que apenas administradores atualizem pedidos (mudar status)
CREATE POLICY "Only admins can update orders" 
ON public.orders FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Permite que administradores deletem pedidos se necessário
CREATE POLICY "Only admins can delete orders" 
ON public.orders FOR DELETE 
USING (public.is_admin());

-- 5. Garantir que RLS está ativado
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
