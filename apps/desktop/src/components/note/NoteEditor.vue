<script setup>
import { ref } from "vue";

const draft = ref(`# Rendering Pipeline

## One-sentence definition
A rendering pipeline is the ordered path that turns scene data into final pixels.

## The problem it solves
It gives graphics work a stable sequence: collect data, transform it, shade it, compose it, and present the result.

## Core intuition
Think of the pipeline as a set of strict modules. Each module has inputs, outputs, and relation edges in graph.yaml.

## Minimal example
Scene data -> vertex processing -> rasterization -> fragment shading -> post process -> display.`);
</script>

<template>
  <div class="note-editor">
    <textarea
      v-model="draft"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<style scoped>
.note-editor {
  min-height: 0;
  border: 1px solid var(--border-muted);
  background: var(--background-panel);
}

textarea {
  width: 100%;
  height: 100%;
  min-height: 560px;
  border: 0;
  border-radius: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--text-secondary);
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 14px;
  line-height: 1.65;
  padding: 22px;
}
</style>
