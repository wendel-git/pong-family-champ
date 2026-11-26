#!/usr/bin/env node
/**
 * ============================================================
 *  PONG NO TERMINAL  —  Node.js puro (sem dependências)
 * ============================================================
 *  Rodar:        node pong.js
 *  Modo ASCII:   node pong.js --ascii   (se os símbolos aparecerem quebrados)
 *
 *  Visão geral do código:
 *   - CONFIG ........ constantes de ajuste do jogo
 *   - Sound ......... efeitos sonoros (beep do Windows / bell do terminal)
 *   - Canvas ........ "tela virtual" (grade de caracteres + cores)
 *   - Renderer ...... envia ao terminal só as linhas que mudaram (sem flicker)
 *   - Paddle / Ball . entidades do jogo
 *   - Game .......... estados, física, IA, menu e desenho das telas
 *   - main() ........ configura o terminal, lê o teclado e roda o loop
 * ============================================================
 */
'use strict';

// ------------------------------------------------------------
// CONFIGURAÇÃO
// ------------------------------------------------------------
const CONFIG = {
  WIN_SCORE: 5,          // pontos para vencer
  MIN_COLS: 40,          // largura mínima do terminal
  MIN_ROWS: 15,          // altura mínima do terminal
  FRAME_MS: 16,          // intervalo do loop (~60 quadros por segundo)
  ASPECT: 2,             // uma célula do terminal é ~2x mais alta que larga
  BALL_BASE_SPEED: 0.75, // velocidade inicial da bola (x altura do campo, em linhas/s)
  BALL_MAX_FACTOR: 1.9,  // limite de aceleração da bola
  BALL_ACCEL: 1.05,      // aceleração a cada rebatida
  MAX_BOUNCE_ANGLE: 0.96,// ângulo máximo de saída da raquete (~55 graus)
  PLAYER_SPEED: 1.2,     // velocidade da raquete do jogador (x altura do campo, linhas/s)
  KEY_HOLD: 0.12,        // quanto tempo a raquete continua andando após uma tecla (s)
  COUNTDOWN: 3,          // segundos da contagem regressiva
};

// Dificuldades. "speed" é a velocidade máxima da raquete do computador
// (x altura do campo, por segundo); "miss" é a chance de errar de propósito.
const DIFFICULTIES = [
  { name: 'Fácil',   reaction: 0.30, speed: 0.45, error: 2.5, miss: 0.38, predict: false, zone: 0.55 },
  { name: 'Médio',   reaction: 0.15, speed: 0.70, error: 1.5, miss: 0.24, predict: true,  zone: 0.80 },
  { name: 'Difícil', reaction: 0.07, speed: 1.00, error: 0.8, miss: 0.14, predict: true,  zone: 1.00 },
];

// ------------------------------------------------------------
// ANSI, CORES E CARACTERES
// ------------------------------------------------------------
const ESC = '\x1b';
const ANSI = {
  altOn: ESC + '[?1049h',   // tela alternativa (não suja o histórico do terminal)
  altOff: ESC + '[?1049l',
  hide: ESC + '[?25l',      // esconde o cursor
  show: ESC + '[?25h',
  wrapOff: ESC + '[?7l',    // evita rolagem ao escrever na última célula
  wrapOn: ESC + '[?7h',
  reset: ESC + '[0m',
  clear: ESC + '[40m' + ESC + '[2J' + ESC + '[H', // fundo preto + limpa a tela
  moveTo: (row, col) => `${ESC}[${row};${col}H`,
};

// Códigos de cor do primeiro plano (o fundo é sempre preto)
const COLOR = { white: 97, green: 92, blue: 94 };

const ASCII = process.argv.includes('--ascii');
const ASCII_MAP = {
  '█': '#', '●': 'O', '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
  '│': '|', '↑': '^', '↓': 'v', '▶': '>', '·': '.', '×': 'x',
};

