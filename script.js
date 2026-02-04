const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");

const state = {
  running: false,
  paused: false,
  score: 0,
  lives: 3,
  best: Number(localStorage.getItem("astro-best") || 0),
  collected: 0,
  speedFactor: 1,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 18,
  speed: 3.6,
};

const keys = new Set();
const stars = [];
const comets = [];

const pointer = {
  active: false,
  x: 0,
  y: 0,
};

const STAR_COUNT = 6;
const COMET_COUNT = 4;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const spawnStar = () => ({
  x: randomBetween(40, canvas.width - 40),
  y: randomBetween(40, canvas.height - 40),
  radius: randomBetween(10, 16),
  pulse: randomBetween(0, Math.PI * 2),
});

const spawnComet = () => ({
  x: randomBetween(0, canvas.width),
  y: randomBetween(0, canvas.height),
  radius: randomBetween(18, 28),
  speed: randomBetween(1.2, 2.4),
  angle: randomBetween(0, Math.PI * 2),
  wobble: randomBetween(0.4, 1.2),
});

const resetEntities = () => {
  stars.length = 0;
  comets.length = 0;
  for (let i = 0; i < STAR_COUNT; i += 1) {
    stars.push(spawnStar());
  }
  for (let i = 0; i < COMET_COUNT; i += 1) {
    comets.push(spawnComet());
  }
};

const resetGame = () => {
  state.running = true;
  state.paused = false;
  state.score = 0;
  state.lives = 3;
  state.collected = 0;
  state.speedFactor = 1;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  resetEntities();
  overlay.classList.add("hidden");
  updateHud();
};

const updateHud = () => {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  bestEl.textContent = state.best;
};

const setOverlay = (title, text, buttonLabel = "Jogar") => {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonLabel;
  overlay.classList.remove("hidden");
};

const gameOver = () => {
  state.running = false;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("astro-best", state.best);
  }
  updateHud();
  setOverlay(
    "Fim de jogo",
    "Os cometas atingiram o astronauta. Tente novamente para superar a sua melhor pontuação!",
    "Jogar de novo"
  );
};

const togglePause = () => {
  if (!state.running) {
    return;
  }
  state.paused = !state.paused;
  if (state.paused) {
    setOverlay("Pausado", "Respire fundo e continue quando estiver pronto.", "Continuar");
  } else {
    overlay.classList.add("hidden");
  }
};

const handleMovement = () => {
  let moveX = 0;
  let moveY = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) moveY -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) moveY += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) moveX -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) moveX += 1;

  if (pointer.active) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 6) {
      moveX = dx / distance;
      moveY = dy / distance;
    }
  }

  const magnitude = Math.hypot(moveX, moveY) || 1;
  const speed = player.speed * state.speedFactor;

  player.x += (moveX / magnitude) * speed;
  player.y += (moveY / magnitude) * speed;
  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
};

const updateComets = () => {
  comets.forEach((comet) => {
    comet.angle += 0.01 * comet.wobble;
    comet.x += Math.cos(comet.angle) * comet.speed * state.speedFactor;
    comet.y += Math.sin(comet.angle) * comet.speed * state.speedFactor;

    if (comet.x < -40 || comet.x > canvas.width + 40) {
      comet.x = randomBetween(0, canvas.width);
    }
    if (comet.y < -40 || comet.y > canvas.height + 40) {
      comet.y = randomBetween(0, canvas.height);
    }
  });
};

const checkCollisions = () => {
  stars.forEach((star, index) => {
    const distance = Math.hypot(player.x - star.x, player.y - star.y);
    if (distance < player.radius + star.radius) {
      state.score += 10;
      state.collected += 1;
      stars[index] = spawnStar();
      if (state.collected % 10 === 0) {
        state.speedFactor += 0.1;
      }
    }
  });

  comets.forEach((comet) => {
    const distance = Math.hypot(player.x - comet.x, player.y - comet.y);
    if (distance < player.radius + comet.radius - 6) {
      state.lives -= 1;
      player.x = canvas.width / 2;
      player.y = canvas.height / 2;
      comet.x = randomBetween(0, canvas.width);
      comet.y = randomBetween(0, canvas.height);
      if (state.lives <= 0) {
        gameOver();
      }
    }
  });
};

const drawBackground = () => {
  ctx.fillStyle = "#070b1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 40; i += 1) {
    const x = (i * 73) % canvas.width;
    const y = (i * 29) % canvas.height;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + (i % 5) * 0.02})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawStars = (delta) => {
  stars.forEach((star) => {
    const pulse = 1 + Math.sin(delta / 200 + star.pulse) * 0.2;
    ctx.fillStyle = "#f8c045";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(248, 192, 69, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius * 1.6, 0, Math.PI * 2);
    ctx.stroke();
  });
};

const drawComets = () => {
  comets.forEach((comet) => {
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 107, 107, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, comet.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  });
};

const drawPlayer = () => {
  ctx.fillStyle = "#4ad7ff";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0b1020";
  ctx.beginPath();
  ctx.arc(player.x + 4, player.y - 4, player.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
};

let lastTime = 0;
const loop = (timestamp) => {
  if (!state.running || state.paused) {
    lastTime = timestamp;
    requestAnimationFrame(loop);
    return;
  }

  const delta = timestamp - lastTime;
  lastTime = timestamp;

  handleMovement();
  updateComets();
  checkCollisions();
  updateHud();

  drawBackground();
  drawStars(delta);
  drawComets();
  drawPlayer();

  requestAnimationFrame(loop);
};

const handleResize = () => {
  const wrapper = canvas.parentElement;
  if (!wrapper) return;
  const { width } = wrapper.getBoundingClientRect();
  const height = Math.min(width * 0.58, 560);
  canvas.style.height = `${height}px`;
};

window.addEventListener("resize", handleResize);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});

startBtn.addEventListener("click", () => {
  if (!state.running || state.paused) {
    resetGame();
  }
});

handleResize();
resetEntities();
updateHud();
requestAnimationFrame(loop);
