alter table public.profiles drop constraint if exists profiles_avatar_url_format_check;
alter table public.profiles add constraint profiles_avatar_url_format_check check (
  avatar_url is null
  or avatar_url ~ '^data:image/(svg\+xml|png|jpeg|webp);'
  or avatar_url ~ '^https://'
);
alter table public.profiles drop constraint if exists profiles_avatar_config_object_check;
alter table public.profiles add constraint profiles_avatar_config_object_check check (
  avatar_config is null or jsonb_typeof(avatar_config) = 'object'
);
