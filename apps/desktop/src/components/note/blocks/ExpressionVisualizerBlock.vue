<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const canvasRef = ref(null);
const mode = ref(props.data.mode === "3d" ? "3d" : "2d");
const dragStart = ref(null);
const rotation = ref({ x: -0.72, z: 0.72 });
const parameterValues = ref({});

const parameterDefaults = computed(() => ({
  a: Number(props.data.parameters?.a ?? props.data.a ?? 1),
  b: Number(props.data.parameters?.b ?? props.data.b ?? 1.5),
  c: Number(props.data.parameters?.c ?? props.data.c ?? 0),
  d: Number(props.data.parameters?.d ?? props.data.d ?? 0),
  e: Number(props.data.parameters?.e ?? props.data.e ?? 1),
}));
const xRange = computed(() => props.data.range?.x || [-6.28, 6.28]);
const yRange = computed(() => props.data.range?.y || [-2.8, 2.8]);
const displayedFormula = computed(() => {
  if (mode.value === "3d") {
    return `z = a * sin(bx + c) * cos(e y) + d`;
  }
  return `y = a * sin(bx + c) + d`;
});
const visibleParameterKeys = computed(() => (mode.value === "3d" ? ["a", "b", "c", "d", "e"] : ["a", "b", "c", "d"]));

watch(
  parameterDefaults,
  (defaults) => {
    parameterValues.value = { ...defaults };
  },
  { immediate: true },
);

watch([parameterValues, rotation, mode], () => nextTick(draw), { deep: true });
onMounted(draw);

function setMode(nextMode) {
  mode.value = nextMode;
}

function resetParameters() {
  parameterValues.value = { ...parameterDefaults.value };
}

function getParam(name, fallback = 0) {
  return Number(parameterValues.value[name] ?? fallback);
}

function evaluate2d(x) {
  return getParam("a", 1) * Math.sin(getParam("b", 1.5) * x + getParam("c", 0)) + getParam("d", 0);
}

function evaluate3d(x, y) {
  return getParam("a", 1) * Math.sin(getParam("b", 1.5) * x + getParam("c", 0)) * Math.cos(getParam("e", 1) * y) + getParam("d", 0);
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

function draw2d(ctx, width, height) {
  drawAxes2d(ctx, width, height);
  ctx.strokeStyle = "#c8ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const samples = 360;
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = xRange.value[0] + (xRange.value[1] - xRange.value[0]) * t;
    const y = evaluate2d(x);
    const screenX = 40 + t * (width - 64);
    const screenY = height / 2 - y * 72;
    if (index === 0) ctx.moveTo(screenX, screenY);
    else ctx.lineTo(screenX, screenY);
  }
  ctx.stroke();
}

function drawAxes2d(ctx, width, height) {
  const color = "rgba(237, 237, 237, 0.68)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, height / 2);
  ctx.lineTo(width - 24, height / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width / 2, height - 24);
  ctx.lineTo(width / 2, 24);
  ctx.stroke();
  drawArrowHead(ctx, width - 24, height / 2, 0, color);
  drawArrowHead(ctx, width / 2, 24, -Math.PI / 2, color);
  drawAxisLabel(ctx, "x axis", width - 54, height / 2 - 18, "#ededed");
  drawAxisLabel(ctx, "y axis", width / 2 + 34, 34, "#ededed");
  drawAxisLabel(ctx, "0", width / 2 - 14, height / 2 + 16, "#777777");
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
  const steps = 28;
  const xMin = props.data.range3d?.x?.[0] ?? -2.8;
  const xMax = props.data.range3d?.x?.[1] ?? 2.8;
  const yMin = yRange.value[0];
  const yMax = yRange.value[1];
  ctx.lineWidth = 1;
  for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
    ctx.beginPath();
    for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
      const x = xMin + ((xMax - xMin) * xIndex) / steps;
      const y = yMin + ((yMax - yMin) * yIndex) / steps;
      const [screenX, screenY] = project3d(x, y, evaluate3d(x, y), width, height);
      if (xIndex === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.strokeStyle = yIndex % 4 === 0 ? "rgba(200, 255, 0, 0.72)" : "rgba(237, 237, 237, 0.24)";
    ctx.stroke();
  }
  for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
    ctx.beginPath();
    for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
      const x = xMin + ((xMax - xMin) * xIndex) / steps;
      const y = yMin + ((yMax - yMin) * yIndex) / steps;
      const [screenX, screenY] = project3d(x, y, evaluate3d(x, y), width, height);
      if (yIndex === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.strokeStyle = xIndex % 4 === 0 ? "rgba(200, 255, 0, 0.72)" : "rgba(237, 237, 237, 0.24)";
    ctx.stroke();
  }
  drawAxes3d(ctx, width, height);
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
</script>

<template>
  <section class="expression-block">
    <div class="block-head">
      <div>
        <div class="block-kicker">expression-visualizer</div>
        <h3>{{ data.title || "Parametric Expression" }}</h3>
      </div>
      <div class="mode-tabs">
        <button :class="{ 'is-active': mode === '2d' }" type="button" @click="setMode('2d')">2D Curve</button>
        <button :class="{ 'is-active': mode === '3d' }" type="button" @click="setMode('3d')">3D Surface</button>
      </div>
    </div>
    <div class="expression-layout">
      <aside class="control-panel">
        <div class="label">formula</div>
        <div class="formula">{{ displayedFormula }}</div>
        <label v-for="key in visibleParameterKeys" :key="key" class="slider-row">
          <span>{{ key }}: {{ Number(parameterValues[key]).toFixed(2) }}</span>
          <input v-model.number="parameterValues[key]" max="5" min="-5" step="0.1" type="range" />
        </label>
        <button class="small-btn" type="button" @click="resetParameters">Reset Parameters</button>
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
          <span>drag: rotate 3d</span>
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
.slider-row span {
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

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  min-width: min(280px, 100%);
}

.mode-tabs button,
.small-btn {
  border: 1px solid var(--border-muted);
  border-radius: 0;
  background: var(--background-panel);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: var(--font-size-small);
  font-weight: 800;
  padding: 8px 10px;
  text-transform: uppercase;
}

.mode-tabs button.is-active,
.mode-tabs button:hover,
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

  .mode-tabs {
    min-width: 0;
  }
}
</style>