const LOGO = [
  ' ____   ___  _   _  ____ ',
  '|  _ \\ / _ \\| \\ | |/ ___|',
  '| |_) | | | |  \\| | |  _ ',
  '|  __/| |_| | |\\  | |_| |',
  '|_|    \\___/|_| \\_|\\____|',
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ------------------------------------------------------------
// SOM
// ------------------------------------------------------------
// No Windows o "bell" (\x07) costuma ficar mudo no terminal do VS Code.
// Por isso usamos um PowerShell em segundo plano que toca [Console]::Beep
// com frequências diferentes. Se não der certo, caímos no \x07 padrão.
class Sound {
  constructor() {
    this.enabled = true; // ligado por padrão
    this.child = null;
    this.last = 0;
    if (process.platform === 'win32') this.startWindows();
  }

  startWindows() {
    try {
      const { spawn } = require('node:child_process');
      const script =
        "while (($l = [Console]::In.ReadLine()) -ne $null) { " +
        "try { $p = $l.Split(','); [Console]::Beep([int]$p[0], [int]$p[1]) } catch {} }";
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        stdio: ['pipe', 'ignore', 'ignore'],
        windowsHide: true,
      });
      child.on('error', () => { this.child = null; });
      child.on('exit', () => { this.child = null; });
      child.stdin.on('error', () => {});
      this.child = child;
    } catch (e) {
      this.child = null;
    }
  }

  /** notes: lista de [frequência_hz, duração_ms]. force ignora o limite de repetição. */
  play(notes, force = false) {
    if (!this.enabled) return;
    const now = Date.now();
    if (!force && now - this.last < 40) return;
    this.last = now;
    if (this.child && this.child.stdin.writable) {
      this.child.stdin.write(notes.map(([f, d]) => `${f},${d}`).join('\n') + '\n');
    } else {
      process.stdout.write('\x07');
    }
  }

  hit()  { this.play([[880, 35]]); }
  wall() { this.play([[440, 25]]); }
  tick() { this.play([[600, 70]], true); }
  pointPlayer() { this.play([[660, 70], [990, 110]], true); }
  pointCpu()    { this.play([[330, 90], [220, 160]], true); }
  win()  { this.play([[523, 90], [659, 90], [784, 90], [1047, 240]], true); }
  lose() { this.play([[392, 160], [330, 160], [262, 320]], true); }

  close() {
    if (this.child) {
      try { this.child.stdin.end(); this.child.kill(); } catch (e) { /* ignora */ }
      this.child = null;
    }
  }
}

// ------------------------------------------------------------
// CANVAS: tela virtual com caracteres e cores
// ------------------------------------------------------------
class Canvas {
  constructor(w, h) { this.resize(w, h); }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.chars = Array.from({ length: h }, () => new Array(w).fill(' '));
    this.colors = Array.from({ length: h }, () => new Array(w).fill(COLOR.white));
  }

  clear() {
    for (let y = 0; y < this.h; y++) {
      this.chars[y].fill(' ');
      this.colors[y].fill(COLOR.white);
    }
  }

  put(x, y, text, color = COLOR.white) {
    y = Math.round(y);
    if (y < 0 || y >= this.h) return;
    let cx = Math.round(x);
    for (const ch of String(text)) {
      if (cx >= 0 && cx < this.w) {
        this.chars[y][cx] = ASCII ? (ASCII_MAP[ch] || ch) : ch;
        this.colors[y][cx] = color;
      }
      cx++;
    }
  }

  center(y, text, color = COLOR.white) {
    this.put(Math.floor((this.w - Array.from(text).length) / 2), y, text, color);
  }

  /** Converte cada linha em uma string com códigos de cor (agrupando trechos de mesma cor). */
  rows() {
    const out = [];
    for (let y = 0; y < this.h; y++) {
      let line = '';
      let cur = -1;
      for (let x = 0; x < this.w; x++) {
        const c = this.colors[y][x];
        if (c !== cur) { cur = c; line += `${ESC}[40;${c}m`; }
        line += this.chars[y][x];
      }
      out.push(line + ANSI.reset);
    }
    return out;
  }
}

// ------------------------------------------------------------
// RENDERER: só reescreve as linhas que mudaram (evita flicker)
// ------------------------------------------------------------
class Renderer {
  constructor(out) { this.out = out; this.prev = []; }

  invalidate() {
    this.prev = [];
    this.out.write(ANSI.clear);
  }

  flush(rows) {
    let buf = '';
    for (let i = 0; i < rows.length; i++) {
      if (this.prev[i] !== rows[i]) {
        buf += ANSI.moveTo(i + 1, 1) + rows[i];
        this.prev[i] = rows[i];
      }
    }
    if (buf) this.out.write(buf);
  }
}

