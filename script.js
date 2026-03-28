const presetConfigs = [
  { id: "starter", name: "Starter Hive", cols: 8, rows: 8, mineRatio: 0.14, tag: "Calm" },
  { id: "scout", name: "Scout Comb", cols: 10, rows: 10, mineRatio: 0.17, tag: "Warm" },
  { id: "worker", name: "Worker Nest", cols: 13, rows: 13, mineRatio: 0.19, tag: "Alert" },
  { id: "queen", name: "Queen Chamber", cols: 21, rows: 13, mineRatio: 0.22, tag: "Sharp" },
  { id: "storm", name: "Storm Swarm", cols: 29, rows: 13, mineRatio: 0.25, tag: "Brutal" },
];

const beeLayer = document.getElementById("bee-layer");
const boardWrapper = document.getElementById("board-wrapper");
const boardElement = document.getElementById("board");
const presetGrid = document.getElementById("preset-grid");
const mineCounter = document.getElementById("mine-counter");
const timerElement = document.getElementById("timer");
const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const activeModeLabel = document.getElementById("active-mode-label");
const resetButton = document.getElementById("reset-button");
const customStartButton = document.getElementById("custom-start-button");
const fxLayer = document.getElementById("fx-layer");
const resultOverlay = document.getElementById("result-overlay");
const resultEyebrow = document.getElementById("result-eyebrow");
const resultTitle = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");
const resultTime = document.getElementById("result-time");
const resultBoard = document.getElementById("result-board");
const resultButton = document.getElementById("result-button");
const sizeSlider = document.getElementById("size-slider");
const difficultySlider = document.getElementById("difficulty-slider");
const sizeValue = document.getElementById("size-value");
const difficultyValue = document.getElementById("difficulty-value");

const BASE_HEX_SIZE = 40;
const HEX_HEIGHT_RATIO = 0.92;
const HORIZONTAL_STEP_RATIO = 0.75;

let selectedConfig = presetConfigs[0];
let currentMode = "preset";
let boardState = null;
let timerId = null;
let elapsedSeconds = 0;
let highlightedCell = null;
let overlayTimeoutId = null;
let queenBeeFrameId = null;
let queenBeeTimeoutId = null;

const beeConfigs = [
  { edge: "top", duration: 36, delay: 0, scale: 1.0 },
  { edge: "top", duration: 44, delay: -18, scale: 0.86, reverse: true },
  { edge: "bottom", duration: 42, delay: -8, scale: 1.08 },
  { edge: "bottom", duration: 50, delay: -26, scale: 0.92, reverse: true },
  { edge: "left", duration: 34, delay: -11, scale: 0.9 },
  { edge: "right", duration: 39, delay: -20, scale: 1.02, reverse: true },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildCustomConfig() {
  const size = Number(sizeSlider.value);
  const difficulty = Number(difficultySlider.value) / 100;
  return {
    id: "custom",
    name: "Custom Hive",
    cols: size,
    rows: size,
    mineRatio: difficulty,
    tag: "Custom",
  };
}

function updateCustomLabels() {
  const size = Number(sizeSlider.value);
  const difficulty = Number(difficultySlider.value);
  sizeValue.textContent = `${size} x ${size}`;
  difficultyValue.textContent = `${difficulty}%`;
}

function getMineCount(config) {
  const totalCells = config.cols * config.rows;
  return clamp(Math.round(totalCells * config.mineRatio), 1, totalCells - 1);
}

function createPresetButtons() {
  presetGrid.innerHTML = "";

  for (const config of presetConfigs) {
    const button = document.createElement("button");
    button.className = "preset-button";
    button.type = "button";
    button.dataset.presetId = config.id;

    button.innerHTML = `
      <div class="preset-title">
        <span>${config.name}</span>
        <span>${config.tag}</span>
      </div>
      <div class="preset-meta">
        <span>${config.cols} x ${config.rows}</span>
        <span>${getMineCount(config)} mines</span>
      </div>
    `;

    button.addEventListener("click", () => {
      currentMode = "preset";
      selectedConfig = config;
      syncPresetSelection();
      startGame(config);
    });

    presetGrid.appendChild(button);
  }
}

function syncPresetSelection() {
  const buttons = presetGrid.querySelectorAll(".preset-button");
  for (const button of buttons) {
    const isActive = currentMode === "preset" && button.dataset.presetId === selectedConfig.id;
    button.classList.toggle("active", isActive);
  }
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  if (timerId) {
    return;
  }

  timerId = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = String(elapsedSeconds);
  }, 1000);
}

