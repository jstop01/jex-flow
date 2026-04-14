import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow@11.11.4';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export const useUndoRedo = (
  initialNodes: Node[],
  initialEdges: Edge[],
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void,
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void
) => {
  const [history, setHistory] = useState<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // useRef로 최신 상태를 항상 참조 (stale closure 방지)
  const historyRef = useRef(history);
  const indexRef = useRef(currentIndex);
  historyRef.current = history;
  indexRef.current = currentIndex;

  const takeSnapshot = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      const h = historyRef.current;
      const idx = indexRef.current;
      const newHistory = h.slice(0, idx + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });

      if (newHistory.length > 50) {
        newHistory.shift();
        setCurrentIndex(newHistory.length - 1);
      } else {
        setCurrentIndex(idx + 1);
      }
      setHistory(newHistory);
    },
    []
  );

  const undo = useCallback(() => {
    const idx = indexRef.current;
    if (idx > 0) {
      const prevIndex = idx - 1;
      const state = historyRef.current[prevIndex];
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setEdges(JSON.parse(JSON.stringify(state.edges)));
      setCurrentIndex(prevIndex);
    }
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const idx = indexRef.current;
    const h = historyRef.current;
    if (idx < h.length - 1) {
      const nextIndex = idx + 1;
      const state = h[nextIndex];
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setEdges(JSON.parse(JSON.stringify(state.edges)));
      setCurrentIndex(nextIndex);
    }
  }, [setNodes, setEdges]);

  // 키보드 단축키 (Cmd+Z / Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // input/textarea 내부에서는 무시
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (!isMac && modifier && event.key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    takeSnapshot,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo
  };
};