// ------------------------------------------------------------
// ENTIDADES
// ------------------------------------------------------------
class Paddle {
  constructor() {
    this.x = 0;          // coluna
    this.y = 0;          // linha do topo (decimal)
    this.h = 3;          // altura em linhas
    this.dir = 0;        // -1 sobe, 1 desce (só o jogador usa)
    this.holdUntil = 0;  // até quando continuar andando
  }
}

class Ball {
  constructor() {
    this.x = 0; this.y = 0;     // posição (decimal)
    this.vx = 0; this.vy = 0;   // velocidade em células/s
    this.factor = 1;            // multiplicador de velocidade (aceleração)
    this.angle = 0;             // ângulo em radianos (positivo = descendo)
    this.dirSign = 1;           // +1 vai para a direita, -1 para a esquerda
  }
}

// ------------------------------------------------------------
// JOGO
// ------------------------------------------------------------
class Game {
  constructor(out, sound) {
    this.out = out;
    this.sound = sound;
    this.canvas = new Canvas(1, 1);
    this.renderer = new Renderer(out);
    this.player = new Paddle();
    this.cpu = new Paddle();
    this.ball = new Ball();

    this.state = 'menu';       // menu | countdown | playing | gameover
    this.paused = false;
    this.menuIndex = 1;        // item selecionado no menu (começa em Médio)
    this.diffIndex = 1;        // dificuldade da partida atual
    this.endIndex = 0;         // item selecionado na tela final
    this.score = { player: 0, cpu: 0 };
    this.clock = 0;
    this.countdown = 0;
    this.lastCount = 0;

    // estado da IA
    this.aiTimer = 0;
    this.aiTarget = 0;
    this.aiOffset = 0;
    this.aiLastVx = 0;

    this.layout();
    this.resetPositions();
    this.resetRound(1);
  }

  get diff() { return DIFFICULTIES[this.diffIndex]; }

  tooSmall() { return this.w < CONFIG.MIN_COLS || this.h < CONFIG.MIN_ROWS; }

  // ---------- Layout (adapta ao tamanho do terminal) ----------
  layout() {
    this.w = this.out.columns || 80;
    this.h = this.out.rows || 24;
    this.playTop = 2;                  // linha 0: placar | 1: borda | 2..h-3: campo | h-2: borda | h-1: legenda
    this.playBottom = this.h - 3;
    this.fieldH = Math.max(1, this.playBottom - this.playTop + 1);
    this.canvas.resize(this.w, this.h);

    const ph = Math.max(3, Math.round(this.fieldH / 4));
    this.player.x = 2;
    this.cpu.x = Math.max(3, this.w - 3);
    this.player.h = ph;
    this.cpu.h = ph;
    this.clampPaddle(this.player);
    this.clampPaddle(this.cpu);
  }

  onResize() {
    const ow = this.w || 1, ot = this.playTop, of = this.fieldH || 1, b = this.ball;
    const rx = b.x / ow, ry = (b.y - ot) / of;
    const rp = (this.player.y - ot) / of, rc = (this.cpu.y - ot) / of;
    this.layout();
    b.x = rx * this.w;
    b.y = this.playTop + ry * this.fieldH;
    this.player.y = this.playTop + rp * this.fieldH;
    this.cpu.y = this.playTop + rc * this.fieldH;
    this.clampPaddle(this.player);
    this.clampPaddle(this.cpu);
    this.applyVelocity();
    this.renderer.invalidate();
  }

  clampPaddle(p) {
    p.y = clamp(p.y, this.playTop, Math.max(this.playTop, this.playBottom + 1 - p.h));
  }

  resetPositions() {
    const y = this.playTop + (this.fieldH - this.player.h) / 2;
    this.player.y = y;
    this.cpu.y = y;
    this.player.dir = 0;
  }

  // ---------- Bola ----------
  applyVelocity() {
    const b = this.ball;
    const speed = this.fieldH * CONFIG.BALL_BASE_SPEED * b.factor; // linhas/s (visual)
    b.vx = b.dirSign * Math.cos(b.angle) * speed * CONFIG.ASPECT;  // colunas/s
    b.vy = Math.sin(b.angle) * speed;                              // linhas/s
  }

