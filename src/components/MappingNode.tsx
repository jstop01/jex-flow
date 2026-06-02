import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { ArrowRightLeft, Link, ArrowRight, Wand2 } from 'lucide-react';

export const MappingNode = memo(({ id, data, selected }: NodeProps) => {
  // 매핑 개수
  const mappings = data.mappings || [];
  const mappingCount = mappings.length;

  // 미리보기용 매핑 목록 (최대 4개)
  const previewMappings = mappings.slice(0, 4);
  const hasMore = mappingCount > 4;

  // Accent color - purple for Mapping node
  const accentColor = '#8b5cf6';
  const headerBgColor = '#ede9fe';
  const headerBorderColor = '#ddd6fe';

  // 필드명에서 마지막 부분만 추출 (path.to.field → field)
  const getShortName = (name: string) => {
    const parts = name?.split('.') || [];
    return parts[parts.length - 1] || name || '?';
  };

  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[200px] max-w-[260px] transition-all overflow-hidden ${
        selected ? 'shadow-xl' : 'border-slate-300'
      }`}
      style={{ borderColor: selected ? accentColor : undefined }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
      >
        <div
          className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
      </Handle>

      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ backgroundColor: headerBgColor, borderColor: headerBorderColor }}
      >
        <div className="p-1.5 rounded-lg bg-white/60" style={{ color: accentColor }}>
          <ArrowRightLeft size={16} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-slate-800 text-sm">{id}</div>
          <div className="text-slate-400 text-[10px] font-mono">type: Mapping</div>
        </div>
        <div className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: accentColor, color: 'white' }}>
          {mappingCount}
        </div>
      </div>

      <div className="p-3 bg-white">
        {data.description && (
          <div className="text-slate-500 text-xs mb-2 italic border-b border-slate-100 pb-2">
            {data.description}
          </div>
        )}

        {mappingCount === 0 ? (
          <div className="text-slate-400 text-xs text-center py-2">
            더블클릭하여 매핑 설정
          </div>
        ) : (
          <div className="space-y-1">
            {previewMappings.map((mapping: any, idx: number) => {
              const sourceName = mapping.sources?.[0]?.fieldName
                ? getShortName(mapping.sources[0].fieldName)
                : '?';
              const targetName = getShortName(mapping.targetFieldName);
              const hasTransform = mapping.transform && mapping.transform.type !== 'none';
              const multiSource = (mapping.sources?.length || 0) > 1;

              return (
                <div
                  key={mapping.id || idx}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-50 border border-slate-100"
                >
                  <span className="text-purple-600 font-mono truncate max-w-[70px]" title={sourceName}>
                    {sourceName}
                  </span>
                  {multiSource && (
                    <span className="text-[9px] text-purple-400">+{(mapping.sources?.length || 1) - 1}</span>
                  )}
                  {hasTransform && (
                    <Wand2 size={10} className="text-amber-500 flex-shrink-0" />
                  )}
                  <ArrowRight size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="text-blue-600 font-mono truncate max-w-[70px]" title={targetName}>
                    {targetName}
                  </span>
                </div>
              );
            })}
            {hasMore && (
              <div className="text-[10px] text-slate-400 text-center">
                +{mappingCount - 4}개 더...
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
      >
        <div
          className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
      </Handle>
    </div>
  );
});

MappingNode.displayName = 'MappingNode';
