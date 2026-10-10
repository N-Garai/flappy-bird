const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const statusEl = document.getElementById("status");

const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const PIPE_WIDTH = 64;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.4;
const PIPE_SPAWN_INTERVAL = 1500;

const sounds = {
  ctx: null,
  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = AudioCtx ? new AudioCtx() : null;
    }
    if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  },
  play(freq, duration = 0.08, type = "sine", gainValue = 0.08) {
    const audioCtx = this.ensureContext();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  },
  flap() {
    this.play(500, 0.08, "square", 0.05);
  },
  score() {
    this.play(760, 0.09, "triangle", 0.07);
    setTimeout(() => this.play(960, 0.08, "triangle", 0.06), 60);
  },
  hit() {
    this.play(180, 0.2, "sawtooth", 0.08);
  },
};

const state = {
  running: false,
  gameOver: false,
  bird: {
    x: 95,
    y: canvas.height / 2,
    radius: 16,
    velocityY: 0,
  },
  pipes: [],
  score: 0,
  bestScore: Number(localStorage.getItem("flappy-best-score") || 0),
  lastSpawnTs: 0,
  prevFrameTs: 0,
};

bestScoreEl.textContent = state.bestScore;

function reset() {
  state.running = false;
  state.gameOver = false;
  state.pipes = [];
  state.score = 0;
  state.lastSpawnTs = 0;
  state.prevFrameTs = 0;
  state.bird.y = canvas.height / 2;
  state.bird.velocityY = 0;
  scoreEl.textContent = "0";
  statusEl.textContent = "Press Space or tap to start";
}

function startIfNeeded() {
  if (state.running || state.gameOver) return;
  state.running = true;
  state.prevFrameTs = performance.now();
  statusEl.textContent = "";
  sounds.ensureContext();
}

function flap() {
  if (state.gameOver) return;
  startIfNeeded();
  state.bird.velocityY = FLAP_STRENGTH;
  sounds.flap();
}

function createPipe() {
  const margin = 90;
  const maxTop = canvas.height - PIPE_GAP - margin;
  const topHeight = margin + Math.random() * (maxTop - margin);
  state.pipes.push({
    x: canvas.width,
    topHeight,
    scored: false,
  });
}

function intersectsPipe(pipe) {
  const withinPipeX =
    state.bird.x + state.bird.radius > pipe.x &&
    state.bird.x - state.bird.radius < pipe.x + PIPE_WIDTH;

  if (!withinPipeX) return false;

  const hitsTop = state.bird.y - state.bird.radius < pipe.topHeight;
  const hitsBottom = state.bird.y + state.bird.radius > pipe.topHeight + PIPE_GAP;
  return hitsTop || hitsBottom;
}

function endGame() {
  if (state.gameOver) return;
  state.running = false;
  state.gameOver = true;
  sounds.hit();
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("flappy-best-score", String(state.bestScore));
    bestScoreEl.textContent = String(state.bestScore);
  }
  statusEl.textContent = "Game over. Press R to restart";
}

function update(delta, ts) {
  if (!state.running) return;

  state.bird.velocityY += GRAVITY * delta * 60;
  state.bird.y += state.bird.velocityY * delta * 60;

  if (state.bird.y + state.bird.radius >= canvas.height || state.bird.y - state.bird.radius <= 0) {
    endGame();
    return;
  }

  if (!state.lastSpawnTs || ts - state.lastSpawnTs >= PIPE_SPAWN_INTERVAL) {
    createPipe();
    state.lastSpawnTs = ts;
  }

  state.pipes.forEach((pipe) => {
    pipe.x -= PIPE_SPEED * delta * 60;

    if (!pipe.scored && pipe.x + PIPE_WIDTH < state.bird.x) {
      pipe.scored = true;
      state.score += 1;
      scoreEl.textContent = String(state.score);
      sounds.score();
    }

    if (intersectsPipe(pipe)) {
      endGame();
    }
  });

  state.pipes = state.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -5);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#7dd3fc");
  gradient.addColorStop(1, "#38bdf8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
}

function drawBird() {
  ctx.save();
  ctx.translate(state.bird.x, state.bird.y);
  ctx.rotate(Math.max(-0.4, Math.min(0.8, state.bird.velocityY / 12)));

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0, 0, state.bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(state.bird.radius - 4, -3);
  ctx.lineTo(state.bird.radius + 10, 1);
  ctx.lineTo(state.bird.radius - 4, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(4, -6, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPipes() {
  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#15803d";
  ctx.lineWidth = 3;

  state.pipes.forEach((pipe) => {
    const bottomY = pipe.topHeight + PIPE_GAP;
    const bottomHeight = canvas.height - bottomY;

    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);

    ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);

    ctx.fillStyle = "#16a34a";
    ctx.fillRect(pipe.x - 4, pipe.topHeight - 16, PIPE_WIDTH + 8, 16);
    ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 16);
    ctx.fillStyle = "#22c55e";
  });
}

function draw() {
  drawBackground();
  drawPipes();
  drawBird();

  if (!state.running && !state.gameOver) {
    ctx.fillStyle = "rgb(15 23 42 / 0.7)";
    ctx.font = "bold 28px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Tap or Space to fly", canvas.width / 2, canvas.height / 2 - 40);
  }
}

function loop(ts) {
  if (!state.prevFrameTs) state.prevFrameTs = ts;
  const delta = Math.min((ts - state.prevFrameTs) / 1000, 0.033);
  state.prevFrameTs = ts;

  update(delta, ts);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }

  if (event.code === "KeyR") {
    reset();
  }
});

canvas.addEventListener("pointerdown", flap);
reset();
requestAnimationFrame(loop);
