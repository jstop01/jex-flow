# 버그: 탭 전환 시 노드 위치 이동

## 증상
JEXQ svc_0002_01 화면에서 탭(DEFAULT, GET, POST 등)을 전환할 때마다 노드가 점점 아래로 이동함.

## 발생 환경
- JEXQ 시스템의 서비스 등록/수정 화면 (svc_0002_01)
- jex-flow가 iframe으로 임베딩된 환경

## 관련 파일

### JEXQ 측 (부모 페이지)
1. **`JEXQ/SVC_GRP/P_BIZ/src/main/resources/templates/svc/svc_0002_01.html`**
   - 252-270 라인: 7개 탭마다 별도 iframe 정의
   - 각 iframe src: `svc_0002_02?area=minimap-only`
   - hidden input: `#comFlowData`, `#comFlowData_get`, `#comFlowData_post` 등

2. **`JEXQ/SVC_GRP/P_BIZ/src/main/resources/static/js/menu/svc/svc_0002_01.js`**
   - 457-487 라인: `changeDomainTab()` - 탭 전환 로직
   - 484-486 라인: 탭 전환 후 `sendMiniMapDataForTab()` 호출
   - 1436-1464 라인: `sendMiniMapDataForTab()` - postMessage로 데이터 전송

### jex-flow 측 (iframe)
1. **`src/pages/MiniMapOnlyPage.tsx`**
   - 116-135 라인: `SET_MINIMAP_DATA` 메시지 핸들러
   - 119-128 라인: y좌표 정규화 로직 (minY 기준으로 상단 정렬)

2. **`src/App.tsx`**
   - 2338-2366 라인: `saveToParent()` - `SAVE_FLOW_DATA` 전송
   - 2340 라인: `separateNodesAndGroups()` 호출

3. **`src/utils/relationshipUtils.ts`**
   - `separateNodesAndGroups()` 함수 - 노드 export 준비

## 데이터 흐름

```
1. 사용자가 Flow Editor에서 편집 후 저장
   ↓
2. saveToParent() 호출
   ├─ separateNodesAndGroups(nodes, edges) 실행
   └─ window.parent.postMessage({ type: 'SAVE_FLOW_DATA', payload: jsonStr })
   ↓
3. svc_0002_01.js의 handleFlowSave() 수신
   ├─ $(inputId).val(event.data.payload) - hidden input에 저장
   └─ sendMiniMapDataForTab(suffix) - 미니맵 갱신
   ↓
4. 탭 전환 시 changeDomainTab() 호출
   └─ sendMiniMapDataForTab(suffix) 호출
   ↓
5. MiniMapOnlyPage.tsx에서 SET_MINIMAP_DATA 수신
   └─ y좌표 정규화 (minY 기준)
```

## 의심되는 원인

### 가설 1: y좌표 정규화 누적
MiniMapOnlyPage.tsx의 정규화 로직:
```typescript
const minY = Math.min(...rawNodes.map((n: Node) => n.position?.y ?? 0));
const normalizedNodes = rawNodes.map((node: Node) => ({
  ...node,
  position: {
    x: node.position?.x ?? 0,
    y: (node.position?.y ?? 0) - minY,  // minY가 음수면 y가 증가
  },
}));
```
- 만약 hidden input의 데이터가 정규화된 미니맵 데이터로 다시 저장된다면 누적 효과 발생

### 가설 2: separateNodesAndGroups() 변환
- 이 함수가 노드 위치를 변환하는지 확인 필요

### 가설 3: 데이터 왕복 변환
- JSON 저장 → 파싱 → 저장 과정에서 위치값 변경

## 검증 방법

1. **콘솔 로깅 추가**
   - svc_0002_01.js의 sendMiniMapDataForTab()에서 전송 데이터 로깅
   - MiniMapOnlyPage.tsx에서 수신 데이터 로깅
   - 탭 전환 시 y좌표 변화 추적

2. **hidden input 모니터링**
   - `#comFlowData` 값이 탭 전환 시 변경되는지 확인
   - 브라우저 개발자 도구에서 breakpoint 설정

3. **separateNodesAndGroups() 검토**
   - 함수 내부에서 position 값 변경 여부 확인

## 해결 방안 (예상)

1. **미니맵 정규화를 읽기 전용으로 유지**
   - 미니맵은 표시만 담당하고, hidden input 데이터는 변경하지 않음

2. **탭 전환 시 데이터 재전송 방지**
   - 데이터가 변경되지 않았으면 미니맵 갱신 스킵

3. **원본 위치 보존**
   - 정규화 전 원본 y좌표 값을 별도로 저장

---

**작성일**: 2026-02-03
**상태**: 조사 중
