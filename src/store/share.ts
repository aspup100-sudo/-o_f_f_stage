import { toast, type LinkRoute } from './store';

export const PUBLIC_URL = 'https://aspup100-sudo.github.io/-o_f_f_stage/'; // 공개 웹 주소

/** 화면 주소. #/popup/p1 처럼 해시로 붙여야 GitHub Pages에서 404가 안 난다 */
export function linkTo(route?: LinkRoute) {
  return route ? `${PUBLIC_URL}#/${route.name}/${encodeURIComponent(route.id)}` : PUBLIC_URL;
}

/** 휴대폰이면 공유 시트, 아니면 링크를 복사한다. route를 주면 받은 사람이 그 화면으로 바로 들어온다 */
export async function shareLink(title: string, text: string, route?: LinkRoute) {
  const url = linkTo(route);
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('링크를 복사했어요. 친구에게 붙여 넣어 보내 보세요');
  } catch {
    toast('공유를 취소했어요');
  }
}
