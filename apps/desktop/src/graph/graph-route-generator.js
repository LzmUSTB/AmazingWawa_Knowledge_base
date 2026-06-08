export function getPortPoint(box, port) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  if (port === "top") return [centerX, box.y];
  if (port === "right") return [box.x + box.width, centerY];
  if (port === "bottom") return [centerX, box.y + box.height];
  return [box.x, centerY];
}

export function choosePorts(sourceBox, targetBox) {
  const sourceCenterX = sourceBox.x + sourceBox.width / 2;
  const sourceCenterY = sourceBox.y + sourceBox.height / 2;
  const targetCenterX = targetBox.x + targetBox.width / 2;
  const targetCenterY = targetBox.y + targetBox.height / 2;
  const deltaX = targetCenterX - sourceCenterX;
  const deltaY = targetCenterY - sourceCenterY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { sourcePort: "right", targetPort: "left" }
      : { sourcePort: "left", targetPort: "right" };
  }

  return deltaY >= 0
    ? { sourcePort: "bottom", targetPort: "top" }
    : { sourcePort: "top", targetPort: "bottom" };
}

export function generateOrthogonalRoute(sourceBox, targetBox) {
  const { sourcePort, targetPort } = choosePorts(sourceBox, targetBox);
  const [sourceX, sourceY] = getPortPoint(sourceBox, sourcePort);
  const [targetX, targetY] = getPortPoint(targetBox, targetPort);

  if (sourcePort === "left" || sourcePort === "right") {
    const midX = Math.round((sourceX + targetX) / 2);
    return [
      [sourceX, sourceY],
      [midX, sourceY],
      [midX, targetY],
      [targetX, targetY],
    ];
  }

  const midY = Math.round((sourceY + targetY) / 2);
  return [
    [sourceX, sourceY],
    [sourceX, midY],
    [targetX, midY],
    [targetX, targetY],
  ];
}
