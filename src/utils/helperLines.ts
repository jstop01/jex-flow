import { Node, NodePositionChange } from 'reactflow';

// 드래그 중 정렬 가이드선 계산 (React Flow 공식 helper-lines 예제 방식)
// 드래그 노드의 left/center/right, top/middle/bottom 을 같은 캔버스(같은 parentId)의
// 다른 노드와 비교해 distance 이내로 맞으면 그 좌표에 스냅하고 가이드선 위치를 돌려준다.
export interface HelperLinesResult {
  horizontal?: number; // y (flow 좌표)
  vertical?: number;   // x (flow 좌표)
  snapPosition: { x?: number; y?: number };
}

export function getHelperLines(change: NodePositionChange, nodes: Node[], distance = 6): HelperLinesResult {
  const result: HelperLinesResult = { snapPosition: {} };
  const nodeA = nodes.find((n) => n.id === change.id);
  if (!nodeA || !change.position) return result;

  const aW = nodeA.width || 150, aH = nodeA.height || 40;
  const aLeft = change.position.x, aRight = aLeft + aW, aCx = aLeft + aW / 2;
  const aTop = change.position.y, aBottom = aTop + aH, aCy = aTop + aH / 2;

  let bestV = distance, bestH = distance;
  nodes.forEach((nodeB) => {
    if (nodeB.id === nodeA.id || nodeB.hidden || nodeB.selected) return;
    if (nodeB.parentId !== nodeA.parentId) return;
    const bW = nodeB.width || 150, bH = nodeB.height || 40;
    const bLeft = nodeB.position.x, bRight = bLeft + bW, bCx = bLeft + bW / 2;
    const bTop = nodeB.position.y, bBottom = bTop + bH, bCy = bTop + bH / 2;

    // 세로 가이드선(x 정렬): left-left, right-right, center-center
    const vCands: Array<[number, number]> = [
      [Math.abs(aLeft - bLeft), bLeft],
      [Math.abs(aRight - bRight), bRight - aW],
      [Math.abs(aCx - bCx), bCx - aW / 2],
    ];
    vCands.forEach(([d, snapX], i) => {
      if (d < bestV) {
        bestV = d;
        result.snapPosition.x = snapX;
        result.vertical = i === 0 ? bLeft : i === 1 ? bRight : bCx;
      }
    });
    // 가로 가이드선(y 정렬): top-top, bottom-bottom, middle-middle
    const hCands: Array<[number, number]> = [
      [Math.abs(aTop - bTop), bTop],
      [Math.abs(aBottom - bBottom), bBottom - aH],
      [Math.abs(aCy - bCy), bCy - aH / 2],
    ];
    hCands.forEach(([d, snapY], i) => {
      if (d < bestH) {
        bestH = d;
        result.snapPosition.y = snapY;
        result.horizontal = i === 0 ? bTop : i === 1 ? bBottom : bCy;
      }
    });
  });
  return result;
}
