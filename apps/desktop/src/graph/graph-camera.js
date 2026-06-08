export const GRAPH_CAMERA_LIMITS = {
  minZoom: 0.35,
  maxZoom: 2.2,
};

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function screenToWorld(clientX, clientY, viewportElement, camera) {
  const rect = viewportElement.getBoundingClientRect();
  return {
    x: (clientX - rect.left - camera.x) / camera.zoom,
    y: (clientY - rect.top - camera.y) / camera.zoom,
  };
}

export function zoomCameraAt(camera, clientX, clientY, viewportElement, nextZoom) {
  const zoom = clamp(nextZoom, GRAPH_CAMERA_LIMITS.minZoom, GRAPH_CAMERA_LIMITS.maxZoom);
  const rect = viewportElement.getBoundingClientRect();
  const viewportX = clientX - rect.left;
  const viewportY = clientY - rect.top;
  const worldX = (viewportX - camera.x) / camera.zoom;
  const worldY = (viewportY - camera.y) / camera.zoom;

  return {
    x: viewportX - worldX * zoom,
    y: viewportY - worldY * zoom,
    zoom,
  };
}

export function getScopeBounds(nodes, getNodeLayout) {
  if (!nodes.length) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const boxes = nodes.map((node) => getNodeLayout(node.id));
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function fitCameraToBounds(viewportElement, bounds, options = {}) {
  const margin = options.margin ?? 160;
  const minZoom = options.minZoom ?? GRAPH_CAMERA_LIMITS.minZoom;
  const maxZoom = options.maxZoom ?? 1.4;
  const rect = viewportElement.getBoundingClientRect();
  const paddedWidth = bounds.width + margin * 2;
  const paddedHeight = bounds.height + margin * 2;
  const zoom = clamp(
    Math.min(rect.width / paddedWidth, rect.height / paddedHeight),
    minZoom,
    maxZoom,
  );
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x: rect.width / 2 - centerX * zoom,
    y: rect.height / 2 - centerY * zoom,
    zoom,
  };
}