  resetRound(dirSign) {
    const b = this.ball;
    b.x = this.w / 2;
    b.y = this.playTop + this.fieldH / 2;
    b.factor = 1;
    b.dirSign = dirSign;
    b.angle = (Math.random() * 2 - 1) * 0.45;
    this.applyVelocity();
  }

  // ---------- Fluxo da partida ----------
  startMatch() {
    this.diffIndex = this.menuIndex;
    this.score = { player: 0, cpu: 0 };
    this.paused = false;
    this.resetPositions();
    this.beginServe(Math.random() < 0.5 ? -1 : 1);
  }

  beginServe(dirSign) {
    this.resetRound(dirSign);
    this.state = 'countdown';
    this.countdown = CONFIG.COUNTDOWN;
    this.lastCount = 0;
    this.aiTimer = 0;
    this.aiOffset = 0;
    this.aiLastVx = 0;
  }

  point(who) {
    this.score[who]++;
    if (this.score[who] >= CONFIG.WIN_SCORE) {
      this.state = 'gameover';
      this.endIndex = 0;
      if (who === 'player') this.sound.win(); else this.sound.lose();
      return;
    }
    if (who === 'player') this.sound.pointPlayer(); else this.sound.pointCpu();
    this.beginServe(who === 'player' ? 1 : -1); // saque vai para quem perdeu o ponto
  }

