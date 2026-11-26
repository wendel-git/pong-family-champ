# 📜 Histórico do projeto

Registro de tudo o que foi feito neste projeto: o que foi pedido, o que foi decidido,
o que deu errado e como cada coisa foi verificada. O projeto foi desenvolvido em
conversa com o **Claude (IA da Anthropic)**, com o autor dirigindo as decisões.

**Como manter:** cada alteração nova ganha uma entrada no fim da
[Linha do tempo](#-linha-do-tempo), com data, pedido, o que mudou e como foi testado.
Horários no fuso de Manaus.

---

## 📍 Estado atual

| Item | Situação |
|---|---|
| Jogo | https://pong-familia.vercel.app (público, sem login) |
| Código | GitHub `wendel-git/pong-familia`, branch `main` |
| Publicação | Vercel, projeto `pong-familia` (time NeuraLab). Cada envio para a `main` publica sozinho |
| Banco | Supabase, projeto `pong-familia` (São Paulo): `pong_matches`, `pong_ranking`, `pong_settings` |
| Campeonato | Período de **teste em 28/11 e 29/11**. Categoria 1 = Médio, Categoria 2 = Difícil, 5 partidas por dia em cada categoria. Fácil é treino |
| Placar | Zerado em 26/11 |

---

## 🧭 Como a IA foi usada

1. **Refinar o pedido antes de pedir código.** O projeto começou com o Claude atuando
   como "Criador de Prompts": a cada rodada ele reescrevia o pedido, sugeria detalhes e
   fazia perguntas, até o pedido ficar completo. Só então o código foi gerado.
2. **O autor decide, a IA executa e propõe.** Regras do campeonato, plataformas,
   público e prioridades foram decididos pelo autor. Quando havia ambiguidade real, a IA
   perguntou com opções em vez de adivinhar (por exemplo: como contar as categorias,
   qual período, o que fazer na 6ª partida do dia).
3. **Toda mudança foi verificada.** Testes automatizados simulando o jogo, testes
   direto no banco real (desfeitos no fim), conferência visual por screenshot no
   navegador do autor, em tamanho de computador e de celular.
4. **Os erros da IA foram registrados.** Estão na seção
   [Erros da IA e como foram pegos](#-erros-da-ia-e-como-foram-pegos).

---

## 🗓 Linha do tempo

### Fase 1 · Definição do pedido (até 25/11)
**Pedido:** o autor pediu ao Claude para atuar como Criador de Prompts e chegar ao
melhor pedido para "um jogo Pong completo em JavaScript, para rodar no terminal".
**Decisões do autor nas rodadas de perguntas:**
- contra o computador, com menu de dificuldade;
- Windows, rodando localmente no VS Code (Node 26);
- campo que se ajusta ao terminal;
- verde e azul no menu, partida em preto com elementos brancos;
- 5 pontos, contagem regressiva, som ligado por padrão;
- código mais explicação de como funciona, com toda a documentação necessária.

### Fase 2 · Versão de terminal (até 25/11)
**Feito:** `pong.js` em Node.js puro, sem dependências: menu, 3 níveis de IA,
contagem regressiva, som (beep do Windows via PowerShell), redesenho sem piscar e
`docs/TERMINAL.md` explicando o código.
**Verificação:** sintaxe validada e física simulada (colisões, pontos, redimensionamento).

### Fase 3 · Versão para navegador (até 25/11)
**Pedido:** "um executável HTML para rodar em qualquer PC".
**Feito:** `web/index.html`, um arquivo único que abre com duplo clique. Mesmas regras,
som pelo navegador. Publicado também como página no claude.ai.

### Fase 4 · Bug da bolinha, 2 jogadores e placar (até 25/11)
**Pedido:** "a bolinha não bate na minha raquete e o jogo buga"; modo 2 jogadores
(W/S × setas); guardar o maior campeão.
**Causa do bug:** erro da IA. O código usava `player.w`, uma propriedade que não
existia, e a posição da bola virava `NaN`.
**Correção:** largura fixa da raquete. Teste simulado confirmou o rebote sem `NaN`.

### Fase 5 · Velocidade e pontuação (até 25/11)
**Pedidos e ajustes:**
1. Bola 1,5× mais rápida a cada 7 s e partida até 10 pontos.
2. "Acelera de uma vez": o aumento era em degraus. Virou contínuo, quadro a quadro.
   Medição: o maior salto entre quadros caiu de ~0,5 para ~0,005.
3. "Tem que voltar à velocidade inicial a cada ponto": o cronômetro de velocidade
   passou a zerar em cada saque.

### Fase 6 · Hospedagem: Supabase e Vercel (25/11, ~18h)
**Feito pela IA com as contas do autor:**
- projeto Supabase `pong-familia` criado (plano gratuito, custo confirmado como $0);
- tabela de placar com segurança (RLS);
- site publicado na Vercel às 19:06.

**Pendente na época:** não havia conexão com o GitHub (ver Fase 8).

### Fase 7 · Campo de nome real (26/11, ~01h)
**Problema relatado:** "não está aparecendo um campo para digitar os nomes".
**Causa:** o "campo" era só texto desenhado no canvas, sem campo de verdade e sem
teclado no celular.
**Correção:** formulário HTML de verdade. Os testes acharam um segundo bug antes de
publicar: depois de digitar, o foco ficava preso no campo e travava os controles.
Corrigido também. Placar zerado a pedido do autor.

### Fase 8 · GitHub e integração completa (26/11, 10:19–10:43)
**Diagnóstico:** o autor não achava o projeto no GitHub porque **ele nunca tinha sido
enviado**. A publicação da Fase 6 foi feita direto na Vercel. A IA tinha avisado
isso só no README, e não com clareza na conversa.
**Feito pelo autor:** criou o repositório `pong-familia`, liberou o app do Claude e
ligou o GitHub à Vercel.
**Feito pela IA:**
- primeiro envio do código (commit `f289171`);
- configuração da Vercel para publicar a partir da pasta `web/`;
- confirmação de que um envio ao GitHub publica o site sozinho, em ~2 s (`739d858`).

**Problema encontrado no teste:** o link passado antes ao autor,
`pong-familia-neura-lab1.vercel.app`, **exigia login da Vercel**. O teste foi feito
abrindo no navegador sem login. O link público correto é `pong-familia.vercel.app`.
**Segurança testada no banco real:** gravar uma vitória funcionou; inserir 9999
vitórias direto e apagar registros foram recusados.

### Fase 9 · Campeonato em categorias (26/11, 10:52–10:54)
**Pedido:** nome também no modo 1 jogador; campeonato com categorias.
**Feito:**
- tela de nome no 1 vs COM;
- banco passou a guardar **uma linha por partida** (`pong_matches`), e o ranking é
  calculado a partir delas. Assim o campeonato é auditável e as regras podem mudar sem
  perder dados;
- "Ana" e "ana" contam como a mesma pessoa; o nome "Computador" é reservado.

**Verificação:** 29 cenários simulados; uma partida de cada categoria gravada no banco
real; 5 partidas inválidas recusadas pelo banco.
**Bugs visuais pegos por screenshot e corrigidos:** o rodapé do placar ficava por cima
dos atalhos (`0f03603`), e o rótulo do campo de nome ficava longe do campo (`d828f2d`).

### Fase 10 · Regras do campeonato (26/11, 11:00–11:19)
**Decisões do autor:**
- Categoria 1 = 1 vs COM no **Médio**, Categoria 2 = 1 vs COM no **Difícil**, cada uma
  com seu campeão;
- **Fácil = treino**; 2 Jogadores = ranking à parte;
- **5 partidas por dia**; a 6ª é **bloqueada até o dia seguinte**;
- vitórias somam entre os dias pelo nome;
- tela inicial mostra o **top 3** de cada categoria;
- período ainda a definir.

**Suposição da IA, confirmada depois pelo autor:** o limite de 5 é **por categoria**
(5 no Médio e mais 5 no Difícil).
**Feito:**
- `pong_settings` com período, limite e fuso de Manaus;
- o banco aplica as regras ao gravar: recusa a 6ª, e fora do período a partida vira
  treino;
- o jogo confere o limite antes de começar e mostra o que cada partida vale
  ("Cat. 1 · Médio · partida 3/5 hoje") (`804ee75`).

**Verificação:**
- testes no banco real, desfeitos no fim: a 6ª recusada mesmo com "ANA" em maiúsculas,
  o Difícil separado, o Fácil e o 2 Jogadores sem contar, partida fora do período
  como treino;
- 27 cenários simulados;
- screenshots em tamanho de computador e de celular.

**Bug pego no celular e corrigido:** linhas de texto passavam da largura da tela
(`e5ca94f`).
**Observação de processo:** o Supabase pede confirmação do autor antes de alterações
que apagam ou substituem estruturas. Duas vezes a confirmação expirou e a IA parou
para pedir aprovação, em vez de tentar contornar.

### Fase 11 · Período de teste e divulgação (26/11, ~11:50)
- Período configurado: **28/11 a 29/11**. O placar segue zerado.
- Mensagem de boas-vindas escrita para os irmãos, pedindo que joguem, se divirtam e
  atuem como testadores e críticos.
- Criado este `HISTORICO.md`.

---

## 🐞 Erros da IA e como foram pegos

| # | Erro | Como foi percebido | Correção |
|---|---|---|---|
| 1 | Bola atravessava a raquete (`player.w` inexistente gerava `NaN`) | Autor testou e relatou | Largura fixa; teste simulado do rebote |
| 2 | Aceleração em degraus, brusca | Autor relatou | Aceleração contínua; medição quadro a quadro |
| 3 | "Campo de nome" era só texto desenhado, sem campo real | Autor relatou | Formulário HTML |
| 4 | Foco preso no campo travaria os controles | Teste automatizado da IA, antes de publicar | Foco devolvido ao jogo |
| 5 | Projeto publicado sem passar pelo GitHub, avisado só no README | Autor não achou o projeto no GitHub | Repositório criado e integração completa |
| 6 | Link passado exigia login da Vercel | Teste da IA abrindo o link sem login | Link público `pong-familia.vercel.app` |
| 7 | Rodapé do placar sobreposto e rótulo desalinhado | Screenshot da IA | `0f03603`, `d828f2d` |
| 8 | Textos saíam da tela no celular | Screenshot da IA em tamanho de celular | `e5ca94f` |

---

## ⏭ Pendências

- Rodar o período de teste (28 e 29/11) e coletar críticas e bugs relatados pelos irmãos.
- Definir as datas dos 5 dias oficiais; zerar o placar antes do primeiro dia.
- Ideia em aberto: controle por toque, para jogar no celular.
- A versão de terminal (`pong.js`) não recebeu as regras novas (10 pontos, campeonato).
