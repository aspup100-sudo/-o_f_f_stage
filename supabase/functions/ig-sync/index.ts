// 공식 인스타 피드를 가져와 records(collection = 'instaPosts')에 넣는 서버 함수.
// Supabase Cron 으로 15분마다 부른다. 토큰은 ig_token 표에서 읽는다.
// 토큰 두 가지를 다 받는다.
// - IG 로 시작: Instagram 로그인 토큰. 60일짜리라 30일마다 연장한다.
// - 그 밖(EAA…): Facebook 로그인 토큰. 인스타와 연결된 페이지의 토큰으로 바꿔 저장한다(긴 토큰에서 받은 페이지 토큰은 만료가 없다).
import { createClient } from 'npm:@supabase/supabase-js@2';

const API = 'https://graph.instagram.com';
const FB = 'https://graph.facebook.com';
const VER = 'v26.0';
const KEEP = 12; // 홈에 보여 줄 최근 글 수

type Media = {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: row, error } = await db.from('ig_token').select('token, refreshed_at').eq('id', 1).maybeSingle();
  if (error || !row) return json({ ok: false, why: '토큰이 없어요. instagram.sql 의 insert 줄을 실행해 주세요.' }, 400);
  let token = row.token as string;
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  let res: Response;

  if (token.startsWith('IG')) {
    // 토큰은 60일짜리라 30일마다 연장한다
    if (Date.now() - new Date(row.refreshed_at).getTime() > 30 * 86400_000) {
      const r = await fetch(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
      if (r.ok) {
        token = (await r.json()).access_token;
        await db.from('ig_token').update({ token, refreshed_at: new Date().toISOString() }).eq('id', 1);
      }
    }
    res = await fetch(`${API}/${VER}/me/media?fields=${fields}&limit=${KEEP}&access_token=${token}`);
  } else {
    // 페이지 토큰이면 바로 인스타 계정을 찾는다
    let igId: string | undefined;
    const me = await fetch(`${FB}/${VER}/me?fields=instagram_business_account&access_token=${token}`);
    if (me.ok) igId = (await me.json()).instagram_business_account?.id;
    // 사용자 토큰이면 인스타와 연결된 페이지를 찾아 그 페이지 토큰으로 바꿔 둔다
    if (!igId) {
      const r = await fetch(`${FB}/${VER}/me/accounts?fields=access_token,instagram_business_account&access_token=${token}`);
      if (!r.ok) return json({ ok: false, why: await r.text() }, 502);
      const page = ((await r.json()).data ?? []).find((p: any) => p.instagram_business_account);
      if (!page) return json({ ok: false, why: '인스타와 연결된 페이스북 페이지를 못 찾았어요.' }, 400);
      igId = page.instagram_business_account.id;
      token = page.access_token;
      await db.from('ig_token').update({ token, refreshed_at: new Date().toISOString() }).eq('id', 1);
    }
    res = await fetch(`${FB}/${VER}/${igId}/media?fields=${fields}&limit=${KEEP}&access_token=${token}`);
  }

  if (!res.ok) return json({ ok: false, why: await res.text() }, 502);
  const media = ((await res.json()).data ?? []) as Media[];

  // 사진 주소는 시간이 지나면 바뀌므로 매번 최근 글을 통째로 덮어쓴다
  const rows = media
    .map((m) => ({
      id: m.id,
      imageUrl: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
      caption: (m.caption ?? '').slice(0, 300),
      permalink: m.permalink,
      mediaType: m.media_type,
      postedAt: m.timestamp,
    }))
    .filter((p) => p.imageUrl)
    .map((p) => ({ collection: 'instaPosts', id: p.id, data: p }));

  if (rows.length) {
    const up = await db.from('records').upsert(rows, { onConflict: 'collection,id' });
    if (up.error) return json({ ok: false, why: up.error.message }, 500);
  }
  // 인스타에서 지운 글은 앱에서도 내린다
  const keep = rows.map((r) => r.id);
  const { data: old } = await db.from('records').select('id').eq('collection', 'instaPosts');
  const gone = (old ?? []).map((o) => o.id as string).filter((id) => !keep.includes(id));
  if (gone.length) await db.from('records').delete().eq('collection', 'instaPosts').in('id', gone);

  return json({ ok: true, saved: rows.length, removed: gone.length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
