const GAME_SECONDS = 180;
const CANVAS_SIZE = 420;
const SAMPLE_STEP = 3;
const SCORE_BOUNDS = { min: 54, max: 366 };
const ORIGINAL_SHAPES = [
  { type: "rect", fill: "#893024", x: 54, y: 54, w: 312, h: 312 },
  { type: "blob", fill: "#151b20", points: [[118,59],[164,52],[183,73],[220,70],[205,92],[217,125],[204,166],[224,197],[206,246],[161,225],[139,180],[108,171],[101,124]] },
  { type: "blob", fill: "#f3f2dc", points: [[82,249],[112,235],[158,242],[205,244],[251,252],[279,280],[291,340],[279,366],[111,366],[85,347],[71,302]] },
  { type: "blob", fill: "#151b20", points: [[82,216],[115,202],[139,220],[132,252],[105,264],[79,250]] },
  { type: "blob", fill: "#f3f2dc", points: [[92,218],[116,213],[131,226],[124,247],[101,253],[87,239]] },
  { type: "blob", fill: "#d29b4b", points: [[117,232],[132,235],[138,250],[128,266],[111,262],[104,247]] },
  { type: "blob", fill: "#f3f2dc", points: [[214,211],[252,202],[280,215],[285,242],[252,254],[221,244]] },
  { type: "blob", fill: "#d29b4b", points: [[177,94],[199,99],[203,128],[190,148],[168,137],[163,110]] },
  { type: "blob", fill: "#f3f2dc", points: [[164,117],[177,127],[189,121],[198,134],[187,152],[165,147],[153,130]] },
  { type: "blob", fill: "#151b20", points: [[158,92],[176,81],[195,86],[207,100],[204,121],[191,113],[176,119],[162,111]] },
  { type: "blob", fill: "#f0d9be", points: [[161,145],[188,158],[219,186],[243,222],[207,226],[172,205],[145,184]] },
  { type: "blob", fill: "#f0d9be", points: [[126,166],[156,179],[189,207],[166,219],[132,202],[109,184]] },
  { type: "blob", fill: "#893024", points: [[121,177],[158,154],[196,169],[226,207],[217,243],[174,226],[140,207],[104,207]] },
  { type: "blob", fill: "#f0d9be", points: [[127,157],[164,172],[188,193],[177,205],[141,184],[112,170]] },
  { type: "line", stroke: "#d29b4b", width: 10, points: [[88,94],[88,310]] },
  { type: "line", stroke: "#d29b4b", width: 8, points: [[81,101],[107,101]] },
  { type: "line", stroke: "#d29b4b", width: 8, points: [[87,119],[118,123]] },
  { type: "line", stroke: "#d29b4b", width: 7, points: [[292,88],[292,180]] },
  { type: "line", stroke: "#d29b4b", width: 6, points: [[282,101],[304,101]] },
  { type: "line", stroke: "#d29b4b", width: 6, points: [[281,122],[309,119]] },
  { type: "circle", fill: "#d29b4b", x: 87, y: 83, r: 9 },
  { type: "circle", fill: "#d29b4b", x: 292, y: 82, r: 8 }
];
const COLORS = ["#151b20", "#893024", "#f3f2dc", "#f0d9be", "#d29b4b", "#ffffff", "#5d3b25", "#4d7f57", "#2e5a88", "#c94b3a"];

const state = {
  brushColor: COLORS[0],
  brushSize: 14,
  tool: "brush",
  drawing: false,
  started: false,
  finished: false,
  remaining: GAME_SECONDS,
  timerId: null,
  lastPoint: null
};

const els = {
  timer: document.querySelector("#timer"),
  score: document.querySelector("#score"),
  status: document.querySelector("#status-text"),
  actionBar: document.querySelector("#action-bar"),
  toolPanel: document.querySelector("#tool-panel"),
  brushLabel: document.querySelector("#brush-label"),
  resultPanel: document.querySelector("#result-panel"),
  resultCopy: document.querySelector("#result-copy"),
  meterFill: document.querySelector("#meter-fill"),
  referenceCanvas: document.querySelector("#reference-canvas"),
  drawingCanvas: document.querySelector("#drawing-canvas"),
  comparisonCanvas: document.querySelector("#comparison-canvas")
};

