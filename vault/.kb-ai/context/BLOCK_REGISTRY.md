# Block Registry

## Native Blocks

- concept-card
- process-flow
- compare-table
- code-explain
- quiz
- expression-visualizer

## Native Block Examples

### concept-card

```markdown
:::concept-card
title: Curl Noise
summary: 从标量噪声场构造旋转向量场，用较低成本生成类似流体的纹理运动。
why: 它能在不运行完整流体模拟的情况下，为实时 VFX 生成可控的旋涡感。
key_intuition: 梯度指向噪声变化最快的方向；把梯度旋转 90° 后，运动会更倾向于绕着等值线流动。
points:
  - 适合纹理扭曲、烟雾、魔法、能量场等视觉效果。
  - 不是完整流体求解器，不保证真实物理。
  - 输入噪声的尺度和模糊程度会强烈影响最终旋涡结构。
tags: [curl-noise, vector-field, vfx]
:::
```

### process-flow

```markdown
:::process-flow
title: Curl Noise Authoring Pipeline
steps:
  - id: noise
    label: Generate smooth scalar noise
  - id: derivative
    label: Estimate local gradient / derivative
    depends_on: noise
  - id: rotate
    label: Rotate derivative direction by 90 degrees
    depends_on: derivative
  - id: warp
    label: Use vector field to warp source texture
    depends_on: rotate
  - id: tune
    label: Tune scale, strength, blur, and octaves
    depends_on: warp
:::
```

### compare-table

```markdown
:::compare-table
columns: [Curl Noise, Flow Map]
rows:
  input_data: [Procedural scalar noise, Artist-authored vector texture]
  control_style: [Parameter-driven, Paint/directable]
  runtime_cost: [Usually low, Very low]
  physical_accuracy: [Fluid-like but approximate, Not physical]
  best_use_case: [Organic turbulence, Directed motion]
:::
```

### code-explain

```markdown
:::code-explain
language: glsl
code: |
  float n0 = noise(uv + vec2(eps, 0.0));
  float n1 = noise(uv - vec2(eps, 0.0));
  float dx = (n0 - n1) / (2.0 * eps);
  vec2 field = vec2(dy, -dx);
lines:
  1: Sample noise slightly to the right.
  2: Sample noise slightly to the left.
  3: Approximate the x derivative with a central difference.
  4: Rotate the gradient-like direction to form a curl-like field.
:::
```

### quiz

```markdown
:::quiz
question: 为什么 Curl Noise 中把梯度方向旋转 90° 会更容易形成旋涡感？
choices:
  - 因为运动方向更倾向于沿等值线绕行
  - 因为噪声频率会自动变低
  - 因为它会执行完整压力投影
answer: 因为运动方向更倾向于沿等值线绕行。
:::
```

### expression-visualizer

```markdown
:::expression-visualizer
title: Wave Surface
mode: 3d
formula_display: z = amplitude * sin(freqX * x) * cos(freqY * y)
render:
  kind: surface3d
  z: amplitude * sin(freqX * x) * cos(freqY * y)
  xRange: [-3.14, 3.14]
  yRange: [-3.14, 3.14]
  zRange: [-2, 2]
parameters:
  - name: amplitude
    label: Amplitude
    default: 1
    min: 0
    max: 2
    step: 0.05
  - name: freqX
    label: X Frequency
    default: 1
    min: 0.1
    max: 5
    step: 0.1
  - name: freqY
    label: Y Frequency
    default: 1
    min: 0.1
    max: 5
    step: 0.1
:::
```

## Custom Declarative Blocks

If no custom declarative blocks are installed, create one only when a safe structured visual is clearly better than native blocks or a static image.

Use `DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md` for syntax.
