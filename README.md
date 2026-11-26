# 🏓 Pong da Família

Jogo Pong em JavaScript, com placar de campeonato compartilhado.

🔗 **Jogue aqui:** https://pong-familia.vercel.app

Funciona em qualquer navegador, no PC ou no celular, sem instalar nada. É esse link que
você manda para os seus irmãos.

---

## 🎮 Como jogar

Vence quem fizer **10 pontos** primeiro. A cada ponto a bola volta à velocidade inicial
e acelera aos poucos (1,5× a cada 7 segundos, com um limite para não ficar impossível).

No menu, escolha o modo. Antes de cada partida aparece uma tela para digitar o nome;
é esse nome que vai para o placar.

- **1 Jogador (1 vs COM):** você contra o computador, em Fácil, Médio ou Difícil.
- **2 Jogadores:** dois no mesmo teclado, um com `W`/`S` e o outro com as setas.

| Tecla | Ação |
|---|---|
| `W` / `S` | Raquete da esquerda |
| `↑` / `↓` | Raquete da direita (2 jogadores) ou a sua (1 jogador) |
| `Enter` | Confirmar no menu |
| `L` | Ver o placar completo do campeonato (no menu principal) |
| `P` | Pausar |
| `R` | Reiniciar a partida |
| `M` | Ligar/desligar o som |
| `Q` | Voltar ao menu |

## 🏆 Campeonato

O campeonato é no modo **1 vs COM**, com duas categorias e um campeão em cada:

| Dificuldade | O que é |
|---|---|
| **Fácil** | Treino. Não conta para nada. |
| **Médio** | **Categoria 1** do campeonato. |
| **Difícil** | **Categoria 2** do campeonato. |
| **2 Jogadores** | Ranking à parte, só pela diversão. |

**Regras**

- Cada jogador pode jogar **5 partidas por dia em cada categoria** (5 no Médio e 5 no
  Difícil). Vitórias e derrotas contam para o limite. Na 6ª o jogo avisa e não deixa
  começar, até o dia seguinte (horário de Manaus). Treinar no Fácil é livre.
- As vitórias **se somam entre os dias**: basta entrar sempre com o mesmo nome.
  Maiúsculas não importam ("Ana" e "ana" são a mesma pessoa).
- Ganha cada categoria quem tiver mais vitórias. Empate: fica na frente quem jogou
  menos partidas.
- O período do campeonato (5 dias) ainda não foi definido. Enquanto não for, as partidas
  de Médio e Difícil contam todos os dias. Depois de definido, partidas fora do período
  viram treino.

**Onde ver**

- A tela inicial mostra o **top 3 de cada categoria** e o período.
- A tecla **L**, no menu, abre o placar completo: Categoria 1, Categoria 2 e 2 Jogadores,
  com vitórias e partidas de cada um.
- No canto da partida aparece o que ela vale (por exemplo, "Cat. 1 · Médio · partida 3/5
  hoje"), e a tela final confirma se ela foi registrada.

---

## 🗂 O que tem neste repositório

```
pong-familia/
├── web/index.html      # o jogo no navegador (é o que está publicado na Vercel)
├── pong.js             # versão para terminal (Node.js, sem dependências)
├── package.json        # atalho: npm start roda a versão de terminal
├── supabase/schema.sql # SQL que cria a tabela e a função do placar
└── docs/TERMINAL.md    # explicação técnica da versão de terminal
```

## ⚙️ Como está montado

| Peça | Onde fica |
|---|---|
| Código | GitHub: `wendel-git/pong-familia` |
| Site | Vercel: projeto `pong-familia` (time NeuraLab), publicado a partir da pasta `web/` |
| Placar | Supabase: projeto `pong-familia` (região São Paulo): `pong_matches` (uma linha por partida, inclusive treinos), `pong_ranking` (rankings) e `pong_settings` (período e limite diário) |

**Atualizar o jogo:** qualquer alteração enviada (`git push`) para a branch `main`
publica uma nova versão no mesmo link, automaticamente, em menos de um minuto.

**Segurança do placar:** o navegador só consegue *ler* as partidas e gravar uma partida
nova pela função `record_pong_match`, que confere a categoria, os nomes, o placar (quem
venceu precisa ter feito 10 pontos), o período e o limite diário. Ninguém consegue apagar
ou editar partidas pelo site. A chave que aparece no código (`SUPABASE_ANON_KEY`) é
pública por design; quem protege os dados são as regras do banco, em
[`supabase/schema.sql`](supabase/schema.sql).

**Definir o período** (quando vocês decidirem as datas), no SQL Editor do Supabase:
`update public.pong_settings set start_date = '2026-12-01', end_date = '2026-12-05';`
Na mesma tabela dá para mudar o limite diário (`daily_limit`).

**Ver todas as partidas:** no painel do Supabase, abra o Table Editor → `pong_matches`.
A coluna `counts` diz se a partida valeu para o campeonato.

**Zerar o campeonato** (por exemplo, antes do primeiro dia): no SQL Editor, rode
`truncate public.pong_matches restart identity;`.

---

## 🖥️ Versão de terminal

```bash
node pong.js
# se os caracteres aparecerem quebrados:
node pong.js --ascii
```

Precisa do [Node.js](https://nodejs.org/) instalado. Esta versão é mais antiga que a
web: é só contra o computador, vai até 5 pontos e não grava placar. Detalhes em
[`docs/TERMINAL.md`](docs/TERMINAL.md).
