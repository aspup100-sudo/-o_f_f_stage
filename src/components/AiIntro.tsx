// 브랜드 소개 입력칸 + "AI 텍스트 생성" 버튼.
// 버튼을 누르면 팝업이 떠서 키워드나 대충 쓴 내용을 받고, [생성]을 누르면 소개글을 써서 입력칸에 넣어 준다.
// 입력칸은 그대로 열려 있어서 직접 쓰거나, AI가 쓴 글을 고쳐 쓸 수 있다.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { askAi, type BrandIntroOut } from '@/store/ai';
import { AiSource, Button, Icon, cx, textareaCls } from './ui';
import type { ThemeTags } from '@/types';

export interface BrandInfo {
  name?: string;
  tags?: ThemeTags;
}

const EXAMPLES = ['핸드메이드 니트', '빈티지 원단 리폼', '성수 작업실', '오래 입는 옷', '20대 여성', '자연 염색'];

export function BrandIntroField({ value, onChange, brand, maxLength, label = '브랜드 소개', placeholder }: {
  value: string;
  onChange: (v: string) => void;
  brand: BrandInfo;
  maxLength?: number;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<'ai' | 'example' | null>(null);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-ink-700">{label}</span>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-brand-500 text-brand-600 text-[12px] font-semibold active:bg-brand-50">
          <Icon name="sparkle" className="w-3.5 h-3.5" />AI 텍스트 생성
        </button>
      </div>
      <textarea
        className={textareaCls}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '직접 쓰거나, AI 텍스트 생성으로 초안을 받아 고쳐 쓰세요'}
      />
      <div className="flex items-center justify-between mt-1 min-h-[16px]">
        <span>{source && <AiSource source={source} />}</span>
        {maxLength && <span className="text-[11px] text-ink-500">{value.length}/{maxLength}</span>}
      </div>
      <AiIntroDialog
        open={open}
        onClose={() => setOpen(false)}
        brand={brand}
        maxLength={maxLength}
        onDone={(text, src) => { onChange(text); setSource(src); setOpen(false); }}
      />
    </div>
  );
}

function AiIntroDialog({ open, onClose, brand, maxLength, onDone }: {
  open: boolean;
  onClose: () => void;
  brand: BrandInfo;
  maxLength?: number;
  onDone: (text: string, source: 'ai' | 'example') => void;
}) {
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);

  // 열릴 때마다 진행 상태만 초기화 (적어 둔 키워드는 남겨서 다시 생성하기 쉽게)
  useEffect(() => { if (open) setBusy(false); }, [open]);
  if (!open) return null;

  const addChip = (k: string) => setKeywords((cur) => (cur.includes(k) ? cur : cur.trim() ? `${cur.trim()}, ${k}` : k));

  const generate = async () => {
    if (!keywords.trim() || busy) return;
    setBusy(true);
    const r = await askAi<BrandIntroOut>('brand', {
      브랜드이름: brand.name || '(미정)',
      키워드와메모: keywords.trim(),
      무드: brand.tags?.moods ?? [],
      카테고리: brand.tags?.categories ?? [],
      가격대: brand.tags?.price ?? '',
      고객층: brand.tags?.ages ?? [],
      최대글자수: maxLength ?? 300,
    }, () => ({ intro: exampleIntro(keywords, brand, maxLength) }));
    let text = r.result.intro.trim();
    if (maxLength && text.length > maxLength) text = text.slice(0, maxLength);
    setBusy(false);
    onDone(text, r.source);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="ai-intro-title" className="relative w-full max-w-[380px] bg-white rounded shadow-xl">
        <div className="px-5 pt-5">
          <div className="flex items-center gap-1.5">
            <Icon name="sparkle" className="w-5 h-5 text-brand-500" />
            <h2 id="ai-intro-title" className="font-extrabold text-base">AI 브랜드 소개 생성</h2>
          </div>
          <p className="text-[12px] text-ink-500 mt-1 leading-relaxed">
            키워드나 생각나는 내용을 대충 적어 주세요. 고른 무드·카테고리와 합쳐서 소개글을 써 드려요.
          </p>
          <textarea
            autoFocus
            className={cx(textareaCls, 'mt-3 min-h-[110px]')}
            maxLength={300}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={'예) 직접 짠 니트, 빈티지 원단, 성수 작업실,\n오래 입어도 질리지 않는 옷'}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map((k) => (
              <button key={k} type="button" onClick={() => addChip(k)} className="px-2.5 h-7 rounded-full border border-ink-300 text-[12px] text-ink-700 active:bg-ink-100">+ {k}</button>
            ))}
          </div>
          {(brand.tags?.moods.length || brand.tags?.categories.length) ? (
            <p className="text-[11px] text-ink-500 mt-2.5">같이 반영: {[...(brand.tags?.moods ?? []), ...(brand.tags?.categories ?? [])].join(' · ')}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 p-5 pt-4">
          <Button variant="secondary" size="lg" disabled={busy} onClick={onClose}>취소</Button>
          <Button size="lg" disabled={!keywords.trim() || busy} onClick={generate}>{busy ? '쓰는 중…' : '생성'}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// AI 서버가 없을 때 쓰는 예시 문구. 입력한 키워드로 짧은 소개를 만든다.
function exampleIntro(raw: string, brand: BrandInfo, maxLength?: number) {
  const kws = raw.split(/[,\n·/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const name = brand.name?.trim();
  const mood = brand.tags?.moods[0];
  const cat = brand.tags?.categories[0] ?? '옷';
  const ages = brand.tags?.ages.join(', ');
  const head = kws.length ? `${kws.slice(0, 2).join(', ')}` : '작은 작업실';
  const lines = [
    `${name ? `${name}${josa(name)} ` : ''}${head}에서 출발한 ${mood ? `${mood} 무드의 ` : ''}${cat} 브랜드예요.`,
    kws.length > 2 ? `'${kws.slice(2).join(`', '`)}', 이 마음을 놓치지 않으려 해요.` : '유행보다 오래 곁에 두는 물건을 만들어요.',
    ages ? `${ages} 손님들이 일상에서 편하게 꺼내 쓰는 걸 생각해요.` : '',
  ].filter(Boolean);
  let text = lines.join(' ');
  if (maxLength && text.length > maxLength) text = lines[0].slice(0, maxLength);
  return text;
}

// 받침이 있으면 '은', 없으면 '는'
function josa(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '는';
  return (c - 0xac00) % 28 ? '은' : '는';
}
