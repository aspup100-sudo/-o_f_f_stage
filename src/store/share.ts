import { toast } from './store';

export const PUBLIC_URL = 'https://aspup100-sudo.github.io/-o_f_f_stage/'; // 공개 웹 주소

/** 휴대폰이면 공유 시트, 아니면 링크를 복사한다. */
export async function shareLink(title: string, text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url: PUBLIC_URL });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${PUBLIC_URL}`);
    toast('링크를 복사했어요. 친구에게 붙여 넣어 보내 보세요');
  } catch {
    toast('공유를 취소했어요');
  }
}
