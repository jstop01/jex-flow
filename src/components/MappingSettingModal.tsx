import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FilePlus, Edit2, ArrowUp, ArrowDown, Save } from 'lucide-react';

export interface MappingField {
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
}

interface MappingSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  mappingType: 'input' | 'output';
  initialData?: MappingField[];
  onSave: (data: MappingField[], mappingType: 'input' | 'output') => void;
}

export const MappingSettingModal = ({
  isOpen,
  onClose,
  nodeId,
  mappingType,
  initialData,
  onSave,
}: MappingSettingModalProps) => {
  const [data, setData] = useState<MappingField[]>([]);

  // Only reset data when modal opens (isOpen changes from false to true)
  useEffect(() => {
    if (isOpen) {
      setData(Array.isArray(initialData) ? [...initialData] : []);
    }
  }, [isOpen, nodeId, mappingType]);

  const handleSave = () => {
    onSave(data, mappingType);
    onClose();
  };

  if (!isOpen) return null;

  const addRow = () => {
    const newRow: MappingField = {
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
    setData([...data, newRow]);
  };

  const deleteRow = () => {
    setData(data.filter((row) => !row.checked));
  };

  const deleteAll = () => {
    setData([]);
  };

  const toggleCheck = (id: string) => {
    setData(data.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const toggleAllCheck = (checked: boolean) => {
    setData(data.map((item) => ({ ...item, checked })));
  };

  const title = mappingType === 'input' ? 'inputMapping' : 'outputMapping';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-slate-200"
        style={{ width: '90vw', height: '80vh', minHeight: '80vh', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#dce4fd] border-b border-[#cddbfd] shrink-0">
          <h2 className="text-lg font-bold text-[#1e293b] flex items-center gap-2">
            {title} - Node {nodeId}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#5277f7] hover:bg-[#4162d9] rounded shadow-sm transition-colors"
            >
              <Save size={14} />
              저장 (Save)
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-700">{title}</span>
            <div className="flex gap-1 ml-2">
              <button className="p-1 hover:bg-slate-200 rounded text-slate-500 border border-slate-300 bg-white shadow-sm">
                <ArrowUp size={12} />
              </button>
              <button className="p-1 hover:bg-slate-200 rounded text-slate-500 border border-slate-300 bg-white shadow-sm">
                <ArrowDown size={12} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 shadow-sm">
              <FilePlus size={12} />
              파일추가
            </button>
            <button
              onClick={addRow}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 shadow-sm"
            >
              <Plus size={12} />
              추가
            </button>
            <button
              onClick={deleteRow}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[#e03131] border border-[#c92a2a] rounded text-white hover:bg-[#c92a2a] shadow-sm"
            >
              <Trash2 size={12} />
              삭제
            </button>
            <button
              onClick={deleteAll}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[#e03131] border border-[#c92a2a] rounded text-white hover:bg-[#c92a2a] shadow-sm"
            >
              전체삭제
            </button>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-auto bg-white min-h-0">
          <table className="w-full text-left border-collapse min-w-[1200px] table-fixed">
            <thead className="bg-[#e9ecef] sticky top-0 z-10 text-[11px] text-slate-600 font-semibold">
              <tr>
                <th className="py-1 px-2 border border-slate-300 text-center w-8">
                  <input
                    type="checkbox"
                    className="translate-y-0.5"
                    checked={data.length > 0 && data.every((d) => d.checked)}
                    onChange={(e) => toggleAllCheck(e.target.checked)}
                  />
                </th>
                <th className="py-1 px-2 border border-slate-300 text-center w-8">
                  <Edit2 size={10} className="mx-auto" />
                </th>
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
                      onChange={() => toggleCheck(row.id)}
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
                        const newData = data.map((r) =>
                          r.id === row.id ? { ...r, englishName: e.target.value } : r
                        );
                        setData(newData);
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <input
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.koreanName}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, koreanName: e.target.value } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <input
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500 text-right"
                      value={row.length}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, length: e.target.value } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <select
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.fieldType}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, fieldType: e.target.value } : r
                        ));
                      }}
                    >
                      <option value="String">String</option>
                      <option value="Integer">Integer</option>
                      <option value="Long">Long</option>
                      <option value="Double">Double</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Record">Record</option>
                    </select>
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <input
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.ruleName}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, ruleName: e.target.value } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <input
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.target}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, target: e.target.value } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <select
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.dataType}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, dataType: e.target.value } : r
                        ));
                      }}
                    >
                      <option value="String">String</option>
                      <option value="X">X</option>
                      <option value="N">N</option>
                    </select>
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <select
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.alignment}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, alignment: e.target.value } : r
                        ));
                      }}
                    >
                      <option value="Left">Left</option>
                      <option value="Right">Right</option>
                      <option value="Center">Center</option>
                    </select>
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <input
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.padding}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, padding: e.target.value } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <input
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.defaultValue}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, defaultValue: e.target.value } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white text-center">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, required: e.target.checked } : r
                        ));
                      }}
                    />
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <select
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.encryption}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, encryption: e.target.value } : r
                        ));
                      }}
                    >
                      <option value="None">None</option>
                      <option value="AES">AES</option>
                      <option value="RSA">RSA</option>
                    </select>
                  </td>
                  <td className="py-1 px-2 border border-slate-200 bg-white p-0">
                    <select
                      className="w-full h-full px-1 border-none outline-none bg-transparent focus:ring-1 focus:ring-inset focus:ring-blue-500"
                      value={row.masking}
                      onChange={(e) => {
                        setData(data.map((r) =>
                          r.id === row.id ? { ...r, masking: e.target.value } : r
                        ));
                      }}
                    >
                      <option value="None">None</option>
                      <option value="N">N</option>
                      <option value="Y">Y</option>
                    </select>
                  </td>
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
      </div>
    </div>
  );
};