function setStatus(title, text) {
  statusTitle.textContent = title;
  statusText.textContent = text;
}

function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function clearEffects() {
  fxLayer.innerHTML = "";
  if (overlayTimeoutId) {
    clearTimeout(overlayTimeoutId);
    overlayTimeoutId = null;
  }
  if (queenBeeFrameId) {
    cancelAnimationFrame(queenBeeFrameId);
    queenBeeFrameId = null;
  }
  if (queenBeeTimeoutId) {
    clearTimeout(queenBeeTimeoutId);
    queenBeeTimeoutId = null;
  }
}

function createAmbientBees() {
  beeLayer.innerHTML = "";

  for (const beeConfig of beeConfigs) {
    const bee = document.createElement("div");
    bee.className = `bee ${beeConfig.edge}${beeConfig.reverse ? " reverse" : ""}`;
    bee.style.animationDuration = `${beeConfig.duration}s`;
    bee.style.animationDelay = `${beeConfig.delay}s`;
    bee.style.setProperty("--bee-scale", String(beeConfig.scale));
    beeLayer.appendChild(bee);
  }
}

function hideOverlay() {
  resultOverlay.classList.remove("visible");
  resultOverlay.setAttribute("aria-hidden", "true");
}

function showOverlay({ eyebrow, title, message, buttonLabel }) {
  resultEyebrow.textContent = eyebrow;
  resultTitle.textContent = title;
  resultMessage.textContent = message;
  resultTime.textContent = formatTime(elapsedSeconds);
  resultBoard.textContent = `${boardState.config.cols} x ${boardState.config.rows}`;
  resultButton.textContent = buttonLabel;
  resultOverlay.classList.add("visible");
  resultOverlay.setAttribute("aria-hidden", "false");
}

function spawnParticles(type, count) {
  clearEffects();

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("div");
    particle.className = `particle ${type}`;
    const size = type === "honey-drop"
      ? 10 + Math.random() * 28
      : 14 + Math.random() * 18;
    const left = Math.random() * 100;
    const driftX = `${(Math.random() - 0.5) * (type === "honey-drop" ? 260 : 180)}px`;
    const duration = type === "honey-drop"
      ? 1200 + Math.random() * 900
      : 700 + Math.random() * 500;
    const delay = Math.random() * 180;

    particle.style.width = `${size}px`;
    particle.style.height = `${size * (type === "honey-drop" ? 1.25 : 1)}px`;
    particle.style.left = `${left}vw`;
    particle.style.animationDuration = `${duration}ms`;
    particle.style.animationDelay = `${delay}ms`;
    particle.style.setProperty("--drift-x", driftX);
    particle.style.setProperty("--particle-scale", `${0.75 + Math.random() * 1.3}`);
    particle.style.setProperty("--rise-y", `${80 + Math.random() * 160}px`);

    fxLayer.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove(), { once: true });
  }
}

