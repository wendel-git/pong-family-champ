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
| `L` | Ver o placar do campeonato (no menu principal) |
| `P` | Pausar |
| `R` | Reiniciar a partida |
| `M` | Ligar/desligar o som |
| `Q` | Voltar ao menu |

## 🏆 Campeonato

O campeonato tem duas categorias, cada uma com o seu ranking:

| Categoria | Conta para o título? |
|---|---|
| **1 vs COM** | **Sim.** Quem tiver mais vitórias contra o computador é o campeão. |
| **2 Jogadores** | Não. É um ranking à parte, só pela diversão. |

- O líder do campeonato aparece no topo do menu. A tecla **L** mostra os dois rankings
  completos, com vitórias e partidas jogadas de cada um.
- Desempate: com o mesmo número de vitórias, fica na frente quem jogou menos partidas.
- Toda partida terminada é gravada no banco de dados (Supabase), e todo mundo que abre
  o link vê o mesmo placar.
- Use sempre o **mesmo nome**. Maiúsculas não importam: "Ana" e "ana" são a mesma pessoa.
- O computador não entra no ranking, e ninguém pode usar o nome "Computador".
- Vitórias contra o COM valem o mesmo em qualquer dificuldade. A dificuldade de cada
  partida fica gravada, caso vocês queiram mudar essa regra depois.

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
| Placar | Supabase: projeto `pong-familia` (região São Paulo): tabela `pong_matches` (uma linha por partida) e ranking `pong_ranking` |

**Atualizar o jogo:** qualquer alteração enviada (`git push`) para a branch `main`
publica uma nova versão no mesmo link, automaticamente, em menos de um minuto.

**Segurança do placar:** o navegador só consegue *ler* as partidas e gravar uma partida
nova pela função `record_pong_match`, que confere a categoria, os nomes e o placar
(quem venceu precisa ter feito 10 pontos). Ninguém consegue apagar ou editar partidas
pelo site. A chave que aparece no código (`SUPABASE_ANON_KEY`) é pública por design;
quem protege os dados são as regras do banco, em [`supabase/schema.sql`](supabase/schema.sql).

**Ver todas as partidas:** no painel do Supabase, abra o Table Editor → `pong_matches`.

**Zerar o campeonato:** no painel do Supabase, abra o SQL Editor e rode
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
