import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { JEXQ_BIZ_BASE } from '../utils/contextPath';

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
  // 직접 입력 모드: 사용자가 에러 메시지 텍스트를 직접 입력 (JSON은 description 재활용, code/codeName 비움)
  onDirectInput?: (message: string) => void;
  initialDirectMessage?: string;
}

export const CodeSelectionModal = ({ isOpen, onClose, onSelect, onDirectInput, initialDirectMessage = '' }: CodeSelectionModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [errorCodes, setErrorCodes] = useState<ErrorCodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'code' | 'direct'>('code');
  const [directMessage, setDirectMessage] = useState('');

  // 모달 열릴 때: 기존에 직접 입력된 메시지가 있으면 직접 입력 탭으로 시작
  useEffect(() => {
    if (isOpen) {
      setDirectMessage(initialDirectMessage || '');
      setTab(initialDirectMessage ? 'direct' : 'code');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 모달 열릴 때 API 호출
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`${JEXQ_BIZ_BASE}/flow_code_r001.jct`, {
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
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-slate-200"
        style={onDirectInput && tab === 'direct' ? { width: 560, height: 380 } : { width: 1000, height: 700 }}
      >
        
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

        {/* Tabs: 코드 선택 / 직접 입력 */}
        {onDirectInput && (
          <div className="flex border-b border-slate-200 bg-white px-3 pt-2 gap-1">
            {([['code', '코드 선택'], ['direct', '직접 입력']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors ${
                  tab === key
                    ? 'bg-white text-[#5277f7] border-slate-200 -mb-px'
                    : 'bg-slate-50 text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 직접 입력 탭 */}
        {onDirectInput && tab === 'direct' ? (
          <div className="flex-1 flex flex-col p-4 gap-2.5 bg-white">
            <div className="text-xs text-slate-500">
              사용자에게 표시할 에러 메시지를 직접 입력하세요. (코드 선택 없이 이 메시지가 사용됩니다)
            </div>
            <textarea
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              placeholder="예: 계좌번호가 유효하지 않습니다."
              className="flex-1 w-full text-sm border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-[#5277f7] focus:ring-2 focus:ring-blue-100 resize-none text-slate-800"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                disabled={!directMessage.trim()}
                onClick={() => { onDirectInput(directMessage.trim()); onClose(); }}
                className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:bg-blue-200 disabled:cursor-not-allowed bg-[#5277f7] hover:bg-[#4064e0]"
              >
                저장
              </button>
            </div>
          </div>
        ) : (
        <>
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
        </>
        )}
      </div>
    </div>
  );
};
