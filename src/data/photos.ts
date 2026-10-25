// 데모용 예시 사진 (Unsplash 무료 사진). 실제 사용자가 올린 사진이 있으면 그걸 먼저 쓴다.
// 데이터에 저장하지 않고 id로 계산해서, 서버에 이미 올라간 데모 데이터에도 바로 적용된다.
import type { LookbookImage, Space } from '@/types';

const u = (id: string, w = 600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const POOL: Record<string, string[]> = {
  의류: ['1490481651871-ab68de25d43d', '1523381210434-271e8be1f52b', '1489987707025-afc232f7ea0f', '1434389677669-e08b4cac3105', '1515886657613-9f3515b0c78f', '1509631179647-0177331693ae', '1445205170230-053b83016050', '1556905055-8f358a7a47b2'],
  주얼리: ['1535632066927-ab7c9ab60908', '1611591437281-460bfbe1220a', '1515562141207-7a88fb7ce338', '1599643478518-a784e5dc4c8f', '1602173574767-37ac01994b2a', '1573408301185-9146fe634ad0'],
  가방: ['1584917865442-de89df76afd3', '1553062407-98eeb64c6a62', '1548036328-c9fa89d128fa', '1590874103328-eac38a683ce7', '1566150905458-1bf1fc113f0d', '1594223274512-ad4803739b7c'],
  모자: ['1521369909029-2afed882baee', '1588850561407-ed78c282e89b', '1575428652377-a2d80e2277fc', '1514327605112-b887c0e61c0a'],
  신발: ['1542291026-7eec264c27ff', '1460353581641-37baddab0fa2', '1549298916-b41d501d3772', '1525966222134-fcfa99b8ae77', '1595950653106-6c9ebd614d3a', '1600185365483-26d7a4cc7519'],
  '기타 액세서리': ['1576053139778-7e32f2ae3cfd', '1511499767150-a48a237f0083', '1590548784585-643d2b9f2925', '1624222247344-550fb60583dc', '1523170335258-f5ed11844a49'],
};
const SPACE = ['1441986300917-64674bd600d8', '1567401893414-76b7b1e5a7a5', '1555529669-e69e7aa0ba9a', '1497366216548-37526070297c', '1524758631624-e2822e304c36', '1519710164239-da123dc03ef4', '1586023492125-27b2c045efd7', '1600607687939-ce8a6c25118c', '1618221195710-dd6b41faaea6', '1513694203232-719a280e022f', '1493809842364-78817add7ffb', '1502672260266-1c1ef2d93688'];

// 데모 브랜드의 대표 카테고리. 새로 가입한 브랜드는 의류 사진으로 보여 준다
const BRAND_CAT: Record<string, string> = {
  b1: '의류', b2: '주얼리', b3: '가방', b4: '모자', b5: '주얼리', b6: '의류', b7: '기타 액세서리', b8: '의류', b9: '신발', b10: '의류', b11: '주얼리', b12: '가방', b13: '기타 액세서리',
};

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 룩북 사진 주소. 올린 사진이 없으면 브랜드 카테고리에 맞는 예시 사진 */
export function lookbookSrc(im: Pick<LookbookImage, 'id' | 'brandId'> & { photo?: string }): string {
  if (im.photo) return im.photo;
  const pool = POOL[BRAND_CAT[im.brandId] ?? '의류'];
  const n = Number(im.id.match(/(\d+)$/)?.[1] ?? hash(im.id));
  return u(pool[(n - 1 + hash(im.brandId)) % pool.length]);
}

/** 공간 사진 주소 (i번째). 올린 사진이 없으면 예시 매장 사진 */
export function spaceSrc(s: Pick<Space, 'id'> & { photos?: string[] }, i: number, w?: number): string {
  if (s.photos?.[i]) return s.photos[i];
  return u(SPACE[(hash(s.id) + i * 5) % SPACE.length], w);
}

/** 브랜드 대표 사진 (팝업 배너, 프로필 사진 자리). 첫 룩북 사진을 쓴다 */
export function brandCoverSrc(b: { id: string; lookbook: string[] }, images?: (Pick<LookbookImage, 'id' | 'brandId'> & { photo?: string })[]): string {
  const id = b.lookbook[0] ?? `${b.id}_img1`;
  const im = images?.find((x) => x.id === id);
  return lookbookSrc(im ?? { id, brandId: b.id });
}
