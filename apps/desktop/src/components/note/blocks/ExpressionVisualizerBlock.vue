<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const canvasRef = ref(null);
const dragStart = ref(null);
const rotation = ref({ x: -0.72, z: 0.72 });
const parameterValues = ref({});

const mode = computed(() => (props.data.mode === "3d" ? "3d" : "2d"));
const renderSpec = computed(() => props.data.render || props.data.render_spec || null);

const renderKind = computed(() => {
  const kind = String(renderSpec.value?.kind || "").toLowerCase().replace(/[_-]/g, "");
  if (mode.value === "3d") return kind || "surface3d";
  return kind || "curve2d";
});

const normalizedParameters = computed(() => {
  const raw = props.data.parameters;

  if (Array.isArray(raw)) {
    return raw
      .filter((parameter) => parameter && parameter.name)
      .map((parameter) => normalizeParameter(parameter.name, parameter));
  }

  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([name, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return normalizeParameter(name, value);
      }

      return normalizeParameter(name, { default: value });
    });
  }

  return [];
});

const visibleParameters = computed(() => normalizedParameters.value);

const parameterDefaults = computed(() =>
  Object.fromEntries(normalizedParameters.value.map((parameter) => [parameter.name, parameter.default])),
);

const xRange = computed(() =>
  normalizeRange(
    renderSpec.value?.xRange ||
      renderSpec.value?.x_range ||
      renderSpec.value?.domain?.x ||
      props.data.range?.x,
    [-6.28, 6.28],
  ),
);

const yDomainRange = computed(() =>
  normalizeRange(
    renderSpec.value?.yRange ||
      renderSpec.value?.y_range ||
      renderSpec.value?.domain?.y ||
      props.data.range?.y,
    [-2.8, 2.8],
  ),
);

const zRange = computed(() =>
  normalizeRange(
    renderSpec.value?.zRange ||
      renderSpec.value?.z_range ||
      renderSpec.value?.range?.z,
    null,
  ),
);

const displayedFormula = computed(() => {
  return (
    props.data.formula_display ||
    props.data.formulaDisplay ||
    props.data.formula ||
    renderSpec.value?.formula ||
    renderSpec.value?.y ||
    renderSpec.value?.z ||
    "No formula"
  );
});

const expressionSource = computed(() => {
  if (!renderSpec.value) return "";
  if (mode.value === "3d") return String(renderSpec.value.z || renderSpec.value.expr || "");
  return String(renderSpec.value.y || renderSpec.value.expr || "");
});

