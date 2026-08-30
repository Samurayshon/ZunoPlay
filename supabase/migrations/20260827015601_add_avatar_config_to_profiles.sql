alter table public.profiles add column if not exists avatar_config jsonb;
comment on column public.profiles.avatar_config is 'Configuração estruturada do avatar personalizável do ZunoPlay.';
