// AI 도우미. 서버 함수(supabase/functions/ai)에 맡기고, 서버가 없거나 키가 없으면 정해진 틀로 예시를 채운다.
// source가 'example'이면 화면에 "예시" 표시를 붙여 진짜 AI 결과와 구분한다.
import { client } from './remote';

export type AiTask = 'recruit' | 'promo' | 'space' | 'report' | 'layout';

export interface AiResult<T> {
  result: T;
  source: 'ai' | 'example';
}

export type RecruitDraftOut = { title: string; intro: string };
export type PromoOut = { intro: string; caption: string; poster: string };
export type SpaceOut = { keywords: string[]; moods: string[]; intro: string };
export type LayoutZone = 'back' | 'left' | 'right' | 'center';
export type LayoutItemOut = { kind: 'hanger' | 'table' | 'photo'; brand: string; x: number; y: number; rotate: 0 | 90 };
export type LayoutOut = { items: LayoutItemOut[]; path: { x: number; y: number }[]; tips: string[] };
export type ReportOut = { good: string[]; improve: string[]; next: string[] };

// 서버에 키가 없다는 걸 한 번 알면 그 뒤로는 바로 예시로 간다
let noKey = false;

export async function askAi<T>(task: AiTask, input: Record<string, unknown>, fallback: () => T, images?: string[]): Promise<AiResult<T>> {
  if (client && !noKey) {
    try {
      const { data, error } = await client.functions.invoke('ai', { body: { task, input, images } });
      if (!error && data?.ok) return { result: data.result as T, source: 'ai' };
      if (data?.why === 'no-key') noKey = true;
      // 서버 함수가 아직 없거나(404) 키가 없으면(503) 조용히 예시로
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      if (status === 404 || status === 503) noKey = true;
    } catch {
      /* 네트워크 오류면 예시로 */
    }
  }
  return { result: fallback(), source: 'example' };
}
