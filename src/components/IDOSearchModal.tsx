import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { fetchComponents, fetchTargetServers } from '../services/componentService';
import type { TargetServer } from '../services/componentService';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  SelectionChangedEvent,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionOptions,
  RowDoubleClickedEvent
} from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

export interface ComponentItem {
  id: string;
  type: 'IDO' | 'IMO';
  package: string;
  packagePath: string;
  componentId: string;
  name: string;
  className: string;
  modifier: string;
  modifiedDate: string;
  svrId?: string;
}

interface IDOSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ComponentItem) => void;
  currentNodeLabel?: string;
}

export const IDOSearchModal = ({ isOpen, onClose, onSelect, currentNodeLabel }: IDOSearchModalProps) => {
  // Search Filters
  const [filterType, setFilterType] = useState<string>('IDO');
  const [filterServer, setFilterServer] = useState<string>('');
  const [filterId, setFilterId] = useState('');
  const [filterName, setFilterName] = useState('');

  // Server list
  const [serverList, setServerList] = useState<TargetServer[]>([]);

  // Data & loading state
  const [rowData, setRowData] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(false);

  // AG Grid State
  const gridRef = useRef<AgGridReact<ComponentItem>>(null);
  const [selectedItems, setSelectedItems] = useState<ComponentItem[]>([]);

  // Column Definitions
  const [columnDefs] = useState<ColDef<ComponentItem>[]>([
    { field: 'type', headerName: '타입', width: 90 },
    { field: 'componentId', headerName: '컴포넌트 ID', flex: 1, minWidth: 200 },
    { field: 'name', headerName: '컴포넌트명', width: 200 },
    {
      field: 'modifiedDate',
      headerName: '수정일시',
      width: 160,
      valueFormatter: (params: any) => {
        const v = params.value;
        if (!v || v.length < 14) return v || '';
        return v.substring(0, 4) + '-' + v.substring(4, 6) + '-' + v.substring(6, 8) + ' ' +
          v.substring(8, 10) + ':' + v.substring(10, 12) + ':' + v.substring(12, 14);
      }
    },
    { field: 'modifier', headerName: '수정자', width: 120 },
  ]);

  // Row Selection Configuration - 단일 선택 (라디오 버튼)
  const rowSelection: RowSelectionOptions = {
    mode: 'singleRow',
    checkboxes: true,
    headerCheckbox: false,
  };

  // 타입 변경 시 서버 목록 로드
  const loadServerList = useCallback(async (comTp: string) => {
    try {
      const servers = await fetchTargetServers(comTp);
      setServerList(servers);
      setFilterServer(servers.length > 0 ? servers[0].SVR_ID : '');
    } catch (e) {
      setServerList([]);
      setFilterServer('');
    }
  }, []);

  // API 호출로 컴포넌트 목록 조회
  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (filterType) filters.COM_TP = filterType;
      if (filterId) filters.COM_ID = filterId;
      if (filterName) filters.COM_NM = filterName;
      if (filterServer) filters.SVR_ID = filterServer;

      const items = await fetchComponents(filters);
      setRowData(items);
    } catch (e) {
      console.error('Failed to fetch components:', e);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterId, filterName, filterServer]);

  // 모달 열릴 때 상태 초기화 + 목록 로드
  useEffect(() => {
    if (isOpen) {
      setSelectedItems([]);
      setFilterType('IDO');
      setFilterId('');
      setFilterName('');
      setFilterServer('');
      if (gridRef.current?.api) {
        gridRef.current.api.deselectAll();
      }
      // 서버 목록 로드 + 기본값(IDO)으로 조회
      (async () => {
        const servers = await fetchTargetServers('IDO');
        setServerList(servers);
        setFilterServer(servers.length > 0 ? servers[0].SVR_ID : '');
        setLoading(true);
        try {
          const items = await fetchComponents({ COM_TP: 'IDO' });
          setRowData(items);
        } catch (e) {
          console.error('Failed to fetch components:', e);
          setRowData([]);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen]);

  const handleSearch = () => {
    loadComponents();
  };

  const handleReset = () => {
    setFilterType('IDO');
    setFilterId('');
    setFilterName('');
    setFilterServer(serverList.length > 0 ? serverList[0].SVR_ID : '');
    setSelectedItems([]);
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.deselectAll();
    }
    loadServerList('IDO');
  };

  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selectedRows = event.api.getSelectedRows();
    setSelectedItems(selectedRows);
  }, []);

  const handleApplyAndClose = () => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems[0]);
      onClose();
    }
  };

  const handleDoubleClicked = (event: RowDoubleClickedEvent<ComponentItem>) => {
    if (event.data) {
      onSelect(event.data);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#dce4fd] border-b border-[#cddbfd]">
          <h2 className="text-lg font-bold text-[#5277f7]">컴포넌트 검색</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Filter Section */}
        <div className="p-4 bg-[#f8f9fa] border-b border-slate-200">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {/* Row 1 */}
            <div className="flex items-center">
              <label className="w-24 text-sm font-medium text-slate-600 shrink-0">타입</label>
              <select
                className="flex-1 h-8 px-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#5277f7]"
                value={filterType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterType(val);
                  loadServerList(val);
                }}
              >
                <option value="IDO">IDO</option>
                <option value="IMO">IMO</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="w-24 text-sm font-medium text-slate-600 shrink-0">서버</label>
              <select
                className="flex-1 h-8 px-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#5277f7]"
                value={filterServer}
                onChange={(e) => setFilterServer(e.target.value)}
              >
                {serverList.map((s) => (
                  <option key={s.SVR_ID} value={s.SVR_ID}>{s.SVR_NM}</option>
                ))}
              </select>
            </div>

            {/* Row 2 */}
            <div className="flex items-center">
              <label className="w-24 text-sm font-medium text-slate-600 shrink-0">컴포넌트 ID</label>
              <input
                className="flex-1 h-8 px-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#5277f7]"
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center">
              <label className="w-24 text-sm font-medium text-slate-600 shrink-0">컴포넌트명</label>
              <input
                className="flex-1 h-8 px-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#5277f7]"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="h-[26px] px-6 inline-flex items-center justify-center bg-[#5277f7] text-white text-sm rounded-[4px] hover:bg-[#4162d9] font-medium shadow-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#5277f7]/40 transition-colors"
            >
              검색
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 flex justify-end gap-2 border-b border-slate-200 bg-white">
          <button
            onClick={handleApplyAndClose}
            disabled={selectedItems.length === 0}
            className="h-[26px] px-4 bg-[#1e293b] text-white text-xs rounded-[4px] hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            적용 및 닫기
          </button>
        </div>

        {/* AG Grid Section */}
        <div className="flex-1 p-4 bg-slate-50 flex flex-col min-h-0">
          <div className="flex-1 w-full shadow-sm border border-slate-300">
             {/* Custom Styles for AG Grid Integration */}
             <style>
              {`
                /* Override AG Grid Theme Variables for Consistency */
                .ag-theme-quartz, .ag-theme-alpine {
                  --ag-selected-row-background-color: #eff6ff !important;
                  --ag-checkbox-checked-color: #5277f7 !important;
                  --ag-header-background-color: #f1f5f9 !important;
                  --ag-header-foreground-color: #475569 !important;
                  --ag-row-hover-color: #f8fafc !important;
                  --ag-font-size: 13px !important;
                  --ag-font-family: inherit !important;
                }
                .ag-header-cell-label {
                  font-weight: 600 !important;
                }
              `}
             </style>
             <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                rowSelection={rowSelection}
                onSelectionChanged={onSelectionChanged}
                onRowDoubleClicked={handleDoubleClicked}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
             />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#dce4fd] border-t border-[#cddbfd] text-xs font-medium text-[#5277f7] flex justify-between items-center">
           <div>총 <span className="font-bold">{rowData.length}</span>개 항목 / 선택됨 <span className="font-bold">{selectedItems.length}</span>개</div>
        </div>
      </div>
    </div>
  );
};
