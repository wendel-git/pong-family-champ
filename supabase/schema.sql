-- ============================================================
-- Pong — placar de campeões no Supabase
-- ============================================================
-- Como usar:
--   1. No painel do seu projeto Supabase, abra "SQL Editor".
--   2. Cole TODO o conteúdo deste arquivo e clique em "Run".
--   3. Pronto — a tabela e a função de incremento seguro já existem.
-- ============================================================

-- Tabela com o total de vitórias de cada nome
create table if not exists public.pong_champions (
  name text primary key,
  wins integer not null default 0
);

-- Ativa Row Level Security (ninguém lê/escreve nada a não ser pelas regras abaixo)
alter table public.pong_champions enable row level security;

-- Qualquer pessoa (inclusive a chave pública "anon" usada no navegador) pode LER o placar
drop policy if exists "Qualquer um pode ler o placar" on public.pong_champions;
create policy "Qualquer um pode ler o placar"
  on public.pong_champions
  for select
  using (true);

-- IMPORTANTE: não criamos política de INSERT/UPDATE direto para "anon".
-- Toda escrita acontece só através da função abaixo (increment_pong_win),
-- que soma exatamente +1 por vitória — assim ninguém consegue, por exemplo,
-- forjar um placar de 9999 vitórias direto pela API.
create or replace function public.increment_pong_win(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pong_champions (name, wins)
  values (p_name, 1)
  on conflict (name) do update set wins = pong_champions.wins + 1;
end;
$$;

-- Permite que a chave pública ("anon", a que vai no código do jogo) chame essa função
grant execute on function public.increment_pong_win(text) to anon;
