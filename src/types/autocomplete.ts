// 자동완성 카테고리 타입
export type AutocompleteCategory =
  | 'keyword'      // Java 예약어 (if, else, for, while 등)
  | 'dataType'     // 데이터 타입 (int, String, boolean 등)
  | 'method'       // 메서드 (System.out.println, Math.max 등)
  | 'snippet'      // 코드 스니펫 (try-catch 블록 등)
  | 'custom';      // 사용자 정의

// 개별 자동완성 항목
export interface AutocompleteItem {
  id: string;                         // 고유 식별자
  keyword: string;                    // 자동완성 키워드
  category: AutocompleteCategory;     // 카테고리
  description?: string;               // 설명 (툴팁용)
  syntax?: string;                    // 문법 예시
}

// 서버 응답 전체 구조
export interface AutocompleteDataResponse {
  version: string;                    // 데이터 버전
  lastUpdated: number;                // 마지막 업데이트 timestamp
  items: AutocompleteItem[];          // 자동완성 항목 목록
}