const referenceContext = els.referenceCanvas.getContext("2d", { willReadFrequently: true });
const drawingContext = els.drawingCanvas.getContext("2d", { willReadFrequently: true });

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `button ${className || ""}`.trim();
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function buildInterface() {
  els.actionBar.append(
    createButton("Start 3 minute round", "", startGame),
    createButton("Score now", "secondary", finishGame),
    createButton("Reset canvas", "secondary", resetRound)
  );

  const colorGroup = document.createElement("div");
  colorGroup.className = "tool-group";
  colorGroup.append(createGroupTitle("Palette"));

  const palette = document.createElement("div");
  palette.className = "palette";
  COLORS.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.setAttribute("aria-label", `Select ${color}`);
    swatch.addEventListener("click", () => selectColor(color, swatch));
    if (color === state.brushColor) swatch.classList.add("active");
    palette.append(swatch);
  });
  colorGroup.append(palette);

  const modeGroup = document.createElement("div");
  modeGroup.className = "tool-group";
  modeGroup.append(createGroupTitle("Tool"));

  const toolButtons = document.createElement("div");
  toolButtons.className = "tool-buttons";
  [
    ["brush", "Brush"],
    ["bucket", "Paint bucket"],
    ["eraser", "Eraser"]
  ].forEach(([tool, label]) => {
    const button = createButton(label, tool === state.tool ? "tool-choice active" : "tool-choice", () => selectTool(tool));
    button.dataset.tool = tool;
    toolButtons.append(button);
  });
  modeGroup.append(toolButtons);

  const brushGroup = document.createElement("div");
  brushGroup.className = "tool-group";
  brushGroup.append(createGroupTitle("Brush size"));

  const rangeRow = document.createElement("label");
  rangeRow.className = "range-row";
  const range = document.createElement("input");
  range.type = "range";
  range.min = "3";
  range.max = "42";
  range.value = String(state.brushSize);
  const rangeValue = document.createElement("strong");
  rangeValue.textContent = `${state.brushSize}px`;
  range.addEventListener("input", () => {
    state.brushSize = Number(range.value);
    rangeValue.textContent = `${state.brushSize}px`;
    updateBrushLabel();
  });
  rangeRow.append(range, rangeValue);
  brushGroup.append(rangeRow);

  const help = document.createElement("p");
  help.className = "help-text";
  help.textContent = "Use your mouse, stylus, or finger. The final score samples both canvases and rewards close color matches in the right places.";

  els.toolPanel.append(modeGroup, colorGroup, brushGroup, help);
}

function createGroupTitle(text) {
  const title = document.createElement("span");
  title.className = "tool-group-title";
  title.textContent = text;
  return title;
}

function selectColor(color, activeSwatch) {
  state.brushColor = color;
  if (state.tool === "eraser") selectTool("brush");
  document.querySelectorAll(".swatch").forEach((swatch) => swatch.classList.remove("active"));
  activeSwatch.classList.add("active");
  updateBrushLabel();
}

function selectTool(tool) {
  state.tool = tool;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  els.drawingCanvas.classList.toggle("bucket-mode", tool === "bucket");
  updateBrushLabel();
}

function updateBrushLabel() {
  const colorText = state.tool === "eraser" ? "paper" : state.brushColor;
  els.brushLabel.textContent = `Tool: ${state.tool}, ${colorText}, ${state.brushSize}px`;
}

function drawOriginal() {
  referenceContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawPaper(referenceContext);
  ORIGINAL_SHAPES.forEach((shape) => drawShape(referenceContext, shape));
  drawFrame(referenceContext);
}

function drawPaper(ctx) {
  ctx.fillStyle = "#f8f3e7";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = "#eee4cf";
  ctx.fillRect(38, 38, 344, 344);
}

