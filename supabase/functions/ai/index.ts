// AI 도우미 서버 함수. 앱에서 supabase.functions.invoke('ai', { body: { task, input } })로 부른다.
// 키(ANTHROPIC_API_KEY)는 Supabase Edge Function 비밀 설정에만 둔다. 앱 코드에는 절대 넣지 않는다.
// 키가 없거나 실패하면 앱이 자체 예시 문구로 대신 채운다.
import Anthropic from 'npm:@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5'; // 글 1건 약 20~40원. 비용을 줄이려면 'claude-haiku-5-5'(1~2원)
const MAX_INPUT = 6000; // 글자 수. 이보다 긴 요청은 받지 않는다 (요금 보호)
const MAX_IMAGES = 3;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM = `너는 OFF STAGE의 글쓰기 도우미야. OFF STAGE는 작은 패션 브랜드 여러 곳이 팀을 짜서 공동 팝업을 열고 공간을 나눠 빌리는 서비스야.
- 한국어로, 실제 브랜드 담당자가 쓴 것처럼 담백하게 써. 과장, 이모지, 느낌표 남발, "~해보세요!" 같은 광고 말투는 쓰지 마.
- 입력에 없는 사실(가격, 날짜, 주소, 수치)은 지어내지 마. 모르면 그 부분은 빼.
- 29CM, 무신사 매거진처럼 짧은 문장과 구체적인 디테일을 좋아해.`;

type Task = 'recruit' | 'promo' | 'space' | 'report';

const str = { type: 'string' } as const;
const strList = { type: 'array', items: { type: 'string' } } as const;
const obj = (props: Record<string, unknown>) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });

const TASKS: Record<Task, { ask: string; schema: Record<string, unknown> }> = {
  recruit: {
    ask: '아래 정보로 공동 팝업 모집글을 써 줘. title은 40자 이내, intro는 4~6문장. 어떤 무드인지, 어떤 브랜드를 찾는지, 함께하면 좋은 점을 담아.',
    schema: obj({ title: str, intro: str }),
  },
  promo: {
    ask: '아래 팝업 정보로 홍보 문구를 써 줘. intro는 팝업 소개 3~4문장, caption은 인스타그램 캡션(줄바꿈 포함, 해시태그 5~8개를 맨 끝에), poster는 포스터에 크게 들어갈 한 줄 카피(20자 이내)와 그 아래 작은 설명 한 줄을 줄바꿈으로 구분.',
    schema: obj({ intro: str, caption: str, poster: str }),
  },
  space: {
    ask: '아래 공간 정보와 사진을 보고 팝업 공간 소개를 써 줘. keywords는 공간 특징 키워드 4~6개(각 2~6자, 예: 통창, 높은 층고, 1층 코너), moods는 어울리는 무드 2~3개, intro는 3~4문장 소개글.',
    schema: obj({ keywords: strList, moods: strList, intro: str }),
  },
  report: {
    ask: '아래는 끝난 공동 팝업의 방문·후기 데이터야. 반응이 좋았던 점(good) 2~3개, 아쉬웠던 점(improve) 1~2개, 다음 회차 제안(next) 2~3개를 한 문장씩 써 줘. 데이터에 근거한 것만.',
    schema: obj({ good: strList, improve: strList, next: strList }),
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, why: 'POST만 받아요' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ ok: false, why: 'no-key' }, 503);

  let body: { task?: Task; input?: Record<string, unknown>; images?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, why: '요청 형식이 잘못됐어요' }, 400);
  }
  const spec = body.task && TASKS[body.task];
  if (!spec) return json({ ok: false, why: '모르는 작업이에요' }, 400);
  const inputText = JSON.stringify(body.input ?? {}, null, 1);
  if (inputText.length > MAX_INPUT) return json({ ok: false, why: '입력이 너무 길어요' }, 413);

  // 사진은 data:image/jpeg;base64,... 형태로 최대 3장
  const images = (body.images ?? []).slice(0, MAX_IMAGES).flatMap((d) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(d);
    return m ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: m[1] as 'image/jpeg', data: m[2] } }] : [];
  });

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: spec.schema } },
      messages: [{ role: 'user', content: [...images, { type: 'text', text: `${spec.ask}\n\n${inputText}` }] }],
    } as never);
    const msg = res as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (msg.stop_reason === 'refusal') return json({ ok: false, why: '이 내용은 만들 수 없어요' }, 422);
    const text = msg.content.find((b) => b.type === 'text')?.text;
    if (!text) return json({ ok: false, why: '빈 응답이에요' }, 502);
    return json({ ok: true, result: JSON.parse(text) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: '잠시 뒤 다시 시도해 주세요' }, 429);
    if (e instanceof Anthropic.APIError) return json({ ok: false, why: `AI 오류 ${e.status ?? ''}` }, 502);
    return json({ ok: false, why: 'AI 연결에 실패했어요' }, 502);
  }
});
