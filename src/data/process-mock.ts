import { ServiceTypeDataResponse, ServiceTypeInputsResponse } from '../types/process';

export const MOCK_SERVICE_TYPE_DATA: ServiceTypeDataResponse = {
  version: '1.0.0',
  lastUpdated: Date.now(),
  types: [
    { code: 'com.process.ProcessDefault', name: '기본 프로세스' },
    { code: 'com.process.ProcessHTTP', name: 'HTTP 서비스' },
    { code: 'com.process.ProcessDB', name: '데이터베이스' },
    { code: 'com.process.ProcessFile', name: '파일 처리' },
    { code: 'com.process.ProcessQueue', name: '큐 처리' },
    { code: 'com.process.ProcessScheduler', name: '스케줄러' },
  ],
};

// 서비스 타입별 입력 필드 Mock 데이터
export const MOCK_SERVICE_TYPE_INPUTS: Record<string, ServiceTypeInputsResponse> = {
  'com.process.ProcessDefault': {
    serviceType: 'com.process.ProcessDefault',
    fields: [
      { id: 'processName', text: '프로세스명', type: 'TEXT', defaultValue: '' },
      { id: 'description', text: '설명', type: 'DESCRIPTION', defaultValue: '' },
    ],
  },
  'com.process.ProcessHTTP': {
    serviceType: 'com.process.ProcessHTTP',
    fields: [
      { id: 'url', text: 'URL', type: 'TEXT', defaultValue: 'https://' },
      { id: 'method', text: 'HTTP Method', type: 'LIST', defaultValue: 'GET', listValue: [
        { value: 'GET', text: 'GET' },
        { value: 'POST', text: 'POST' },
        { value: 'PUT', text: 'PUT' },
        { value: 'DELETE', text: 'DELETE' },
      ]},
      { id: '', type: 'SPLIT', defaultValue: '인증 설정' },
      { id: 'authType', text: '인증 방식', type: 'RADIO', defaultValue: 'none', listValue: [
        { value: 'none', text: '없음' },
        { value: 'basic', text: 'Basic Auth' },
        { value: 'bearer', text: 'Bearer Token' },
      ]},
      { id: 'username', text: '사용자명', type: 'TEXT', defaultValue: '', parentId: 'authType', parentValue: 'basic' },
      { id: 'password', text: '비밀번호', type: 'PASSWORD', defaultValue: '', parentId: 'authType', parentValue: 'basic' },
      { id: 'token', text: 'Token', type: 'TEXT', defaultValue: '', parentId: 'authType', parentValue: 'bearer' },
    ],
  },
  'com.process.ProcessDB': {
    serviceType: 'com.process.ProcessDB',
    fields: [
      { id: 'dbType', text: 'DB 타입', type: 'LIST', defaultValue: 'mysql', listValue: [
        { value: 'mysql', text: 'MySQL' },
        { value: 'oracle', text: 'Oracle' },
        { value: 'postgresql', text: 'PostgreSQL' },
        { value: 'mssql', text: 'MS SQL Server' },
      ]},
      { id: 'host', text: '호스트', type: 'TEXT', defaultValue: 'localhost' },
      { id: 'port', text: '포트', type: 'TEXT', defaultValue: '3306' },
      { id: 'database', text: '데이터베이스', type: 'TEXT', defaultValue: '' },
      { id: '', type: 'SPLIT', defaultValue: '접속 정보' },
      { id: 'username', text: '사용자명', type: 'TEXT', defaultValue: '' },
      { id: 'password', text: '비밀번호', type: 'PASSWORD', defaultValue: '' },
    ],
  },
  'com.process.ProcessFile': {
    serviceType: 'com.process.ProcessFile',
    fields: [
      { id: 'filePath', text: '파일 경로', type: 'TEXT', defaultValue: '' },
      { id: 'fileType', text: '파일 타입', type: 'LIST', defaultValue: 'text', listValue: [
        { value: 'text', text: '텍스트' },
        { value: 'csv', text: 'CSV' },
        { value: 'json', text: 'JSON' },
        { value: 'xml', text: 'XML' },
      ]},
      { id: 'encoding', text: '인코딩', type: 'LIST', defaultValue: 'utf-8', listValue: [
        { value: 'utf-8', text: 'UTF-8' },
        { value: 'euc-kr', text: 'EUC-KR' },
        { value: 'cp949', text: 'CP949' },
      ]},
    ],
  },
  'com.process.ProcessQueue': {
    serviceType: 'com.process.ProcessQueue',
    fields: [
      { id: 'queueType', text: '큐 타입', type: 'LIST', defaultValue: 'kafka', listValue: [
        { value: 'kafka', text: 'Kafka' },
        { value: 'rabbitmq', text: 'RabbitMQ' },
        { value: 'activemq', text: 'ActiveMQ' },
      ]},
      { id: 'host', text: '호스트', type: 'TEXT', defaultValue: 'localhost' },
      { id: 'port', text: '포트', type: 'TEXT', defaultValue: '9092' },
      { id: 'topic', text: '토픽/큐 이름', type: 'TEXT', defaultValue: '' },
    ],
  },
  'com.process.ProcessScheduler': {
    serviceType: 'com.process.ProcessScheduler',
    fields: [
      { id: 'scheduleType', text: '스케줄 타입', type: 'RADIO', defaultValue: 'cron', listValue: [
        { value: 'cron', text: 'Cron 표현식' },
        { value: 'interval', text: '간격 설정' },
      ]},
      { id: 'cronExpression', text: 'Cron 표현식', type: 'TEXT', defaultValue: '0 0 * * *', parentId: 'scheduleType', parentValue: 'cron' },
      { id: 'intervalValue', text: '간격 (초)', type: 'TEXT', defaultValue: '60', parentId: 'scheduleType', parentValue: 'interval' },
      { id: '', type: 'SPLIT', defaultValue: '실행 옵션' },
      { id: 'enabled', text: '활성화', type: 'CHECK', defaultValue: 'enabled', listValue: [
        { value: 'enabled', text: '스케줄 활성화' },
      ]},
    ],
  },
};