function spawnFireworks() {
  const colors = ["#ffd75e", "#ff8a5b", "#fff0a6", "#8ae3ff", "#ff9fd2"];

  for (let burst = 0; burst < 7; burst += 1) {
    const centerX = 14 + Math.random() * 72;
    const centerY = 10 + Math.random() * 42;

    for (let index = 0; index < 18; index += 1) {
      const particle = document.createElement("div");
      particle.className = "particle firework";
      const angle = (Math.PI * 2 * index) / 18;
      const distance = 36 + Math.random() * 84;
      particle.style.left = `${centerX}vw`;
      particle.style.top = `${centerY}vh`;
      particle.style.animationDuration = `${900 + Math.random() * 500}ms`;
      particle.style.animationDelay = `${burst * 140 + Math.random() * 120}ms`;
      particle.style.setProperty("--burst-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--burst-y", `${Math.sin(angle) * distance}px`);
      particle.style.setProperty("--burst-scale", `${0.8 + Math.random() * 0.9}`);
      particle.style.setProperty("--burst-color", colors[(burst + index) % colors.length]);
      fxLayer.appendChild(particle);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
    }
  }
}

function getSafeCellsForEggs() {
  const safeCells = [];

  for (let row = 0; row < boardState.config.rows; row += 1) {
    for (let col = 0; col < boardState.config.cols; col += 1) {
      const cell = boardState.cells[row][col];
      if (!cell.mine && cell.revealed) {
        safeCells.push({ row, col });
      }
    }
  }

  safeCells.sort((left, right) => (left.row + left.col) - (right.row + right.col));
  return safeCells;
}

function markEggAt(row, col) {
  const cell = boardState.cells[row][col];
  cell.egged = true;
  const selector = `.hex-cell[data-row="${row}"][data-col="${col}"]`;
  const button = boardElement.querySelector(selector);
  if (button) {
    button.classList.add("egged");
  }
}

function animateQueenBee() {
  const safeCells = getSafeCellsForEggs();
  if (safeCells.length === 0) {
    return;
  }

  const queenBee = document.createElement("div");
  queenBee.className = "mother-bee";
  boardElement.appendChild(queenBee);

  const metrics = getBoardMetrics(boardState.config, getActiveHexSize());
  const route = safeCells.filter((_, index) => index % Math.max(1, Math.floor(safeCells.length / 18)) === 0);
  if (route[route.length - 1] !== safeCells[safeCells.length - 1]) {
    route.push(safeCells[safeCells.length - 1]);
  }

  const points = route.map(({ row, col }) => ({
    x: (col * metrics.horizontalStep) + (metrics.hexSize * 0.1),
    y: (row * metrics.verticalStep) + (col % 2 === 1 ? metrics.hexHeight / 2 : 0) - 8,
    row,
    col,
  }));

  let pointIndex = 0;
  let segmentStart = 0;
  const segmentDuration = 260;
  let lastEggIndex = -1;

  function step(timestamp) {
    if (!segmentStart) {
      segmentStart = timestamp;
    }

    const current = points[pointIndex];
    const next = points[Math.min(pointIndex + 1, points.length - 1)];
    const progress = Math.min((timestamp - segmentStart) / segmentDuration, 1);
    const x = current.x + ((next.x - current.x) * progress);
    const y = current.y + ((next.y - current.y) * progress);
    queenBee.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    const eggTargetIndex = Math.floor(((pointIndex + progress) / points.length) * safeCells.length);
    if (eggTargetIndex > lastEggIndex && eggTargetIndex < safeCells.length) {
      const eggTarget = safeCells[eggTargetIndex];
      markEggAt(eggTarget.row, eggTarget.col);
      lastEggIndex = eggTargetIndex;
    }

    if (progress >= 1) {
      pointIndex += 1;
      segmentStart = timestamp;
      if (pointIndex >= points.length - 1) {
        while (lastEggIndex < safeCells.length - 1) {
          lastEggIndex += 1;
          const eggTarget = safeCells[lastEggIndex];
          markEggAt(eggTarget.row, eggTarget.col);
        }

        queenBeeTimeoutId = window.setTimeout(() => queenBee.remove(), 900);
        queenBeeFrameId = null;
        return;
      }
    }

    queenBeeFrameId = window.requestAnimationFrame(step);
  }

  queenBeeFrameId = window.requestAnimationFrame(step);
}