  // ---------- Atualização (física e IA) ----------
  update(dt) {
    this.clock += dt;
    if (this.tooSmall() || this.paused) return;

    if (this.state === 'countdown') {
      this.updatePlayer(dt);
      this.updateAI(dt);
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n > 0 && n !== this.lastCount) { this.lastCount = n; this.sound.tick(); }
      if (this.countdown <= 0) this.state = 'playing';
    } else if (this.state === 'playing') {
      this.updatePlayer(dt);
      this.updateAI(dt);
      this.updateBall(dt);
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.dir !== 0 && this.clock < p.holdUntil) {
      p.y += p.dir * CONFIG.PLAYER_SPEED * this.fieldH * dt;
      this.clampPaddle(p);
    }
  }

  /** Posição Y em que a bola chegará à raquete do computador (considerando as paredes). */
  predictY() {
    const b = this.ball;
    if (b.vx <= 0) return b.y;
    const t = (this.cpu.x - b.x) / b.vx;
    const H = this.fieldH;
    let rel = b.y + b.vy * t - this.playTop;
    rel = ((rel % (2 * H)) + 2 * H) % (2 * H);
    if (rel > H) rel = 2 * H - rel;
    return this.playTop + rel;
  }

  /** Sorteia o "erro de mira" do computador para a próxima rebatida. */
  rollOffset() {
    const d = this.diff;
    if (Math.random() < d.miss) {
      const sign = Math.random() < 0.5 ? -1 : 1;
      return sign * (this.cpu.h / 2 + 0.6 + Math.random() * 2.5); // erra de propósito
    }
    return (Math.random() * 2 - 1) * d.error;
  }

  updateAI(dt) {
    const ai = this.cpu, b = this.ball, d = this.diff;

    // Nova bola vindo na direção do computador: sorteia o erro dessa jogada
    if (b.vx > 0 && this.aiLastVx <= 0) this.aiOffset = this.rollOffset();
    this.aiLastVx = b.vx;

    // O computador só "reage" de tempos em tempos (atraso humano)
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = d.reaction;
      const mid = this.playTop + this.fieldH / 2;
      const active = this.state === 'playing' && b.vx > 0 && b.x >= this.w * (1 - d.zone);
      this.aiTarget = active ? (d.predict ? this.predictY() : b.y) + this.aiOffset : mid;
    }

    // Move a raquete com velocidade limitada
    const center = ai.y + ai.h / 2;
    const diff = this.aiTarget - center;
    const step = d.speed * this.fieldH * dt;
    if (Math.abs(diff) > 0.25) ai.y += clamp(diff, -step, step);
    this.clampPaddle(ai);
  }

  paddleHit(p, y) {
    const p0 = Math.round(p.y);
    return y >= p0 - 0.3 && y < p0 + p.h + 0.3;
  }

  /** Rebate a bola na raquete: o ângulo depende de onde a bola tocou. */
  bounceOff(p, yHit, dir) {
    const b = this.ball;
    const p0 = Math.round(p.y);
    const rel = clamp((yHit - (p0 + p.h / 2)) / (p.h / 2), -1, 1);
    let angle = rel * CONFIG.MAX_BOUNCE_ANGLE;
    if (Math.abs(angle) < 0.1) angle = (Math.random() < 0.5 ? -1 : 1) * 0.1;
    b.angle = angle;
    b.dirSign = dir;
    b.factor = Math.min(b.factor * CONFIG.BALL_ACCEL, CONFIG.BALL_MAX_FACTOR);
    b.x = dir > 0 ? this.player.x + 1.001 : this.cpu.x - 0.001;
    this.applyVelocity();
    this.sound.hit();
  }

  updateBall(dt) {
    const b = this.ball;
    const px = b.x, py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Colisão com as raquetes (detecta o cruzamento do "plano" da raquete)
    const L = this.player, R = this.cpu;
    const faceL = L.x + 1, faceR = R.x;
    if (b.vx < 0 && px >= faceL && b.x < faceL) {
      const yHit = py + (b.y - py) * ((px - faceL) / (px - b.x));
      if (this.paddleHit(L, yHit)) this.bounceOff(L, yHit, 1);
    } else if (b.vx > 0 && px <= faceR && b.x > faceR) {
      const yHit = py + (b.y - py) * ((faceR - px) / (b.x - px));
      if (this.paddleHit(R, yHit)) this.bounceOff(R, yHit, -1);
    }

    // Colisão com as paredes de cima e de baixo
    const top = this.playTop, bottom = this.playBottom + 1;
    if (b.y < top) {
      b.y = top + (top - b.y);
      b.angle = Math.abs(b.angle);
      this.applyVelocity();
      this.sound.wall();
    } else if (b.y >= bottom) {
      b.y = Math.max(top, bottom - (b.y - bottom) - 0.001);
      b.angle = -Math.abs(b.angle);
      this.applyVelocity();
      this.sound.wall();
    }

    // Pontuação
    if (b.x < 0) this.point('cpu');
    else if (b.x >= this.w) this.point('player');
  }

  // ---------- Teclado ----------
  handleKey(key) {
    if (key === 'ctrl-c' || key === 'q') return this.quit();
    if (key === 'm') {
      this.sound.enabled = !this.sound.enabled;
      if (this.sound.enabled) this.sound.tick();
      return;
    }

    if (this.state === 'menu') {
      if (key === 'up' || key === 'w') this.menuIndex = (this.menuIndex + DIFFICULTIES.length - 1) % DIFFICULTIES.length;
      else if (key === 'down' || key === 's') this.menuIndex = (this.menuIndex + 1) % DIFFICULTIES.length;
      else if (key >= '1' && key <= String(DIFFICULTIES.length)) { this.menuIndex = Number(key) - 1; this.startMatch(); }
      else if (key === 'enter') this.startMatch();
    } else if (this.state === 'countdown' || this.state === 'playing') {
      if (key === 'up' || key === 'w') { this.player.dir = -1; this.player.holdUntil = this.clock + CONFIG.KEY_HOLD; }
      else if (key === 'down' || key === 's') { this.player.dir = 1; this.player.holdUntil = this.clock + CONFIG.KEY_HOLD; }
      else if (key === 'p') this.paused = !this.paused;
      else if (key === 'r') this.startMatch();
      else if (key === 'b') { this.state = 'menu'; this.paused = false; }
    } else if (this.state === 'gameover') {
      if (key === 'up' || key === 'w') this.endIndex = (this.endIndex + 2) % 3;
      else if (key === 'down' || key === 's') this.endIndex = (this.endIndex + 1) % 3;
      else if (key === 'r') this.startMatch();
      else if (key === 'b') this.state = 'menu';
      else if (key === 'enter') {
        if (this.endIndex === 0) { this.menuIndex = this.diffIndex; this.startMatch(); }
        else if (this.endIndex === 1) this.state = 'menu';
        else this.quit();
      }
    }
  }

  quit() { process.exit(0); } // o restante da limpeza acontece no evento 'exit'

  // ---------- Desenho ----------
  render() {
    const c = this.canvas;
    c.clear();
    if (this.tooSmall()) this.drawSmall();
    else if (this.state === 'menu') this.drawMenu();
    else if (this.state === 'gameover') this.drawGameOver();
    else this.drawMatch();
    this.renderer.flush(c.rows());
  }

  drawSmall() {
    const c = this.canvas;
    const y = Math.floor(this.h / 2) - 1;
    c.center(y, 'Terminal muito pequeno', COLOR.green);
    c.center(y + 1, `Atual: ${this.w}x${this.h}`, COLOR.blue);
    c.center(y + 2, `Mínimo: ${CONFIG.MIN_COLS}x${CONFIG.MIN_ROWS}`, COLOR.blue);
  }

  drawMenu() {
    const c = this.canvas;
    const logo = this.h >= 17;
    const total = (logo ? LOGO.length + 1 : 2) + 9;
    let y = Math.max(0, Math.floor((this.h - total) / 2));

    if (logo) {
      const maxLen = Math.max(...LOGO.map((l) => l.length));
      const x0 = Math.floor((this.w - maxLen) / 2);
      LOGO.forEach((line, i) => {
        for (let k = 0; k < line.length; k++) {
          c.put(x0 + k, y + i, line[k], k < 13 ? COLOR.green : COLOR.blue); // degradê verde -> azul
        }
      });
      y += LOGO.length + 1;
    } else {
      c.center(y, 'P O N G', COLOR.green);
      y += 2;
    }

    c.center(y, `Você × Computador  ·  vence quem fizer ${CONFIG.WIN_SCORE} pontos`, COLOR.blue);
    y += 2;
    c.center(y, 'Escolha a dificuldade', COLOR.green);
    y += 1;
    DIFFICULTIES.forEach((d, i) => {
      const sel = i === this.menuIndex;
      c.center(y + i, `${sel ? '▶ ' : '  '}${i + 1}. ${d.name.padEnd(8)}`, sel ? COLOR.green : COLOR.blue);
    });
    y += DIFFICULTIES.length + 1;
    c.center(y, '↑/↓ navegar  ·  ENTER confirmar  ·  1-3 atalho', COLOR.blue);
    c.center(y + 1, `M som: ${this.sound.enabled ? 'LIGADO' : 'DESLIGADO'}  ·  Q sair`, COLOR.green);
  }

  drawBox(lines, borderColor) {
    const c = this.canvas;
    const inner = Math.max(...lines.map((l) => Array.from(l.t).length)) + 4;
    const bw = inner + 2, bh = lines.length + 2;
    const x0 = Math.floor((this.w - bw) / 2);
    const y0 = Math.floor((this.h - bh) / 2);
    c.put(x0, y0, '╔' + '═'.repeat(inner) + '╗', borderColor);
    lines.forEach((l, i) => {
      const y = y0 + 1 + i;
      c.put(x0, y, '║' + ' '.repeat(inner) + '║', borderColor);
      c.put(x0 + 1 + Math.floor((inner - Array.from(l.t).length) / 2), y, l.t, l.color);
    });
    c.put(x0, y0 + bh - 1, '╚' + '═'.repeat(inner) + '╝', borderColor);
  }

  drawGameOver() {
    const won = this.score.player > this.score.cpu;
    const items = ['Jogar de novo', 'Voltar ao menu', 'Sair'];
    const lines = [
      { t: won ? 'VOCÊ VENCEU!' : 'O COMPUTADOR VENCEU', color: won ? COLOR.green : COLOR.blue },
      { t: '', color: COLOR.blue },
      { t: `Placar final: ${this.score.player} x ${this.score.cpu}`, color: COLOR.blue },
      { t: `Dificuldade: ${this.diff.name}`, color: COLOR.blue },
      { t: '', color: COLOR.blue },
      ...items.map((t, i) => ({
        t: `${i === this.endIndex ? '▶ ' : '  '}${t.padEnd(15)}`,
        color: i === this.endIndex ? COLOR.green : COLOR.blue,
      })),
      { t: '', color: COLOR.blue },
      { t: '↑/↓ escolher  ·  ENTER confirmar', color: COLOR.blue },
    ];
    this.drawBox(lines, won ? COLOR.green : COLOR.blue);
  }

  drawMatch() {
    const c = this.canvas, W = this.w, H = this.h;

    // Placar e informações (tudo em branco durante a partida)
    const score = `JOGADOR ${this.score.player}  :  ${this.score.cpu} COMPUTADOR`;
    c.center(0, score);
    const left = `Nível: ${this.diff.name}`;
    const right = `Som: ${this.sound.enabled ? 'LIGADO' : 'DESLIGADO'}`;
    if (W >= score.length + left.length + right.length + 8) {
      c.put(1, 0, left);
      c.put(W - right.length - 1, 0, right);
    }

    // Bordas, linha central tracejada, raquetes e bola
    c.put(0, 1, '═'.repeat(W));
    c.put(0, H - 2, '═'.repeat(W));
    const mid = Math.floor(W / 2);
    for (let y = this.playTop; y <= this.playBottom; y += 2) c.put(mid, y, '│');
    for (const p of [this.player, this.cpu]) {
      const y0 = Math.round(p.y);
      for (let i = 0; i < p.h; i++) c.put(p.x, y0 + i, '█');
    }
    const b = this.ball;
    c.put(
      clamp(Math.floor(b.x), 0, W - 1),
      clamp(Math.floor(b.y), this.playTop, this.playBottom),
      '●'
    );

    // Legenda
    const legends = [
      'W/S ou ↑/↓ mover  |  P pausar  |  R reiniciar  |  M som  |  B menu  |  Q sair',
      'W/S mover | P pausa | R reinicia | M som | Q sair',
      'P pausa|R reinicia|M som|Q sair',
    ];
    const legend = legends.find((l) => l.length <= W) || legends[legends.length - 1];
    c.center(H - 1, legend);

    // Sobreposições
    const midY = Math.floor(this.playTop + this.fieldH / 2);
    if (this.paused) {
      this.drawBox(
        [
          { t: 'PAUSADO', color: COLOR.white },
          { t: '', color: COLOR.white },
          { t: 'P continuar · R reiniciar · B menu', color: COLOR.white },
        ],
        COLOR.white
      );
    } else if (this.state === 'countdown' && this.fieldH >= 9) {
      c.center(midY - 2, `[ ${Math.max(1, Math.ceil(this.countdown))} ]`);
      c.center(midY + 2, 'Prepare-se!');
    }
  }
}

