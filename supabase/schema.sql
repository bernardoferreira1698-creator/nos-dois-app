-- ============================================================
-- Nós Dois — esquema da base de dados (Supabase / Postgres)
-- Cola este ficheiro completo no SQL Editor do Supabase e corre-o.
-- Podes correr várias vezes sem problema (tudo usa "if not exists").
-- ============================================================

-- ---------- Perfis (um por pessoa, ligado ao login) ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Sem nome',
  created_at timestamptz not null default now());

-- Cria automaticamente um perfil quando alguém faz login pela primeira vez.
-- "set search_path = public" é necessário: este trigger corre no contexto
-- interno do Supabase Auth, que não encontra a tabela sem o caminho explícito.
create or replace function handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Sem nome'));
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Grupos (casal) ----------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now());

create table if not exists group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null unique references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id));

-- Garante no máximo 2 pessoas por grupo.
create or replace function check_group_size()
returns trigger
set search_path = public
as $$
begin
  if (select count(*) from group_members where group_id = new.group_id) >= 2 then
    raise exception 'Este grupo já tem 2 pessoas.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists before_group_member_insert on group_members;
create trigger before_group_member_insert
  before insert on group_members
  for each row execute function check_group_size();

-- Função auxiliar usada nas políticas de segurança abaixo.
create or replace function is_group_member(gid uuid)
returns boolean
security definer stable
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid());
$$ language sql;

-- Devolve o group_id da pessoa autenticada (ou null se não tiver grupo).
create or replace function my_group_id()
returns uuid
security definer stable
set search_path = public
as $$
  select group_id from group_members where user_id = auth.uid() limit 1;
$$ language sql;

-- ---------- Progresso do sorteio (partilhado pelo grupo) ----------
create table if not exists draw_progress (
  group_id uuid not null references groups (id) on delete cascade,
  category_id text not null,
  order_json jsonb not null,
  pos int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (group_id, category_id));

-- ---------- Ideias acrescentadas pelo casal ----------
create table if not exists custom_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  category_id text not null,
  text text not null,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now());

-- ---------- Histórico partilhado ----------
create table if not exists history (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  category_id text not null,
  text text not null,
  chosen_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  done boolean not null default false);

create table if not exists history_ratings (
  history_id uuid not null references history (id) on delete cascade,
  user_id uuid not null references profiles (id),
  rating smallint not null check (rating between 1 and 5),
  rated_at timestamptz not null default now(),
  primary key (history_id, user_id));

-- ---------- Favoritos partilhados ----------
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  category_id text not null,
  text text not null,
  added_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  unique (group_id, category_id, text));

-- ---------- Vales (atribuídos automaticamente, não sorteados) ----------
create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  assigned_to uuid not null references profiles (id),
  text text not null,
  status text not null default 'ativo'
    check (status in ('ativo', 'a_aguardar', 'usado', 'expirado')),
  has_time_limit boolean not null default false,
  expires_at timestamptz,
  used_requested_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now());

-- ---------- Subscrições de notificações push (Web Push) ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now());

-- ---------- Preferências de cada pessoa ----------
create table if not exists user_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  notifications_enabled boolean not null default true,
  spicy_auto_opt_in boolean not null default false);

-- ---------- Agendamento da notificação semanal surpresa ----------
create table if not exists weekly_schedule (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  scheduled_for timestamptz not null,
  category_id text, -- null = a app não escolhe, convida o casal a escolher
  sent boolean not null default false,
  created_at timestamptz not null default now());

-- ============================================================
-- Segurança: cada grupo só vê os seus próprios dados.
-- ============================================================
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table draw_progress enable row level security;
alter table custom_items enable row level security;
alter table history enable row level security;
alter table history_ratings enable row level security;
alter table favorites enable row level security;
alter table vouchers enable row level security;
alter table push_subscriptions enable row level security;
alter table user_settings enable row level security;
alter table weekly_schedule enable row level security;

-- profiles: todos os utilizadores autenticados podem ver nomes (necessário
-- para mostrar o nome do parceiro), mas só editam o seu próprio.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select to authenticated using (true);
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update to authenticated using (id = auth.uid());

-- groups: só membros veem o próprio grupo; criar um grupo é sempre permitido.
-- "created_by = auth.uid()" permite a quem acabou de criar o grupo lê-lo de
-- volta antes de a linha em group_members existir (acontece logo a seguir).
drop policy if exists "groups_select" on groups;
create policy "groups_select" on groups for select to authenticated
  using (is_group_member(id) or created_by = auth.uid());
