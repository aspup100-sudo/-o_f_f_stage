import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Grade, LookbookImage } from '@/types';
import { back } from '@/store/store';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

// ───────── 아이콘 ─────────
const paths: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  users: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21c0-4 4-6 8-6s8 2 8 6',
  plus: 'M12 5v14M5 12h14',
  building: 'M4 21V5l8-3 8 3v16M9 21v-4h6v4M8 8h2M14 8h2M8 12h2M14 12h2',
  team: 'M9 11a3 3 0 100-6 3 3 0 000 6zM17 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 2 6 5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-7 8-7s8 3 8 7',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  stamp: 'M12 3a4 4 0 00-2 7.5V14H6v3h12v-3h-4v-3.5A4 4 0 0012 3zM5 20h14',
  inbox: 'M3 13l3-8h12l3 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1zM3 13h5l1 3h6l1-3h5',
  chat: 'M4 5h16v11H8l-4 4z',
  bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0',
  back: 'M15 5l-7 7 7 7',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  pin: 'M12 21s-6-6-6-11a6 6 0 1112 0c0 5-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  swap: 'M7 7h13l-3-3M17 17H4l3 3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  cart: 'M3 4h2l2.5 11h11L21 7H6.5M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l8-8',
  medal: 'M8 3h8l-2.5 6h-3zM12 21a5 5 0 100-10 5 5 0 000 10z',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  flame: 'M12 21c-4 0-7-3-7-7 0-4 4-6 4-10 3 2 5 5 5 8 1-1 2-2 2-4 2 2 3 4 3 6 0 4-3 7-7 7z',
  megaphone: 'M4 10v4h3l8 4V6l-8 4zM18 9a4 4 0 010 6',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  hand: 'M8 13V5a1.5 1.5 0 013 0v6M11 11V4a1.5 1.5 0 013 0v7M14 11V6a1.5 1.5 0 013 0v8c0 4-3 7-6.5 7S5 18 4 15l-1-3a1.5 1.5 0 012.5-1.5L8 13',
  hanger: 'M10 7a2 2 0 112 2c-.8.4-1 .9-1 1.5V12l9 6H3l8-6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  repeat: 'M4 12a7 7 0 0112-5l2 2M20 12a7 7 0 01-12 5l-2-2M18 4v5h-5M6 20v-5h5',
  shirt: 'M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3c0 2-2 3-4 3S8 5 8 3z',
  bag: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 016 0v2',
  phone: 'M7 3h10v18H7zM11 18h2',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  question: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17h.01',
};
/** 글자 사이에 넣는 작은 아이콘. 글자 크기를 따라간다 */
export function Ic({ n, className }: { n: string; className?: string }) {
  return <Icon name={n} className={cx('inline-block w-[1.1em] h-[1.1em] align-[-0.2em] mr-[0.2em] shrink-0', className)} />;
}

export function Icon({ name, className = 'w-5 h-5', filled, tint, bold }: { name: keyof typeof paths | string; className?: string; filled?: boolean; tint?: boolean; bold?: boolean }) {
  // tint: 선 안쪽을 같은 색으로 옅게 채운다 (선택된 탭 등)
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled || tint ? 'currentColor' : 'none'} fillOpacity={tint && !filled ? 0.2 : undefined} stroke="currentColor" strokeWidth={bold ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.sparkle} />
    </svg>
  );
}

// ───────── 기본 요소 ─────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
export function Button({
  children, onClick, variant = 'primary', className, disabled, size = 'md', type = 'button', full,
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; disabled?: boolean; size?: 'sm' | 'md' | 'lg'; type?: 'button' | 'submit'; full?: boolean;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand-500 text-white active:bg-brand-600 disabled:bg-ink-300',
    secondary: 'bg-white text-ink-900 border border-ink-300 active:bg-ink-100 disabled:text-ink-300',
    ghost: 'text-ink-700 active:bg-ink-100',
    danger: 'bg-red-50 text-red-600 border border-red-200 active:bg-red-100',
    dark: 'bg-ink-900 text-white active:bg-ink-700 disabled:bg-ink-300',
  };
  const s = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-base' }[size];
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cx('rounded-xl font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap', v[variant], s, full && 'w-full', className)}>
      {children}
    </button>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('bg-white rounded-2xl border border-ink-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', onClick && 'cursor-pointer active:bg-ink-100/40', className)}>
      {children}
    </div>
  );
}

