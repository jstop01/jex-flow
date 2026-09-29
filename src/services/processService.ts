import { ServiceTypeDataResponse, ServiceTypeInputsResponse, InputField } from '../types/process';
import { MOCK_SERVICE_TYPE_DATA, MOCK_SERVICE_TYPE_INPUTS } from '../data/process-mock';
import { jctFetch } from '../utils/jctFetch';

const USE_MOCK = false;

/**
 * 서버에서 서비스 타입 목록 조회 (PRC 함수)
 */
export async function fetchServiceTypes(): Promise<ServiceTypeDataResponse> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      ...MOCK_SERVICE_TYPE_DATA,
      lastUpdated: Date.now(),
    };
  }

  return jctFetch('flow_func_r001', { FUNC_TP: 'PRC' });
}

/**
 * 서버와 서비스 타입 데이터 동기화
 */
export async function syncServiceTypes(): Promise<ServiceTypeDataResponse> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      ...MOCK_SERVICE_TYPE_DATA,
      lastUpdated: Date.now(),
    };
  }

  return jctFetch('flow_func_r001', { FUNC_TP: 'PRC' });
}

/**
 * 서비스 타입별 입력 필드 조회 (함수 상세 + 필드 목록)
 */
export async function fetchServiceTypeInputs(serviceType: string): Promise<ServiceTypeInputsResponse> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const mockData = MOCK_SERVICE_TYPE_INPUTS[serviceType];
    if (mockData) {
      return mockData;
    }
    return {
      serviceType,
      fields: [
        { id: 'description', text: '설명', type: 'TEXT', defaultValue: '' },
      ],
    };
  }

  const data = await jctFetch('flow_func_r002', { FUNC_ID: serviceType });

  // listValue가 JSON 문자열이면 파싱
  if (data.fields) {
    data.fields = data.fields.map((field: InputField) => {
      if (field.listValue && typeof field.listValue === 'string') {
        try {
          field.listValue = JSON.parse(field.listValue as string);
        } catch {
          // 파싱 실패 시 그대로 유지
        }
      }
      return field;
    });
  }

  return data;
}
