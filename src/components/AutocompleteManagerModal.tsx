import React, { useState, useEffect, useCallback } from 'react';
import { X, Code, RefreshCw, Search, Filter } from 'lucide-react';
import { AutocompleteItem, AutocompleteCategory } from '../types/autocomplete';
import { fetchAutocompleteData, syncAutocompleteData } from '../services/autocompleteService';

interface AutocompleteManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdate: (items: AutocompleteItem[]) => void;
}

const CATEGORY_LABELS: Record<AutocompleteCategory, string> = {
  keyword: 'keyword',
  dataType: 'dataType',
  method: 'method',
  snippet: 'snippet',
  custom: 'custom',
};

const CATEGORY_COLORS: Record<AutocompleteCategory, string> = {
  keyword: 'bg-blue-100 text-blue-700',
  dataType: 'bg-purple-100 text-purple-700',
  method: 'bg-green-100 text-green-700',
  snippet: 'bg-amber-100 text-amber-700',
  custom: 'bg-slate-100 text-slate-700',
};

export const AutocompleteManagerModal = ({
  isOpen,
  onClose,
  onDataUpdate,
}: AutocompleteManagerModalProps) => {
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AutocompleteItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchAutocompleteData();
      setItems(response.items);
      setLastSyncTime(response.lastUpdated);
      onDataUpdate(response.items);
    } catch (err) {
      setError('데이터 로드 실패');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onDataUpdate]);

  // 동기화
  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await syncAutocompleteData();
      setItems(response.items);
      setLastSyncTime(response.lastUpdated);
      onDataUpdate(response.items);
    } catch (err) {
      setError('동기화 실패');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 모달 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // 필터링
  useEffect(() => {
    let result = items;

    // 카테고리 필터
    if (filterCategory !== 'ALL') {
      result = result.filter(item => item.category === filterCategory);
    }

    // 검색어 필터
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        item =>
          item.keyword.toLowerCase().includes(keyword) ||
          item.description?.toLowerCase().includes(keyword)
      );
    }

    setFilteredItems(result);
  }, [items, filterCategory, searchKeyword]);

  // 마지막 동기화 시간 포맷
  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[80vh] overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#cddbfd] bg-[#dce4fd] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/60 rounded-xl">
              <Code size={22} className="text-[#5277f7]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">자동완성 관리</h2>
              <p className="text-xs text-slate-500 mt-0.5">서버에서 가져온 자동완성 데이터를 확인합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Section */}
        <div className="flex items-center gap-4 px-6 py-3 bg-[#f6f7fa] border-b border-slate-200 shrink-0">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5277f7]"
            >
              <option value="ALL">전체 카테고리</option>
              <option value="keyword">keyword</option>
              <option value="dataType">dataType</option>
              <option value="method">method</option>
              <option value="snippet">snippet</option>
              <option value="custom">custom</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="키워드 검색..."
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5277f7]"
            />
          </div>

          {/* Action Buttons */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#5277f7] rounded-lg hover:bg-[#4166d9] disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            서버 동기화
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-xs text-slate-500">
                <th className="px-6 py-3 font-semibold w-28">category</th>
                <th className="px-6 py-3 font-semibold w-48">keyword</th>
                <th className="px-6 py-3 font-semibold">description</th>
                <th className="px-6 py-3 font-semibold">syntax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    데이터 로딩 중...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-sm font-mono text-slate-800">{item.keyword}</code>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {item.description || '-'}
                    </td>
                    <td className="px-6 py-3">
                      {item.syntax ? (
                        <code className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {item.syntax}
                        </code>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="text-xs text-slate-500">
            마지막 동기화: {formatLastSync(lastSyncTime)} · 총 {filteredItems.length}개 항목
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
