# 🏓 Pong no Terminal

Jogo Pong completo, feito em **Node.js puro** (sem nenhuma dependência externa), para jogar
direto no terminal — inclusive no terminal integrado do **VS Code no Windows**.

![modo](https://img.shields.io/badge/node-%3E%3D16-green) ![sem dependências](https://img.shields.io/badge/depend%C3%AAncias-nenhuma-blue)

---

## ▶️ Como rodar

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado (testado na v22, compatível com v16+).
- Um terminal de verdade (não funciona em painéis de saída que não sejam interativos).

### Passo a passo
```bash
# 1. clone o repositório
git clone <url-do-seu-repositorio>
cd pong-terminal

# 2. rode o jogo
node pong.js
```

Se estiver usando o **VS Code**: abra a pasta do projeto, abra o **Terminal Integrado**
(`Ctrl + '` ou menu *Terminal > Novo Terminal*) e rode `node pong.js` nele — não use o painel
"Output"/"Depuração", pois eles não são terminais interativos.

Se os caracteres `█`, `●`, `═` aparecerem quebrados ou como quadrados/pontos de interrogação,
rode com o modo ASCII simplificado:
```bash
node pong.js --ascii
```

---

## 🎮 Como jogar

- Você controla a **raquete da esquerda** contra o **computador** (raquete da direita).
- Vence quem fizer **5 pontos** primeiro.

| Tecla            | Ação                                   |
|------------------|-----------------------------------------|
| `W` / `↑`        | Mover a raquete para cima               |
| `S` / `↓`        | Mover a raquete para baixo               |
| `P`              | Pausar / continuar                       |
| `R`              | Reiniciar a partida                      |
| `M`              | Ligar/desligar o som                     |
| `B`              | Voltar ao menu                           |
| `Q` / `Ctrl+C`   | Sair do jogo                             |
| `1`, `2`, `3`    | Atalho de dificuldade no menu            |
| `Enter`          | Confirmar seleção no menu                |

No menu inicial, escolha a dificuldade: **Fácil**, **Médio** ou **Difícil**. Mesmo no
Difícil, o computador erra de vez em quando — é possível vencer em todos os níveis.

O tamanho do campo se ajusta automaticamente ao tamanho da janela do terminal, inclusive
se você redimensionar a janela no meio da partida.

---

## 🔊 Som

O som vem **ligado por padrão**. No Windows, o jogo usa `[Console]::Beep` via PowerShell
(em segundo plano) para gerar tons diferentes para cada evento (rebatida, parede, ponto,
vitória/derrota). Em outros sistemas, ou caso o PowerShell não esteja disponível, ele usa
o beep padrão do terminal (`\x07`). Aperte `M` a qualquer momento para ligar ou desligar.

---

## 🗂 Estrutura do projeto

```
pong-terminal/
├── pong.js        # jogo completo (único arquivo de código)
├── package.json   # metadados e script "npm start"
└── README.md      # este arquivo
```

Também é possível rodar com:
```bash
npm start
# ou, no modo ASCII:
npm run start:ascii
```

---

## 🧠 Como o código funciona

O arquivo `pong.js` é organizado em blocos, de cima para baixo:

1. **`CONFIG` e `DIFFICULTIES`**
   Constantes que controlam o equilíbrio do jogo: velocidade da bola, aceleração,
   velocidade das raquetes e os três perfis de dificuldade da IA (tempo de reação,
   velocidade máxima, margem de erro e chance de "errar de propósito").

2. **ANSI e cores (`ANSI`, `COLOR`)**
   Códigos de escape de terminal usados para:
   - abrir uma **tela alternativa** (não suja o histórico do terminal);
   - esconder/mostrar o cursor;
   - posicionar o cursor em uma linha/coluna específica sem limpar a tela inteira
     (isso é o que evita o "flicker"/piscar da tela a cada quadro);
   - pintar texto em **verde**, **azul** ou **branco** sobre fundo preto.

3. **`Sound`**
   Classe responsável pelos efeitos sonoros. No Windows, abre um processo PowerShell
   em segundo plano (`[Console]::Beep(frequência, duração)`) e envia comandos para ele
   via `stdin`, permitindo tons diferentes por evento. Se isso falhar, cai no beep
   padrão do terminal (`\x07`). O método `play()` também evita exagero de repetição
   (debounce) para não travar o som dos quadros seguidos.

4. **`Canvas`**
   Uma "tela virtual": uma matriz de caracteres (`chars`) e uma matriz de cores
   (`colors`) do tamanho do terminal. Métodos como `put()` e `center()` escrevem texto
   nessa matriz. O método `rows()` converte cada linha da matriz em uma string com os
   códigos ANSI de cor já embutidos.

5. **`Renderer`**
   Compara a tela desenhada agora com a tela desenhada no quadro anterior e **só
   reenvia ao terminal as linhas que mudaram**. É essa técnica (dirty-rows) que faz o
   jogo rodar suave, sem piscar, mesmo em terminais mais lentos como o do Windows.

6. **`Paddle` e `Ball`**
   Estruturas simples de dados: posição, tamanho e velocidade de cada raquete e da
   bola.

7. **`Game`** — o coração do jogo:
   - **`layout()` / `onResize()`**: calculam o tamanho do campo a partir de
     `process.stdout.columns/rows` e, ao reposicionar, convertem as posições atuais em
     proporções (0 a 1) para que nada "salte" de lugar quando a janela muda de tamanho.
   - **Física da bola (`updateBall`)**: a cada quadro, a bola se move em linha reta;
     o código verifica se ela cruzou o "plano" de uma raquete entre o quadro anterior e
     o atual (evita que a bola atravesse a raquete em quadros rápidos) e calcula o ponto
     exato de contato. O ângulo de saída depende de **onde** a bola bateu na raquete
     (`bounceOff`), e a velocidade aumenta um pouco a cada rebatida até um teto
     (`BALL_ACCEL` / `BALL_MAX_FACTOR`).
   - **IA (`updateAI`)**: a raquete do computador não "teleporta" até a bola. Ela:
     1. sorteia um "erro de mira" (`rollOffset`) toda vez que a bola começa a vir na
        direção dela — às vezes esse erro é grande o bastante para errar de propósito,
        segundo a chance `miss` da dificuldade;
     2. só reavalia o alvo a cada `reaction` segundos (tempo de reação, não é
        instantâneo);
     3. nas dificuldades Médio/Difícil, **prevê** (`predictY`) onde a bola vai chegar,
        simulando os rebotes nas paredes de cima/baixo matematicamente;
     4. se move até esse alvo com velocidade máxima limitada por `speed`.
   - **Estados (`state`)**: `menu` → `countdown` → `playing` → `gameover`, controlados
     em `update()` e desenhados em `render()`.
   - **Teclado (`handleKey`)**: traduz cada tecla para uma ação, dependendo do estado
     atual (navegar no menu, mover a raquete, pausar, etc.).
   - **Desenho (`drawMenu`, `drawMatch`, `drawGameOver`, `drawSmall`)**: monta cada tela
     chamando `canvas.put()`/`canvas.center()`. Durante a partida, tudo é desenhado em
     branco (placar, bordas, raquetes e bola); o verde e o azul ficam só para o menu e
     as telas de início/fim de jogo.

8. **Leitura do teclado (`KEY_RE`, `normalizeKey`)**
   O terminal entrega as teclas como texto bruto, incluindo sequências de escape para
   as setas (ex.: `\x1b[A` para a seta para cima). Uma expressão regular separa cada
   tecla/sequência recebida, e `normalizeKey` converte isso em nomes simples (`'up'`,
   `'down'`, `'enter'`, etc.).

9. **`main()`**
   Função que realmente liga tudo:
   - verifica se está rodando em um terminal interativo de verdade;
   - entra na tela alternativa e ativa o **modo raw** do teclado (`setRawMode(true)`),
     que faz cada tecla chegar imediatamente ao programa, sem esperar o Enter;
   - registra uma função de **limpeza** (`cleanup`) que desliga o modo raw, mostra o
     cursor de novo e sai da tela alternativa — isso roda automaticamente ao sair do
     jogo (tecla `Q`, `Ctrl+C` ou até em caso de erro inesperado), para o terminal
     **nunca ficar bagunçado** depois do jogo fechar;
   - cria um loop com `setInterval` a cada ~16 ms (≈60 quadros por segundo), chamando
     `game.update(dt)` (física) e `game.render()` (desenho) em cada quadro, usando o
     tempo realmente decorrido (`dt`) para a bola e as raquetes se moverem de forma
     consistente mesmo se algum quadro atrasar.

### Por que não "pisca" a tela?
Dois cuidados garantem isso: (1) o jogo nunca limpa a tela inteira a cada quadro —
só a primeira vez; depois disso, o `Renderer` reescreve **apenas as linhas que mudaram**
de um quadro para o outro; (2) cada escrita no terminal já é enviada com a cor
embutida, então não há uma segunda passada "pintando" por cima.

---

## ⚠️ Solução de problemas

- **"Execute em um terminal interativo"**: rode `node pong.js` em um terminal de
  verdade (PowerShell, CMD, Git Bash, ou o terminal integrado do VS Code) — não em
  painéis que não sejam um terminal interativo (ex.: o painel "Saída/Output" do VS Code).
- **Caracteres estranhos (quadrados, `?`)**: use `node pong.js --ascii`, ou configure a
  fonte do terminal para uma com suporte a Unicode (ex.: *Cascadia Code*, já padrão em
  terminais recentes do Windows).
- **Sem som no Windows**: o jogo tenta abrir um processo PowerShell em segundo plano.
  Se sua política de execução bloquear scripts, o jogo automaticamente cai no beep
  padrão do terminal — o jogo continua funcionando normalmente, só o som pode mudar.
- **Tela "Terminal muito pequeno"**: aumente a janela do terminal para pelo menos
  40 colunas por 15 linhas.