const renderError = computed(() => {
  if (!renderSpec.value) {
    return "NO RENDER SPEC: provide render.y for 2D or render.z for 3D.";
  }

  if (mode.value === "2d" && renderKind.value !== "curve2d") {
    return `UNSUPPORTED 2D RENDER KIND: ${renderSpec.value.kind || "unknown"}`;
  }

  if (mode.value === "3d" && renderKind.value !== "surface3d") {
    return `UNSUPPORTED 3D RENDER KIND: ${renderSpec.value.kind || "unknown"}`;
  }

  if (!expressionSource.value.trim()) {
    return mode.value === "3d"
      ? "NO RENDER EXPRESSION: provide render.z."
      : "NO RENDER EXPRESSION: provide render.y.";
  }

  try {
    const evaluator = compileExpression(expressionSource.value);
    const testScope = { x: 1, y: 1, t: 1 };
    for (const parameter of normalizedParameters.value) {
      testScope[parameter.name] = parameter.default;
    }
    evaluator(testScope);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
});

const compiledExpression = computed(() => {
  if (renderError.value) return null;
  return compileExpression(expressionSource.value);
});

watch(
  parameterDefaults,
  (defaults) => {
    parameterValues.value = { ...defaults };
  },
  { immediate: true },
);

watch(
  [parameterValues, rotation, mode, renderSpec],
  () => nextTick(draw),
  { deep: true },
);

onMounted(draw);

function normalizeParameter(name, input) {
  const defaultValue = Number(input.default ?? input.value ?? 0);
  const min = Number(input.min ?? -5);
  const max = Number(input.max ?? 5);
  const step = Number(input.step ?? 0.1);

  return {
    name: String(name),
    label: String(input.label || name),
    default: Number.isFinite(defaultValue) ? defaultValue : 0,
    min: Number.isFinite(min) ? min : -5,
    max: Number.isFinite(max) ? max : 5,
    step: Number.isFinite(step) && step > 0 ? step : 0.1,
  };
}

function normalizeRange(value, fallback) {
  if (!Array.isArray(value) || value.length < 2) return fallback;
  const min = Number(value[0]);
  const max = Number(value[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return fallback;
  return min < max ? [min, max] : [max, min];
}

function resetParameters() {
  parameterValues.value = { ...parameterDefaults.value };
}

function getParam(name, fallback = 0) {
  return Number(parameterValues.value[name] ?? fallback);
}

function buildScope(extra = {}) {
  const scope = { ...extra };
  for (const parameter of normalizedParameters.value) {
    scope[parameter.name] = getParam(parameter.name, parameter.default);
  }
  return scope;
}

function evaluate2d(x) {
  const evaluator = compiledExpression.value;
  if (!evaluator) return NaN;
  return evaluator(buildScope({ x, t: x }));
}

function evaluate3d(x, y) {
  const evaluator = compiledExpression.value;
  if (!evaluator) return NaN;
  return evaluator(buildScope({ x, y }));
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));

  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  clear(ctx, rect.width, rect.height);

  if (renderError.value) {
    drawUnsupported(ctx, rect.width, rect.height, renderError.value);
    return;
  }

  if (mode.value === "3d") draw3d(ctx, rect.width, rect.height);
  else draw2d(ctx, rect.width, rect.height);
}

function clear(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(237, 237, 237, 0.12)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawUnsupported(ctx, width, height, message) {
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ededed";
  ctx.font = "800 15px Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("EXPRESSION NOT RENDERED", 28, 28);

  ctx.fillStyle = "#999999";
  ctx.font = "700 12px Cascadia Mono, Consolas, monospace";
  wrapText(ctx, message, 28, 62, Math.max(260, width - 56), 18);

  ctx.fillStyle = "rgba(200, 255, 0, 0.9)";
  ctx.font = "700 12px Cascadia Mono, Consolas, monospace";
  wrapText(
    ctx,
    "Formula display is still shown. Add a safe render spec to draw a curve or surface.",
    28,
    122,
    Math.max(260, width - 56),
    18,
  );
}

function draw2d(ctx, width, height) {
  const samples = Math.max(80, Number(renderSpec.value?.samples || 360));
  const values = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = xRange.value[0] + (xRange.value[1] - xRange.value[0]) * t;
    const y = evaluate2d(x);
    values.push({ t, x, y });
  }

  const finiteValues = values.filter((sample) => Number.isFinite(sample.y));
  const explicitYRange = normalizeRange(renderSpec.value?.valueRange || renderSpec.value?.value_range || null, null);
  const plotRange = explicitYRange || computeAutoRange(finiteValues.map((sample) => sample.y), [-2, 2]);

  drawAxes2d(ctx, width, height, plotRange);

  ctx.strokeStyle = "#c8ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();

  let drawing = false;

  for (const sample of values) {
    const screenX = 40 + sample.t * (width - 64);
    const screenY = mapValue(sample.y, plotRange[0], plotRange[1], height - 32, 24);

    if (!Number.isFinite(screenY)) {
      drawing = false;
      continue;
    }

    if (!drawing) {
      ctx.moveTo(screenX, screenY);
      drawing = true;
    } else {
      ctx.lineTo(screenX, screenY);
    }
  }

  ctx.stroke();
}

function computeAutoRange(values, fallback) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return fallback;

  let min = Math.min(...finite);
  let max = Math.max(...finite);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const padding = (max - min) * 0.12;
  return [min - padding, max + padding];
}

function mapValue(value, inputMin, inputMax, outputMin, outputMax) {
  if (!Number.isFinite(value)) return NaN;
  const t = (value - inputMin) / (inputMax - inputMin);
  return outputMin + (outputMax - outputMin) * t;
}

