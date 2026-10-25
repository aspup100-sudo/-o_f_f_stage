// 휴대폰 사진을 골라 작게 줄인 JPEG(data URL)로 돌려준다.
// 프로토타입이라 사진을 데이터에 바로 넣는다. 정식 서비스에서는 파일 저장소(Supabase Storage)로 옮긴다.
export function pickPhotos(max = 6, size = 900): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = max > 1;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, max);
      resolve((await Promise.all(files.map((f) => shrink(f, size)))).filter(Boolean) as string[]);
    };
    input.click();
  });
}

function shrink(file: File, size: number): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, size / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
