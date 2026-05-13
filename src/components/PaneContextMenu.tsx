import React, { useRef, useEffect } from 'react';
import {
  Workflow,
  Database,
  Split,
  GitMerge,
  AlertCircle,
  Repeat,
  Repeat2,
  Layers,
  FolderOpen,
  RotateCw,
  Undo,
  Redo,
  Trash2,
  Download,
  Upload,
  MousePointer2,
  Hand,
  Play,
  Code,
  Square,
} from 'lucide-react';

interface PaneContextMenuProps {
  top: number;
  left: number;
  onClose: () => void;
  onAddNode: (type: string) => void;
  // Toolbar actions
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDelete: () => void;
  onExport: () => void;
  onImport: () => void;
  toolMode: 'select' | 'pan';
  onToolModeChange: (mode: 'select' | 'pan') => void;
}

const menuItems = [
  { type: 'Process', label: 'Process', icon: Workflow, color: 'text-blue-500' },
  { type: 'Variable', label: 'Variable', icon: Database, color: 'text-emerald-500' },
  { type: 'Script', label: 'Script', icon: Code, color: 'text-violet-500' },
  { type: 'IfElse', label: 'IfElse', icon: Split, color: 'text-amber-500' },
  { type: 'Switch', label: 'Switch', icon: GitMerge, color: 'text-indigo-500' },
  { type: 'While', label: 'while', icon: Repeat, color: 'text-cyan-500' },
  { type: 'For', label: 'for', icon: RotateCw, color: 'text-purple-500' },
  { type: 'ForEach', label: 'foreach', icon: Repeat2, color: 'text-fuchsia-500' },
  { type: 'CallDO', label: 'CallDO', icon: Layers, color: 'text-orange-500' },
  { type: 'Method', label: 'method', icon: FolderOpen, color: 'text-teal-500' },
  { type: 'CallMethod', label: 'CallMethod', icon: Play, color: 'text-rose-500' },
  { type: 'Error', label: 'Error', icon: AlertCircle, color: 'text-red-500' },
  { type: 'End', label: 'End', icon: Square, color: 'text-red-600' },
];

export const PaneContextMenu = ({
  top,
  left,
  onClose,
  onAddNode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDelete,
  onExport,
  onImport,
  toolMode,
  onToolModeChange,
}: PaneContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position if menu would overflow viewport
  const adjustedLeft = Math.min(left, window.innerWidth - 200);
  const adjustedTop = Math.min(top, window.innerHeight - 400);

  const iconBtnClass = "w-8 h-8 flex items-center justify-center rounded-md transition-colors";
  const iconBtnActiveClass = "bg-[#5277f7] text-white";
  const iconBtnDefaultClass = "text-slate-500 hover:bg-slate-100 hover:text-slate-700";
  const iconBtnDisabledClass = "text-slate-300 cursor-not-allowed";

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedTop, left: adjustedLeft }}
      className="fixed z-50 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 animate-in fade-in zoom-in duration-100 origin-top-left"
    >
      {/* Quick Actions Toolbar */}
      <div className="px-2 pb-2 border-b border-slate-100 mb-1">
        <div className="flex flex-col gap-1">
          {/* Tool Mode */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 flex-1">
              <button
                onClick={() => { onToolModeChange('select'); }}
                className={`${iconBtnClass} flex-1 ${toolMode === 'select' ? iconBtnActiveClass : iconBtnDefaultClass}`}
                title="선택 모드 (Ctrl/Cmd + 1)"
                aria-label="선택 모드"
              >
                <MousePointer2 size={14} />
              </button>
              <button
                onClick={() => { onToolModeChange('pan'); }}
                className={`${iconBtnClass} flex-1 ${toolMode === 'pan' ? iconBtnActiveClass : iconBtnDefaultClass}`}
                title="이동 모드 (Ctrl/Cmd + 2)"
                aria-label="이동 모드"
              >
                <Hand size={14} />
              </button>
            </div>

            {/* History */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { onUndo(); }}
                disabled={!canUndo}
                className={`${iconBtnClass} ${!canUndo ? iconBtnDisabledClass : iconBtnDefaultClass}`}
                title="실행 취소"
                aria-label="실행 취소"
              >
                <Undo size={14} />
              </button>
              <button
                onClick={() => { onRedo(); }}
                disabled={!canRedo}
                className={`${iconBtnClass} ${!canRedo ? iconBtnDisabledClass : iconBtnDefaultClass}`}
                title="다시 실행"
                aria-label="다시 실행"
              >
                <Redo size={14} />
              </button>
            </div>
          </div>

          {/* Actions & File - Second Row */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(); onClose(); }}
              className={`${iconBtnClass} text-red-500 hover:bg-red-50 hover:text-red-600`}
              title="선택 삭제"
              aria-label="선택 삭제"
            >
              <Trash2 size={14} />
            </button>

            <button
              onClick={() => { onExport(); onClose(); }}
              className={`${iconBtnClass} ${iconBtnDefaultClass}`}
              title="내보내기"
              aria-label="JSON 내보내기"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={() => { onImport(); onClose(); }}
              className={`${iconBtnClass} ${iconBtnDefaultClass}`}
              title="가져오기"
              aria-label="JSON 가져오기"
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Node Section */}
      <div className="px-3 py-1.5">
        <span className="text-xs font-bold text-slate-400">노드 추가</span>
      </div>
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.type}
            onClick={() => {
              onAddNode(item.type);
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
          >
            <Icon size={16} className={item.color} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};