function celebrateWin() {
  spawnParticles("win-spark", 32);
  spawnFireworks();
  animateQueenBee();
  showOverlay({
    eyebrow: "Hive cleared",
    title: "Sweet victory",
    message: `Fantastic run. You cleared the whole honeycomb in ${formatTime(elapsedSeconds)}, and the mother bee is laying fresh eggs in the safe comb.`,
    buttonLabel: "Play Another Round",
  });
}

function explodeHoney() {
  spawnParticles("honey-drop", 42);
  showOverlay({
    eyebrow: "Hive ruptured",
    title: "Honey everywhere",
    message: `Boom. A hidden mine burst the comb after ${formatTime(elapsedSeconds)}. Shake it off and try again.`,
    buttonLabel: "Try Again",
  });
}

function updateHighlights() {
  const buttons = boardElement.querySelectorAll(".hex-cell");
  for (const button of buttons) {
    button.classList.remove("neighbor-focus", "anchor-focus");
  }

  if (!highlightedCell || !boardState) {
    return;
  }

  const anchorSelector = `.hex-cell[data-row="${highlightedCell.row}"][data-col="${highlightedCell.col}"]`;
  const anchorButton = boardElement.querySelector(anchorSelector);
  if (anchorButton) {
    anchorButton.classList.add("anchor-focus");
  }

  const neighbors = getNeighbors(
    highlightedCell.row,
    highlightedCell.col,
    boardState.config.rows,
    boardState.config.cols,
  );

  for (const neighbor of neighbors) {
    const selector = `.hex-cell[data-row="${neighbor.row}"][data-col="${neighbor.col}"]`;
    const button = boardElement.querySelector(selector);
    if (button) {
      button.classList.add("neighbor-focus");
    }
  }
}

function createEmptyBoard(config) {
  const cells = [];

  for (let row = 0; row < config.rows; row += 1) {
    const rowCells = [];
    for (let col = 0; col < config.cols; col += 1) {
      rowCells.push({
      row,
      col,
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      egged: false,
    });
    }
    cells.push(rowCells);
  }

  return {
    config,
    cells,
    mineCount: getMineCount(config),
    flaggedCount: 0,
    revealedCount: 0,
    firstMove: true,
    isGameOver: false,
    hasWon: false,
  };
}

function oddQToCube(row, col) {
  const x = col;
  const z = row - ((col - (col & 1)) / 2);
  const y = -x - z;
  return { x, y, z };
}

function cubeToOddQ(x, y, z) {
  return {
    col: x,
    row: z + ((x - (x & 1)) / 2),
  };
}

function getNeighbors(row, col, rows, cols) {
  const origin = oddQToCube(row, col);
  const directions = [
    { x: 1, y: -1, z: 0 },
    { x: 1, y: 0, z: -1 },
    { x: 0, y: 1, z: -1 },
    { x: -1, y: 1, z: 0 },
    { x: -1, y: 0, z: 1 },
    { x: 0, y: -1, z: 1 },
  ];

  return directions
    .map((direction) => cubeToOddQ(
      origin.x + direction.x,
      origin.y + direction.y,
      origin.z + direction.z,
    ))
    .filter(({ row: nextRow, col: nextCol }) =>
      nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols);
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
}

