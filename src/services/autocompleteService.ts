import { AutocompleteDataResponse } from '../types/autocomplete';
import { MOCK_AUTOCOMPLETE_DATA } from '../data/autocomplete-mock';

// API 설정
const USE_MOCK = false;
const API_BASE_URL = 'http://10.254.241.251:3001/mock/api/autocomplete';

/**
 * 서버에서 자동완성 데이터 조회
 */
export async function fetchAutocompleteData(): Promise<AutocompleteDataResponse> {
  if (USE_MOCK) {
    // Mock 모드: 약간의 지연 후 Mock 데이터 반환
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      ...MOCK_AUTOCOMPLETE_DATA,
      lastUpdated: Date.now(),
    };
  }

  // 실제 API 연동 (나중에 주석 해제)
  const response = await fetch(`${API_BASE_URL}/list`);
  if (!response.ok) {
    throw new Error('자동완성 데이터 조회 실패');
  }
  return response.json();
}

/**
 * 서버와 데이터 동기화
 */
export async function syncAutocompleteData(): Promise<AutocompleteDataResponse> {
  if (USE_MOCK) {
    // Mock 모드: 약간의 지연 후 Mock 데이터 반환
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      ...MOCK_AUTOCOMPLETE_DATA,
      lastUpdated: Date.now(),
    };
  }

  // 실제 API 연동 (나중에 주석 해제)
  const response = await fetch(`${API_BASE_URL}/sync`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('자동완성 데이터 동기화 실패');
  }
  return response.json();
}