drop policy if exists "groups_insert" on groups;
create policy "groups_insert" on groups for insert to authenticated with check (created_by = auth.uid());

-- group_members: ver apenas o próprio grupo; juntar-se é inserir a própria linha.
drop policy if exists "group_members_select" on group_members;
create policy "group_members_select" on group_members for select to authenticated using (is_group_member(group_id));
drop policy if exists "group_members_insert" on group_members;
create policy "group_members_insert" on group_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "group_members_delete_own" on group_members;
create policy "group_members_delete_own" on group_members for delete to authenticated using (user_id = auth.uid());

-- Todas as tabelas de conteúdo do grupo seguem o mesmo padrão:
drop policy if exists "draw_progress_all" on draw_progress;
create policy "draw_progress_all" on draw_progress for all to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "custom_items_all" on custom_items;
create policy "custom_items_all" on custom_items for all to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "history_all" on history;
create policy "history_all" on history for all to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "history_ratings_all" on history_ratings;
create policy "history_ratings_all" on history_ratings for all to authenticated
  using (exists (select 1 from history h where h.id = history_id and is_group_member(h.group_id)))
  with check (user_id = auth.uid());

drop policy if exists "favorites_all" on favorites;
create policy "favorites_all" on favorites for all to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "vouchers_all" on vouchers;
create policy "vouchers_all" on vouchers for all to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "weekly_schedule_all" on weekly_schedule;
create policy "weekly_schedule_all" on weekly_schedule for all to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

-- push_subscriptions e user_settings: só a própria pessoa.
drop policy if exists "push_subscriptions_own" on push_subscriptions;
create policy "push_subscriptions_own" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_settings_own" on user_settings;
create policy "user_settings_own" on user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Entrar num grupo por código.
-- Corre com privilégios elevados (security definer) só para poder
-- encontrar o grupo pelo código antes de a pessoa ser membro — sem isto,
-- as regras de segurança acima impediam a busca.
-- ============================================================
create or replace function join_group(p_code text)
returns uuid
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from groups where code = upper(p_code);

  if gid is null then
    raise exception 'Código inválido.';
  end if;

  if exists (select 1 from group_members where user_id = auth.uid()) then
    raise exception 'Já pertences a um grupo.';
  end if;

  if (select count(*) from group_members where group_id = gid) >= 2 then
    raise exception 'Este grupo já tem 2 pessoas.';
  end if;

  insert into group_members (group_id, user_id) values (gid, auth.uid());
  return gid;
end;
$$ language plpgsql;

grant execute on function join_group(text) to authenticated;

-- Preenche automaticamente "quem" fez cada coisa com a pessoa autenticada,
-- para o frontend não precisar de o enviar sempre.
alter table groups alter column created_by set default auth.uid();
alter table history alter column chosen_by set default auth.uid();
alter table favorites alter column added_by set default auth.uid();
alter table custom_items alter column created_by set default auth.uid();

-- ============================================================
-- Tempo real: quando um de vocês faz algo, o outro vê logo, sem recarregar.
-- (o bloco "do" evita erro se correres este ficheiro outra vez)
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array['history', 'history_ratings', 'favorites', 'custom_items', 'vouchers', 'draw_progress', 'group_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- Avaliações às cegas: cada um só vê a nota do outro depois de ter dado a
-- sua própria. Isto corre na base de dados (não só escondido no ecrã) para
-- que não haja mesmo forma de "espreitar" a nota do outro primeiro.
-- ============================================================
alter table history add column if not exists vouchers_granted boolean not null default false;

create or replace view history_with_ratings
with (security_invoker = true)
as
select
  h.id,
  h.group_id,
  h.category_id,
  h.text,
  h.done,
  h.created_at,
  h.chosen_by,
  p.name as chosen_by_name,
  mine.rating as my_rating,
  case when mine.rating is not null then theirs.rating else null end as partner_rating
from history h
left join profiles p on p.id = h.chosen_by
left join history_ratings mine on mine.history_id = h.id and mine.user_id = auth.uid()
left join history_ratings theirs on theirs.history_id = h.id and theirs.user_id <> auth.uid()
where is_group_member(h.group_id);

grant select on history_with_ratings to authenticated;

-- ============================================================
-- Regista quem marcou o vale como usado (quem "cumpriu" o favor), que é
-- diferente de quem o recebeu (assigned_to).
-- ============================================================
alter table vouchers add column if not exists used_by uuid references profiles (id);