function drawAxes2d(ctx, width, height, plotRange) {
  const color = "rgba(237, 237, 237, 0.68)";
  const xAxisY = mapValue(0, plotRange[0], plotRange[1], height - 32, 24);
  const yAxisT = (0 - xRange.value[0]) / (xRange.value[1] - xRange.value[0]);
  const yAxisX = 40 + yAxisT * (width - 64);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(40, Number.isFinite(xAxisY) ? xAxisY : height / 2);
  ctx.lineTo(width - 24, Number.isFinite(xAxisY) ? xAxisY : height / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(Number.isFinite(yAxisX) ? yAxisX : width / 2, height - 24);
  ctx.lineTo(Number.isFinite(yAxisX) ? yAxisX : width / 2, 24);
  ctx.stroke();

  drawArrowHead(ctx, width - 24, Number.isFinite(xAxisY) ? xAxisY : height / 2, 0, color);
  drawArrowHead(ctx, Number.isFinite(yAxisX) ? yAxisX : width / 2, 24, -Math.PI / 2, color);

  drawAxisLabel(ctx, "x axis", width - 54, (Number.isFinite(xAxisY) ? xAxisY : height / 2) - 18, "#ededed");
  drawAxisLabel(ctx, "y axis", (Number.isFinite(yAxisX) ? yAxisX : width / 2) + 34, 34, "#ededed");
  drawAxisLabel(ctx, "0", (Number.isFinite(yAxisX) ? yAxisX : width / 2) - 14, (Number.isFinite(xAxisY) ? xAxisY : height / 2) + 16, "#777777");
}

function project3d(x, y, z, width, height) {
  const cosZ = Math.cos(rotation.value.z);
  const sinZ = Math.sin(rotation.value.z);
  const rotatedX = x * cosZ - y * sinZ;
  const rotatedY = x * sinZ + y * cosZ;

  const cosX = Math.cos(rotation.value.x);
  const sinX = Math.sin(rotation.value.x);
  const y2 = rotatedY * cosX - z * sinX;
  const z2 = rotatedY * sinX + z * cosX;

  const scale = Math.min(width, height) / 7;
  return [width / 2 + rotatedX * scale, height / 2 - y2 * scale - 8, z2];
}

function draw3d(ctx, width, height) {
  const steps = Math.max(8, Math.min(80, Number(renderSpec.value?.steps || 28)));
  const xMin = xRange.value[0];
  const xMax = xRange.value[1];
  const yMin = yDomainRange.value[0];
  const yMax = yDomainRange.value[1];
  const sampled = [];

  for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
    const row = [];
    for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
      const x = xMin + ((xMax - xMin) * xIndex) / steps;
      const y = yMin + ((yMax - yMin) * yIndex) / steps;
      row.push({ x, y, z: evaluate3d(x, y) });
    }
    sampled.push(row);
  }

  const autoZRange = zRange.value || computeAutoRange(sampled.flat().map((point) => point.z), [-1, 1]);
  const zScale = Number(renderSpec.value?.zScale || renderSpec.value?.z_scale || 1);

  ctx.lineWidth = 1;

  for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
    ctx.beginPath();
    let drawing = false;

    for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
      const point = sampled[yIndex][xIndex];
      const z = normalizeZ(point.z, autoZRange) * zScale;
      const [screenX, screenY] = project3d(point.x, point.y, z, width, height);

      if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
        drawing = false;
        continue;
      }

      if (!drawing) {
        ctx.moveTo(screenX, screenY);
        drawing = true;
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }

    ctx.strokeStyle = yIndex % 4 === 0 ? "rgba(200, 255, 0, 0.72)" : "rgba(237, 237, 237, 0.24)";
    ctx.stroke();
  }

  for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
    ctx.beginPath();
    let drawing = false;

    for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
      const point = sampled[yIndex][xIndex];
      const z = normalizeZ(point.z, autoZRange) * zScale;
      const [screenX, screenY] = project3d(point.x, point.y, z, width, height);

      if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
        drawing = false;
        continue;
      }

      if (!drawing) {
        ctx.moveTo(screenX, screenY);
        drawing = true;
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }

    ctx.strokeStyle = xIndex % 4 === 0 ? "rgba(200, 255, 0, 0.72)" : "rgba(237, 237, 237, 0.24)";
    ctx.stroke();
  }

  drawAxes3d(ctx, width, height);
}

function normalizeZ(value, range) {
  if (!Number.isFinite(value)) return NaN;
  const center = (range[0] + range[1]) / 2;
  const halfRange = Math.max(0.000001, (range[1] - range[0]) / 2);
  return (value - center) / halfRange;
}

function drawAxes3d(ctx, width, height) {
  draw3dAxis(ctx, width, height, [0, 0, 0], [3.2, 0, 0], "x axis", "#ededed");
  draw3dAxis(ctx, width, height, [0, 0, 0], [0, 3.2, 0], "y axis", "#00b7ff");
  draw3dAxis(ctx, width, height, [0, 0, 0], [0, 0, 2.5], "z axis", "#c8ff00");

  const [originX, originY] = project3d(0, 0, 0, width, height);
  ctx.fillStyle = "#ededed";
  ctx.fillRect(originX - 3, originY - 3, 6, 6);
  drawAxisLabel(ctx, "0", originX - 16, originY + 16, "#777777");
}

