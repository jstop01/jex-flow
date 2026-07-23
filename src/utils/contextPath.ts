/**
 * 런타임 context-path 계산 유틸.
 *
 * React 앱은 서버(ReactAssetService)가 `{contextPath}/plugins/jexq_biz/react/jexq_biz/assets/...`
 * 경로로 로드한다. 즉 자기 번들 script의 src에는 이미 context-path가 포함돼 있으므로,
 * 그 src에서 context-path 부분을 역산하면 별도 설정/전달 없이 정확한 값을 얻는다.
 *
 * JEUS 등 WAS가 context-path(예: /aiAdmin)를 붙여도 API 호출 경로가 맞게 되고,
 * 로컬처럼 context-path가 없는(`/`) 환경에서는 빈 문자열이 되어 기존 동작을 유지한다.
 */
export function getContextPath(): string {
  const scripts = Array.from(document.getElementsByTagName('script'));
  for (const s of scripts) {
    const src = s.src || '';
    const m = src.match(/(.*)\/plugins\/jexq_biz\/react\//);
    if (m) {
      try {
        // m[1] = "https://host{contextPath}" → pathname이 contextPath
        const p = new URL(m[1], window.location.origin).pathname;
        // 루트 context(톰캣 등)는 pathname이 "/"로 나오는데, 그대로 쓰면
        // "/" + "/plugins/..." = "//plugins/..."(프로토콜-상대 URL)이 되어 깨짐.
        // 루트는 빈 문자열로 정규화하고, 그 외는 끝 슬래시 제거.
        if (p === '/' || p === '') return '';
        return p.endsWith('/') ? p.slice(0, -1) : p;
      } catch {
        return '';
      }
    }
  }
  return '';
}

/** jexq_biz 플러그인 서비스(.jct) 호출용 베이스 URL (context-path 포함) */
export const JEXQ_BIZ_BASE = getContextPath() + '/plugins/jexq_biz';
