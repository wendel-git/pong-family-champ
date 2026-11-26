-- ============================================================
-- Pong da Família — banco do campeonato (Supabase)
-- ============================================================
-- Para recriar do zero: no painel do Supabase, abra o SQL Editor,
-- cole este arquivo inteiro e clique em "Run".
--
-- Regras:
--   Categoria 1 = 1 vs COM no Médio   (ranking 'medio')
--   Categoria 2 = 1 vs COM no Difícil (ranking 'dificil')
--   Fácil = treino, não conta.  2 Jogadores = ranking à parte ('2p').
--   Cada jogador pode jogar até daily_limit partidas por dia em cada categoria
--   (dia no fuso de time_zone). Fora do período (start_date..end_date) vira treino.
--
-- Definir o período:
--   update public.pong_settings set start_date = '2026-12-01', end_date = '2026-12-05';
-- Zerar o campeonato:
--   truncate public.pong_matches restart identity;
-- ============================================================

-- Regras do campeonato (uma linha só).
create table if not exists public.pong_settings (
  id int primary key default 1 check (id = 1),
  start_date date,               -- null = período ainda não definido: Médio/Difícil contam todo dia
  end_date date,
  daily_limit int not null default 5 check (daily_limit between 1 and 100),
  time_zone text not null default 'America/Manaus'
);
insert into public.pong_settings (id) values (1) on conflict (id) do nothing;
alter table public.pong_settings enable row level security;
drop policy if exists "Qualquer um pode ler as regras" on public.pong_settings;
create policy "Qualquer um pode ler as regras" on public.pong_settings
  for select to anon, authenticated using (true);

-- Uma linha por partida terminada (inclusive treinos).
create table if not exists public.pong_matches (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category text not null check (category in ('1p','2p')),   -- 1p = 1 vs COM, 2p = 2 jogadores
  difficulty text check (difficulty in ('Fácil','Médio','Difícil')),
  player1 text not null,
  player2 text not null,
  score1 int not null,
  score2 int not null,
  winner text not null,
  counts boolean not null default false   -- true = vale para o campeonato
);
alter table public.pong_matches enable row level security;
-- Qualquer pessoa pode LER as partidas. Não há política de insert/update/delete:
-- a única forma de gravar é a função record_pong_match.
drop policy if exists "Qualquer um pode ler as partidas" on public.pong_matches;
create policy "Qualquer um pode ler as partidas" on public.pong_matches
  for select to anon, authenticated using (true);

-- Situação de um jogador hoje numa dificuldade (o jogo consulta antes de começar).
create or replace function public.pong_player_status(p_name text, p_difficulty text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  s public.pong_settings;
  today date;
  played int;
begin
  select * into s from public.pong_settings where id = 1;
  today := (now() at time zone s.time_zone)::date;
  select count(*) into played from public.pong_matches
   where counts and category = '1p' and difficulty = p_difficulty
     and lower(player1) = lower(btrim(coalesce(p_name, '')))
     and (created_at at time zone s.time_zone)::date = today;
  return json_build_object(
    'championship', coalesce(p_difficulty in ('Médio','Difícil'), false),
    'in_period', (s.start_date is null or today >= s.start_date) and (s.end_date is null or today <= s.end_date),
    'played_today', played,
    'daily_limit', s.daily_limit,
    'start_date', s.start_date,
    'end_date', s.end_date,
    'today', today);
end;
$$;
grant execute on function public.pong_player_status(text, text) to anon, authenticated;

-- Grava uma partida aplicando as regras. Devolve {counts, played_today, daily_limit}.
create or replace function public.record_pong_match(
  p_category text, p_difficulty text,
  p_player1 text, p_player2 text,
  p_score1 int, p_score2 int
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  n1 text := btrim(coalesce(p_player1, ''));
  n2 text := btrim(coalesce(p_player2, ''));
  win_score constant int := 10;
  s public.pong_settings;
  today date;
  played int := 0;
  does_count boolean := false;
begin
  if p_category not in ('1p','2p') then raise exception 'categoria inválida'; end if;
  if length(n1) not between 1 and 20 or length(n2) not between 1 and 20 then
    raise exception 'nome precisa ter de 1 a 20 caracteres';
  end if;
  if p_category = '1p' then
    if n2 <> 'Computador' or lower(n1) = 'computador' then
      raise exception 'no 1 vs COM o jogador 2 é sempre o Computador';
    end if;
    if p_difficulty not in ('Fácil','Médio','Difícil') then raise exception 'dificuldade inválida'; end if;
  else
    if lower(n1) = 'computador' or lower(n2) = 'computador' then raise exception 'nome reservado'; end if;
    if lower(n1) = lower(n2) then raise exception 'os dois jogadores precisam ter nomes diferentes'; end if;
    p_difficulty := null;
  end if;
  if not ((p_score1 = win_score and p_score2 between 0 and win_score - 1)
       or (p_score2 = win_score and p_score1 between 0 and win_score - 1)) then
    raise exception 'placar inválido';
  end if;

  if p_category = '1p' and p_difficulty in ('Médio','Difícil') then
    -- uma gravação por vez para o mesmo jogador/dificuldade, para o limite não falhar
    perform pg_advisory_xact_lock(hashtext(lower(n1) || '|' || p_difficulty));
    select * into s from public.pong_settings where id = 1;
    today := (now() at time zone s.time_zone)::date;
    if (s.start_date is null or today >= s.start_date) and (s.end_date is null or today <= s.end_date) then
      select count(*) into played from public.pong_matches
       where counts and category = '1p' and difficulty = p_difficulty
         and lower(player1) = lower(n1)
         and (created_at at time zone s.time_zone)::date = today;
      if played >= s.daily_limit then
        raise exception 'limite diário atingido: % já jogou % partidas de % hoje', n1, played, p_difficulty;
      end if;
      does_count := true;
    end if;
  end if;

  insert into public.pong_matches (category, difficulty, player1, player2, score1, score2, winner, counts)
  values (p_category, p_difficulty, n1, n2, p_score1, p_score2,
          case when p_score1 = win_score then n1 else n2 end, does_count);

  return json_build_object('counts', does_count,
                           'played_today', played + case when does_count then 1 else 0 end,
                           'daily_limit', coalesce(s.daily_limit, 0));
end;
$$;
-- A chave pública (usada no navegador) pode chamar as funções.
-- O Supabase avisa que isso é "público": é intencional, é assim que o site grava.
grant execute on function public.record_pong_match(text, text, text, text, int, int) to anon, authenticated;

-- Rankings: 'medio' (Categoria 1) e 'dificil' (Categoria 2) usam só partidas que contam;
-- '2p' é o ranking à parte. O Computador não entra. "Ana" e "ana" são a mesma pessoa;
-- o nome exibido é o da partida mais recente.
create or replace view public.pong_ranking
with (security_invoker = true) as
with appearances as (
  select case when category = '2p' then '2p' when difficulty = 'Médio' then 'medio' else 'dificil' end as board,
         created_at, id, player1 as name, lower(winner) = lower(player1) as won
    from public.pong_matches where category = '2p' or counts
  union all
  select '2p', created_at, id, player2, lower(winner) = lower(player2)
    from public.pong_matches where category = '2p'
)
select board,
       (array_agg(name order by created_at desc, id desc))[1] as name,
       count(*) filter (where won)::int as wins,
       count(*)::int as games
from appearances
where lower(name) <> 'computador'
group by board, lower(name);
grant select on public.pong_ranking to anon, authenticated;
