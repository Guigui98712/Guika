-- Create the diario_obra table
create table diario_obra (
  id bigserial primary key,
  obra_id bigint references obras(id) on delete cascade,
  data date not null,
  descricao text not null,
  observacoes text,
  etapas_iniciadas text[] default '{}',
  etapas_concluidas text[] default '{}',
  fotos text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create table for tracking etapas dates
create table etapas_datas (
  id bigserial primary key,
  obra_id bigint references obras(id) on delete cascade,
  etapa_nome text not null,
  data_inicio date not null,
  data_fim date,
  status text not null default 'em_andamento',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
create index diario_obra_data_idx on diario_obra(data);
create index diario_obra_obra_id_idx on diario_obra(obra_id);
create index etapas_datas_obra_id_idx on etapas_datas(obra_id);

-- Enable RLS
alter table diario_obra enable row level security;
alter table etapas_datas enable row level security;

-- Create policies
create policy "Permitir select para todos" on diario_obra
  for select using (true);

create policy "Permitir insert para todos" on diario_obra
  for insert with check (true);

create policy "Permitir update para todos" on diario_obra
  for update using (true);

create policy "Permitir delete para todos" on diario_obra
  for delete using (true);

-- Policies for etapas_datas
create policy "Permitir select para todos" on etapas_datas
  for select using (true);

create policy "Permitir insert para todos" on etapas_datas
  for insert with check (true);

create policy "Permitir update para todos" on etapas_datas
  for update using (true);

create policy "Permitir delete para todos" on etapas_datas
  for delete using (true); 