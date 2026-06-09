import { getDomains } from "./graph-data-store.js";

export const domainColors = {
  graphics: "#00B7FF",
  "linear-algebra": "#EDEDED",
  "machine-learning": "#C8FF00",
  "web-dev": "#FF2BD6",
  "game-dev": "#FF3B30",
  career: "#FFD500",
  simulation: "#7C5CFF",
  language: "#00E5A8",
  "dcc-tools": "#FF8A00",
};

export const relationTheme = {
  contains: {
    color: "#DCDCDC",
    label: "CONTAINS",
    dash: "",
    direction: "none",
    lineStyle: "solid",
    preview: "solid",
  },
  "depends-on": {
    color: "#FFD500",
    label: "DEPENDS-ON",
    dash: "8 7",
    direction: "none",
    lineStyle: "dashed",
    preview: "dashed",
  },
  "used-in": {
    color: "#7C5CFF",
    label: "USED-IN",
    dash: "",
    direction: "forward",
    lineStyle: "solid",
    preview: "arrow",
  },
  "compares-with": {
    color: "#FF8A00",
    label: "COMPARES-WITH",
    dash: "",
    direction: "both",
    lineStyle: "double",
    preview: "double-bidirectional",
  },
};

export function getDomainColor(domain) {
  const activeDomain = getDomains().find((item) => item.id === domain);
  return activeDomain?.color || domainColors[domain] || "#EDEDED";
}

export function nodeClass(type) {
  return `pcb-node pcb-node--${type}`;
}
