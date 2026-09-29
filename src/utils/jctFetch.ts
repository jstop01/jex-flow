/**
 * jexq_biz 플러그인 서비스(.jct) 공통 호출 유틸.
 *
 * 서버는 세션이 만료돼도 HTTP 200으로 응답하고 본문에
 *   {"COMMON_HEAD":{"ERROR":true,"CODE":"SES001"}}
 * 를 돌려준다. 각 서비스가 이 헤더를 보지 않으면 응답 키가 없어
 * `data.XXX_LIST || []` 가 빈 배열이 되어 "조용히 아무것도 안 나오는" 상태가 된다.
 *
 * Flow Editor는 iframe에 React 번들만 실려 있어 jexjs 공통 세션 처리(로그인 팝업)가
 * 닿지 않으므로, 호출을 이 파일 한 곳으로 모아 세션 만료를 판별한다.
 */
import { JEXQ_BIZ_BASE } from './contextPath';

/** 세션 만료 응답 코드 (OPERIA studio.const.js _JEX_ERROR_CD.NOT_CONNETED_JEX_SESSION 과 동일) */
const SESSION_ERROR_CODES = ['SES001', 'WM0099'];

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let alreadyNotified = false;

/**
 * 세션 만료 시 한 번만 실행될 핸들러를 등록한다. (App.tsx에서 등록)
 * 여러 요청이 동시에 만료를 만나도 핸들러는 1회만 호출된다.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler;
}

/** 프레임워크 공통 응답 헤더의 오류 여부 (studio.common.js 와 동일하게 truthy면 오류) */
function getErrorHead(data: any): { CODE?: string; MESSAGE?: string } | null {
  const head = data && data.COMMON_HEAD;
  return head && head.ERROR ? head : null;
}

/**
 * .jct 서비스를 POST로 호출하고 JSON을 반환한다.
 * 세션이 만료된 응답이면 등록된 핸들러를 1회 호출하고 SessionExpiredError를 던진다.
 */
export async function jctFetch(serviceId: string, body?: unknown): Promise<any> {
  const response = await fetch(`${JEXQ_BIZ_BASE}/${serviceId}.jct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });

  if (!response.ok) {
    throw new Error(`${serviceId} 호출 실패 (HTTP ${response.status})`);
  }

  const data = await response.json();

  const errorHead = getErrorHead(data);
  if (errorHead) {
    const code = errorHead.CODE || '';
    if (SESSION_ERROR_CODES.indexOf(code) > -1) {
      if (!alreadyNotified) {
        alreadyNotified = true;
        try {
          if (sessionExpiredHandler) sessionExpiredHandler();
        } catch (e) {
          console.error('세션 만료 처리 중 오류:', e);
        }
      }
      throw new Error('세션이 만료되었습니다.');
    }
    // 세션 외 오류도 그냥 통과시키면 응답 키가 없어 "조용히 빈 목록"이 된다.
    throw new Error(`${serviceId} 오류${code ? ' [' + code + ']' : ''}: ${errorHead.MESSAGE || ''}`);
  }

  return data;
}
