import React, { useState, useEffect } from 'react';
import { X, Save, Code, ChevronDown, CheckCircle2, Settings } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { AutocompleteItem } from '../types/autocomplete';

interface ScriptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodes: Node[]; // All nodes to reference their I/O
  edges: Edge[]; // All edges to determine upstream connections
  initialScriptType?: string;
  initialVariableName?: string;
  initialScriptContent?: string;
  initialVariables?: RegisteredVariable[]; // Previously registered variables
  onSave: (scriptType: string, variableName: string, scriptContent: string, variables: RegisteredVariable[]) => void;
  autocompleteData?: AutocompleteItem[]; // 서버에서 받아온 자동완성 데이터
  onOpenAutocompleteManager?: () => void; // 자동완성 관리 모달 열기
}

export interface RegisteredVariable {
  id: string;
  sourceType: string; // e.g., "node1.input" or "node2.output"
  sourceField: string; // Field name from the I/O
  variableName: string; // Variable name to use in script
  fieldType?: string; // Field type (String, Number, etc.)
}

const scriptTypeOptions = [
  { value: 'java', text: 'Java' },
  { value: 'groovy', text: 'Groovy' },
];

export const ScriptEditModal = ({
  isOpen,
  onClose,
  nodeId,
  nodes,
  edges,
  initialScriptType = 'java',
  initialVariableName = '',
  initialScriptContent = '',
  initialVariables = [],
  onSave,
  autocompleteData = [],
  onOpenAutocompleteManager,
}: ScriptEditModalProps) => {
  const [scriptType, setScriptType] = useState(initialScriptType);
  const [variableName, setVariableName] = useState(initialVariableName);
  const [scriptContent, setScriptContent] = useState(initialScriptContent);
  const [registeredVariables, setRegisteredVariables] = useState<RegisteredVariable[]>(initialVariables);
  
  // Script type dropdown state
  const [showScriptTypeDropdown, setShowScriptTypeDropdown] = useState(false);
  
  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false); // 검증 통과 여부
  
  // Autocomplete state
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(false); // 자동완성 ON/OFF
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Java keywords and common methods (fallback if no autocompleteData)
  const defaultKeywords = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
    'int', 'String', 'boolean', 'double', 'float', 'long', 'void',
    'public', 'private', 'static', 'final',
    'class', 'interface', 'new', 'this', 'super',
    'try', 'catch', 'finally', 'throw', 'throws',
    'System.out.println()', 'String.valueOf()', 'Integer.parseInt()',
    'null', 'true', 'false',
  ];

  // 서버 데이터가 있으면 사용, 없으면 기본값
  const javaKeywords = autocompleteData.length > 0
    ? autocompleteData.map(item => item.keyword)
    : defaultKeywords;

  useEffect(() => {
    if (isOpen) {
      setScriptType(initialScriptType || '');
      setVariableName(initialVariableName || '');
      setScriptContent(initialScriptContent || '');
      setRegisteredVariables(initialVariables || []);
      setValidationError(null);
      setIsValidated(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Validate Java script syntax via API
  const validateJavaScript = async (script: string): Promise<{ valid: boolean; error?: string }> => {
    // TODO: 임시적으로 무조건 true를 반환함. 실제 API 연동 시 아래 주석 해제 필요
    return { valid: true };

    /*
    try {
      const API_ENDPOINT = '/validate/java';

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          variables: registeredVacluariables, // 등록된 변수 정보도 함께 전송
        }),
      });

      // API 응답 형식: { valid: boolean, error?: string }
      const data = await response.json();

      if (data.valid === true) {
        return { valid: true };
      } else {
        return { valid: false, error: data.error || '문법 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Validation API error:', error);
      return { valid: false, error: 'API 서버와 통신할 수 없습니다.' };
    }
    */
  };

  const handleSave = () => {
    // 스크립트 타입 선택 여부 확인
    if (!scriptType) {
      alert('스크립트 타입을 선택해 주세요.');
      return;
    }
    // 검증 통과 여부 확인 (검증 통과한 경우만 저장 가능)
    if (!isValidated) {
      alert('문법을 검증해 주세요.');
      return;
    }
    onSave(scriptType, variableName, scriptContent, registeredVariables);
    onClose();
  };

  const handleTest = async () => {
    // 스크립트 내용이 비어있으면 에러
    if (!scriptContent.trim()) {
      alert('스크립트 내용을 입력해주세요.');
      return;
    }

    // 검증 시작
    setIsValidating(true);
    setValidationError(null);

    try {
      const result = await validateJavaScript(scriptContent);
      
      if (result.valid) {
        // 검증 성공
        setIsValidated(true);
        setValidationError(null);
        alert('✅ 문법 검증에 성공했습니다!');
      } else {
        // 검증 실패 - 에러 메시지 표시
        setIsValidated(false);
        setValidationError(result.error || '문법 오류가 발생했습니다.');
        alert('❌ 문법 검증에 실패했습니다.\n\n' + (result.error || '문법 오류가 발생했습니다.'));
      }
    } catch (error) {
      console.error('Validation error:', error);
      setIsValidated(false);
      setValidationError('검증 중 오류가 발생했습니다.');
      alert('❌ 검증 중 오류가 발생했습니다.');
    } finally {
      setIsValidating(false);
    }
  };

  const getScriptTypeText = (value: string) => {
    if (!value) return 'Script Type 선택';
    const option = scriptTypeOptions.find(opt => opt.value === value);
    return option?.text || value;
  };

  // Get current word at cursor position
  const getCurrentWord = (text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos);
    const afterCursor = text.slice(cursorPos);
    
    // Find word boundaries
    const wordBefore = beforeCursor.match(/[a-zA-Z_$.]*$/)?.[0] || '';
    const wordAfter = afterCursor.match(/^[a-zA-Z_$0-9]*/)?.[0] || '';
    
    return {
      word: wordBefore + wordAfter,
      prefix: wordBefore,
      start: cursorPos - wordBefore.length,
      end: cursorPos + wordAfter.length,
    };
  };

  // Handle script content change with autocomplete
  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    setScriptContent(newContent);
    setCursorPosition(newCursorPos);

    // 스크립트가 수정되면 검증 상태 리셋
    if (isValidated) {
      setIsValidated(false);
      setValidationError(null);
    }

    // 자동완성이 켜져있으면 타이핑 시 자동완성 표시
    if (autoCompleteEnabled) {
      const { prefix } = getCurrentWord(newContent, newCursorPos);

      if (prefix.length >= 1) {
        const variableNames = registeredVariables.map(v => v.variableName);
        const allSuggestions = [...javaKeywords, ...variableNames];

        const filtered = allSuggestions.filter(keyword =>
          keyword.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if (filtered.length > 0) {
          setAutocompleteOptions(filtered);
          setSelectedAutocompleteIndex(0);
          setShowAutocomplete(true);
        } else {
          setShowAutocomplete(false);
        }
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (suggestion: string) => {
    if (!textareaRef.current) return;

    const { start, end } = getCurrentWord(scriptContent, cursorPosition);
    const before = scriptContent.slice(0, start);
    const after = scriptContent.slice(end);
    const newContent = before + suggestion + after;
    
    setScriptContent(newContent);
    setShowAutocomplete(false);

    // Set cursor position after the inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + suggestion.length;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle keyboard events for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 자동완성이 열려있을 때만 키보드 네비게이션
    if (!showAutocomplete) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedAutocompleteIndex((prev: number) =>
        prev < autocompleteOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAutocompleteIndex((prev: number) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (autocompleteOptions.length > 0) {
        e.preventDefault();
        handleAutocompleteSelect(autocompleteOptions[selectedAutocompleteIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowAutocomplete(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col" style={{ width: '1000px', maxHeight: '95vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#cddbfd] bg-[#dce4fd]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/60 rounded-xl">
              <Code size={22} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">스크립트 편집기</h2>
              <p className="text-xs text-slate-500 mt-0.5">Java 스크립트를 작성하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Script Type Combobox */}
            <div className="relative">
              <button
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white/60 border border-slate-200 rounded-lg hover:bg-white/80 transition-colors ${
                  showScriptTypeDropdown ? 'border-[#5277f7] shadow-[0_0_0_2px_rgba(82,119,247,0.15)]' : ''
                }`}
                onClick={() => setShowScriptTypeDropdown(!showScriptTypeDropdown)}
              >
                <Code size={14} className="text-violet-600" />
                <span className="text-slate-700">{scriptTypeOptions.find(o => o.value === scriptType)?.text || 'Script Type'}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showScriptTypeDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showScriptTypeDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl z-20 border border-slate-200 py-1 min-w-[120px]">
                  {scriptTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        scriptType === option.value ? 'bg-[#eff4ff] text-[#5277f7] font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setScriptType(option.value);
                        setShowScriptTypeDropdown(false);
                      }}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {onOpenAutocompleteManager && (
              <button
                onClick={onOpenAutocompleteManager}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white/60 border border-slate-200 rounded-lg hover:bg-white/80 transition-colors"
                title="자동완성 관리"
              >
                <Settings size={14} />
                자동완성 관리
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg p-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - Script Editor */}
        <div className="flex-1 overflow-hidden flex relative">
          {/* Script Editor */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Script Content */}
            <div className="flex-1 flex flex-col h-full relative">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500 font-bold">javaScript</label>
                <label
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setAutoCompleteEnabled(!autoCompleteEnabled)}
                >
                  <span className="text-xs text-slate-500">자동완성</span>
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                      autoCompleteEnabled ? 'bg-[#5277f7] border-[#5277f7]' : 'bg-slate-200 border-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full transition-transform shadow-md ${
                        autoCompleteEnabled ? 'bg-white' : 'bg-[#5277f7]'
                      }`}
                      style={{ transform: autoCompleteEnabled ? 'translateX(22px)' : 'translateX(4px)' }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${autoCompleteEnabled ? 'text-[#5277f7]' : 'text-slate-400'}`}>
                    {autoCompleteEnabled ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
              <textarea
                className="flex-1 w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:outline-none focus:border-[#5277f7] focus:shadow-[0_0_0_3px_rgba(82,119,247,0.15)] bg-slate-50 focus:bg-white transition-all font-mono text-sm resize-none"
                placeholder="// Java 코드를 여기에 작성하세요...
// 등록된 변수를 사용하세요
// 예: String result = userId + userName;"
                rows={30}
                value={scriptContent}
                onChange={handleScriptChange}
                onKeyDown={handleKeyDown}
                ref={textareaRef}
                style={{ minHeight: '650px' }}
              />
              
              {/* Autocomplete Dropdown */}
              {showAutocomplete && (
                <div className="absolute left-6 mt-2 w-72 bg-white rounded-lg border-2 border-[#5277f7] shadow-2xl z-20 max-h-64 overflow-y-auto">
                  <div className="py-1">
                    {autocompleteOptions.map((option, index) => (
                      <button
                        key={option}
                        className={`w-full text-left px-4 py-2 text-sm font-mono transition-colors ${
                          index === selectedAutocompleteIndex 
                            ? 'bg-[#5277f7] text-white' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => handleAutocompleteSelect(option)}
                        onMouseEnter={() => setSelectedAutocompleteIndex(index)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                    ↑↓ 이동 • Enter/Tab 선택 • Esc 닫기
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/80">
          {/* Validation Error Message */}
          {validationError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-800 mb-1">문법 검증 실패</h4>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{validationError}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={isValidating}
            >
              취소
            </button>
            <button
              onClick={handleTest}
              disabled={isValidating || !scriptContent.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                isValidating || !scriptContent.trim()
                  ? 'bg-slate-400 cursor-not-allowed'
                  : isValidated
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {isValidating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  검증 중...
                </>
              ) : isValidated ? (
                <>
                  <CheckCircle2 size={16} />
                  검증 완료
                </>
              ) : (
                <>
                  <Code size={16} />
                  문법 테스트
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={isValidating}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                isValidating
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#5277f7] hover:bg-[#4162d9]'
              }`}
            >
              <Save size={16} />
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};