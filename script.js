const presetConfigs = [
  { id: "starter", name: "Starter Hive", cols: 8, rows: 8, mineRatio: 0.14, tag: "Calm" },
  { id: "scout", name: "Scout Comb", cols: 10, rows: 10, mineRatio: 0.17, tag: "Warm" },
  { id: "worker", name: "Worker Nest", cols: 12, rows: 12, mineRatio: 0.19, tag: "Alert" },
  { id: "queen", name: "Queen Chamber", cols: 14, rows: 14, mineRatio: 0.22, tag: "Sharp" },
  { id: "storm", name: "Storm Swarm", cols: 16, rows: 16, mineRatio: 0.25, tag: "Brutal" },
];

const boardElement = document.getElementById("board");
const presetGrid = document.getElementById("preset-grid");
const mineCounter = document.getElementById("mine-counter");
const timerElement = document.getElementById("timer");
const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const activeModeLabel = document.getElementById("active-mode-label");
const resetButton = document.getElementById("reset-button");
const customStartButton = document.getElementById("custom-start-button");
const sizeSlider = document.getElementById("size-slider");
const difficultySlider = document.getElementById("difficulty-slider");
const sizeValue = document.getElementById("size-value");
const difficultyValue = document.getElementById("difficulty-value");

const HEX_SIZE = 40;
const HEX_HEIGHT = HEX_SIZE * 0.92;
const HORIZONTAL_STEP = HEX_SIZE * 0.75;
const VERTICAL_STEP = HEX_HEIGHT;

let selectedConfig = presetConfigs[0];
let currentMode = "preset";
let boardState = null;
let timerId = null;
let elapsedSeconds = 0;

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
  } else {
    setStatus("Sweep in progress", "Clear safe cells and flag the suspicious hexes.");
  }

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

function renderBoard() {
  boardElement.innerHTML = "";

  const boardWidth = ((boardState.config.cols - 1) * HORIZONTAL_STEP) + HEX_SIZE + 20;
  const boardHeight = ((boardState.config.rows - 1) * VERTICAL_STEP) + HEX_HEIGHT + 20 + (boardState.config.cols > 1 ? HEX_HEIGHT / 2 : 0);
  boardElement.style.width = `${boardWidth}px`;
  boardElement.style.height = `${boardHeight}px`;

  for (let row = 0; row < boardState.config.rows; row += 1) {
    for (let col = 0; col < boardState.config.cols; col += 1) {
      const cell = boardState.cells[row][col];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hex-cell";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `Row ${row + 1}, Column ${col + 1}`);
      button.style.left = `${10 + (col * HORIZONTAL_STEP)}px`;
      button.style.top = `${10 + (row * VERTICAL_STEP) + (col % 2 === 1 ? HEX_HEIGHT / 2 : 0)}px`;
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

      boardElement.appendChild(button);
    }
  }

  updateMineCounter();
}

function startGame(config) {
  stopTimer();
  elapsedSeconds = 0;
  timerElement.textContent = "0";
  boardState = createEmptyBoard(config);
  activeModeLabel.textContent = config.name;
  setStatus("Ready to sweep", "Left click reveals a hex. Right click plants a warning flag.");
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

createPresetButtons();
updateCustomLabels();
syncPresetSelection();
startGame(selectedConfig);