function draw3dAxis(ctx, width, height, from, to, label, color) {
  const [x1, y1] = project3d(from[0], from[1], from[2], width, height);
  const [x2, y2] = project3d(to[0], to[1], to[2], width, height);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  drawArrowHead(ctx, x2, y2, angle, color);
  drawAxisLabel(ctx, label, x2 + Math.cos(angle) * 28, y2 + Math.sin(angle) * 18, color);
}

function drawArrowHead(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-9, -4);
  ctx.lineTo(-9, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAxisLabel(ctx, text, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "800 12px Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, y);
}

function handlePointerDown(event) {
  if (mode.value !== "3d") return;

  dragStart.value = {
    x: event.clientX,
    y: event.clientY,
    rotation: { ...rotation.value },
  };

  event.currentTarget.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!dragStart.value || mode.value !== "3d") return;

  rotation.value = {
    z: dragStart.value.rotation.z + (event.clientX - dragStart.value.x) * 0.01,
    x: Math.max(-1.4, Math.min(0.2, dragStart.value.rotation.x + (event.clientY - dragStart.value.y) * 0.01)),
  };
}

function handlePointerUp() {
  dragStart.value = null;
}

const NUMBER_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*/;
const ALLOWED_FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  sqrt: Math.sqrt,
  exp: Math.exp,
  log: Math.log,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

function compileExpression(expression) {
  const tokens = tokenizeExpression(expression);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(type, value = null) {
    const token = tokens[index];
    if (!token || token.type !== type || (value !== null && token.value !== value)) {
      return null;
    }
    index += 1;
    return token;
  }

  function expect(type, value = null) {
    const token = consume(type, value);
    if (!token) {
      const expected = value === null ? type : `${type} "${value}"`;
      throw new Error(`Invalid expression: expected ${expected}`);
    }
    return token;
  }

  function parseExpression() {
    return parseAdditive();
  }

  function parseAdditive() {
    let node = parseMultiplicative();

    while (peek()?.type === "operator" && ["+", "-"].includes(peek().value)) {
      const operator = consume("operator").value;
      node = { type: "binary", operator, left: node, right: parseMultiplicative() };
    }

    return node;
  }

  function parseMultiplicative() {
    let node = parsePower();

    while (peek()?.type === "operator" && ["*", "/"].includes(peek().value)) {
      const operator = consume("operator").value;
      node = { type: "binary", operator, left: node, right: parsePower() };
    }

    return node;
  }

  function parsePower() {
    let node = parseUnary();

    if (peek()?.type === "operator" && peek().value === "^") {
      consume("operator", "^");
      node = { type: "binary", operator: "^", left: node, right: parsePower() };
    }

    return node;
  }

  function parseUnary() {
    if (peek()?.type === "operator" && ["+", "-"].includes(peek().value)) {
      const operator = consume("operator").value;
      return { type: "unary", operator, argument: parseUnary() };
    }

    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();

    if (!token) {
      throw new Error("Invalid expression: unexpected end");
    }

    if (consume("number")) {
      return { type: "number", value: token.value };
    }

    if (consume("identifier")) {
      const name = token.value;

      if (consume("paren", "(")) {
        if (!Object.hasOwn(ALLOWED_FUNCTIONS, name)) {
          throw new Error(`Unsupported function: ${name}`);
        }

        const args = [];

        if (!consume("paren", ")")) {
          do {
            args.push(parseExpression());
          } while (consume("comma", ","));

          expect("paren", ")");
        }

        return { type: "call", name, args };
      }

      return { type: "identifier", name };
    }

    if (consume("paren", "(")) {
      const node = parseExpression();
      expect("paren", ")");
      return node;
    }

    throw new Error(`Invalid expression near "${token.value}"`);
  }

  const ast = parseExpression();

  if (index < tokens.length) {
    throw new Error(`Invalid expression near "${tokens[index].value}"`);
  }

  return (scope) => evaluateAst(ast, scope);
}

