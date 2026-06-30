import React from 'react';
import { Node } from 'reactflow';
import { X } from 'lucide-react';

interface NodeInfoPopoverProps {
  node: Node;
  onClose: () => void;
}

/** 필드명 마지막 부분만 추출 (path.to.field → field) — MappingNode.getShortName과 동일 */
const getShortName = (name: string): string => {
  const parts = name?.split('.') || [];
  return parts[parts.length - 1] || name || '?';
};

/** 값이 있을 때만 행 렌더링 */
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span className="text-slate-700 break-all">{value}</span>
    </div>
  );
};

export const NodeInfoPopover: React.FC<NodeInfoPopoverProps> = ({ node, onClose }) => {
  const d = (node.data as any) || {};
  const nodeType = node.type || '';

  /* ── 타입별 본문 ─────────────────────────────────────────── */
  const renderBody = () => {
    /* Start / End (내부 start/end 포함) */
    const isStart = d.isStart || d.isInternalStart || nodeType === 'Start';
    const isEnd   = d.isEnd   || d.isInternalEnd   || nodeType === 'End';
    if (isStart) {
      return <p className="text-slate-500 italic">컨테이너 진입점</p>;
    }
    if (isEnd) {
      return <p className="text-slate-500 italic">컨테이너 종료점</p>;
    }

    /* CallDO */
    if (nodeType === 'CallDO') {
      const ido = d.ido || {};
      const componentId = ido.componentId || d.code || '';
      const idoTypeLabel = ido.type || '';
      const returnType = d.returnType
        ? (typeof d.returnType === 'string' ? d.returnType : (d.returnType.name || d.returnType.id || ''))
        : '';
      const mappings: any[] = d.mappings || [];
      const previewMappings = mappings.slice(0, 3);

      return (
        <div className="space-y-1">
          <InfoRow label="componentId" value={componentId} />
          <InfoRow label="type"        value={idoTypeLabel} />
          <InfoRow label="returnType"  value={returnType} />
          {mappings.length > 0 && (
            <div className="pt-1 border-t border-slate-100">
              <div className="text-slate-400 mb-0.5">
                mappings ({mappings.length}건)
              </div>
              {previewMappings.map((m: any, i: number) => {
                const srcField = m.sources?.[0]?.fieldName ?? '';
                const tgtField = m.targetFieldName ?? '';
                if (!srcField && !tgtField) return null;
                return (
                  <div key={i} className="flex items-center gap-1 text-slate-600 font-mono">
                    <span className="text-slate-500">{getShortName(srcField)}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-700">{getShortName(tgtField)}</span>
                  </div>
                );
              })}
              {mappings.length > 3 && (
                <div className="text-slate-400 mt-0.5">…외 {mappings.length - 3}건</div>
              )}
            </div>
          )}
        </div>
      );
    }

    /* IfElse */
    if (nodeType === 'IfElse') {
      return (
        <div className="space-y-1">
          <InfoRow label="expression" value={d.expression} />
        </div>
      );
    }

    /* While */
    if (nodeType === 'While') {
      return (
        <div className="space-y-1">
          <InfoRow label="expression" value={d.expression} />
        </div>
      );
    }

    /* ForEach */
    if (nodeType === 'ForEach') {
      return (
        <div className="space-y-1">
          <InfoRow label="expression" value={d.expression} />
        </div>
      );
    }

    /* For */
    if (nodeType === 'For') {
      return (
        <div className="space-y-1">
          <InfoRow label="expression" value={d.expression} />
          <InfoRow label="start"      value={d.startValue} />
          <InfoRow label="end"        value={d.endValue} />
        </div>
      );
    }

    /* Variable */
    if (nodeType === 'Variable') {
      return (
        <div className="space-y-1">
          <InfoRow label="variableName" value={d.variableName} />
          <InfoRow label="expression"   value={d.expression} />
        </div>
      );
    }

    /* Error */
    if (nodeType === 'Error') {
      return (
        <div className="space-y-1">
          <InfoRow label="code"     value={d.code} />
          <InfoRow label="codeName" value={d.codeName} />
        </div>
      );
    }

    /* CallMethod */
    if (nodeType === 'CallMethod') {
      const groupLabel =
        d.selectedGroup?.label ||
        (typeof d.selectedGroup === 'string' ? d.selectedGroup : '') ||
        '';
      return (
        <div className="space-y-1">
          <InfoRow label="method" value={groupLabel || '미선택'} />
        </div>
      );
    }

    /* Script */
    if (nodeType === 'Script') {
      return (
        <div className="space-y-1">
          <InfoRow label="scriptType"    value={d.scriptType} />
          <InfoRow label="variableName"  value={d.variableName} />
        </div>
      );
    }

    /* 그 외 — label / description */
    const fallbackLabel = d.label || d.description || '';
    if (fallbackLabel) {
      return <p className="text-slate-600">{fallbackLabel}</p>;
    }

    return <p className="text-slate-400 italic">정보 없음</p>;
  };

  /* ── 헤더 타이틀 (id + type) ─────────────────────────────── */
  const displayType = (() => {
    const isStart = d.isStart || d.isInternalStart || nodeType === 'Start';
    const isEnd   = d.isEnd   || d.isInternalEnd   || nodeType === 'End';
    if (isStart) return 'Start';
    if (isEnd)   return 'End';
    return nodeType || 'Node';
  })();

  return (
    /* 캔버스 우상단 고정 */
    <div
      className="absolute top-3 right-3 z-40 w-60 rounded-xl border border-slate-200 bg-white shadow-lg text-xs select-none"
      style={{ pointerEvents: 'auto' }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-800 truncate">{node.id}</div>
          <div className="text-[10px] text-slate-400 font-mono">type: {displayType}</div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </div>

      {/* 본문 */}
      <div className="px-3 py-2 space-y-1 text-[11px]">
        {renderBody()}
      </div>
    </div>
  );
};
