import type { IOField } from '../components/IOSettingModal';
import { JEXQ_BIZ_BASE } from '../utils/contextPath';

// API 설정 (context-path 포함 — JEUS 등 context-path 환경 대응)
const API_BASE_URL = JEXQ_BIZ_BASE;

export interface ComponentItem {
  id: string;
  type: 'IDO' | 'IMO';
  package: string;
  packagePath: string;
  componentId: string;
  name: string;
  className: string;
  modifier: string;
  modifiedDate: string;
  svrId?: string;
}

export interface ComponentSearchFilters {
  COM_TP?: string;
  COM_ID?: string;
  COM_NM?: string;
  PKG_NM?: string;
  SVR_ID?: string;
}

export interface TargetServer {
  SVR_ID: string;
  SVR_NM: string;
}

/**
 * 타겟 서버 목록 조회
 */
export async function fetchTargetServers(comTp: string): Promise<TargetServer[]> {
  const response = await fetch(`${API_BASE_URL}/flow_target_r001.jct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ COM_TP: comTp }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.TARGET_LIST || []) as TargetServer[];
}

/**
 * 컴포넌트 목록 조회 (IDO/IMO)
 */
export async function fetchComponents(filters?: ComponentSearchFilters): Promise<ComponentItem[]> {
  const response = await fetch(`${API_BASE_URL}/flow_comp_r001.jct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters || {}),
  });

  if (!response.ok) {
    throw new Error('컴포넌트 목록 조회 실패');
  }

  const data = await response.json();
  const list: any[] = data.COM_LIST || [];

  return list.map((o: any, idx: number) => ({
    id: String(idx + 1),
    type: (o.COM_TP === 'IDO' ? 'IDO' : 'IMO') as 'IDO' | 'IMO',
    package: o.PKG_FULL_PATH || '',
    packagePath: o.PKG_FULL_PATH || '',
    componentId: o.COM_ID || '',
    name: o.COM_NM || '',
    className: o.CLS_NM || '',
    modifier: o.UPD_NM || o.UPD_ID || '',
    modifiedDate: o.UPD_DT || '',
    svrId: o.SVR_ID || '',
  }));
}

/**
 * 컴포넌트 IO 도메인 조회
 */
export interface ComponentIOResult {
  inputs: IOField[];
  outputs: IOField[];
  sqlList?: { sql: string; sqlDvCd: string; dbTp: string }[];
}

