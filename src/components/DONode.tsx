import React, { memo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { GitBranch, ChevronDown, Edit2 } from 'lucide-react';

export const DONode = memo(({ id, data, selected }: NodeProps) => {
  const [showReturnTypePopup, setShowReturnTypePopup] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // IMO인 경우 RETURN TYPE은 JexData 고정
  const isIMO = data.ido?.type === 'IMO';

  // Return type options
  const returnTypeOptions = data.returnTypeOptions || [
    { name: 'JexData', id: 'JexData' },
    { name: 'JexDataList', id: 'JexDataList' },
  ];

  const handleReturnTypeSelect = (option: { name: string; id: string }) => {
    data.onChange?.('returnType', option);
    setShowReturnTypePopup(false);
  };

  // Calculate dropdown position when popup opens
  useEffect(() => {
    if (showReturnTypePopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showReturnTypePopup]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showReturnTypePopup) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowReturnTypePopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReturnTypePopup]);

  return (
    <>
      <div
        className={`rounded-2xl bg-white border-2 shadow-lg w-[240px] transition-all overflow-hidden ${
          selected ? 'shadow-xl border-[#5277f7]' : 'border-slate-200'
        }`}
      >
        {/* Target Handle (Input) */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
          style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
        </Handle>

        {/* Header */}
        <div className="px-4 py-3 bg-[#dce4fd] border-b border-[#cddbfd] flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-white/60 text-[#5277f7]">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="text-slate-900 font-bold text-sm">{id}</div>
            <div className="text-slate-400 text-[10px] font-mono">type: CallDO</div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 bg-white">
          {/* LINKED DO - Opens IDOSearchModal */}
          <div className="mb-3">
            <div className="text-[10px] text-slate-400 font-bold mb-1.5">linkedDO</div>
            <button
              className="nodrag nopan nowheel w-full text-left bg-[#eff4ff] text-[#5277f7] px-3 py-2 rounded-lg border border-[#dce4fd] hover:border-[#5277f7] hover:bg-[#e0edff] transition-all group relative"
              onClick={() => data.onOpenLinkedIDOSearch?.()}
            >
              {data.ido ? (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5277f7]"></div>
                      <span className="text-sm font-medium truncate">{data.ido.componentId}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-3.5 truncate">{data.ido.name}</div>
                    {data.ido.svrId && (
                      <div className="text-[10px] text-slate-400 pl-3.5 truncate">서버: {data.ido.svrId}</div>
                    )}
                  </div>
                  <Edit2 size={14} className="text-[#5277f7] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </div>
              ) : (
                <span className="text-slate-400 text-sm">select DO...</span>
              )}
            </button>
          </div>

          {/* RETURN TYPE - Local Popup */}
          <div
            className="mb-4"
            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
          >
            <div className="text-[10px] text-slate-400 font-bold mb-1.5">returnType</div>
            <button
              ref={buttonRef}
              className={`nodrag nopan nowheel w-full text-left bg-white px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
                isIMO
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                  : showReturnTypePopup
                    ? 'border-[#c4b5fd] shadow-[0_0_0_2px_rgba(196,181,253,0.3)]'
                    : 'border-[#c4b5fd] hover:shadow-[0_0_0_2px_rgba(196,181,253,0.2)]'
              }`}
              style={{ pointerEvents: 'auto' }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (!isIMO) {
                  setShowReturnTypePopup(!showReturnTypePopup);
                }
              }}
              disabled={isIMO}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isIMO ? 'text-slate-500' : 'text-slate-700'}`}>
                  {isIMO ? 'JexData' : (data.returnType ? data.returnType.name : 'select returnType...')}
                </span>
                {!isIMO && (
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${showReturnTypePopup ? 'rotate-180' : ''}`}
                  />
                )}
              </div>
            </button>

            {/* Return Type Dropdown - Rendered via Portal (IMO가 아닐 때만) */}
            {showReturnTypePopup && !isIMO && (() => {
              const rect = buttonRef.current?.getBoundingClientRect();
              const pos = rect ? {
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width || 200,
              } : dropdownPosition;

              return ReactDOM.createPortal(
                <>
                  <style>{`
                    .donode-dropdown-overlay {
                      position: fixed !important;
                      top: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      bottom: 0 !important;
                      z-index: 2147483647 !important;
                      pointer-events: auto !important;
                    }
                    .donode-dropdown-backdrop {
                      position: fixed !important;
                      top: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      bottom: 0 !important;
                      background: transparent !important;
                      pointer-events: auto !important;
                    }
                    .donode-dropdown-menu {
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
                    }
                    .donode-dropdown-item {
                      display: block !important;
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
                    .donode-dropdown-item:hover {
                      background: #f8fafc !important;
                    }
                    .donode-dropdown-item.selected {
                      background: #f3e8ff !important;
                    }
                  `}</style>
                  <div className="donode-dropdown-overlay">
                    <div
                      className="donode-dropdown-backdrop"
                      onClick={() => setShowReturnTypePopup(false)}
                    />
                    <div
                      ref={dropdownRef}
                      className="donode-dropdown-menu"
                      style={{
                        top: `${pos.top}px`,
                        left: `${pos.left}px`,
                        width: `${pos.width}px`,
                      }}
                    >
                      {returnTypeOptions.map((option, idx) => {
                        const isSelected = data.returnType?.id === option.id;
                        return (
                          <button
                            key={idx}
                            className={`donode-dropdown-item ${isSelected ? 'selected' : ''}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReturnTypeSelect(option);
                            }}
                          >
                            {option.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>,
                document.body
              );
            })()}
          </div>

          {/* TRUE / FALSE Labels */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: '#10b981' }}>TRUE</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
              <span className="text-xs font-medium" style={{ color: '#ef4444' }}>FALSE</span>
            </div>
          </div>
        </div>

        {/* TRUE Handle (Bottom Left) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
          style={{ bottom: 0, left: '25%', transform: 'translate(-50%, 50%)' }}
        >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none" style={{ backgroundColor: '#10b981' }} />
        </Handle>

        {/* FALSE Handle (Bottom Right) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
          style={{ bottom: 0, left: '75%', transform: 'translate(-50%, 50%)' }}
        >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none" style={{ backgroundColor: '#ef4444' }} />
        </Handle>
      </div>
    </>
  );
});

DONode.displayName = 'DONode';