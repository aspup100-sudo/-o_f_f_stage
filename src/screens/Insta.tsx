// 공식 인스타(@o_f_f_stage) 피드 칸. 서버 함수(supabase/functions/ig-sync)가 넣어 준 글을 보여 주고,
// 아직 연결 전이라 글이 없으면 데모 글을 보여 준다.
import type { DB } from '@/data/mock';
import { lookbookSrc } from '@/data/photos';
import { OFFICIAL_INSTAGRAM, type InstaPost } from '@/types';
import { Demo } from '@/components/ui';

const DEMO_POSTS: InstaPost[] = [
  { id: 'ig_demo1', imageUrl: lookbookSrc({ id: 'b1_img2', brandId: 'b1' }), caption: '가을 산책단 3팀이 11/7 성수에서 만나요. 오브제먼트 × 소금상점 × 낮은달', permalink: '', mediaType: 'IMAGE', postedAt: '2026-10-25T10:00:00' },
  { id: 'ig_demo2', imageUrl: lookbookSrc({ id: 'b2_img1', brandId: 'b2' }), caption: '골목 옷장 마지막 주말. 연남 코너하우스에서 28일까지 열려요', permalink: '', mediaType: 'IMAGE', postedAt: '2026-10-24T18:00:00' },
  { id: 'ig_demo3', imageUrl: lookbookSrc({ id: 'b9_img1', brandId: 'b9' }), caption: '겨울 아웃도어 마켓, 같이 열 신발 브랜드를 찾고 있어요', permalink: '', mediaType: 'IMAGE', postedAt: '2026-10-22T12:00:00' },
];

/** 최신순 인스타 글. 서버에서 받은 게 없으면 데모 글 */
export function instaFeed(db: DB): { posts: InstaPost[]; demo: boolean } {
  const real = [...(db.instaPosts ?? [])].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  return real.length ? { posts: real, demo: false } : { posts: DEMO_POSTS, demo: true };
}

export function InstaThumb({ post, demo }: { post: InstaPost; demo?: boolean }) {
  const href = post.permalink || `https://www.instagram.com/${OFFICIAL_INSTAGRAM}/`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block shrink-0 w-[200px] self-start text-left">
      <div className="relative aspect-[4/5] bg-ink-100 overflow-hidden rounded">
        <img src={post.imageUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <span className="absolute top-2 left-2 bg-white text-ink-900 text-[11px] font-bold px-1.5 py-0.5">@{OFFICIAL_INSTAGRAM}</span>
        {post.mediaType === 'VIDEO' && <span className="absolute top-2 right-2 bg-white text-ink-900 text-[11px] font-bold px-1.5 py-0.5">영상</span>}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-500 flex items-center gap-1">인스타그램 · {post.postedAt.slice(5, 10).replace('-', '/')}{demo && <Demo />}</div>
      <div className="text-[13px] text-ink-700 leading-snug line-clamp-2">{post.caption}</div>
    </a>
  );
}
