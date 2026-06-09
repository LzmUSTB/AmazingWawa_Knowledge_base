import { getDomains } from "./graph-data-store.js";

export const fallbackDomainPalette = [
  "#00B7FF",
  "#7C5CFF",
  "#C8FF00",
  "#FF8A00",
  "#FF2BD6",
  "#00E5A8",
  "#FFD500",
  "#FF3B30",
  "#EDEDED",
];

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
  return activeDomain?.color || getFallbackDomainColor(domain);
}

export function stableHash(value = "") {
  return String(value).split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) | 0;
  }, 0);
}

export function getFallbackDomainColor(domainId) {
  if (!domainId) return "#EDEDED";
  return fallbackDomainPalette[Math.abs(stableHash(domainId)) % fallbackDomainPalette.length];
}

export function nodeClass(type) {
  return `pcb-node pcb-node--${type}`;
}