function plantMines(board, safeRow, safeCol) {
  const candidates = [];

  for (let row = 0; row < board.config.rows; row += 1) {
    for (let col = 0; col < board.config.cols; col += 1) {
      const isSafeOrigin = row === safeRow && col === safeCol;
      const isNeighbor = getNeighbors(safeRow, safeCol, board.config.rows, board.config.cols)
        .some((neighbor) => neighbor.row === row && neighbor.col === col);

      if (!isSafeOrigin && !isNeighbor) {
        candidates.push({ row, col });
      }
    }
  }

  shuffle(candidates);

  for (let index = 0; index < board.mineCount; index += 1) {
    const choice = candidates[index];
    board.cells[choice.row][choice.col].mine = true;
  }

  for (let row = 0; row < board.config.rows; row += 1) {
    for (let col = 0; col < board.config.cols; col += 1) {
      const cell = board.cells[row][col];
      if (cell.mine) {
        continue;
      }

      cell.adjacent = getNeighbors(row, col, board.config.rows, board.config.cols)
        .filter((neighbor) => board.cells[neighbor.row][neighbor.col].mine)
        .length;
    }
  }
}

function updateMineCounter() {
  const remaining = Math.max(boardState.mineCount - boardState.flaggedCount, 0);
  mineCounter.textContent = String(remaining);
}

function revealCell(row, col) {
  const cell = boardState.cells[row][col];

  if (cell.revealed || cell.flagged || boardState.isGameOver) {
    return;
  }

  if (boardState.firstMove) {
    plantMines(boardState, row, col);
    boardState.firstMove = false;
    startTimer();
  }

  cell.revealed = true;
  boardState.revealedCount += 1;

  if (cell.mine) {
    boardState.isGameOver = true;
    stopTimer();
    revealAllMines(row, col);
    setStatus("Hive breached", "A hidden mine detonated. Reset the board and try a cleaner route.");
    explodeHoney();
    renderBoard();
    return;
  }

  if (cell.adjacent === 0) {
    floodReveal(row, col);
  }

  if (checkWin()) {
    boardState.isGameOver = true;
    boardState.hasWon = true;
    stopTimer();
    setStatus("Hive secured", `You cleared ${boardState.config.cols} x ${boardState.config.rows} without a blast.`);
    renderBoard();
    celebrateWin();
    return;
  }

  setStatus("Sweep in progress", "Clear safe cells and flag the suspicious hexes.");

  renderBoard();
}

function floodReveal(startRow, startCol) {
  const queue = [{ row: startRow, col: startCol }];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentCell = boardState.cells[current.row][current.col];

    for (const neighbor of getNeighbors(current.row, current.col, boardState.config.rows, boardState.config.cols)) {
      const nextCell = boardState.cells[neighbor.row][neighbor.col];
      if (nextCell.revealed || nextCell.flagged || nextCell.mine) {
        continue;
      }

      nextCell.revealed = true;
      boardState.revealedCount += 1;

      if (nextCell.adjacent === 0) {
        queue.push(neighbor);
      }
    }
  }
}

function revealAllMines(triggerRow, triggerCol) {
  for (let row = 0; row < boardState.config.rows; row += 1) {
    for (let col = 0; col < boardState.config.cols; col += 1) {
      const cell = boardState.cells[row][col];
      if (cell.mine) {
        cell.revealed = true;
      }
      if (row === triggerRow && col === triggerCol) {
        cell.burst = true;
      }
    }
  }
}

function toggleFlag(row, col) {
  const cell = boardState.cells[row][col];

  if (cell.revealed || boardState.isGameOver) {
    return;
  }

  cell.flagged = !cell.flagged;
  boardState.flaggedCount += cell.flagged ? 1 : -1;
  updateMineCounter();
  renderBoard();
}

function checkWin() {
  const totalSafeCells = (boardState.config.cols * boardState.config.rows) - boardState.mineCount;
  return boardState.revealedCount >= totalSafeCells;
}

function getCellDisplay(cell) {
  if (!cell.revealed) {
    return cell.flagged ? "!" : "";
  }

  if (cell.mine) {
    return "*";
  }

  return cell.adjacent > 0 ? String(cell.adjacent) : "";
}