export function Chip({ children, active, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cx('px-3 h-8 rounded-full text-xs font-medium border whitespace-nowrap transition-colors', active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-700 border-ink-300', className)}>
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'yellow' }) {
  const t = {
    gray: 'bg-ink-100 text-ink-700', orange: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700', purple: 'bg-violet-50 text-violet-700', red: 'bg-red-50 text-red-600', yellow: 'bg-amber-50 text-amber-700',
  }[tone];
  return <span className={cx('inline-flex items-center px-2 h-6 rounded-md text-[11px] font-medium whitespace-nowrap', t)}>{children}</span>;
}

export function Demo({ children = '데모' }: { children?: ReactNode }) {
  return <span className="inline-flex items-center px-1.5 h-5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold align-middle">({children})</span>;
}

const gradeStyle: Record<Grade, { cls: string; icon: string }> = {
  새싹: { cls: 'bg-lime-50 text-lime-700 border-lime-200', icon: 'leaf' },
  브론즈: { cls: 'bg-orange-50 text-orange-800 border-orange-200', icon: 'medal' },
  실버: { cls: 'bg-slate-50 text-slate-700 border-slate-300', icon: 'medal' },
  골드: { cls: 'bg-yellow-50 text-yellow-800 border-yellow-300', icon: 'medal' },
};
export function GradeBadge({ grade, small }: { grade: Grade; small?: boolean }) {
  const g = gradeStyle[grade];
  return (
    <span className={cx('inline-flex items-center gap-0.5 border rounded-full font-semibold whitespace-nowrap', g.cls, small ? 'px-1.5 h-5 text-[10px]' : 'px-2 h-6 text-xs')}>
      <Icon name={g.icon} className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {grade}
    </span>
  );
}

/** 실제 사진 대신 색과 패턴으로 그리는 이미지 자리 */
export function Swatch({ hue, pattern = 'solid', label, className, rounded = 'rounded-xl' }: { hue: number; pattern?: LookbookImage['pattern']; label?: string; className?: string; rounded?: string }) {
  const c1 = `hsl(${hue} 45% 82%)`;
  const c2 = `hsl(${hue} 40% 68%)`;
  const c3 = `hsl(${hue} 35% 38%)`;
  const bg: Record<string, string> = {
    solid: `linear-gradient(160deg, ${c1}, ${c2})`,
    stripe: `repeating-linear-gradient(45deg, ${c1} 0 10px, ${c2} 10px 20px)`,
    dot: `radial-gradient(${c2} 20%, transparent 21%) 0 0/14px 14px, ${c1}`,
    grid: `linear-gradient(${c2} 1px, transparent 1px) 0 0/16px 16px, linear-gradient(90deg, ${c2} 1px, ${c1} 1px) 0 0/16px 16px`,
    wave: `radial-gradient(circle at 50% 120%, ${c2} 40%, transparent 41%) 0 0/28px 20px, ${c1}`,
    circle: `radial-gradient(circle at 50% 45%, ${c2} 0 30%, ${c1} 31%)`,
  };
  return (
    <div className={cx('relative overflow-hidden', rounded, className)} style={{ background: bg[pattern] }}>
      {label && (
        <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded bg-white/80 text-[10px] font-medium" style={{ color: c3 }}>
          {label}
        </span>
      )}
    </div>
  );
}

export function Avatar({ name, hue = 20, size = 40 }: { name: string; hue?: number; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, background: `hsl(${hue} 45% 55%)`, fontSize: size * 0.4 }}>
      {name.slice(0, 1)}
    </div>
  );
}

