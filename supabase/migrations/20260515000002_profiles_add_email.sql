-- Add email column to profiles
alter table public.profiles add column if not exists email text;

-- Update trigger to capture email on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, last_name, first_name, gender, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'gender',
    new.email
  );
  return new;
end;
$$;