function getBoardMetrics(config, hexSize) {
  const hexHeight = hexSize * HEX_HEIGHT_RATIO;
  const horizontalStep = hexSize * HORIZONTAL_STEP_RATIO;
  const verticalStep = hexHeight;
  const boardWidth = ((config.cols - 1) * horizontalStep) + hexSize;
  const boardHeight = ((config.rows - 1) * verticalStep) + hexHeight + (config.cols > 1 ? hexHeight / 2 : 0);

  return {
    hexSize,
    hexHeight,
    horizontalStep,
    verticalStep,
    boardWidth,
    boardHeight,
  };
}

function getActiveHexSize() {
  return window.innerWidth <= 720 ? 34 : BASE_HEX_SIZE;
}

function renderBoard() {
  boardElement.innerHTML = "";

  const metrics = getBoardMetrics(boardState.config, getActiveHexSize());
  boardElement.style.width = `${metrics.boardWidth}px`;
  boardElement.style.height = `${metrics.boardHeight}px`;
  boardElement.style.setProperty("--hex-size", `${metrics.hexSize}px`);

  for (let row = 0; row < boardState.config.rows; row += 1) {
    for (let col = 0; col < boardState.config.cols; col += 1) {
      const cell = boardState.cells[row][col];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hex-cell";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `Row ${row + 1}, Column ${col + 1}`);
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.style.left = `${col * metrics.horizontalStep}px`;
      button.style.top = `${(row * metrics.verticalStep) + (col % 2 === 1 ? metrics.hexHeight / 2 : 0)}px`;
      button.textContent = getCellDisplay(cell);

      if (cell.revealed) {
        button.classList.add("revealed");
      }
      if (cell.flagged) {
        button.classList.add("flagged");
      }
      if (cell.mine) {
        button.classList.add("mine");
      }
      if (cell.burst) {
        button.classList.add("burst");
      }
      if (cell.revealed && !cell.mine && cell.adjacent === 0) {
        button.classList.add("safe-zero");
      }
      if (cell.revealed && cell.adjacent > 0) {
        button.classList.add(`n${Math.min(cell.adjacent, 6)}`);
      }

      button.addEventListener("click", () => revealCell(row, col));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(row, col);
      });
      button.addEventListener("mouseenter", () => {
        if (cell.revealed && !cell.mine && cell.adjacent > 0) {
          highlightedCell = { row, col };
          updateHighlights();
          setStatus("Hex count preview", "Hovered numbers count the six touching hexes highlighted on the board.");
        }
      });
      button.addEventListener("mouseleave", () => {
        if (highlightedCell && highlightedCell.row === row && highlightedCell.col === col) {
          highlightedCell = null;
          updateHighlights();
          if (!boardState.isGameOver) {
            setStatus("Sweep in progress", "Hovered numbers highlight the six touching hexes they count.");
          }
        }
      });

      boardElement.appendChild(button);
    }
  }

  updateMineCounter();
  updateHighlights();
}

function startGame(config) {
  stopTimer();
  elapsedSeconds = 0;
  highlightedCell = null;
  clearEffects();
  hideOverlay();
  timerElement.textContent = "0";
  boardState = createEmptyBoard(config);
  activeModeLabel.textContent = config.name;
  setStatus("Ready to sweep", "Left click reveals a hex. Right click plants a warning flag. Hover a number to see its six neighbors.");
  renderBoard();
}

resetButton.addEventListener("click", () => {
  startGame(currentMode === "custom" ? buildCustomConfig() : selectedConfig);
});

customStartButton.addEventListener("click", () => {
  currentMode = "custom";
  syncPresetSelection();
  startGame(buildCustomConfig());
});

sizeSlider.addEventListener("input", updateCustomLabels);
difficultySlider.addEventListener("input", updateCustomLabels);
resultButton.addEventListener("click", () => {
  hideOverlay();
  startGame(currentMode === "custom" ? buildCustomConfig() : selectedConfig);
});

createPresetButtons();
updateCustomLabels();
syncPresetSelection();
createAmbientBees();
startGame(selectedConfig);
window.addEventListener("resize", () => {
  if (boardState) {
    renderBoard();
  }
});