export async function fetchComponentIO(
  comId: string,
  comTp: string
): Promise<ComponentIOResult> {
  const response = await fetch(`${API_BASE_URL}/flow_comp_r002.jct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ COM_ID: comId, COM_TP: comTp }),
  });

  if (!response.ok) {
    throw new Error('컴포넌트 IO 도메인 조회 실패');
  }

  const data = await response.json();
  const domainList: any[] = data.DOMAIN_LIST || [];

  // IO_TP='R' 도메인 맵: COM_ID → children IOField[] (inputs/outputs 양쪽에서 참조)
  const recordDomainMap = buildRecordDomainMap(domainList);

  const inputs = mapDomainToIOFields(domainList, 'I', recordDomainMap);
  const outputs = [
    ...mapDomainToIOFields(domainList, 'O', recordDomainMap),
    ...mapRecordDomains(domainList, recordDomainMap),  // IO_TP='R' 중 outputs 단독 항목 추가
    ...mapDomainToIOFields(domainList, 'C', recordDomainMap),  // IO_TP='C' (CMO 통합 도메인)
  ];

  // IDO SQL 정보 파싱
  const idoSqlRaw: any[] = data.IDO_SQL_LIST || [];
  const sqlList = idoSqlRaw.map((item: any) => ({
    sql: item.DB_SQL || '',
    sqlDvCd: item.SQL_DV_CD || '',
    dbTp: item.DB_TP || '',
  }));

  return { inputs, outputs, sqlList: sqlList.length > 0 ? sqlList : undefined };
}

/**
 * IO_TP='R' 도메인 목록을 COM_ID 기준 맵으로 사전 빌드
 * 반환: { [comId]: { korName, children: IOField[] } }
 */
function buildRecordDomainMap(
  domainList: { IO_TP: string; COM_ID: string; PRPT_INF: string }[]
): Record<string, { korName: string; children: IOField[] }> {
  // I/O 도메인 MSG_INF에서 RECORD 엔트리의 한글명 수집 (key: ENG_WRD_SRT → korName)
  const recordKorNames: Record<string, string> = {};
  domainList.filter((d) => d.IO_TP === 'I' || d.IO_TP === 'O').forEach((d) => {
    let prpt: Record<string, any> = {};
    try { prpt = d.PRPT_INF ? (typeof d.PRPT_INF === 'string' ? JSON.parse(d.PRPT_INF) : d.PRPT_INF) : {}; } catch {}
    const msgInf = prpt.MSG_INF;
    let arr: any[] = [];
    if (Array.isArray(msgInf)) arr = msgInf;
    else if (msgInf && typeof msgInf === 'object') {
      arr = Array.isArray(msgInf.default) ? msgInf.default : (msgInf[Object.keys(msgInf)[0]] || []);
    }
    arr.forEach((m: any) => {
      if (m.FLD_TP === 'RECORD' || m.FLD_TP === 'COMMON') {
        const eng = m.ENG_WRD_SRT || m.ENG_WRD_NM || '';
        if (eng && !recordKorNames[eng]) {
          recordKorNames[eng] = m.KOR_WRD_NM || m.KOR_WRD_SRT || '';
        }
      }
    });
  });

  const map: Record<string, { korName: string; children: IOField[] }> = {};

  domainList
    .filter((d) => d.IO_TP === 'R')
    .forEach((d, idx) => {
      let prpt: Record<string, any> = {};
      try {
        if (d.PRPT_INF) prpt = typeof d.PRPT_INF === 'string' ? JSON.parse(d.PRPT_INF) : d.PRPT_INF;
      } catch {}

      const korName = prpt.KOR_WRD_NM || prpt.KOR_WRD_SRT || prpt.KOR_NM
        || recordKorNames[d.COM_ID] || d.COM_ID;

      let msgInfArr: any[] = [];
      const msgInf = prpt.MSG_INF;
      if (Array.isArray(msgInf)) {
        msgInfArr = msgInf;
      } else if (msgInf && typeof msgInf === 'object') {
        if (Array.isArray(msgInf.default)) {
          msgInfArr = msgInf.default;
        } else {
          const firstKey = Object.keys(msgInf)[0];
          if (firstKey && Array.isArray(msgInf[firstKey])) msgInfArr = msgInf[firstKey];
        }
      }

      const children: IOField[] = [];
      msgInfArr.forEach((m: any, childIdx: number) => {
        if (m.FLD_TP === 'GROUP') return;
        const engName = m.ENG_WRD_SRT || m.ENG_WRD_NM || m.RULE_NM || `field_${childIdx + 1}`;
        const childKorName = m.KOR_WRD_NM || m.KOR_WRD_SRT || '';
        children.push({
          id: `R_${idx + 1}_${childIdx + 1}`,
          englishName: engName,
          koreanName: childKorName,
          length: m.LENGTH || '',
          fieldType: m.FLD_TP || 'FIELD',
          ruleName: m.RULE_NM || '',
          target: '',
          dataType: m.IDO_TP || m.DAT_TP || '',
          alignment: m.SRT_NM || '',
          padding: m.PAD_VLU || '',
          defaultValue: '',
          required: m.MDTY_YN === 'Y',
          encryption: m.CRYP_YN || '',
          masking: m.MASK_YN || '',
          checked: false,
          name: engName,
          type: m.FLD_TP || 'FIELD',
          isRecordChild: true,
        } as IOField);
      });

      map[d.COM_ID] = { korName, children };
    });

  return map;
}

/**
 * DOMAIN_LIST → IOField[] 변환
 * PRPT_INF JSON 구조:
 *   IDO: { "MSG_INF": { "default": [...fields], "DERBY": [...], ... } }
 *   SVC: { "MSG_INF": [...fields] }
 *
 * FLD_TP='RECORD' 항목은 recordDomainMap에서 children을 가져와 트리 구조로 포함시킴.
 * 이렇게 하면 IMO의 CMO 항목이 inputs에서 펼쳐 보이게 됨.
 */
function mapDomainToIOFields(
  domainList: { IO_TP: string; COM_ID: string; PRPT_INF: string }[],
  ioType: string,
  recordDomainMap: Record<string, { korName: string; children: IOField[] }>
): IOField[] {
  const fields: IOField[] = [];

  domainList
    .filter((d) => d.IO_TP === ioType)
    .forEach((d) => {
      let prpt: Record<string, any> = {};
      try {
        if (d.PRPT_INF) {
          prpt = typeof d.PRPT_INF === 'string'
            ? JSON.parse(d.PRPT_INF)
            : d.PRPT_INF;
        }
      } catch {
        // 파싱 실패
      }

      // MSG_INF 추출: 배열 또는 DB벤더별 객체(default/DERBY/ORACLE 등)
      let msgInfArr: any[] = [];
      const msgInf = prpt.MSG_INF;
      if (Array.isArray(msgInf)) {
        // SVC: MSG_INF가 직접 배열
        msgInfArr = msgInf;
      } else if (msgInf && typeof msgInf === 'object') {
        // IDO: MSG_INF가 {"default": [...], "DERBY": [...]} 형태
        // "default" 키 우선, 없으면 첫번째 키의 배열 사용
        if (Array.isArray(msgInf.default)) {
          msgInfArr = msgInf.default;
        } else {
          const firstKey = Object.keys(msgInf)[0];
          if (firstKey && Array.isArray(msgInf[firstKey])) {
            msgInfArr = msgInf[firstKey];
          }
        }
      }

      // 각 필드를 IOField로 변환
      // RECORD/COMMON 뒤에 나오는 FIELD들은 해당 RECORD의 children으로 그루핑
      let currentRecord: IOField | null = null;
      msgInfArr.forEach((m: any) => {
        if (m.FLD_TP === 'GROUP') return;

        const engName = m.ENG_WRD_SRT || m.ENG_WRD_NM || m.RULE_NM || `field_${fields.length + 1}`;
        const korName = m.KOR_WRD_NM || m.KOR_WRD_SRT || '';

        if (m.FLD_TP === 'RECORD' || m.FLD_TP === 'COMMON') {
          const isCommon = m.FLD_TP === 'COMMON';
          // COMMON(공통부)은 같은 IMO 내 RECORD와 달리 별도 CMO(RULE_NM)를 참조한다.
          // RECORD처럼 순서기반으로 뒤따르는 형제 FIELD를 자식으로 흡수하면 안 되고,
          // children은 펼칠 때 CMO를 lazy-load 하여 채운다(MappingEditorModal의 toggleTargetRecord).
          // → COMMON은 recordDomainMap(IO_TP='R') 조회 대상이 아니며 children은 항상 빈 배열로 둔다.
          const recordEntry = isCommon ? undefined : recordDomainMap[engName];
          const children = recordEntry?.children?.length ? recordEntry.children : [];
          const recordField: IOField = {
            id: `${ioType}_R_${fields.length + 1}`,
            englishName: engName,
            koreanName: korName || recordEntry?.korName || engName,
            length: '',
            fieldType: isCommon ? 'COMMON' : 'RECORD',
            ruleName: m.RULE_NM || '',
            target: '',
            dataType: '',
            alignment: '',
            padding: '',
            defaultValue: '',
            required: m.MDTY_YN === 'Y',
            encryption: '',
            masking: '',
            checked: false,
            name: engName,
            type: isCommon ? 'COMMON' : 'RECORD',
            children,
          } as IOField;
          fields.push(recordField);
          // RECORD만 순서기반 흡수: IO_TP='R' children이 없으면 뒤따르는 FIELD들을 이 RECORD의 children으로 수집.
          // COMMON은 형제 FIELD를 흡수하지 않는다(최상위 형제로 유지).
          currentRecord = isCommon ? null : (children.length > 0 ? null : recordField);
          return;
        }

        // 현재 RECORD가 있고 children이 비어있으면 → 이 FIELD는 RECORD의 child
        if (currentRecord && currentRecord.children) {
          currentRecord.children.push({
            id: `${ioType}_${currentRecord.id}_C_${currentRecord.children.length + 1}`,
            englishName: engName,
            koreanName: korName,
            length: m.LENGTH || '',
            fieldType: m.FLD_TP || 'FIELD',
            ruleName: m.RULE_NM || '',
            target: '',
            dataType: m.IDO_TP || m.DAT_TP || '',
            alignment: m.SRT_NM || '',
            padding: m.PAD_VLU || '',
            defaultValue: '',
            required: m.MDTY_YN === 'Y',
            encryption: m.CRYP_YN || '',
            masking: m.MASK_YN || '',
            checked: false,
            name: engName,
            type: m.FLD_TP || 'FIELD',
            isRecordChild: true,
          } as IOField);
          return;
        }

        fields.push({
          id: `${ioType}_${fields.length + 1}`,
          englishName: engName,
          koreanName: korName,
          length: m.LENGTH || '',
          fieldType: m.FLD_TP || 'FIELD',
          ruleName: m.RULE_NM || '',
          target: '',
          dataType: m.IDO_TP || m.DAT_TP || '',
          alignment: m.SRT_NM || '',
          padding: m.PAD_VLU || '',
          defaultValue: '',
          required: m.MDTY_YN === 'Y',
          encryption: m.CRYP_YN || '',
          masking: m.MASK_YN || '',
          checked: false,
          name: engName,
          type: m.FLD_TP || 'FIELD',
        } as IOField);
      });
    });

  return fields;
}

/**
 * IO_TP='R' (RECORD 타입) 도메인 중 I/O 도메인 MSG_INF에 참조되지 않은 것을
 * outputs에 단독으로 추가 (기존 동작 유지)
 *
 * recordDomainMap은 buildRecordDomainMap()의 반환값을 재사용.
 */
function mapRecordDomains(
  domainList: { IO_TP: string; COM_ID: string; PRPT_INF: string }[],
  recordDomainMap: Record<string, { korName: string; children: IOField[] }>
): IOField[] {
  const fields: IOField[] = [];

  // INPUT/OUTPUT MSG_INF에서 참조된 RECORD/COMMON COM_ID 수집.
  // outputs(=CallDO의 Source)에는 OUTPUT 메시지 항목만 나와야 하므로:
  //  - OUTPUT 참조분은 mapDomainToIOFields('O')에서 이미 처리되니 여기선 중복 제외
  //  - INPUT 참조분(예: IN_REC)은 output Source에 나오면 안 되므로 반드시 제외
  const referencedRecordIds = new Set<string>();
  domainList.filter((d) => d.IO_TP === 'O' || d.IO_TP === 'I').forEach((d) => {
    let prpt: Record<string, any> = {};
    try { prpt = d.PRPT_INF ? (typeof d.PRPT_INF === 'string' ? JSON.parse(d.PRPT_INF) : d.PRPT_INF) : {}; } catch {}
    const msgInf = prpt.MSG_INF;
    let arr: any[] = [];
    if (Array.isArray(msgInf)) arr = msgInf;
    else if (msgInf && typeof msgInf === 'object') {
      arr = Array.isArray(msgInf.default) ? msgInf.default : (msgInf[Object.keys(msgInf)[0]] || []);
    }
    arr.forEach((m: any) => {
      if (m.FLD_TP === 'RECORD' || m.FLD_TP === 'COMMON') {
        const eng = m.ENG_WRD_SRT || m.ENG_WRD_NM || '';
        if (eng) referencedRecordIds.add(eng);
      }
    });
  });

  domainList
    .filter((d) => d.IO_TP === 'R' && !referencedRecordIds.has(d.COM_ID))
    .forEach((d, idx) => {
      const entry = recordDomainMap[d.COM_ID];
      if (!entry) return;

      fields.push({
        id: `O_R_${idx + 1}`,
        englishName: d.COM_ID,
        koreanName: entry.korName,
        length: '',
        fieldType: 'RECORD',
        ruleName: '',
        target: '',
        dataType: '',
        alignment: '',
        padding: '',
        defaultValue: '',
        required: false,
        encryption: '',
        masking: '',
        checked: false,
        name: d.COM_ID,
        type: 'RECORD',
        children: entry.children,
      } as IOField);
    });

  return fields;
}
