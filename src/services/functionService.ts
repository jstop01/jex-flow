import { jctFetch } from '../utils/jctFetch';

export interface MapFunction {
  code: string;
  name: string;
}

export interface FunctionField {
  id: string;
  text: string;
  type:
    | 'FIELD' | 'TEXT' | 'PASSWORD' | 'RADIO' | 'CHECK' | 'LIST' | 'SPLIT' | 'DESCRIPTION'
    | 'String' | 'Double' | 'Boolean' | 'Float' | 'Integer' | 'Object' | 'VALUE';
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
  const data = await jctFetch('flow_func_r001', { FUNC_TP: 'MAP' });
  return (data.types || []).map((t: any) => ({ code: t.code, name: t.name }));
}

/**
 * 함수 필드 상세 조회
 */
export async function fetchFunctionFields(funcId: string): Promise<FunctionDetail> {
  const data = await jctFetch('flow_func_r002', { FUNC_ID: funcId });
  const fields: FunctionField[] = (data.fields || []).map((f: any) => ({
    id: f.id || '',
    text: f.text || f.id || '',
    type: f.type || 'TEXT',
    defaultValue: f.defaultValue || '',
    listValue: f.listValue || '',
  }));
  return { serviceType: data.serviceType || funcId, fields };
}
