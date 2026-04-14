import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FilePlus, Copy, Edit2, ArrowUp, ArrowDown, Save } from 'lucide-react';

export interface IOField {
  id: string;
  englishName: string;
  koreanName: string;
  length: string;
  fieldType: string;
  ruleName: string;
  target: string;
  dataType: string;
  alignment: string;
  padding: string;
  defaultValue: string;
  required: boolean;
  encryption: string;
  masking: string;
  checked: boolean;
  name?: string;
  type?: string;
  // Record(Map) 타입을 위한 중첩 필드
  children?: IOField[];
  // RECORD 하위 필드 여부 (들여쓰기 표시용)
  isRecordChild?: boolean;
}

interface IOSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  initialInputs?: IOField[];
  initialOutputs?: IOField[];
  onSave: (inputs: IOField[], outputs: IOField[]) => void;
  readOnly?: boolean;
  outputReadOnly?: boolean;
  outputTitle?: string;
}

// Reusable Table Section defined OUTSIDE the main component
const IOSection = ({
    title,
    data,
    isExpanded,
    onToggleExpand,
    onAdd,
    onDelete,
    onDeleteAll,
    onCopy,
    onUpdate,
    onCheck,
    onCheckAll,
    readOnly
  }: {
    title: string;
    data: IOField[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onAdd: () => void;
    onDelete: () => void;
    onDeleteAll: () => void;
    onCopy?: () => void;
    onUpdate: (data: IOField[]) => void;
    onCheck: (id: string) => void;
    onCheckAll: (checked: boolean) => void;
    readOnly?: boolean;
  }) => {
    return (
      <div className="flex flex-col border-b border-slate-200 last:border-0 h-1/2 min-h-0">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onToggleExpand} className="text-[#5277f7] hover:bg-blue-50 rounded p-0.5 transition-colors">
                <span className="font-bold text-sm">●</span>
            </button>
            <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          </div>
          
        </div>

        {/* Grid Area */}
        {isExpanded && (
            <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-[#e9ecef] sticky top-0 z-10 text-[11px] text-slate-600 font-semibold">
                        <tr>
                            <th className="py-1 px-2 border border-slate-300 text-center w-8">
                                <input
                                    type="checkbox"
                                    className="translate-y-0.5"
                                    checked={data.length > 0 && data.every(d => d.checked)}
                                    onChange={(e) => !readOnly && onCheckAll(e.target.checked)}
                                    disabled={readOnly}
                                />
                            </th>
                            <th className="py-1 px-2 border border-slate-300 text-center w-8"><Edit2 size={10} className="mx-auto" /></th>
                            <th className="py-1 px-2 border border-slate-300 w-32 bg-slate-200/50">영문명</th>
                            <th className="py-1 px-2 border border-slate-300 w-32 bg-slate-200/50">한글명</th>
                            <th className="py-1 px-2 border border-slate-300 w-16">길이</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">필드타입</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">룰명</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">타겟</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">데이터타입</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">정렬방식</th>
                            <th className="py-1 px-2 border border-slate-300 w-16">패딩</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">기본값</th>
                            <th className="py-1 px-2 border border-slate-300 w-16">필수여부</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">암호화방식</th>
                            <th className="py-1 px-2 border border-slate-300 w-24">마스킹</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id} className="hover:bg-blue-50 border-b border-slate-200 text-[11px] text-slate-700">
                                <td className="py-1 px-2 border border-slate-200 text-center bg-white">
                                    <input
                                        type="checkbox"
                                        className="translate-y-0.5"
                                        checked={row.checked}
                                        onChange={() => !readOnly && onCheck(row.id)}
                                        disabled={readOnly}
                                    />
                                </td>
                                <td className="py-1 px-2 border border-slate-200 text-center bg-white cursor-pointer hover:text-blue-500">
                                    <Edit2 size={10} className="mx-auto" />
                                </td>
                                <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                                    <input 
                                        className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500" 
                                        value={row.englishName} 
                                        onChange={(e) => {
                                            const newData = data.map(r => r.id === row.id ? { ...r, englishName: e.target.value } : r);
                                            onUpdate(newData);
                                        }} 
                                    />
                                </td>
                                <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                                    <input 
                                        className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500" 
                                        value={row.koreanName} 
                                        onChange={(e) => {
                                            const newData = data.map(r => r.id === row.id ? { ...r, koreanName: e.target.value } : r);
                                            onUpdate(newData);
                                        }} 
                                    />
                                </td>
                                <td className="py-1 px-2 border border-slate-200 bg-white text-right">{row.length}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.fieldType}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.ruleName}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.target}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.dataType}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.alignment}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.padding}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.defaultValue}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white text-center">
                                    <input type="checkbox" checked={row.required} readOnly />
                                </td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.encryption}</td>
                                <td className="py-1 px-2 border border-slate-200 bg-white">{row.masking}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                             <tr>
                                <td colSpan={15} className="py-20 text-center text-slate-300 text-xs">
                                    데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    );
};

