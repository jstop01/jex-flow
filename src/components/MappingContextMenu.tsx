import React, { useRef, useEffect } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Edit3 } from 'lucide-react';

interface MappingContextMenuProps {
  top: number;
  left: number;
  nodeId: string;
  onClose: () => void;
  onInputMapping: () => void;
  onOutputMapping: () => void;
  onChangeId: (nodeId: string) => void;
}

export const MappingContextMenu = ({
  top,
  left,
  nodeId,
  onClose,
  onInputMapping,
  onOutputMapping,
  onChangeId,
}: MappingContextMenuProps) => {
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

  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="absolute z-50 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 animate-in fade-in zoom-in duration-100 origin-top-left"
    >
      <button
        onClick={() => {
          onInputMapping();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
      >
        <ArrowDownToLine size={14} className="text-emerald-500" />
        입력 매핑
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button
        onClick={() => {
          onChangeId(nodeId);
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
      >
        <Edit3 size={14} className="text-slate-400" />
        ID 변경
      </button>
    </div>
  );
};