function drawShape(ctx, shape) {
  ctx.save();
  if (shape.type === "rect") {
    ctx.fillStyle = shape.fill;
    ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
  }
  if (shape.type === "circle") {
    ctx.fillStyle = shape.fill;
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (shape.type === "line") {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    shape.points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  }
  if (shape.type === "blob") {
    ctx.fillStyle = shape.fill;
    ctx.beginPath();
    shape.points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFrame(ctx) {
  const rings = [
    { inset: 26, color: "#7c5327", width: 7 },
    { inset: 33, color: "#d1a455", width: 5 },
    { inset: 40, color: "#7c5327", width: 4 }
  ];
  rings.forEach((ring) => {
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width;
    ctx.strokeRect(ring.inset, ring.inset, CANVAS_SIZE - ring.inset * 2, CANVAS_SIZE - ring.inset * 2);
  });
}

function resetDrawingSurface() {
  drawingContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawPaper(drawingContext);
}

function startGame() {
  if (state.started && !state.finished) return;
  state.started = true;
  state.finished = false;
  state.remaining = GAME_SECONDS;
  els.status.textContent = "Drawing";
  els.score.textContent = "--%";
  els.resultPanel.hidden = true;
  els.drawingCanvas.classList.remove("locked");
  resetDrawingSurface();
  updateTimer();
  clearInterval(state.timerId);
  state.timerId = setInterval(tick, 1000);
}

function tick() {
  state.remaining -= 1;
  updateTimer();
  if (state.remaining <= 0) finishGame();
}

function updateTimer() {
  const minutes = Math.floor(state.remaining / 60).toString().padStart(2, "0");
  const seconds = (state.remaining % 60).toString().padStart(2, "0");
  els.timer.textContent = `${minutes}:${seconds}`;
}

function resetRound() {
  clearInterval(state.timerId);
  state.started = false;
  state.finished = false;
  state.remaining = GAME_SECONDS;
  els.status.textContent = "Ready";
  els.score.textContent = "--%";
  els.resultPanel.hidden = true;
  els.drawingCanvas.classList.remove("locked");
  updateTimer();
  resetDrawingSurface();
}

function finishGame() {
  if (state.finished) return;
  clearInterval(state.timerId);
  state.started = false;
  state.finished = true;
  state.remaining = Math.max(0, state.remaining);
  updateTimer();
  const accuracy = scoreDrawing();
  const rounded = Math.round(accuracy);
  els.score.textContent = `${rounded}%`;
  els.status.textContent = "Scored";
  els.drawingCanvas.classList.add("locked");
  els.resultPanel.hidden = false;
  els.resultCopy.textContent = getScoreMessage(rounded);
  els.meterFill.style.width = `${rounded}%`;
}

function getScoreMessage(score) {
  if (score >= 88) return "Museum-level copy! Your shapes, colors, and placement are extremely close to the original.";
  if (score >= 70) return "Strong redraw. The main colors and silhouettes landed in the right regions.";
  if (score >= 45) return "Recognizable attempt. Try blocking in the big background, black shape, and white dress first.";
  return "Keep practicing. Larger color zones and closer placement will raise the real pixel accuracy score.";
}

function scoreDrawing() {
  const original = referenceContext.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
  const copy = drawingContext.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
  const blank = makeBlankDrawingData();
  const copyScore = getWeightedSimilarity(original, copy);
  const blankScore = getWeightedSimilarity(original, blank);
  const normalizedScore = ((copyScore - blankScore) / (100 - blankScore)) * 100;
  return Math.max(0, Math.min(100, normalizedScore));
}

function makeBlankDrawingData() {
  const comparisonContext = els.comparisonCanvas.getContext("2d", { willReadFrequently: true });
  comparisonContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawPaper(comparisonContext);
  return comparisonContext.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
}

function getWeightedSimilarity(original, copy) {
  let weightedScore = 0;
  let totalWeight = 0;

  for (let y = SCORE_BOUNDS.min; y < SCORE_BOUNDS.max; y += SAMPLE_STEP) {
    for (let x = SCORE_BOUNDS.min; x < SCORE_BOUNDS.max; x += SAMPLE_STEP) {
      const index = (y * CANVAS_SIZE + x) * 4;
      const originalBrightness = getBrightness(original[index], original[index + 1], original[index + 2]);
      const backgroundPenalty = originalBrightness > 232 ? 0.25 : 1;
      const edgeWeight = isNearOriginalEdge(original, x, y) ? 1.45 : 1;
      const weight = backgroundPenalty * edgeWeight;
      const distance = colorDistance(original, copy, index);
      const pixelScore = Math.max(0, 1 - distance / 441.68);
      weightedScore += pixelScore * weight;
      totalWeight += weight;
    }
  }

  return (weightedScore / totalWeight) * 100;
}

function colorDistance(original, copy, originalIndex, copyIndex = originalIndex) {
  const red = original[originalIndex] - copy[copyIndex];
  const green = original[originalIndex + 1] - copy[copyIndex + 1];
  const blue = original[originalIndex + 2] - copy[copyIndex + 2];
  return Math.hypot(red, green, blue);
}

function getBrightness(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function isNearOriginalEdge(data, x, y) {
  const right = Math.min(CANVAS_SIZE - 1, x + SAMPLE_STEP);
  const down = Math.min(CANVAS_SIZE - 1, y + SAMPLE_STEP);
  const here = (y * CANVAS_SIZE + x) * 4;
  const horizontal = (y * CANVAS_SIZE + right) * 4;
  const vertical = (down * CANVAS_SIZE + x) * 4;
  return colorDistance(data, data, here, horizontal) > 55 || colorDistance(data, data, here, vertical) > 55;
}

function getCanvasPoint(event) {
  const rect = els.drawingCanvas.getBoundingClientRect();
  const pointer = event.touches ? event.touches[0] : event;
  return {
    x: ((pointer.clientX - rect.left) / rect.width) * CANVAS_SIZE,
    y: ((pointer.clientY - rect.top) / rect.height) * CANVAS_SIZE
  };
}

function beginStroke(event) {
  if (state.finished) return;
  if (!state.started) startGame();
  const point = getCanvasPoint(event);
  if (state.tool === "bucket") {
    floodFill(point);
    return;
  }
  state.drawing = true;
  state.lastPoint = point;
  drawDot(state.lastPoint);
}

function continueStroke(event) {
  if (!state.drawing || state.finished) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  drawingContext.strokeStyle = getActiveDrawColor(point);
  drawingContext.lineWidth = state.brushSize;
  drawingContext.lineCap = "round";
  drawingContext.lineJoin = "round";
  drawingContext.beginPath();
  drawingContext.moveTo(state.lastPoint.x, state.lastPoint.y);
  drawingContext.lineTo(point.x, point.y);
  drawingContext.stroke();
  state.lastPoint = point;
}

function endStroke() {
  state.drawing = false;
  state.lastPoint = null;
}

function drawDot(point) {
  drawingContext.fillStyle = getActiveDrawColor(point);
  drawingContext.beginPath();
  drawingContext.arc(point.x, point.y, state.brushSize / 2, 0, Math.PI * 2);
  drawingContext.fill();
}

function getActiveDrawColor(point) {
  return state.tool === "eraser" ? getPaperColorForPoint(point) : state.brushColor;
}

function getPaperColorForPoint(point) {
  if (!point) return "#eee4cf";
  return point.x >= 38 && point.x <= 382 && point.y >= 38 && point.y <= 382 ? "#eee4cf" : "#f8f3e7";
}

function floodFill(point) {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  const image = drawingContext.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const data = image.data;
  const startIndex = (y * CANVAS_SIZE + x) * 4;
  const target = [data[startIndex], data[startIndex + 1], data[startIndex + 2], data[startIndex + 3]];
  const replacement = hexToRgba(state.brushColor);
  if (colorsMatch(target, replacement, 0)) return;

  const tolerance = 28;
  const stack = [[x, y]];
  const visited = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE);

  while (stack.length) {
    const [currentX, currentY] = stack.pop();
    if (currentX < 0 || currentX >= CANVAS_SIZE || currentY < 0 || currentY >= CANVAS_SIZE) continue;

    const pixelIndex = currentY * CANVAS_SIZE + currentX;
    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;

    const dataIndex = pixelIndex * 4;
    const current = [data[dataIndex], data[dataIndex + 1], data[dataIndex + 2], data[dataIndex + 3]];
    if (!colorsMatch(current, target, tolerance)) continue;

    data[dataIndex] = replacement[0];
    data[dataIndex + 1] = replacement[1];
    data[dataIndex + 2] = replacement[2];
    data[dataIndex + 3] = replacement[3];

    stack.push([currentX + 1, currentY], [currentX - 1, currentY], [currentX, currentY + 1], [currentX, currentY - 1]);
  }

  drawingContext.putImageData(image, 0, 0);
}

function colorsMatch(first, second, tolerance) {
  return Math.abs(first[0] - second[0]) <= tolerance
    && Math.abs(first[1] - second[1]) <= tolerance
    && Math.abs(first[2] - second[2]) <= tolerance
    && Math.abs(first[3] - second[3]) <= tolerance;
}

function hexToRgba(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    255
  ];
}

function wireDrawingEvents() {
  els.drawingCanvas.addEventListener("mousedown", beginStroke);
  els.drawingCanvas.addEventListener("mousemove", continueStroke);
  window.addEventListener("mouseup", endStroke);
  els.drawingCanvas.addEventListener("touchstart", beginStroke, { passive: true });
  els.drawingCanvas.addEventListener("touchmove", continueStroke, { passive: false });
  window.addEventListener("touchend", endStroke);
}

buildInterface();
drawOriginal();
resetDrawingSurface();
wireDrawingEvents();
updateBrushLabel();
updateTimer();
