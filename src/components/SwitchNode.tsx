import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { GitMerge, Plus, X } from 'lucide-react';

export const SwitchNode = memo(({ id, data, selected }: NodeProps) => {
  const cases: string[] = data.cases || ['Case 1', 'Case 2'];

  const updateCases = (newCases: string[]) => {
    data.onChange?.('cases', newCases);
  };

  const addCase = () => {
    updateCases([...cases, `Case ${cases.length + 1}`]);
  };

  const removeCase = (index: number) => {
    const newCases = [...cases];
    newCases.splice(index, 1);
    updateCases(newCases);
  };

  const updateCaseLabel = (index: number, val: string) => {
    const newCases = [...cases];
    newCases[index] = val;
    updateCases(newCases);
  };

  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[220px] transition-all overflow-visible ${
        selected ? 'border-[#5277f7] shadow-xl' : 'border-slate-300'
      }`}
    >
      {/* Top Handle (Input) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
        style={{ top: '-6px' }}
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-indigo-500 border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="bg-[#dce4fd] px-4 py-3 border-b border-[#cddbfd] flex items-center gap-2 rounded-t-[10px]">
        <div className="p-1.5 rounded-lg bg-white/60 text-indigo-600">
          <GitMerge size={16} />
        </div>
        <div>
          <div className="font-bold text-slate-800 text-sm">{id}</div>
          <div className="text-slate-400 text-[10px] font-mono">type: Switch</div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-b-[10px]">
        {data.description && (
          <div className="text-slate-500 text-xs mb-3 italic border-b border-slate-100 pb-2">
            {data.description}
          </div>
        )}

        <div className="mb-4">
          <label className="text-[10px] text-slate-500 font-bold mb-1 block">expression</label>
          <input 
            className="nodrag w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-[#5277f7] bg-slate-50 focus:bg-white transition-colors mb-3" 
            placeholder="e.g., status"
            defaultValue={data.expression || ''}
            onChange={(evt) => data.onChange?.('expression', evt.target.value)}
          />

          <div className="text-[10px] text-slate-500 font-bold mb-2">cases</div>
          <div className="flex flex-col gap-2">
            {cases.map((caseLabel, index) => (
              <div
                key={index}
                className="relative flex items-center justify-between bg-slate-50 rounded p-1.5 pr-3 border border-slate-100 group hover:border-blue-100 transition-colors"
              >
                <input
                  className="nodrag bg-transparent text-xs font-medium text-slate-700 focus:outline-none w-full mr-2"
                  value={caseLabel}
                  onChange={(e) => updateCaseLabel(index, e.target.value)}
                />
                <button
                  onClick={() => removeCase(index)}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`case-${index}`}
                  className="w-8 h-8 !bg-transparent border-none z-50 flex items-center justify-center absolute"
                  style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-indigo-500 border-2 border-white rounded-full pointer-events-none" />
                </Handle>
              </div>
            ))}
            <div className="relative flex items-center justify-between bg-slate-50 rounded p-1.5 pr-3 border border-slate-100 opacity-80">
              <span className="text-xs font-medium text-slate-500 italic px-1">Default</span>
              <Handle
                type="source"
                position={Position.Right}
                id="default"
                className="w-8 h-8 !bg-transparent border-none z-50 flex items-center justify-center absolute"
                style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-slate-400 border-2 border-white rounded-full pointer-events-none" />
              </Handle>
            </div>
          </div>
        </div>

        <button
          onClick={addCase}
          className="w-full flex items-center justify-center gap-1.5 h-[26px] bg-[#5277f7] text-white text-xs font-medium rounded-[4px] hover:bg-[#4162d9] transition-colors shadow-sm"
        >
          <Plus size={14} /> addCase
        </button>
      </div>

      {/* Bottom Handle (Next) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="next"
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
        style={{ bottom: '-6px' }}
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-indigo-500 border-2 border-white rounded-full pointer-events-none" />
      </Handle>
    </div>
  );
});

SwitchNode.displayName = 'SwitchNode';
