import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (jsonData: any) => void;
}

export const JsonImportModal = ({ isOpen, onClose, onImport }: JsonImportModalProps) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setJsonText('');
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        setError(null);
        setShowConfirm(true);
      } else {
        setError('형식 오류: nodes 또는 edges 배열이 없습니다.');
      }
    } catch (e) {
      setError('JSON 문법 오류');
    }
  };

  const handleConfirmImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onImport(parsed);
      onClose();
    } catch (e) {
      setError('가져오기 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {!showConfirm ? (
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-[#dce4fd] border-b border-[#cddbfd]">
            <h2 className="text-lg font-bold text-[#5277f7]">Flow JSON 가져오기</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-4 min-h-0 bg-[#f6f7fa]">
            <p className="text-sm text-slate-500">아래에 JSON 플로우 데이터를 붙여넣으세요.</p>
            <textarea 
              className="w-full h-64 p-3 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#5277f7] focus:border-transparent outline-none resize-none bg-white shadow-sm"
              placeholder='{ "nodes": [...], "edges": [...] }'
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
            />
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-1.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
            >
              취소
            </button>
            <button 
              onClick={handleVerify}
              disabled={!jsonText.trim()}
              className="flex items-center gap-2 h-[32px] px-4 rounded-[4px] bg-[#5277f7] text-white text-sm font-medium hover:bg-[#4162d9] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Upload size={16} /> 확인 및 가져오기
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
           {/* Confirmation Header */}
           <div className="flex items-center justify-between p-4 bg-[#dce4fd] border-b border-[#cddbfd]">
            <h2 className="text-lg font-bold text-[#5277f7]">가져오기 확인</h2>
            <button onClick={() => setShowConfirm(false)} className="text-slate-500 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 bg-white">
            <p className="text-slate-600 mb-6 text-sm">
              이 작업은 현재 캔버스 내용을 대체합니다. 나중에 실행 취소할 수 있습니다.
              <br/><br/>
              계속 진행하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-1.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                뒤로
              </button>
              <button 
                onClick={handleConfirmImport}
                className="h-[32px] px-4 rounded-[4px] bg-[#5277f7] text-white text-sm font-medium hover:bg-[#4162d9] transition-colors shadow-sm"
              >
                예, 가져오기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
