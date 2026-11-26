-- ============================================================
-- Pong da Família — banco do campeonato (Supabase)
-- ============================================================
-- Para recriar do zero: no painel do Supabase, abra o SQL Editor,
-- cole este arquivo inteiro e clique em "Run".
--
-- Categorias:
--   '1p' = 1 vs COM     -> quem tiver mais vitórias aqui é o campeão
--   '2p' = 2 jogadores  -> ranking à parte
-- ============================================================

-- Uma linha por partida terminada. O ranking é calculado a partir daqui.
create table if not exists public.pong_matches (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category text not null check (category in ('1p','2p')),
  difficulty text check (difficulty in ('Fácil','Médio','Difícil')),
  player1 text not null,
  player2 text not null,
  score1 int not null,
  score2 int not null,
  winner text not null
);

alter table public.pong_matches enable row level security;

-- Qualquer pessoa pode LER as partidas. Não há política de insert/update/delete:
-- a única forma de gravar é a função abaixo.
drop policy if exists "Qualquer um pode ler as partidas" on public.pong_matches;
create policy "Qualquer um pode ler as partidas"
  on public.pong_matches for select
  to anon, authenticated
  using (true);

-- Valida a partida e define o vencedor pelo placar (quem fez 10 pontos).
create or replace function public.record_pong_match(
  p_category text, p_difficulty text,
  p_player1 text, p_player2 text,
  p_score1 int, p_score2 int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n1 text := btrim(coalesce(p_player1, ''));
  n2 text := btrim(coalesce(p_player2, ''));
  win_score constant int := 10;
begin
  if p_category not in ('1p','2p') then
    raise exception 'categoria inválida';
  end if;
  if length(n1) not between 1 and 20 or length(n2) not between 1 and 20 then
    raise exception 'nome precisa ter de 1 a 20 caracteres';
  end if;
  if p_category = '1p' then
    if n2 <> 'Computador' or lower(n1) = 'computador' then
      raise exception 'no 1 vs COM o jogador 2 é sempre o Computador';
    end if;
    if p_difficulty not in ('Fácil','Médio','Difícil') then
      raise exception 'dificuldade inválida';
    end if;
  else
    if lower(n1) = 'computador' or lower(n2) = 'computador' then
      raise exception 'nome reservado';
    end if;
    if lower(n1) = lower(n2) then
      raise exception 'os dois jogadores precisam ter nomes diferentes';
    end if;
    p_difficulty := null;
  end if;
  if not ((p_score1 = win_score and p_score2 between 0 and win_score - 1)
       or (p_score2 = win_score and p_score1 between 0 and win_score - 1)) then
    raise exception 'placar inválido';
  end if;

  insert into public.pong_matches (category, difficulty, player1, player2, score1, score2, winner)
  values (p_category, p_difficulty, n1, n2, p_score1, p_score2,
          case when p_score1 = win_score then n1 else n2 end);
end;
$$;

-- A chave pública (usada no navegador) pode chamar a função.
-- O Supabase avisa que isso é "público": é intencional, é assim que o site grava.
grant execute on function public.record_pong_match(text, text, text, text, int, int) to anon, authenticated;

-- Ranking por categoria. O Computador não entra. "Ana" e "ana" são a mesma pessoa;
-- o nome exibido é o da partida mais recente.
create or replace view public.pong_ranking
with (security_invoker = true) as
with appearances as (
  select category, created_at, id, player1 as name, lower(winner) = lower(player1) as won from public.pong_matches
  union all
  select category, created_at, id, player2 as name, lower(winner) = lower(player2) as won from public.pong_matches
)
select category,
       (array_agg(name order by created_at desc, id desc))[1] as name,
       count(*) filter (where won)::int as wins,
       count(*)::int as games
from appearances
where lower(name) <> 'computador'
group by category, lower(name);

grant select on public.pong_ranking to anon, authenticated;
