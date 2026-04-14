import React, { useRef, useEffect, useState } from 'react';
import { Pencil, Check, Edit3 } from 'lucide-react';

interface GroupContextMenuProps {
  top: number;
  left: number;
  nodeId: string;
  currentLabel: string;
  onClose: () => void;
  onSave: (newLabel: string) => void;
  onChangeId: (nodeId: string) => void;
}

export const GroupContextMenu = ({
  top,
  left,
  nodeId,
  currentLabel,
  onClose,
  onSave,
  onChangeId,
}: GroupContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentLabel);

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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="absolute z-50 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 animate-in fade-in zoom-in duration-100 origin-top-left"
    >
      {!isEditing ? (
        <>
          <button
            onClick={handleStartEdit}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
          >
            <Pencil size={14} className="text-slate-400" />
            메소드 이름 수정
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
        </>
      ) : (
        <div className="p-3">
          <div className="text-xs text-slate-400 font-medium mb-2">메소드 이름 수정</div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-11 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5277f7] focus:border-transparent"
              placeholder="그룹 이름 입력"
            />
            <button
              onClick={handleSave}
              className="h-11 w-11 bg-[#5277f7] text-white rounded-md hover:bg-[#4162d9] transition-colors flex items-center justify-center shrink-0"
            >
              <Check size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
