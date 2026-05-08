const API_BASE_URL = '/plugins/jexq_biz';

export interface MapFunction {
  code: string;
  name: string;
}

export interface FunctionField {
  id: string;
  text: string;
  type:
    | 'FIELD' | 'TEXT' | 'PASSWORD' | 'RADIO' | 'CHECK' | 'LIST' | 'SPLIT' | 'DESCRIPTION'
    | 'Object' | 'Double' | 'Float' | 'Integer' | 'VALUE';
  defaultValue?: string;
  listValue?: string;
}

export interface FunctionDetail {
  serviceType: string;
  fields: FunctionField[];
}

/**
 * MAP 함수 목록 조회
 */
export async function fetchMapFunctions(): Promise<MapFunction[]> {
  const response = await fetch(`${API_BASE_URL}/flow_func_r001.jct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ FUNC_TP: 'MAP' }),
  });
  if (!response.ok) {
    throw new Error('MAP 함수 목록 조회 실패');
  }
  const data = await response.json();
  return (data.types || []).map((t: any) => ({ code: t.code, name: t.name }));
}

/**
 * 함수 필드 상세 조회
 */
export async function fetchFunctionFields(funcId: string): Promise<FunctionDetail> {
  const response = await fetch(`${API_BASE_URL}/flow_func_r002.jct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ FUNC_ID: funcId }),
  });
  if (!response.ok) {
    throw new Error('함수 필드 조회 실패');
  }
  const data = await response.json();
  const fields: FunctionField[] = (data.fields || []).map((f: any) => ({
    id: f.id || '',
    text: f.text || f.id || '',
    type: f.type || 'TEXT',
    defaultValue: f.defaultValue || '',
    listValue: f.listValue || '',
  }));
  return { serviceType: data.serviceType || funcId, fields };
}
