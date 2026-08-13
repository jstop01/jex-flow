import React, { useState, useCallback, useEffect } from 'react';
import { Node } from 'reactflow';
import { ChevronLeft, ChevronRight, ChevronDown, Database, Box, Server, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { IOField } from './IOSettingModal';
import { MappingField } from './MappingSettingModal';
import { fetchComponentIO } from '../services/componentService';

interface IOPanelProps {
  nodes: Node[];
  selectedNodeId: string | null;
}

// Service/IDO Info type
interface ServiceInfo {
  serviceId: string;
  serviceName: string;
  packageName: string;
  className: string;
  hasIDO: boolean;
}

export const IOPanel = ({ nodes, selectedNodeId }: IOPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  // Determine node type for specialized display
  const nodeType = selectedNode?.type;
  // IMO/IDO are properties of CallDO node's data.ido.type, not node types themselves
  const isCallDO = nodeType === 'CallDO';
  const idoType = selectedNode?.data?.ido?.type;
  const isIMO = isCallDO && idoType === 'IMO';
  const isIDO = isCallDO && idoType === 'IDO';
  const isMapping = nodeType === 'Mapping';

  // Extract service info from node data (from linked IDO)
  // Returns '-' for all fields if IDO is not selected
  const getServiceInfo = (node: Node): ServiceInfo => {
    const ido = node.data?.ido;
    const hasIDO = !!ido;

    if (!hasIDO) {
      return {
        serviceId: '-',
        serviceName: '-',
        packageName: '-',
        className: '-',
        hasIDO: false,
      };
    }

    return {
      serviceId: ido.componentId || '-',
      serviceName: ido.name || '-',
      packageName: ido.packagePath || ido.package || '-',
      className: ido.className || '-',
      hasIDO: true,
    };
  };

  // Helper to render empty state
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12 px-4">
      <Box size={32} className="opacity-50" />
      <span className="text-sm text-center">{message}</span>
    </div>
  );

  // IO Table Component (Read-only) with Record expansion support
  const IOTable = ({ title, fields, node }: { title: string; fields: IOField[]; node?: Node }) => {
    // Track expanded Record fields
    const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
    // Lazy-loaded children for RECORD fields
    const [loadedChildren, setLoadedChildren] = useState<Record<string, IOField[]>>({});
    const [loadingRecords, setLoadingRecords] = useState<Set<string>>(new Set());

    const toggleRecord = useCallback(async (fieldId: string, field: IOField) => {
      // 이미 열려있으면 닫기
      if (expandedRecords.has(fieldId)) {
        setExpandedRecords(prev => { const next = new Set(prev); next.delete(fieldId); return next; });
        return;
      }

      // children이 이미 있으면 바로 열기
      if ((field.children && field.children.length > 0) || loadedChildren[fieldId]) {
        setExpandedRecords(prev => { const next = new Set(prev); next.add(fieldId); return next; });
        return;
      }

      // children이 없으면 부모 컴포넌트 ID로 API fetch 후 해당 RECORD의 children 추출
      const parentComId = node?.data?.ido?.componentId || '';
      const comTp = node?.data?.ido?.type || 'IMO';
      const recordName = field.englishName || field.name || '';
      if (!parentComId) {
        setExpandedRecords(prev => { const next = new Set(prev); next.add(fieldId); return next; });
        return;
      }

      setLoadingRecords(prev => { const next = new Set(prev); next.add(fieldId); return next; });
      try {
        // COMMON(CMO) 판정: ruleName이 있고 children이 없으면 CMO 참조
        const isCommon = !!(field.ruleName && (!field.children || field.children.length === 0));

        if (isCommon) {
          // COMMON(CMO) 타입: ruleName으로 CMO 컴포넌트 직접 조회
          const cmoId = field.ruleName || recordName;
          const cmoData = await fetchComponentIO(cmoId, 'CMO');
          const cmoFields = [...(cmoData.inputs || []), ...(cmoData.outputs || [])];
          setLoadedChildren(prev => ({
            ...prev,
            [fieldId]: cmoFields,
          }));
        } else {
          // RECORD 타입: 부모 컴포넌트에서 해당 RECORD의 children 추출
          const ioData = await fetchComponentIO(parentComId, comTp);
          const allFields = [...ioData.inputs, ...ioData.outputs];
          let recordField = allFields.find(
            (f: IOField) => (f.fieldType === 'RECORD' || f.fieldType === 'COMMON') && f.englishName === recordName
          );
          if (!recordField) {
            recordField = allFields.find(
              (f: IOField) => (f.fieldType === 'RECORD' || f.fieldType === 'COMMON') && f.name === recordName
            );
          }
          // children이 있으면 사용, 없고 ruleName 있으면 CMO fallback
          if (recordField?.children && recordField.children.length > 0) {
            setLoadedChildren(prev => ({ ...prev, [fieldId]: recordField!.children || [] }));
          } else if (field.ruleName) {
            const cmoData = await fetchComponentIO(field.ruleName, 'CMO');
            const cmoFields = [...(cmoData.inputs || []), ...(cmoData.outputs || [])];
            setLoadedChildren(prev => ({ ...prev, [fieldId]: cmoFields }));
          } else {
            setLoadedChildren(prev => ({ ...prev, [fieldId]: [] }));
          }
        }
      } catch (e) {
        console.error('RECORD children fetch failed:', e);
        setLoadedChildren(prev => ({ ...prev, [fieldId]: [] }));
      } finally {
        setLoadingRecords(prev => { const next = new Set(prev); next.delete(fieldId); return next; });
      }

      setExpandedRecords(prev => { const next = new Set(prev); next.add(fieldId); return next; });
    }, [expandedRecords, loadedChildren, node]);

    // Render a single row (with optional indent for children)
    const renderRow = (field: IOField, idx: number, indent: number = 0) => {
      const isRecord = field.fieldType === 'Record' || field.fieldType === 'RECORD' || field.fieldType === 'COMMON' || field.fieldType === 'Common' || field.fieldType === 'MATCH' || field.fieldType === 'Match';
      const isExpanded = expandedRecords.has(field.id);
      const isLoading = loadingRecords.has(field.id);
      const effectiveIndent = field.isRecordChild ? 1 : indent;
      // children: field 자체에 있거나 lazy-loaded된 것
      const children = field.children?.length ? field.children : (loadedChildren[field.id] || []);

      return (
        <React.Fragment key={field.id || idx}>
          <tr
            className={`hover:bg-blue-50 text-[11px] text-slate-700 ${isRecord ? 'cursor-pointer' : ''} ${field.isRecordChild ? 'bg-slate-50/50' : ''}`}
            onClick={isRecord ? () => toggleRecord(field.id, field) : undefined}
          >
            <td className="py-1.5 px-2 border-b border-slate-100 font-medium truncate max-w-[100px]">
              <div className="flex items-center gap-1" style={{ paddingLeft: `${effectiveIndent * 16}px` }}>
                {isRecord && (
                  isLoading ? (
                    <span className="text-slate-400 text-[10px] flex-shrink-0 animate-spin">⟳</span>
                  ) : (
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
                    />
                  )
                )}
                {!isRecord && effectiveIndent > 0 && (
                  <span className="text-slate-300 flex-shrink-0 text-[10px]">└</span>
                )}
                <span className={isRecord ? 'text-violet-600 font-semibold' : ''}>
                  {field.englishName}
                </span>
              </div>
            </td>
            <td className="py-1.5 px-2 border-b border-slate-100 truncate max-w-[80px]">{field.koreanName}</td>
            <td className="py-1.5 px-2 border-b border-slate-100 w-14">
              <span className={isRecord ? 'text-violet-600 font-medium' : ''}>
                {field.fieldType || 'FIELD'}
              </span>
            </td>
            <td className="py-1.5 px-2 border-b border-slate-100 text-right font-mono w-10">
              {isRecord ? (children.length ? `(${children.length})` : '') : (field.length || '0')}
            </td>
          </tr>
          {/* Render children if expanded */}
          {isRecord && isExpanded && children.map((child, childIdx) =>
            renderRow(child, childIdx, indent + 1)
          )}
        </React.Fragment>
      );
    };

    return (
      <div className="border-t border-slate-200">
        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-700">{title}</h3>
          <span className="text-[10px] text-slate-400">{fields.length}건</span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold">
              <tr>
                <th className="py-2 px-2 border-b border-slate-200">영문명</th>
                <th className="py-2 px-2 border-b border-slate-200">한글명</th>
                <th className="py-2 px-2 border-b border-slate-200 w-14">필드타입</th>
                <th className="py-2 px-2 border-b border-slate-200 w-10 text-right">길이</th>
              </tr>
            </thead>
            <tbody>
              {fields.length > 0 ? (
                fields
                  // isRecordChild: true인 항목은 RECORD 부모의 children으로 렌더링되므로
                  // 최상위 배열에서는 제외 (구버전 flat 배열 데이터 호환)
                  .filter(field => !field.isRecordChild)
                  .map((field, idx) => renderRow(field, idx, 0))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-300 text-xs">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // IMO Information Panel
  const IMOInfoPanel = ({ node }: { node: Node }) => {
    const serviceInfo = getServiceInfo(node);
    const ido = node.data?.ido;
    const [ioData, setIoData] = useState<{ inputs: IOField[]; outputs: IOField[] }>({ inputs: [], outputs: [] });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      if (!ido?.componentId) return;
      setIsLoading(true);
      fetchComponentIO(ido.componentId, ido.type || 'IMO')
        .then(data => setIoData({ inputs: data.inputs || [], outputs: data.outputs || [] }))
        .catch(() => setIoData({ inputs: [], outputs: [] }))
        .finally(() => setIsLoading(false));
    }, [ido?.componentId, ido?.type]);

    const inputs = ioData.inputs;
    const outputs = ioData.outputs;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Service Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-white border-b border-slate-200 shrink-0">
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">IMO ID</div>
            <div className={`text-xs font-mono px-2 py-1.5 rounded border truncate ${serviceInfo.hasIDO ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              {serviceInfo.serviceId}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">IMO 명</div>
            <div className={`text-xs truncate ${serviceInfo.hasIDO ? 'text-slate-800' : 'text-slate-400'}`}>
              {serviceInfo.serviceName}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">대상서버</div>
            <div className={`text-xs truncate ${serviceInfo.hasIDO ? 'text-slate-600' : 'text-slate-400'}`}>
              {ido?.svrId || '-'}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">설명</div>
            <div className={`text-xs truncate ${serviceInfo.hasIDO ? 'text-slate-600' : 'text-slate-400'}`}>
              {ido?.description || node.data?.description || '-'}
            </div>
          </div>
        </div>

        {/* Scrollable IO Tables */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          <div className="mt-4">
            <IOTable title="Input Message" fields={inputs} node={node} />
          </div>
          <div className="mt-4">
            <IOTable title="Output Message" fields={outputs} node={node} />
          </div>
        </div>
      </div>
    );
  };

  // IDO Information Panel
  const IDOInfoPanel = ({ node }: { node: Node }) => {
    const serviceInfo = getServiceInfo(node);
    const ido = node.data?.ido;
    const [ioData, setIoData] = useState<{ inputs: IOField[]; outputs: IOField[]; sqlList?: any[] }>({ inputs: [], outputs: [] });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      if (!ido?.componentId) return;
      setIsLoading(true);
      fetchComponentIO(ido.componentId, ido.type || 'IDO')
        .then(data => setIoData({ inputs: data.inputs || [], outputs: data.outputs || [], sqlList: data.sqlList }))
        .catch(() => setIoData({ inputs: [], outputs: [] }))
        .finally(() => setIsLoading(false));
    }, [ido?.componentId, ido?.type]);

    const inputs = ioData.inputs;
    const outputs = ioData.outputs;
    const rt = node.data?.returnType;
    const rtId = rt ? (typeof rt === 'string' ? rt : (rt.id || rt.name || '')) : '';
    const isOutputList = rtId
      ? rtId === 'JexDataList'
      : (ido?.type === 'IDO' && (ioData.sqlList?.[0]?.sqlDvCd || '') === 'SELECT');

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Service Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-white border-b border-slate-200 shrink-0">
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">IDO ID</div>
            <div className={`text-xs font-mono px-2 py-1.5 rounded border truncate ${serviceInfo.hasIDO ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              {serviceInfo.serviceId}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">IDO 명</div>
            <div className={`text-xs truncate ${serviceInfo.hasIDO ? 'text-slate-800' : 'text-slate-400'}`}>
              {serviceInfo.serviceName}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">대상DB</div>
            <div className={`text-xs truncate ${serviceInfo.hasIDO ? 'text-slate-600' : 'text-slate-400'}`}>
              {ido?.svrId || '-'}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-semibold text-slate-500 mb-1">설명</div>
            <div className={`text-xs truncate ${serviceInfo.hasIDO ? 'text-slate-600' : 'text-slate-400'}`}>
              {ido?.description || node.data?.description || '-'}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          {/* SQL Display */}
          {ioData.sqlList && ioData.sqlList.length > 0 && (
            <div className="px-4 pt-4 pb-3 border-b border-slate-200">
              {ioData.sqlList.map((sqlItem: any, idx: number) => (
                <div key={idx} className={idx > 0 ? 'mt-3' : ''}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-700">SQL</span>
                    {ioData.sqlList.length > 1 && (
                      <span className="text-[10px] text-slate-400">({sqlItem.dbTp || 'default'})</span>
                    )}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                    {sqlItem.sql}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <IOTable title="Input Message" fields={inputs} node={node} />
          </div>
          <div className="mt-4">
            <IOTable title={isOutputList ? 'outputList (JexDataList)' : 'Output Message'} fields={outputs} node={node} />
          </div>
        </div>
      </div>
    );
  };

  // Default Node Info Panel (for non-IMO/IDO nodes)
  const DefaultNodeInfoPanel = ({ node }: { node: Node }) => {
    const inputs: IOField[] = node.data.inputs || [];
    const outputs: IOField[] = node.data.outputs || [];
    const { label, code, codeName, description } = node.data;
    const hasIDO = !!code || !!codeName;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Node Info Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm font-bold text-slate-800 font-mono">{node.id}</div>
          </div>
          <div className="text-xs text-slate-500">
            type: <span className="capitalize font-medium">{node.type}</span>
          </div>
          {hasIDO && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-[#5277f7]">
                <Database size={12} />
                <span className="font-medium">{codeName || code}</span>
              </div>
              {description && (
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</div>
              )}
            </div>
          )}
        </div>

        {/* IO Tables */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          {(inputs.length > 0 || outputs.length > 0) ? (
            <>
              <div className="mt-4">
                <IOTable title="Input Message" fields={inputs} node={node} />
              </div>
              <div className="mt-4">
                <IOTable title="Output Message" fields={outputs} node={node} />
              </div>
            </>
          ) : (
            <EmptyState message="이 노드에는 I/O 데이터가 없습니다" />
          )}
        </div>
      </div>
    );
  };

  // Mapping Table Component (Read-only)
  const MappingTable = ({ title, fields, type }: { title: string; fields: MappingField[]; type: 'input' | 'output' }) => {
    const headerBg = type === 'input' ? 'bg-emerald-50' : 'bg-amber-50';
    const headerTextColor = type === 'input' ? 'text-emerald-700' : 'text-amber-700';
    const Icon = type === 'input' ? ArrowDownToLine : ArrowUpFromLine;
    const iconColor = type === 'input' ? 'text-emerald-500' : 'text-amber-500';

    return (
      <div className="border-t border-slate-200">
        {/* Table Header */}
        <div className={`flex items-center justify-between px-4 py-2 ${headerBg} border-b border-slate-200`}>
          <div className="flex items-center gap-2">
            <Icon size={14} className={iconColor} />
            <h3 className={`text-xs font-bold ${headerTextColor}`}>{title}</h3>
          </div>
          <span className="text-[10px] text-slate-400">{fields.length}건</span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold">
              <tr>
                <th className="py-2 px-2 border-b border-slate-200">영문명</th>
                <th className="py-2 px-2 border-b border-slate-200">한글명</th>
                <th className="py-2 px-2 border-b border-slate-200 w-14">타입</th>
                <th className="py-2 px-2 border-b border-slate-200 w-10 text-right">길이</th>
                <th className="py-2 px-2 border-b border-slate-200 w-16">타겟</th>
              </tr>
            </thead>
            <tbody>
              {fields.length > 0 ? (
                fields.map((field, idx) => (
                  <tr key={field.id || idx} className="hover:bg-blue-50 text-[11px] text-slate-700">
                    <td className="py-1.5 px-2 border-b border-slate-100 font-medium truncate max-w-[100px]">{field.englishName}</td>
                    <td className="py-1.5 px-2 border-b border-slate-100 truncate max-w-[80px]">{field.koreanName}</td>
                    <td className="py-1.5 px-2 border-b border-slate-100 w-14">{field.fieldType || 'String'}</td>
                    <td className="py-1.5 px-2 border-b border-slate-100 text-right font-mono w-10">{field.length || '0'}</td>
                    <td className="py-1.5 px-2 border-b border-slate-100 w-16 truncate">{field.target || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-300 text-xs">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Mapping Node Info Panel - unified layout with DefaultNodeInfoPanel
  const MappingNodeInfoPanel = ({ node }: { node: Node }) => {
    const mappingType = node.data.mappingType as 'input' | 'output' | undefined;
    const inputMapping: MappingField[] = node.data.inputMapping || [];
    const outputMapping: MappingField[] = node.data.outputMapping || [];
    const { label } = node.data;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Node Info Header - same as DefaultNodeInfoPanel */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm font-bold text-slate-800 font-mono">{node.id}</div>
          </div>
          <div className="text-xs text-slate-500">
            type: <span className="capitalize font-medium">{node.type}</span>
            {mappingType && <span className="ml-2 text-[#5277f7] font-medium">({mappingType})</span>}
          </div>
          {node.data.description && (
            <div className="text-xs text-slate-500 mt-2">{node.data.description}</div>
          )}
        </div>

        {/* Mapping Tables */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          {!mappingType ? (
            <EmptyState message="우클릭하여 매핑 타입(Input/Output)을 선택하세요" />
          ) : mappingType === 'input' ? (
            <div className="mt-4">
              <MappingTable title="Input Mapping" fields={inputMapping} type="input" />
            </div>
          ) : (
            <div className="mt-4">
              <MappingTable title="Output Mapping" fields={outputMapping} type="output" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render appropriate panel based on node type
  const renderContent = () => {
    if (!selectedNode) {
      return <EmptyState message="노드를 선택하면 Input/Output 정보가 여기에 표시됩니다" />;
    }

    if (isIMO) {
      return <IMOInfoPanel node={selectedNode} />;
    }

    if (isIDO) {
      return <IDOInfoPanel node={selectedNode} />;
    }

    if (isMapping) {
      return <MappingNodeInfoPanel node={selectedNode} />;
    }

    return <DefaultNodeInfoPanel node={selectedNode} />;
  };

  // Fixed panel width
  const PANEL_WIDTH = 480;
  const COLLAPSED_WIDTH = 40;

  return (
    <div
      style={{
        width: isCollapsed ? COLLAPSED_WIDTH : PANEL_WIDTH,
        minWidth: isCollapsed ? COLLAPSED_WIDTH : PANEL_WIDTH,
        maxWidth: isCollapsed ? COLLAPSED_WIDTH : PANEL_WIDTH,
      }}
      className="h-full bg-white border-l border-slate-200 shadow-[-2px_0_8px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 flex-grow-0 overflow-hidden"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-2 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2">
            <Server size={14} className="text-[#5277f7]" />
            <span className="text-xs font-bold text-slate-700">Node Information</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors ml-auto"
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      )}
    </div>
  );
};
