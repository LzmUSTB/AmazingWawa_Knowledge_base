# Position Based Fluids

## One-sentence definition

Position Based Fluids is a particle fluid simulation method that solves density constraints directly on particle positions.

:::concept-card
title: Position Based Fluids
summary: PBF keeps particle fluids stable by iteratively correcting positions so local density stays near the rest density.
why: It is useful for real-time fluid simulation because it trades some physical precision for stable, controllable behavior.
key_intuition: Treat incompressibility as a constraint-solving loop rather than as a force integration problem.
tags: [simulation, fluids, particles]
:::

## Solver loop

:::solver-loop-diagram
id: pbf-solver-loop
label: PBF Solver Loop
description: A compact overview of the constraint projection loop used by Position Based Fluids.
steps:
  - id: predict
    label: Predict
    description: Integrate velocities to estimate particle positions.
    x: 0.16
    y: 0.34
  - id: density
    label: Density
    description: Estimate density from neighboring particles.
    x: 0.39
    y: 0.34
  - id: solve
    label: Solve
    description: Compute position corrections for incompressibility.
    x: 0.62
    y: 0.34
  - id: update
    label: Update
    description: Apply corrected positions and update velocities.
    x: 0.85
    y: 0.34
edges:
  - from: predict
    to: density
  - from: density
    to: solve
  - from: solve
    to: update
:::

## Related knowledge

PBF is closely related to SPH because both rely on particle neighborhoods and smoothing kernels, but PBF frames the incompressibility step as iterative constraint projection.

## Review questions

:::quiz
question: Why does PBF correct particle positions instead of only applying pressure forces?
answer: Correcting positions makes the simulation more stable for real-time use because incompressibility is enforced as a constraint.
:::