export function SubHeader({ title, right, onBack }: { title: ReactNode; right?: ReactNode; onBack?: () => void }) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-ink-100 h-12 flex items-center px-2">
      <button onClick={onBack ?? back} className="w-10 h-10 flex items-center justify-center text-ink-900" aria-label="뒤로">
        <Icon name="back" />
      </button>
      <div className="flex-1 font-bold text-[15px] truncate">{title}</div>
      <div className="flex items-center gap-1 pr-1">{right}</div>
    </div>
  );
}

export function Section({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('px-4 py-4', className)}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children, icon = 'sparkle', action }: { children: ReactNode; icon?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-10 flex flex-col items-center text-ink-500 text-sm gap-2 text-center">
      <Icon name={icon} className="w-8 h-8 text-ink-300" />
      {children}
      {action && <button onClick={action.onClick} className="mt-1 h-9 px-4 rounded-full bg-ink-900 text-white text-[13px] font-semibold">{action.label}</button>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] h-full flex flex-col justify-end pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto pb-safe-lg">
          <div className="sticky top-0 bg-white flex items-center px-4 pt-4 pb-2 z-10">
            <div className="flex-1 font-bold text-base">{title}</div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-ink-500" aria-label="닫기">
              <Icon name="x" />
            </button>
          </div>
          <div className="px-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children, hint, required }: { label: ReactNode; children: ReactNode; hint?: ReactNode; required?: boolean }) {
  return (
    <label className="block mb-4">
      <div className="text-[13px] font-semibold mb-1.5 text-ink-700">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </div>
      {children}
      {hint && <div className="text-[11px] text-ink-500 mt-1">{hint}</div>}
    </label>
  );
}

export const inputCls = 'w-full h-11 px-3 rounded-xl border border-ink-300 bg-white text-sm outline-none focus:border-ink-900';
export const textareaCls = 'w-full min-h-[88px] p-3 rounded-xl border border-ink-300 bg-white text-sm outline-none focus:border-ink-900';

export function Stars({ value, onChange, size = 'w-6 h-6' }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={n <= value ? 'text-amber-400' : 'text-ink-300'}>
          <Icon name="star" filled className={size} />
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ items, value, onChange, className }: { items: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void; className?: string }) {
  return (
    <div className={cx('relative bg-white', className)}>
      <div className="flex border-b border-ink-100 overflow-x-auto no-scrollbar">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={(e) => { onChange(it.key); e.currentTarget.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }}
            className={cx('px-3.5 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px', value === it.key ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500')}
          >
            {it.label}
          </button>
        ))}
        {items.length > 4 && <span className="w-6 shrink-0" />}
      </div>
      {items.length > 4 && <div className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-white to-transparent" />}
    </div>
  );
}

export function Segmented<T extends string>({ items, value, onChange }: { items: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="flex bg-ink-100 rounded-xl p-1">
      {items.map((it) => (
        <button key={it.key} onClick={() => onChange(it.key)} className={cx('flex-1 h-9 rounded-lg text-sm font-semibold', value === it.key ? 'bg-white shadow text-ink-900' : 'text-ink-500')}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Collapse({ title, children, defaultOpen }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-ink-100">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left">
        <div className="flex-1">{title}</div>
        <span className={cx('text-ink-500 transition-transform', open && 'rotate-90')}>›</span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, 'green' | 'yellow' | 'gray' | 'blue' | 'red' | 'orange'> = {
    '모집 중': 'green', '협의 중': 'yellow', 마감: 'gray', '진행 중': 'orange', 예정: 'blue', 종료: 'gray',
    pending: 'yellow', accepted: 'green', rejected: 'red', '준비 중': 'blue', '운영 중': 'orange',
  };
  const label: Record<string, string> = { pending: '대기', accepted: '수락', rejected: '거절' };
  return <Tag tone={tone[status] ?? 'gray'}>{label[status] ?? status}</Tag>;
}
