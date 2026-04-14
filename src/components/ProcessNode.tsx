import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Workflow, Play, Square, ChevronDown, Settings } from 'lucide-react';
import { ServiceTypeInputModal, InputField } from './ServiceTypeInputModal';
import { ServiceTypeOption, InputField as InputFieldType } from '../types/process';
import { fetchServiceTypes, fetchServiceTypeInputs } from '../services/processService';

export const ProcessNode = memo(({ id, data, selected }: NodeProps) => {
  const [showServiceTypePopup, setShowServiceTypePopup] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [showInputModal, setShowInputModal] = useState(false);
  const [pendingServiceType, setPendingServiceType] = useState<{ value: string; text: string } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // API에서 가져온 서비스 타입 목록
  const [apiServiceTypes, setApiServiceTypes] = useState<ServiceTypeOption[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 서비스 타입별 입력 필드
  const [serviceTypeInputFields, setServiceTypeInputFields] = useState<InputField[]>([]);
  const [isLoadingInputs, setIsLoadingInputs] = useState(false);

  // 서비스 타입 목록 API 호출 (콤보박스 클릭 시)
  const loadServiceTypes = useCallback(async () => {
    if (isLoaded || isLoadingTypes) return; // 이미 로드됐거나 로딩 중이면 스킵

    setIsLoadingTypes(true);
    try {
      const response = await fetchServiceTypes();
      setApiServiceTypes(response.types || []);
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch service types:', error);
      // 실패 시 기본값 사용
      setApiServiceTypes([
        { code: 'com.process.ProcessDefault', name: '기본 프로세스' },
      ]);
    } finally {
      setIsLoadingTypes(false);
    }
  }, [isLoaded, isLoadingTypes]);

  // 이미 serviceType이 설정된 노드면 마운트 시 목록 로드 (한국어 이름 표시용)
  useEffect(() => {
    if (data.serviceType && !isLoaded && !isLoadingTypes) {
      loadServiceTypes();
    }
  }, [data.serviceType, isLoaded, isLoadingTypes, loadServiceTypes]);

  // Calculate dropdown position when popup opens
  useEffect(() => {
    if (showServiceTypePopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Always use viewport coordinates for portal
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showServiceTypePopup]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showServiceTypePopup) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowServiceTypePopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showServiceTypePopup]);

  // Determine if this is an internal start/end node
  const isInternalStart = data.isInternalStart;
  const isInternalEnd = data.isInternalEnd;
  const isInternal = isInternalStart || isInternalEnd;

  // Service type options - API에서 가져온 데이터 사용
  const serviceTypeOptions = apiServiceTypes.map(type => ({
    value: type.code,
    text: type.name,
  }));

  const handleServiceTypeSelect = async (option: { value: string; text: string }) => {
    setPendingServiceType(option);
    setShowServiceTypePopup(false);
    setIsLoadingInputs(true);

    try {
      const response = await fetchServiceTypeInputs(option.value);
      setServiceTypeInputFields(response.fields as InputField[]);
    } catch (error) {
      console.error('Failed to fetch service type inputs:', error);
      // 실패 시 기본 필드 사용
      setServiceTypeInputFields([
        { id: 'description', text: '설명', type: 'TEXT', defaultValue: '' },
      ]);
    } finally {
      setIsLoadingInputs(false);
      setShowInputModal(true);
    }
  };

  const handleInputModalSave = (values: Record<string, any>) => {
    if (pendingServiceType) {
      data.onChange?.('serviceType', pendingServiceType.value);
      data.onChange?.('serviceTypeInput', values);
    }
    setShowInputModal(false);
    setPendingServiceType(null);
  };

  // Helper to get service type text from value
  const getServiceTypeText = (value: string | undefined) => {
    if (!value) return 'serviceType 선택';
    const option = serviceTypeOptions.find(opt => opt.value === value);
    return option?.text || value;
  };

  const handleInputModalClose = () => {
    setShowInputModal(false);
    setPendingServiceType(null);
  };

  // 일반 노드인지 (Start, End, Internal이 아닌)
  const isNormalNode = !data.isStart && !data.isEnd && !isInternal;

  // Internal nodes have a distinct green/red color scheme
  const internalStartColor = '#10b981'; // emerald-500
  const internalEndColor = '#ef4444';   // red-500
  const normalColor = '#5277f7';        // blue

  const accentColor = isInternalStart ? internalStartColor : isInternalEnd ? internalEndColor : normalColor;
  const headerBgColor = isInternalStart ? '#d1fae5' : isInternalEnd ? '#fee2e2' : '#dce4fd';
  const headerBorderColor = isInternalStart ? '#a7f3d0' : isInternalEnd ? '#fecaca' : '#cddbfd';

  // Hide target handle for internal start node, hide source handle for internal end node
  const showTargetHandle = !data.isStart && !isInternalStart;
  const showSourceHandle = !data.isEnd && !isInternalEnd;

  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[180px] transition-all overflow-hidden ${
        selected ? `shadow-xl` : 'border-slate-300'
      }`}
      style={{
        borderColor: selected ? accentColor : undefined,
        overflow: showServiceTypePopup ? 'visible' : 'hidden',
        zIndex: showServiceTypePopup ? 9999 : undefined,
      }}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className={`w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center ${isInternal ? '' : '-top-6'}`}
          style={isInternal ? { top: 0, transform: 'translate(-50%, -50%)' } : undefined}
        >
             <div
               className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none"
               style={{ backgroundColor: accentColor }}
             />
        </Handle>
      )}

      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{ backgroundColor: headerBgColor, borderColor: headerBorderColor }}
      >
        <div
          className="p-1.5 rounded-lg bg-white/60"
          style={{ color: accentColor }}
        >
          {isInternalStart ? <Play size={18} /> : isInternalEnd ? <Square size={18} /> : <Workflow size={18} />}
        </div>
        <div>
          <div className="text-slate-900 font-bold text-sm leading-tight">{data.label}</div>
          <div className="text-slate-400 text-[10px] font-mono">nodeId: {id}</div>
        </div>
      </div>

      {/* Body */}
      <div
        className="p-4 bg-white rounded-b-xl"
        style={!isNormalNode ? { minHeight: '54px' } : undefined}
      >
        {data.description && (
          <div className="text-slate-500 text-xs mb-3">{data.description}</div>
        )}

        {/* SERVICE TYPE - 일반 노드에만 표시 */}
        {isNormalNode && (
          <div
            className="mb-3"
            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
          >
            <div className="flex items-center gap-2">
              <button
                ref={buttonRef}
                className={`nodrag nopan nowheel flex-1 text-left bg-white px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
                  showServiceTypePopup
                    ? 'border-[#c4b5fd] shadow-[0_0_0_2px_rgba(196,181,253,0.3)]'
                    : 'border-[#c4b5fd] hover:shadow-[0_0_0_2px_rgba(196,181,253,0.2)]'
                }`}
                style={{ pointerEvents: 'auto' }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showServiceTypePopup) {
                    loadServiceTypes(); // 콤보박스 열 때 API 호출
                  }
                  setShowServiceTypePopup(!showServiceTypePopup);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 text-sm">
                    {isLoadingTypes ? '로딩중...' : getServiceTypeText(data.serviceType)}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${showServiceTypePopup ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              {/* 서비스 설정 버튼 */}
              <button
                className="nodrag nopan nowheel p-2 rounded-lg border-2 border-[#c4b5fd] bg-white hover:bg-[#f3e8ff] transition-all duration-200"
                style={{ pointerEvents: 'auto' }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={async (e) => {
                  e.stopPropagation();
                  // 서비스 타입이 선택되어 있으면 API 재호출 후 설정 모달 열기
                  if (data.serviceType) {
                    const selectedOption = serviceTypeOptions.find(opt => opt.value === data.serviceType);
                    if (selectedOption) {
                      setPendingServiceType(selectedOption);
                      setIsLoadingInputs(true);
                      try {
                        const response = await fetchServiceTypeInputs(selectedOption.value);
                        setServiceTypeInputFields(response.fields as InputField[]);
                      } catch (error) {
                        console.error('Failed to fetch service type inputs:', error);
                      } finally {
                        setIsLoadingInputs(false);
                        setShowInputModal(true);
                      }
                    }
                  }
                }}
                title="서비스 설정"
                disabled={!data.serviceType}
              >
                <Settings size={16} className={data.serviceType ? 'text-[#7c3aed]' : 'text-slate-300'} />
              </button>
            </div>

            {/* Service Type Dropdown - Always use portal to document.body */}
            {showServiceTypePopup && (() => {
              // 버튼 위치 직접 계산
              const rect = buttonRef.current?.getBoundingClientRect();
              const pos = rect ? {
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width || 200,
              } : dropdownPosition;

              return ReactDOM.createPortal(
                <>
                  {/* Global style override */}
                  <style>{`
                    .custom-node-dropdown-overlay {
                      position: fixed !important;
                      top: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      bottom: 0 !important;
                      z-index: 2147483647 !important;
                      pointer-events: auto !important;
                    }
                    .custom-node-dropdown-backdrop {
                      position: fixed !important;
                      top: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      bottom: 0 !important;
                      background: transparent !important;
                      pointer-events: auto !important;
                    }
                    .custom-node-dropdown-menu {
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
                    .custom-node-dropdown-item {
                      display: block !important;
                      width: 100% !important;
                      text-align: left !important;
                      padding: 8px 12px !important;
                      border: none !important;
                      background: transparent !important;
                      cursor: pointer !important;
                      font-size: 14px !important;
                      white-space: nowrap !important;
                      color: #334155 !important;
                      pointer-events: auto !important;
                    }
                    .custom-node-dropdown-item:hover {
                      background: #f8fafc !important;
                    }
                    .custom-node-dropdown-item.selected {
                      background: #f3e8ff !important;
                    }
                  `}</style>
                  <div className="custom-node-dropdown-overlay">
                    {/* Backdrop */}
                    <div
                      className="custom-node-dropdown-backdrop"
                      onClick={() => setShowServiceTypePopup(false)}
                    />
                    {/* Dropdown Menu */}
                    <div
                      ref={dropdownRef}
                      className="custom-node-dropdown-menu"
                      style={{
                        top: `${pos.top}px`,
                        left: `${pos.left}px`,
                        minWidth: `${pos.width}px`,
                      }}
                    >
                      {serviceTypeOptions.map((option, idx) => {
                        const isSelected = data.serviceType === option.value;
                        return (
                          <button
                            key={idx}
                            className={`custom-node-dropdown-item ${isSelected ? 'selected' : ''}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceTypeSelect(option);
                            }}
                          >
                            {option.text}
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
        )}

        {data.ido && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 font-bold mb-1">
              linked {data.ido.type || 'component'}
            </div>
            <div className="text-xs bg-[#eff4ff] text-[#5277f7] px-2 py-1.5 rounded border border-[#dce4fd] font-medium flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5277f7]"></div>
                <span className="truncate">{data.ido.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 pl-3.5 truncate">
                {data.ido.componentId}
              </div>
            </div>
          </div>
        )}
      </div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={`w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center ${isInternal ? '' : '-bottom-6'}`}
          style={isInternal ? { bottom: 0, transform: 'translate(-50%, 50%)' } : undefined}
        >
             <div
               className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none"
               style={{ backgroundColor: accentColor }}
             />
        </Handle>
      )}

      {/* Service Type Input Modal */}
      {pendingServiceType && (
        <ServiceTypeInputModal
          isOpen={showInputModal && !isLoadingInputs}
          onClose={handleInputModalClose}
          onSave={handleInputModalSave}
          serviceType={pendingServiceType}
          inputs={serviceTypeInputFields}
        />
      )}
    </div>
  );
});

ProcessNode.displayName = 'ProcessNode';