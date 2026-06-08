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
    preview: "solid",
  },
  "depends-on": {
    color: "#FFD500",
    label: "DEPENDS-ON",
    dash: "",
    preview: "arrow",
  },
  "used-in": {
    color: "#7C5CFF",
    label: "USED-IN",
    dash: "8 7",
    preview: "dashed",
  },
  "compares-with": {
    color: "#FF8A00",
    label: "COMPARES-WITH",
    dash: "3 5",
    preview: "double",
  },
};

export function getDomainColor(domain) {
  return domainColors[domain] || "#EDEDED";
}

export function nodeClass(type) {
  return `pcb-node pcb-node--${type}`;
}
