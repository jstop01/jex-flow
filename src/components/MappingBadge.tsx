import React, { memo } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { MappingConnection } from './MappingEditorModal';

/**
 * 노드에 매핑이 설정돼 있음을 알리는 뱃지.
 *
 * 매핑은 노드를 열어봐야만 설정 여부를 알 수 있어 캔버스에서 구분되지 않았다.
 * 매핑이 1건 이상일 때만 노드 헤더 우측에 개수와 함께 표시한다.
 *
 * 스타일은 MappingNode 헤더의 개수 뱃지와 같은 방식(기존 클래스 + 색상은 inline).
 * (index.css는 빌드 시 생성되지 않는 정적 파일이라 새 임의값 클래스는 적용되지 않는다)
 */
const BADGE_COLOR = '#8b5cf6';

interface MappingBadgeProps {
  mappings?: MappingConnection[];
}

export const MappingBadge = memo(({ mappings }: MappingBadgeProps) => {
  const count = mappings?.length ?? 0;
  if (count === 0) return null;

  return (
    <div
      className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ backgroundColor: BADGE_COLOR, color: 'white' }}
      title={`매핑 ${count}건이 설정되어 있습니다`}
    >
      <ArrowRightLeft size={10} />
      {count}
    </div>
  );
});

MappingBadge.displayName = 'MappingBadge';
