-- Enable RLS
alter table auth.users enable row level security;

-- Create tables
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  username text,
  role text not null check (role in ('photographer', 'assistant')) default 'photographer',
  team_id uuid
);

create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  notes text,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create table public.equipment (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  status text not null check (status in ('available', 'in_use', 'maintenance')) default 'available',
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  date timestamp with time zone not null,
  client_id uuid references public.clients(id) on delete set null,
  notes text,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Funzione per inserire un nuovo utente quando viene creato tramite auth.users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, username, role)
  values (new.id, new.email, new.raw_user_meta_data->>'username', coalesce(new.raw_user_meta_data->>'role', 'photographer'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger per inserire utente in tabella pubblica dopo registrazione
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security (RLS) policies
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.equipment enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;

-- Policy per utenti (visualizzazione solo del proprio profilo)
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

-- Policy per i clienti
create policy "Users can CRUD their own clients"
  on public.clients for all
  using (auth.uid() = user_id);

-- Policy per le attrezzature
create policy "Users can CRUD their own equipment"
  on public.equipment for all
  using (auth.uid() = user_id);

-- Policy per gli eventi
create policy "Users can CRUD their own events"
  on public.events for all
  using (auth.uid() = user_id);

-- Policy per i team
create policy "Users can CRUD their own teams"
  on public.teams for all
  using (auth.uid() = owner_id);

-- Create indexes for better performance
create index users_team_id_idx on public.users(team_id);
create index clients_user_id_idx on public.clients(user_id);
create index equipment_user_id_idx on public.equipment(user_id);
create index events_user_id_idx on public.events(user_id);
create index events_client_id_idx on public.events(client_id);

-- Create equipment_presets table
create table public.equipment_presets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  type text not null,
  equipment_ids uuid[] not null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for equipment_presets
alter table public.equipment_presets enable row level security;

-- Create RLS policies for equipment_presets
create policy "Users can view their own equipment presets"
  on public.equipment_presets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own equipment presets"
  on public.equipment_presets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own equipment presets"
  on public.equipment_presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own equipment presets"
  on public.equipment_presets for delete
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index idx_equipment_presets_user_id on public.equipment_presets(user_id);
create index idx_equipment_presets_type on public.equipment_presets(type);

-- Create trigger function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for equipment_presets
create trigger set_updated_at
  before update on public.equipment_presets
  for each row
  execute procedure public.handle_updated_at();