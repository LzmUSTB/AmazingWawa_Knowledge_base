# SPH

SPH（Smoothed Particle Hydrodynamics / 平滑粒子流体力学）是一种用粒子采样连续流体的方法。它不需要固定网格，而是在每个粒子附近用核函数收集邻居贡献，从而近似密度、压力、粘性等物理量。

:::concept-card
title: SPH 的核心思想
summary: 用有限数量的粒子代表连续流体，并用平滑核函数把离散粒子的贡献转化为连续场的近似。
why: 对实时交互和游戏工具来说，SPH 的优势是直观、局部、容易与粒子渲染结合；难点是邻居搜索、参数稳定性和 GPU 并行实现。
:::

## 一句话定义

SPH 把流体看作一组带有质量、位置、速度和密度的粒子，通过邻域内粒子的核函数加权求和来近似连续流体方程。

## 它解决什么问题？

传统网格法把流体存储在固定空间网格上，适合大规模流场和稳定的体积求解；SPH 则把流体跟随粒子移动，更适合自由表面、飞溅、水滴、局部交互和基于粒子的实时可视化。

## 基础执行流程

下面的流程图强调 GPU SPH 中各 pass 的数据依赖关系。注意：某些 per-particle force pass 可以并行或交换顺序执行，只要最终在 integration 前完成累积即可。

:::process-flow
title: GPU SPH 基础流程
nodes:
  spatial-hash:
    label: Spatial Hash
    description: 根据粒子位置计算 cell hash，把粒子放入空间网格或桶结构。
  neighbor-search:
    label: Neighbor Search
    description: 在当前 cell 和周围 cell 中查找邻居粒子，避免 O(n²) 全局遍历。
  density-pressure:
    label: Density / Pressure
    description: 用核函数估计密度，再根据状态方程计算压力。
  viscosity:
    label: Viscosity
    description: 根据邻居速度差计算粘性力，抑制速度场中的高频差异。
  surface-tension:
    label: Surface Tension
    description: 通过颜色场或法线近似表面张力，让水面更容易收缩成团。
  external-forces:
    label: External Forces
    description: 加入重力、用户交互力、吸引/排斥场等外力。
  integrate:
    label: Integrate
    description: 累积所有力后更新速度和位置。
  boundary:
    label: Boundary Solve
    description: 处理容器碰撞、反弹、速度衰减和边界夹取。
  render:
    label: Render / SSFR
    description: 将粒子渲染为流体表面，例如使用 Screen Space Fluid Rendering。
edges:
  - spatial-hash -> neighbor-search
  - neighbor-search -> density-pressure
  - neighbor-search -> viscosity
  - neighbor-search -> surface-tension
  - density-pressure -> integrate
  - viscosity -> integrate
  - surface-tension -> integrate
  - external-forces -> integrate
  - integrate -> boundary
  - boundary -> render
parallel:
  - [density-pressure, viscosity, surface-tension, external-forces]
:::

## 核函数近似

SPH 的关键是把“某一点的物理量”写成附近粒子的加权和。形式上，可以把粒子 `j` 对粒子 `i` 的贡献理解为：距离越近，权重越大；距离超过平滑半径 `h` 后，贡献为 0。

:::expression-visualizer
title: 2D 参数曲线：平滑权重的直觉替代图
mode: 2d
formula: y = a · sin(bx + c) + d
parameters:
  a: 1
  b: 1
  c: 0
  d: 0
range:
  x: [-6.28, 6.28]
:::

上面的 2D 表达式不是 SPH 的标准核函数，而是用于测试可视化 block 的参数响应。正式笔记中可以把它替换成实际支持的核函数可视化。

:::expression-visualizer
title: 3D 参数曲面：扰动水面的直觉图
mode: 3d
formula: z = a · sin(bx + c) · cos(e y) + d
parameters:
  a: 1
  b: 1
  c: 0
  d: 0
  e: 1
range:
  x: [-3.14, 3.14]
  y: [-3.14, 3.14]
:::

## 与其他流体方法的比较

:::compare-table
title: SPH、MLS-MPM 与网格法流体的比较
columns:
  - SPH
  - MLS-MPM
  - Grid Fluid
rows:
  数据表示:
    - 粒子
    - 粒子 + 背景网格
    - 固定或自适应网格
  自由表面:
    - 直观，粒子天然表示水滴和飞溅
    - 表现力强，适合软体/雪/泥等材料
    - 需要额外表面重建或 level set
  稳定性:
    - 参数敏感，压力项容易导致爆炸
    - 通常更稳定，但实现复杂
    - 数值稳定性好，边界条件成熟
  GPU 实现重点:
    - 邻居搜索、hash、prefix sum、cell bucket
    - P2G / Grid Update / G2P pass
    - pressure solve、advection、projection
  适合场景:
    - 实时粒子水、交互水滴、小规模自由表面
    - 多材料、可塑性、复杂连续体
    - 大规模烟、水体、稳定工程模拟
:::

## GPU 中的邻居搜索

朴素 SPH 需要每个粒子检查所有其他粒子，复杂度是 O(n²)。实时 GPU 版本通常会把空间划分为 cell，对每个粒子计算 hash，再只检查周围 cell 的粒子。

:::code-explain
language: glsl
code: |
  bool computeCellHash(vec3 pos, out uint hash) {
      ivec3 cell = ivec3(floor((pos - gridOrigin) / cellSize));

      if (any(lessThan(cell, ivec3(0))) || any(greaterThanEqual(cell, gridRes))) {
          return false;
      }

      hash = uint(cell.x + cell.y * gridRes.x + cell.z * gridRes.x * gridRes.y);
      return true;
  }
explain: |
  这段代码把 3D cell 坐标压平成 1D hash。SPH 的邻居搜索会先把粒子归入 cell，再遍历当前 cell 周围的 27 个 cell。这样可以把全局 O(n²) 搜索变成局部搜索，GPU 上通常还会配合 prefix sum 或固定 bucket 存储。
:::

## 常见不稳定原因

SPH 爆炸通常不是单一原因，而是多个数值项共同失控：压力刚度过高、时间步过大、邻居数量不足、边界处理反弹过强、密度约束没有收敛，都会导致粒子突然获得过大的速度。

:::quiz
question: 为什么 SPH 的压力项容易让模拟“爆炸”？
answer: 因为压力通常由密度误差计算得到。如果时间步过大、刚度过高或邻居数量不足，密度误差会被放大成过强的压力力，导致粒子速度突然增大并穿出边界。
:::

:::quiz
question: 为什么 GPU SPH 通常需要空间 hash 或 cell bucket？
answer: 因为每个粒子只需要查询平滑半径内的邻居。空间划分可以把邻居查询限制在局部 cell，避免每个粒子遍历所有粒子的 O(n²) 成本。
:::

## 实现检查清单

- 粒子数量、平滑半径和 cellSize 是否匹配。
- 邻居数量是否足够，是否存在大量空邻域。
- pressure stiffness 是否过高。
- viscosity 是否足够抑制高频速度差。
- delta time 是否需要 clamp 或 substep。
- boundary 是否在位置和速度两个层面都处理。
- GPU buffer 是否存在越界写入或 cell capacity 溢出。
- render pass 是否把 simulation space、view space、screen space 区分清楚。
