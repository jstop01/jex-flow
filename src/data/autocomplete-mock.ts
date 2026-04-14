import { AutocompleteDataResponse } from '../types/autocomplete';

export const MOCK_AUTOCOMPLETE_DATA: AutocompleteDataResponse = {
  version: '1.0.0',
  lastUpdated: Date.now(),
  items: [
    // Control flow (keyword)
    { id: 'kw-01', keyword: 'if', category: 'keyword', description: '조건문' },
    { id: 'kw-02', keyword: 'else', category: 'keyword', description: '조건문 분기' },
    { id: 'kw-03', keyword: 'else if', category: 'keyword', description: '추가 조건 분기' },
    { id: 'kw-04', keyword: 'for', category: 'keyword', description: '반복문' },
    { id: 'kw-05', keyword: 'while', category: 'keyword', description: 'while 반복문' },
    { id: 'kw-06', keyword: 'do', category: 'keyword', description: 'do-while 반복문' },
    { id: 'kw-07', keyword: 'switch', category: 'keyword', description: 'switch 문' },
    { id: 'kw-08', keyword: 'case', category: 'keyword', description: 'switch case' },
    { id: 'kw-09', keyword: 'break', category: 'keyword', description: '반복문/switch 종료' },
    { id: 'kw-10', keyword: 'continue', category: 'keyword', description: '다음 반복으로' },
    { id: 'kw-11', keyword: 'return', category: 'keyword', description: '값 반환' },

    // Data types (dataType)
    { id: 'dt-01', keyword: 'int', category: 'dataType', description: '정수 타입' },
    { id: 'dt-02', keyword: 'String', category: 'dataType', description: '문자열 타입' },
    { id: 'dt-03', keyword: 'boolean', category: 'dataType', description: '논리 타입' },
    { id: 'dt-04', keyword: 'double', category: 'dataType', description: '실수 타입 (64bit)' },
    { id: 'dt-05', keyword: 'float', category: 'dataType', description: '실수 타입 (32bit)' },
    { id: 'dt-06', keyword: 'long', category: 'dataType', description: '정수 타입 (64bit)' },
    { id: 'dt-07', keyword: 'short', category: 'dataType', description: '정수 타입 (16bit)' },
    { id: 'dt-08', keyword: 'byte', category: 'dataType', description: '정수 타입 (8bit)' },
    { id: 'dt-09', keyword: 'char', category: 'dataType', description: '문자 타입' },
    { id: 'dt-10', keyword: 'void', category: 'dataType', description: '반환값 없음' },

    // Modifiers (keyword)
    { id: 'kw-12', keyword: 'public', category: 'keyword', description: '접근 제어자 (공개)' },
    { id: 'kw-13', keyword: 'private', category: 'keyword', description: '접근 제어자 (비공개)' },
    { id: 'kw-14', keyword: 'protected', category: 'keyword', description: '접근 제어자 (상속)' },
    { id: 'kw-15', keyword: 'static', category: 'keyword', description: '정적 멤버' },
    { id: 'kw-16', keyword: 'final', category: 'keyword', description: '상수/불변' },
    { id: 'kw-17', keyword: 'abstract', category: 'keyword', description: '추상 클래스/메서드' },
    { id: 'kw-18', keyword: 'synchronized', category: 'keyword', description: '동기화' },

    // OOP (keyword)
    { id: 'kw-19', keyword: 'class', category: 'keyword', description: '클래스 정의' },
    { id: 'kw-20', keyword: 'interface', category: 'keyword', description: '인터페이스 정의' },
    { id: 'kw-21', keyword: 'extends', category: 'keyword', description: '클래스 상속' },
    { id: 'kw-22', keyword: 'implements', category: 'keyword', description: '인터페이스 구현' },
    { id: 'kw-23', keyword: 'new', category: 'keyword', description: '객체 생성' },
    { id: 'kw-24', keyword: 'this', category: 'keyword', description: '현재 객체 참조' },
    { id: 'kw-25', keyword: 'super', category: 'keyword', description: '부모 클래스 참조' },

    // Exception handling (keyword)
    { id: 'kw-26', keyword: 'try', category: 'keyword', description: '예외 처리 시작' },
    { id: 'kw-27', keyword: 'catch', category: 'keyword', description: '예외 처리' },
    { id: 'kw-28', keyword: 'finally', category: 'keyword', description: '항상 실행' },
    { id: 'kw-29', keyword: 'throw', category: 'keyword', description: '예외 발생' },
    { id: 'kw-30', keyword: 'throws', category: 'keyword', description: '예외 선언' },

    // Literals (keyword)
    { id: 'kw-31', keyword: 'null', category: 'keyword', description: 'null 참조' },
    { id: 'kw-32', keyword: 'true', category: 'keyword', description: '논리값 참' },
    { id: 'kw-33', keyword: 'false', category: 'keyword', description: '논리값 거짓' },

    // Common methods (method)
    { id: 'mt-01', keyword: 'System.out.println()', category: 'method', description: '콘솔 출력 (줄바꿈)', syntax: 'System.out.println(Object obj)' },
    { id: 'mt-02', keyword: 'System.out.print()', category: 'method', description: '콘솔 출력', syntax: 'System.out.print(Object obj)' },
    { id: 'mt-03', keyword: 'String.valueOf()', category: 'method', description: '문자열 변환', syntax: 'String.valueOf(Object obj)' },
    { id: 'mt-04', keyword: 'String.format()', category: 'method', description: '문자열 포맷', syntax: 'String.format(String format, Object... args)' },
    { id: 'mt-05', keyword: 'Integer.parseInt()', category: 'method', description: '문자열→정수 변환', syntax: 'Integer.parseInt(String s)' },
    { id: 'mt-06', keyword: 'Double.parseDouble()', category: 'method', description: '문자열→실수 변환', syntax: 'Double.parseDouble(String s)' },
    { id: 'mt-07', keyword: 'Math.random()', category: 'method', description: '난수 생성 (0.0~1.0)', syntax: 'Math.random()' },
    { id: 'mt-08', keyword: 'Math.max()', category: 'method', description: '최대값', syntax: 'Math.max(a, b)' },
    { id: 'mt-09', keyword: 'Math.min()', category: 'method', description: '최소값', syntax: 'Math.min(a, b)' },
    { id: 'mt-10', keyword: 'Math.abs()', category: 'method', description: '절대값', syntax: 'Math.abs(value)' },
    { id: 'mt-11', keyword: '.toString()', category: 'method', description: '문자열 변환', syntax: 'obj.toString()' },
    { id: 'mt-12', keyword: '.length()', category: 'method', description: '문자열 길이', syntax: 'str.length()' },
    { id: 'mt-13', keyword: '.equals()', category: 'method', description: '문자열 비교', syntax: 'str.equals(Object obj)' },
    { id: 'mt-14', keyword: '.substring()', category: 'method', description: '부분 문자열', syntax: 'str.substring(begin, end)' },
    { id: 'mt-15', keyword: '.indexOf()', category: 'method', description: '문자열 위치', syntax: 'str.indexOf(String s)' },
    { id: 'mt-16', keyword: '.split()', category: 'method', description: '문자열 분할', syntax: 'str.split(String regex)' },
    { id: 'mt-17', keyword: '.trim()', category: 'method', description: '공백 제거', syntax: 'str.trim()' },
    { id: 'mt-18', keyword: '.toLowerCase()', category: 'method', description: '소문자 변환', syntax: 'str.toLowerCase()' },
    { id: 'mt-19', keyword: '.toUpperCase()', category: 'method', description: '대문자 변환', syntax: 'str.toUpperCase()' },

    // Snippets (snippet)
    { id: 'sn-01', keyword: 'try-catch', category: 'snippet', description: '예외 처리 블록', syntax: 'try {\n  \n} catch (Exception e) {\n  \n}' },
    { id: 'sn-02', keyword: 'for-loop', category: 'snippet', description: 'for 반복문', syntax: 'for (int i = 0; i < n; i++) {\n  \n}' },
    { id: 'sn-03', keyword: 'if-else', category: 'snippet', description: '조건문', syntax: 'if (condition) {\n  \n} else {\n  \n}' },
  ],
};
