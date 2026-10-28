// 서버(Supabase) 동기화. 주소와 공개 키가 설정돼 있을 때만 켜진다.
// 데이터는 records(collection, id, data) 한 테이블에 컬렉션별 문서로 저장한다.
// 나중에 컬렉션마다 정식 테이블로 옮기기 쉽도록 키 규칙을 한곳(keyOf)에 모아 둔다.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DB } from '@/data/mock';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const remoteEnabled = !!(URL && KEY);
export const client: SupabaseClient | null = remoteEnabled ? createClient(URL!, KEY!) : null;

type Row = { collection: string; id: string; data: unknown };

/** 문서마다 고유 키. id가 없는 컬렉션은 묶음 키를 쓴다. */
function keyOf(collection: string, doc: Record<string, unknown>): string {
  if (typeof doc.id === 'string') return doc.id;
  if (collection === 'availability') return `${doc.spaceId}|${doc.date}`;
  if (collection === 'stamps') return String(doc.userId);
  return String(doc.teamId); // agreements, costSplits, shifts, moodboards, completions
}

function toRows(db: DB): Map<string, Row> {
  const out = new Map<string, Row>();
  (Object.keys(db) as (keyof DB)[]).forEach((c) => {
    (db[c] as unknown as Record<string, unknown>[]).forEach((doc) => {
      const id = keyOf(c, doc);
      out.set(`${c}/${id}`, { collection: c, id, data: doc });
    });
  });
  return out;
}

function fromRows(rows: Row[], template: DB): DB {
  const db = Object.fromEntries(Object.keys(template).map((k) => [k, [] as unknown[]])) as unknown as DB;
  // 시드 순서를 지키도록 템플릿에 있던 순서대로 놓고, 새 문서는 뒤에 붙인다
  const order = toRows(template);
  const byKey = new Map(rows.map((r) => [`${r.collection}/${r.id}`, r]));
  const placed = new Set<string>();
  order.forEach((_, k) => {
    const r = byKey.get(k);
    if (r) { (db[r.collection as keyof DB] as unknown[]).push(r.data); placed.add(k); }
  });
  rows.forEach((r) => {
    const k = `${r.collection}/${r.id}`;
    if (!placed.has(k) && r.collection in db) (db[r.collection as keyof DB] as unknown[]).push(r.data);
  });
  return db;
}

/** 서버에서 전체 데이터를 읽는다. 비어 있으면 시드를 올리고 그대로 쓴다. */
export async function pullAll(seed: DB): Promise<DB | null> {
  if (!client) return null;
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('records').select('collection,id,data').range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as Row[]));
    if (!data || data.length < 1000) break;
  }
  if (!rows.length) {
    await pushDiff(null, seed);
    return seed;
  }
  return fromRows(rows, seed);
}

let lastSent: Map<string, string> = new Map();

/** 바뀐 문서만 올리고, 없어진 문서는 지운다. */
export async function pushDiff(prev: DB | null, next: DB) {
  if (!client) return;
  const nextRows = toRows(next);
  const prevRows = prev ? toRows(prev) : new Map<string, Row>();
  const upserts: Row[] = [];
  nextRows.forEach((r, k) => {
    const s = JSON.stringify(r.data);
    const before = prevRows.get(k);
    if (!before || JSON.stringify(before.data) !== s) upserts.push(r);
    lastSent.set(k, s);
  });
  const deletes = [...prevRows.keys()].filter((k) => !nextRows.has(k)).map((k) => prevRows.get(k)!);
  for (let i = 0; i < upserts.length; i += 500) {
    const { error } = await client.from('records').upsert(upserts.slice(i, i + 500), { onConflict: 'collection,id' });
    if (error) throw error;
  }
  for (const d of deletes) {
    lastSent.delete(`${d.collection}/${d.id}`);
    await client.from('records').delete().eq('collection', d.collection).eq('id', d.id);
  }
}

/** 다른 사람이 바꾼 문서를 실시간으로 받는다. 내가 보낸 변경의 메아리는 거른다. */
export function listen(onChange: (r: Row, deleted: boolean) => void) {
  if (!client) return () => {};
  const ch = client
    .channel('records')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, (p) => {
      const deleted = p.eventType === 'DELETE';
      const r = (deleted ? p.old : p.new) as Row;
      if (!r?.collection) return;
      const k = `${r.collection}/${r.id}`;
      if (!deleted && lastSent.get(k) === JSON.stringify(r.data)) return;
      onChange(r, deleted);
    })
    .subscribe();
  return () => { client.removeChannel(ch); };
}

export { keyOf };