export const IOSettingModal = ({ isOpen, onClose, nodeId, initialInputs = [], initialOutputs = [], onSave, readOnly = false, outputReadOnly = false, outputTitle }: IOSettingModalProps) => {
  // Mock State for Inputs and Outputs
  const [inputs, setInputs] = useState<IOField[]>([]);
  const [outputs, setOutputs] = useState<IOField[]>([]);
  
  const [isInputExpanded, setIsInputExpanded] = useState(true);
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      // 초기 데이터가 없으면 빈 배열 사용 (테스트 데이터 생성 안함)
      setInputs(initialInputs ? [...initialInputs] : []);
      setOutputs(initialOutputs ? [...initialOutputs] : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, nodeId]);

  const handleSave = () => {
    // Map internal fields to match what IOPanel might expect if needed
    // For now we just save the full IOField objects
    // Ensure 'name' and 'type' are populated for IOPanel compatibility if they aren't already
    const processedInputs = inputs.map(i => ({
        ...i,
        name: i.englishName || i.koreanName || 'Unnamed',
        type: i.fieldType || 'String'
    }));
    
    const processedOutputs = outputs.map(i => ({
        ...i,
        name: i.englishName || i.koreanName || 'Unnamed',
        type: i.fieldType || 'String'
    }));

    onSave(processedInputs, processedOutputs);
    onClose();
  };

  if (!isOpen) return null;

  // Helper to add a row
  const addRow = (type: 'input' | 'output') => {
    const newRow: IOField = {
      id: Math.random().toString(36).substr(2, 9),
      englishName: '',
      koreanName: '',
      length: '0',
      fieldType: 'String',
      ruleName: '',
      target: '',
      dataType: 'String',
      alignment: 'Left',
      padding: '',
      defaultValue: '',
      required: false,
      encryption: 'None',
      masking: 'None',
      checked: false,
    };

    if (type === 'input') setInputs([...inputs, newRow]);
    else setOutputs([...outputs, newRow]);
  };

  const deleteRow = (type: 'input' | 'output') => {
    if (type === 'input') setInputs(inputs.filter(row => !row.checked));
    else setOutputs(outputs.filter(row => !row.checked));
  }

  const deleteAll = (type: 'input' | 'output') => {
      if (type === 'input') setInputs([]);
      else setOutputs([]);
  }

  const toggleCheck = (type: 'input' | 'output', id: string) => {
      const list = type === 'input' ? inputs : outputs;
      const setter = type === 'input' ? setInputs : setOutputs;
      setter(list.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }

  const toggleAllCheck = (type: 'input' | 'output', checked: boolean) => {
    const list = type === 'input' ? inputs : outputs;
    const setter = type === 'input' ? setInputs : setOutputs;
    setter(list.map(item => ({ ...item, checked })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            입출력 설정 - 노드 {nodeId}
          </h2>
          <div className="flex items-center gap-2">
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1 transition-colors"
            >
                <X size={16} />
            </button>
          </div>
        </div>
        
        {/* Content - Vertical Split */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            <IOSection
                title="inputMessage"
                data={inputs}
                isExpanded={isInputExpanded}
                onToggleExpand={() => setIsInputExpanded(!isInputExpanded)}
                onAdd={() => addRow('input')}
                onDelete={() => deleteRow('input')}
                onDeleteAll={() => deleteAll('input')}
                onUpdate={(data) => setInputs(data)}
                onCheck={(id) => toggleCheck('input', id)}
                onCheckAll={(checked) => toggleAllCheck('input', checked)}
                readOnly={readOnly}
            />
            <IOSection
                title={outputTitle || "outputMessage"}
                data={outputs}
                isExpanded={isOutputExpanded}
                onToggleExpand={() => setIsOutputExpanded(!isOutputExpanded)}
                onAdd={() => addRow('output')}
                onDelete={() => deleteRow('output')}
                onDeleteAll={() => deleteAll('output')}
                onCopy={() => {
                    setOutputs([...outputs, ...inputs.map(i => ({...i, id: Math.random().toString(36).substr(2, 9)}))]);
                }}
                onUpdate={(data) => setOutputs(data)}
                onCheck={(id) => toggleCheck('output', id)}
                onCheckAll={(checked) => toggleAllCheck('output', checked)}
                readOnly={readOnly || outputReadOnly}
            />
        </div>
      </div>
    </div>
  );
};