// ------------------------------------------------------------
// TECLADO
// ------------------------------------------------------------
const KEY_RE = /\x1b\[[0-9;]*[A-Za-z~]|\x1bO[A-Za-z]|[\s\S]/g;

function normalizeKey(s) {
  switch (s) {
    case '\x1b[A': case '\x1bOA': return 'up';
    case '\x1b[B': case '\x1bOB': return 'down';
    case '\r': case '\n': return 'enter';
    case '\x03': return 'ctrl-c';
    default: return s.toLowerCase();
  }
}

// ------------------------------------------------------------
// PRINCIPAL
// ------------------------------------------------------------
function main() {
  const out = process.stdout;
  const inp = process.stdin;

  if (!inp.isTTY || !out.isTTY) {
    console.error('Execute em um terminal interativo: node pong.js');
    process.exit(1);
  }

  const sound = new Sound();
  const game = new Game(out, sound);

  // Restaura o terminal ao sair (cursor visível, modo raw desativado, tela normal)
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try { inp.setRawMode(false); } catch (e) { /* ignora */ }
    out.write(ANSI.reset + ANSI.wrapOn + ANSI.show + ANSI.altOff);
    sound.close();
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  process.on('uncaughtException', (err) => {
    cleanup();
    console.error(err);
    process.exit(1);
  });

  out.write(ANSI.altOn + ANSI.hide + ANSI.wrapOff + ANSI.clear);
  inp.setRawMode(true);
  inp.resume();
  inp.setEncoding('utf8');
  inp.on('data', (chunk) => {
    for (const m of chunk.matchAll(KEY_RE)) game.handleKey(normalizeKey(m[0]));
  });
  out.on('resize', () => game.onResize());

  // Loop principal: atualiza a física com o tempo real decorrido e desenha
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    game.update(dt);
    game.render();
  }, CONFIG.FRAME_MS);
}

if (require.main === module) main();
else module.exports = { Game, Canvas, Sound, CONFIG, DIFFICULTIES };
