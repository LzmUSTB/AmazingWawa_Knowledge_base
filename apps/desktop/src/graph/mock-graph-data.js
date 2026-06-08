export const domains = [
  { id: "graphics", title: "Graphics", label: "graphics", color: "#00B7FF" },
  { id: "linear-algebra", title: "Linear Algebra", label: "linear-algebra", color: "#EDEDED" },
  { id: "machine-learning", title: "Machine Learning", label: "machine-learning", color: "#C8FF00" },
  { id: "web-dev", title: "Web Dev", label: "web-dev", color: "#FF2BD6" },
  { id: "game-dev", title: "Game Dev", label: "game-dev", color: "#FF3B30" },
  { id: "career", title: "Career", label: "career", color: "#FFD500" },
  { id: "language", title: "Language", label: "language", color: "#00E5A8" },
  { id: "simulation", title: "Simulation", label: "simulation", color: "#7C5CFF" },
];

export const domainNodes = domains.map((domain) => ({
  id: domain.id,
  title: domain.title,
  domain: domain.id,
  type: "domain",
  status: "domain",
  summary: `${domain.title} domain graph. Double-click to drill down into direct child nodes.`,
}));

export const conceptNodes = [
  {
    id: "rendering-pipeline",
    title: "Rendering Pipeline",
    domain: "graphics",
    type: "topic",
    status: "seed",
    summary: "The ordered path that turns scene data into final pixels.",
  },
  {
    id: "shader",
    title: "Shader",
    domain: "graphics",
    type: "topic",
    status: "growing",
    summary: "A programmable stage that transforms data or computes surface response.",
  },
  {
    id: "pbr",
    title: "PBR",
    domain: "graphics",
    type: "concept",
    status: "seed",
    summary: "A rendering model that keeps material response physically plausible.",
  },
  {
    id: "rasterization",
    title: "Rasterization",
    domain: "graphics",
    type: "topic",
    status: "stable",
    summary: "The process of converting geometric primitives into fragments.",
  },
  {
    id: "post-process",
    title: "Post Process",
    domain: "graphics",
    type: "concept",
    status: "seed",
    summary: "Screen-space image operations after primary scene rendering.",
  },
  {
    id: "material-system",
    title: "Material System",
    domain: "graphics",
    type: "topic",
    status: "seed",
    summary: "A structured layer for authoring, storing, and applying surface properties.",
  },
  {
    id: "gradient-descent",
    title: "Gradient Descent",
    domain: "machine-learning",
    type: "concept",
    status: "stable",
    summary: "An iterative method for minimizing a differentiable objective.",
  },
  {
    id: "nuxt-viewer",
    title: "Nuxt Viewer",
    domain: "web-dev",
    type: "concept",
    status: "seed",
    summary: "A read-first web surface for browsing rendered knowledge pages.",
  },
  {
    id: "fluid-solver",
    title: "Fluid Solver",
    domain: "simulation",
    type: "topic",
    status: "growing",
    summary: "A numerical system that updates fluid state over time.",
  },
];

export const graphNodes = [...domainNodes, ...conceptNodes];

export const graphEdges = [
  { id: "graphics-rendering-pipeline", source: "graphics", target: "rendering-pipeline", relation: "contains" },
  { id: "graphics-shader", source: "graphics", target: "shader", relation: "contains" },
  { id: "graphics-pbr", source: "graphics", target: "pbr", relation: "contains" },
  { id: "graphics-rasterization", source: "graphics", target: "rasterization", relation: "contains" },
  { id: "graphics-post-process", source: "graphics", target: "post-process", relation: "contains" },
  { id: "graphics-material-system", source: "graphics", target: "material-system", relation: "contains" },
  { id: "root-graphics-ml", source: "graphics", target: "machine-learning", relation: "compares-with" },
  { id: "root-graphics-simulation", source: "graphics", target: "simulation", relation: "used-in" },
  { id: "root-web-career", source: "web-dev", target: "career", relation: "used-in" },
  { id: "e1", source: "rendering-pipeline", target: "shader", relation: "contains" },
  { id: "e2", source: "rendering-pipeline", target: "pbr", relation: "contains" },
  { id: "e3", source: "rendering-pipeline", target: "rasterization", relation: "depends-on" },
  { id: "e4", source: "rendering-pipeline", target: "post-process", relation: "used-in" },
  { id: "e5", source: "rendering-pipeline", target: "gradient-descent", relation: "compares-with" },
  { id: "e6", source: "nuxt-viewer", target: "rendering-pipeline", relation: "used-in" },
  { id: "e7", source: "fluid-solver", target: "shader", relation: "depends-on" },
];

export const noteSections = [
  {
    label: "One-sentence definition",
    body: "A rendering pipeline is the ordered path that turns scene data into final pixels.",
  },
  {
    label: "The problem it solves",
    body: "It gives graphics work a stable sequence: collect data, transform it, shade it, compose it, and present the result.",
  },
  {
    label: "Core intuition",
    body: "Treat each stage as a strict module with known inputs and outputs. The graph indexes how those modules relate; the note explains what they mean.",
  },
  {
    label: "Minimal example",
    body: "Scene data -> vertex processing -> rasterization -> fragment shading -> post process -> display.",
  },
  {
    label: "Review questions",
    body: "Which relation type should express prerequisites? What belongs in graph.yaml rather than note.md? Why is mobile read-first?",
  },
];