function tokenizeExpression(expression) {
  const source = String(expression).trim();
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const rest = source.slice(index);

    if (/^\s+/.test(rest)) {
      index += rest.match(/^\s+/)[0].length;
      continue;
    }

    const numberMatch = rest.match(NUMBER_PATTERN);
    if (numberMatch) {
      tokens.push({ type: "number", value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }

    const identifierMatch = rest.match(IDENTIFIER_PATTERN);
    if (identifierMatch) {
      tokens.push({ type: "identifier", value: identifierMatch[0] });
      index += identifierMatch[0].length;
      continue;
    }

    const char = source[index];

    if ("+-*/^".includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if ("()".includes(char)) {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported expression character: "${char}"`);
  }

  return tokens;
}

function evaluateAst(node, scope) {
  switch (node.type) {
    case "number":
      return node.value;

    case "identifier": {
      if (node.name === "pi" || node.name === "PI") return Math.PI;
      if (node.name === "e") return Math.E;

      if (!Object.hasOwn(scope, node.name)) {
        throw new Error(`Unknown variable: ${node.name}`);
      }

      const value = Number(scope[node.name]);
      return Number.isFinite(value) ? value : NaN;
    }

    case "unary": {
      const value = evaluateAst(node.argument, scope);
      return node.operator === "-" ? -value : value;
    }

    case "binary": {
      const left = evaluateAst(node.left, scope);
      const right = evaluateAst(node.right, scope);

      if (node.operator === "+") return left + right;
      if (node.operator === "-") return left - right;
      if (node.operator === "*") return left * right;
      if (node.operator === "/") return right === 0 ? NaN : left / right;
      if (node.operator === "^") return Math.pow(left, right);

      return NaN;
    }

    case "call": {
      const fn = ALLOWED_FUNCTIONS[node.name];
      const args = node.args.map((argument) => evaluateAst(argument, scope));
      const value = fn(...args);
      return Number.isFinite(value) ? value : NaN;
    }

    default:
      return NaN;
  }
}
</script>

<template>
  <section class="expression-block">
    <div class="block-head">
      <div>
        <div class="block-kicker">expression-visualizer</div>
        <h3>{{ data.title || "Parametric Expression" }}</h3>
      </div>
      <div class="mode-badge">{{ mode === "3d" ? "3D Surface" : "2D Curve" }}</div>
    </div>

    <div class="expression-layout">
      <aside class="control-panel">
        <div class="label">formula</div>
        <div class="formula">{{ displayedFormula }}</div>

        <template v-if="visibleParameters.length">
          <label v-for="parameter in visibleParameters" :key="parameter.name" class="slider-row">
            <span>
              {{ parameter.label }}:
              {{ Number(parameterValues[parameter.name] ?? parameter.default).toFixed(2) }}
            </span>
            <input
              v-model.number="parameterValues[parameter.name]"
              :max="parameter.max"
              :min="parameter.min"
              :step="parameter.step"
              type="range"
            />
          </label>

          <button class="small-btn" type="button" @click="resetParameters">Reset Parameters</button>
        </template>

        <div v-else class="empty-parameters">No interactive parameters.</div>
      </aside>

      <div class="canvas-wrap">
        <canvas
          ref="canvasRef"
          class="expression-canvas"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
        ></canvas>

        <div class="canvas-hud">
          <span v-if="mode === '3d' && !renderError">drag: rotate 3d</span>
          <span>grid: analytic space</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.expression-block {
  display: grid;
  gap: 16px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--ml, var(--graphics));
  background: var(--background-panel);
  padding: 16px;
}

.block-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
}

.block-kicker,
.label,
.slider-row span,
.empty-parameters {
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

h3 {
  margin: 8px 0 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
  line-height: 1.1;
  text-transform: uppercase;
}

.expression-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
}

.control-panel {
  display: grid;
  align-self: start;
  gap: 14px;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
  padding: 14px;
}

.mode-badge,
.small-btn {
  border: 1px solid var(--border-muted);
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  padding: 8px 10px;
  text-transform: uppercase;
}

.mode-badge {
  align-self: start;
  color: var(--text-primary);
}

.small-btn {
  cursor: pointer;
}

.small-btn:hover {
  border-color: var(--border-primary);
  color: var(--text-primary);
  background: var(--background-panel);
}

.formula {
  overflow-x: auto;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  line-height: 1.6;
  padding: 12px;
}

.slider-row {
  display: grid;
  gap: 6px;
}

input[type="range"] {
  width: 100%;
  accent-color: var(--graphics);
}

.empty-parameters {
  border: 1px solid var(--border-muted);
  color: var(--text-muted);
  padding: 10px;
}

.canvas-wrap {
  position: relative;
  min-height: 430px;
  border: 1px solid var(--border-primary);
  background: var(--background-main);
}

.expression-canvas {
  display: block;
  width: 100%;
  height: 430px;
  touch-action: none;
}

.canvas-hud {
  position: absolute;
  left: 12px;
  top: 12px;
  display: grid;
  gap: 4px;
  color: var(--text-muted);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  pointer-events: none;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .block-head,
  .expression-layout {
    grid-template-columns: 1fr;
  }

  .block-head {
    display: grid;
  }
}
</style>
