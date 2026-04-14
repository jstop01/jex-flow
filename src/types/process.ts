/**
 * Process Node Service Type 관련 타입 정의
 */

export interface ServiceTypeOption {
  code: string;
  name: string;
}

export interface ServiceTypeDataResponse {
  version: string;
  lastUpdated: number;
  types: ServiceTypeOption[];
}

/**
 * 서비스 타입별 입력 필드 정의
 */
export interface InputFieldListValue {
  value: string;
  text: string;
}

export interface InputField {
  id: string;
  text?: string;
  type: 'FIELD' | 'TEXT' | 'PASSWORD' | 'RADIO' | 'CHECK' | 'LIST' | 'SPLIT' | 'DESCRIPTION';
  dataType?: string;
  defaultValue?: string;
  listValue?: InputFieldListValue[];
  parentId?: string;
  parentValue?: string;
}

export interface ServiceTypeInputsResponse {
  serviceType: string;
  fields: InputField[];
}
