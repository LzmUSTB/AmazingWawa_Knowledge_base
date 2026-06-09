<script setup>
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const canvasRef = ref(null);
const angle = ref(0.8);
const dragStart = ref(null);
const parameterValues = ref({});

const mode = computed(() => props.data.mode || "2d");
const formula = computed(() => props.data.formula || "y = a * sin(bx + c) + d");
const parameters = computed(() => props.data.parameters || { a: 1, b: 1, c: 0, d: 0 });
const range = computed(() => props.data.range || { x: [-6.28, 6.28], y: [-3.14, 3.14] });

watch(
  parameters,
  (nextParameters) => {
    parameterValues.value = Object.fromEntries(
      Object.entries(nextParameters).map(([key, value]) => [key, Number(value) || 0]),
    );
  },
  { immediate: true },
);

watch([parameterValues, angle, mode], draw, { deep: true });

onMounted(draw);

function getParam(name, fallback = 0) {
  return Number(parameterValues.value[name] ?? fallback);
}

function evaluate2d(x) {
  const a = getParam("a", 1);
  const b = getParam("b", 1);
  const c = getParam("c", 0);
  const d = getParam("d", 0);
  return a * Math.sin(b * x + c) + d;
}

function evaluate3d(x, y) {
  const a = getParam("a", 1);
  const b = getParam("b", 1);
  const c = getParam("c", 0);
  const d = getParam("d", 0);
  const e = getParam("e", 1);
  return a * Math.sin(b * x + c) * Math.cos(e * y) + d;
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
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.strokeStyle = "rgba(237,237,237,0.24)";
  ctx.lineWidth = 1;
  drawGrid(ctx, rect.width, rect.height);
  if (mode.value === "3d") draw3d(ctx, rect.width, rect.height);
  else draw2d(ctx, rect.width, rect.height);
}

function drawGrid(ctx, width, height) {
  for (let x = 0; x <= width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function draw2d(ctx, width, height) {
  const xRange = range.value.x || [-6.28, 6.28];
  const samples = 160;
  ctx.strokeStyle = "#c8ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const x = xRange[0] + (xRange[1] - xRange[0]) * t;
    const y = evaluate2d(x);
    const screenX = 24 + t * (width - 48);
    const screenY = height / 2 - y * 36;
    if (i === 0) ctx.moveTo(screenX, screenY);
    else ctx.lineTo(screenX, screenY);
  }
  ctx.stroke();
  drawAxisLabel(ctx, "x", width - 24, height / 2 - 8);
  drawAxisLabel(ctx, "y", 28, 20);
}

function project3d(x, y, z, width, height) {
  const rotation = angle.value;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  return [width / 2 + rx * 46, height / 2 + ry * 18 - z * 42];
}

function draw3d(ctx, width, height) {
  const xRange = range.value.x || [-3.14, 3.14];
  const yRange = range.value.y || [-3.14, 3.14];
  const steps = 22;
  ctx.strokeStyle = "#00b7ff";
  ctx.lineWidth = 1;
  for (let yi = 0; yi <= steps; yi += 1) {
    ctx.beginPath();
    for (let xi = 0; xi <= steps; xi += 1) {
      const x = xRange[0] + ((xRange[1] - xRange[0]) * xi) / steps;
      const y = yRange[0] + ((yRange[1] - yRange[0]) * yi) / steps;
      const z = evaluate3d(x, y);
      const [screenX, screenY] = project3d(x, y, z, width, height);
      if (xi === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.stroke();
  }
  drawAxisLabel(ctx, "x", width - 34, height - 30);
  drawAxisLabel(ctx, "y", 30, height - 30);
  drawAxisLabel(ctx, "z", width / 2 + 12, 28);
}

function drawAxisLabel(ctx, text, x, y) {
  ctx.fillStyle = "#ededed";
  ctx.font = "11px Cascadia Mono, Consolas, monospace";
  ctx.fillText(text, x, y);
}

function handlePointerDown(event) {
  if (mode.value !== "3d") return;
  dragStart.value = { x: event.clientX, angle: angle.value };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!dragStart.value) return;
  angle.value = dragStart.value.angle + (event.clientX - dragStart.value.x) / 120;
}

function handlePointerUp() {
  dragStart.value = null;
}
</script>

<template>
  <div class="expression-block">
    <header>
      <div class="block-kicker">Expression Visualizer / {{ mode }}</div>
      <h3>{{ data.title || "Expression" }}</h3>
      <code>{{ formula }}</code>
    </header>
    <canvas
      ref="canvasRef"
      class="expression-canvas"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    ></canvas>
    <div class="parameter-grid">
      <label v-for="(_, key) in parameterValues" :key="key">
        <span>{{ key }}: {{ Number(parameterValues[key]).toFixed(2) }}</span>
        <input v-model.number="parameterValues[key]" max="5" min="-5" step="0.1" type="range" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.expression-block {
  display: grid;
  gap: 14px;
  border: 1px solid var(--border-muted);
  border-left: 5px solid var(--graphics);
  background: var(--background-panel);
  padding: 16px;
}

header {
  display: grid;
  gap: 6px;
}

.block-kicker,
label span {
  color: var(--text-muted);
  font-size: var(--font-size-small);
  font-weight: 800;
  text-transform: uppercase;
}

h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-title);
}

code {
  width: max-content;
  max-width: 100%;
  overflow: auto;
  border: 1px solid var(--border-muted);
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  padding: 5px 8px;
}

.expression-canvas {
  width: 100%;
  height: 260px;
  border: 1px solid var(--border-muted);
  background: var(--background-main);
  touch-action: none;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

label {
  display: grid;
  gap: 6px;
}

input {
  accent-color: var(--graphics);
}
</style>
