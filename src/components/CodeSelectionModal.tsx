import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export interface ErrorCodeItem {
  id: string;
  majorCode: string;
  minorCode: string;
  name: string;
  description: string;
}

interface CodeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ErrorCodeItem) => void;
}

export const CodeSelectionModal = ({ isOpen, onClose, onSelect }: CodeSelectionModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [errorCodes, setErrorCodes] = useState<ErrorCodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 모달 열릴 때 API 호출
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/plugins/jexq_biz/flow_code_r001.jct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ LANG_CD: 'ko' }),
      })
        .then((res) => res.json())
        .then((data) => {
          const list = (data.CODE_LIST || []).map((item: any, idx: number) => ({
            id: String(idx + 1),
            majorCode: item.majorCode || '',
            minorCode: item.minorCode || '',
            name: item.name || '',
            description: item.desc || '',
          }));
          setErrorCodes(list);
        })
        .catch(() => setErrorCodes([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const filteredData = errorCodes.filter(
    (item) =>
      item.minorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-lg shadow-xl w-[1000px] h-[700px] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#dce4fd] border-b border-[#cddbfd]">
          <h2 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
            에러 코드 선택
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-white">
            <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="검색 (코드, 명칭)..."
                    className="w-full h-8 pl-8 pr-3 text-xs border border-slate-200 rounded hover:border-slate-300 focus:outline-none focus:border-[#5277f7] transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Content (Table) */}
        <div className="flex-1 overflow-auto bg-slate-50/30">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 text-[11px] font-semibold text-slate-600 border-b border-slate-200 w-24">코드</th>
                <th className="py-2 px-3 text-[11px] font-semibold text-slate-600 border-b border-slate-200">명칭</th>
                <th className="py-2 px-3 text-[11px] font-semibold text-slate-600 border-b border-slate-200 w-16 text-center">선택</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="bg-white hover:bg-blue-50/50 border-b border-slate-100 group transition-colors cursor-pointer"
                    onDoubleClick={() => { onSelect(item); onClose(); }}
                  >
                    <td className="py-2 px-3 text-xs text-slate-600 font-mono whitespace-nowrap">{item.minorCode}</td>
                    <td className="py-2 px-3 text-xs text-slate-700 font-medium truncate max-w-0">{item.name}</td>
                    <td className="py-2 px-3 text-center">
                        <button
                            onClick={() => onSelect(item)}
                            className="h-6 px-2 text-[10px] bg-white border border-slate-200 text-slate-600 rounded hover:bg-[#5277f7] hover:text-white hover:border-[#5277f7] transition-all shadow-sm"
                        >
                            선택
                        </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                        검색 결과가 없습니다.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
            <span>총 {filteredData.length}건</span>
            <span>더블클릭하여 빠른 선택 가능</span>
        </div>
      </div>
    </div>
  );
};
