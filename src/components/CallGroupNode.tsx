import React, { memo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Handle, Position, NodeProps } from 'reactflow';
import { Layers, ChevronDown, FolderOpen } from 'lucide-react';

interface GroupOption {
  id: string;
  label: string;
}

export const CallGroupNode = memo(({ id, data, selected }: NodeProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available groups from data (passed from App.tsx)
  const availableGroups: GroupOption[] = typeof data.availableGroups === 'function' ? data.availableGroups() : (data.availableGroups || []);

  // Currently selected group
  const selectedGroup = data.selectedGroup as GroupOption | null;

  // Calculate dropdown position when popup opens
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleGroupSelect = (group: GroupOption) => {
    data.onChange?.('selectedGroup', group);
    setIsDropdownOpen(false);
  };

  // 그룹이 선택된 경우: 다른 노드처럼 간결한 디자인
  if (selectedGroup) {
    return (
      <div
        className={`rounded-xl bg-white border-2 shadow-lg min-w-[180px] transition-all overflow-hidden ${
          selected ? 'shadow-xl border-[#5277f7]' : 'border-slate-300'
        }`}
      >
        {/* Target Handle (Input) */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
        >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
        </Handle>

        {/* Header */}
        <div className="px-4 py-3 bg-[#dce4fd] border-b border-[#cddbfd] flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-white/60 text-[#5277f7]">
            <FolderOpen size={18} />
          </div>
          <div>
            <div className="text-slate-900 font-bold text-sm leading-tight">{id}</div>
            <div className="text-slate-400 text-[10px] font-mono">type: CallMethod</div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 bg-white rounded-b-xl">
          <div className="text-[10px] text-slate-400 font-bold mb-1">
            callMethod
          </div>
          <div className="text-xs bg-[#eff4ff] text-[#5277f7] px-2 py-1.5 rounded border border-[#dce4fd] font-medium flex items-center gap-2">
            <Layers size={12} />
            <span className="truncate font-mono">{selectedGroup.id}</span>
          </div>
        </div>

        {/* Source Handle (Output) */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
        >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
        </Handle>
      </div>
    );
  }

  // 그룹 미선택: 드롭다운이 있는 선택 UI
  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[220px] transition-all ${
        selected ? 'shadow-xl border-[#5277f7]' : 'border-slate-300'
      }`}
      style={{
        overflow: isDropdownOpen ? 'visible' : 'hidden',
        zIndex: isDropdownOpen ? 9999 : undefined,
      }}
    >
      {/* Target Handle (Input) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="px-4 py-3 bg-[#dce4fd] border-b border-[#cddbfd] flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-white/60 text-[#5277f7]">
          <Layers size={18} />
        </div>
        <div>
          <div className="text-slate-900 font-bold text-sm">{id}</div>
          <div className="text-slate-400 text-[10px] font-mono">type: CallMethod</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 bg-white">
        {/* Group Selection */}
        <div
          className="relative"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
        >
          <div className="text-[10px] text-slate-400 font-bold mb-1.5">selectGroup</div>
          <button
            ref={buttonRef}
            className={`nodrag nopan nowheel w-full text-left bg-white px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
              isDropdownOpen
                ? 'border-[#c4b5fd] shadow-[0_0_0_2px_rgba(196,181,253,0.3)]'
                : 'border-[#c4b5fd] hover:shadow-[0_0_0_2px_rgba(196,181,253,0.2)]'
            }`}
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">select a method...</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Dropdown - Portal to document.body */}
          {isDropdownOpen && (() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            const pos = rect ? {
              top: rect.bottom + 4,
              left: rect.left,
              width: rect.width || 200,
            } : dropdownPosition;

            return ReactDOM.createPortal(
              <>
                <style>{`
                  .callgroup-dropdown-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    z-index: 2147483647 !important;
                    pointer-events: auto !important;
                  }
                  .callgroup-dropdown-backdrop {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: transparent !important;
                    pointer-events: auto !important;
                  }
                  .callgroup-dropdown-menu {
                    position: fixed !important;
                    background-color: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
                    border: 1px solid #e2e8f0 !important;
                    padding: 4px 0 !important;
                    z-index: 2147483647 !important;
                    pointer-events: auto !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    display: block !important;
                    max-height: 200px !important;
                    overflow-y: auto !important;
                  }
                  .callgroup-dropdown-item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    width: 100% !important;
                    text-align: left !important;
                    padding: 8px 12px !important;
                    border: none !important;
                    background: transparent !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    color: #334155 !important;
                    pointer-events: auto !important;
                  }
                  .callgroup-dropdown-item:hover {
                    background: #f8fafc !important;
                  }
                  .callgroup-dropdown-empty {
                    padding: 16px 12px !important;
                    text-align: center !important;
                    color: #94a3b8 !important;
                    font-size: 14px !important;
                  }
                `}</style>
                <div className="callgroup-dropdown-overlay">
                  <div
                    className="callgroup-dropdown-backdrop"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div
                    ref={dropdownRef}
                    className="callgroup-dropdown-menu"
                    style={{
                      top: `${pos.top}px`,
                      left: `${pos.left}px`,
                      width: `${pos.width}px`,
                    }}
                  >
                    {availableGroups.length > 0 ? (
                      availableGroups.map((group) => (
                        <button
                          key={group.id}
                          className="callgroup-dropdown-item"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGroupSelect(group);
                          }}
                        >
                          <Layers size={14} className="text-[#5277f7]" />
                          <span className="font-mono">{group.id}</span>
                        </button>
                      ))
                    ) : (
                      <div className="callgroup-dropdown-empty">
                        no methods available
                      </div>
                    )}
                  </div>
                </div>
              </>,
              document.body
            );
          })()}
        </div>
      </div>

      {/* Source Handle (Output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
      </Handle>
    </div>
  );
});

CallGroupNode.displayName = 'CallGroupNode';
