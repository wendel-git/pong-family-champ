# 🏓 Pong da Família

Jogo Pong em JavaScript, com placar de campeonato compartilhado.

🔗 **Jogue aqui:** https://pong-familia.vercel.app

Funciona em qualquer navegador, no PC ou no celular, sem instalar nada. É esse link que
você manda para os seus irmãos.

---

## 🎮 Como jogar

Vence quem fizer **10 pontos** primeiro. A cada ponto a bola volta à velocidade inicial
e acelera aos poucos (1,5× a cada 7 segundos, com um limite para não ficar impossível).

No menu, escolha o modo:

- **1 Jogador:** você contra o computador, em Fácil, Médio ou Difícil.
- **2 Jogadores:** dois no mesmo teclado. Aparece uma tela para digitar o nome de cada
  um antes de começar.

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

## 🏆 Placar do campeonato

Toda vitória fica gravada no banco de dados (Supabase) com o nome de quem venceu, e todo
mundo que abre o link vê o mesmo placar. O maior campeão aparece no topo do menu, e a
tecla **L** mostra a lista completa.

Duas observações:

- Use sempre o **mesmo nome** para acumular vitórias ("Ana" e "ana" contam como pessoas
  diferentes).
- No modo 1 Jogador, as vitórias do computador também entram no placar, como
  "Computador".

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
| Placar | Supabase: projeto `pong-familia` (região São Paulo), tabela `pong_champions` |

**Atualizar o jogo:** qualquer alteração enviada (`git push`) para a branch `main`
publica uma nova versão no mesmo link, automaticamente, em menos de um minuto.

**Segurança do placar:** o navegador só consegue *ler* a tabela e chamar a função
`increment_pong_win`, que soma exatamente +1 vitória por vez. Ninguém consegue apagar
ou inventar um placar pela API. A chave que aparece no código (`SUPABASE_ANON_KEY`) é
pública por design; quem protege os dados são as regras do banco, em
[`supabase/schema.sql`](supabase/schema.sql).

**Zerar o placar:** no painel do Supabase, abra o SQL Editor e rode
`delete from public.pong_champions;`.

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
