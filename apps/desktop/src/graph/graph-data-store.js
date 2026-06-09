import { shallowRef } from "vue";

export function createEmptyVault() {
  return {
    vault: {
      schemaVersion: 1,
      title: "No Vault Loaded",
      description: "",
      language: "zh-CN",
      defaultDomain: "",
    },
    domains: [],
    nodes: [],
    edges: [],
    layouts: { boards: {} },
    notes: {},
    fileTree: [],
    scopes: {},
    validation: { errors: [], warnings: [] },
    vaultRootPath: "",
    source: "none",
  };
}

const activeVaultRef = shallowRef(createEmptyVault());

export function setActiveVault(vault) {
  activeVaultRef.value = vault || createEmptyVault();
}

export function getActiveVault() {
  return activeVaultRef.value;
}

export function useActiveVault() {
  return activeVaultRef;
}

export function getGraphNodes() {
  return getActiveVault().nodes || [];
}

export function getGraphEdges() {
  return getActiveVault().edges || [];
}

export function getDomains() {
  return getActiveVault().domains || [];
}

export function findGraphNode(nodeId) {
  return getGraphNodes().find((node) => node.id === nodeId);
}
