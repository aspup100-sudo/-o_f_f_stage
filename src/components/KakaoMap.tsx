// 카카오맵. VITE_KAKAO_MAP_KEY(JavaScript 키)가 있을 때만 켜지고,
// 키가 없거나 지도를 못 불러오면 fallback(간략 지도)을 그대로 보여 준다.
import { useEffect, useRef, useState, type ReactNode } from 'react';

const KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
export const kakaoMapEnabled = !!KEY;

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  tone: 'live' | 'soon' | 'selected';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { kakao?: any }
}

let sdk: Promise<any> | null = null;
function loadSdk(): Promise<any> {
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&libraries=services&autoload=false`;
    s.onload = () => (window.kakao?.maps ? window.kakao.maps.load(() => resolve(window.kakao)) : reject(new Error('카카오가 지도 코드를 주지 않았어요 (도메인 미등록 또는 카카오맵 사용 설정 꺼짐)')));
    s.onerror = () => reject(new Error('카카오 지도 서버에 연결하지 못했어요 (키 또는 도메인 확인 필요)'));
    document.head.appendChild(s);
  });
  sdk.catch(() => { sdk = null; });
  return sdk;
}

function pinEl(p: MapPin, onSelect: (id: string) => void) {
  const cls = p.tone === 'selected' ? 'bg-ink-900 text-white' : p.tone === 'live' ? 'bg-brand-500 text-white' : 'bg-white text-ink-900';
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'flex flex-col items-center';
  const tag = document.createElement('span');
  tag.className = `px-2 py-1 text-[12px] font-bold whitespace-nowrap border border-ink-900 flex items-center gap-1 ${cls}`;
  if (p.tone === 'live') {
    const dot = document.createElement('span');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400';
    tag.appendChild(dot);
  }
  tag.appendChild(document.createTextNode(p.label));
  const tail = document.createElement('span');
  tail.className = `w-2 h-2 rotate-45 -mt-1 border-r border-b border-ink-900 ${cls}`;
  el.append(tag, tail);
  el.addEventListener('click', () => onSelect(p.id));
  return el;
}

export function KakaoMap({ pins, onSelect, className, fallback }: { pins: MapPin[]; onSelect: (id: string) => void; className?: string; fallback: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(KEY ? 'loading' : 'failed');
  const [why, setWhy] = useState('');

  useEffect(() => {
    if (!KEY) return;
    let alive = true;
    loadSdk()
      .then((kakao) => {
        if (!alive || !box.current) return;
        const m = new kakao.maps.Map(box.current, { center: new kakao.maps.LatLng(37.555, 126.99), level: 7 });
        m.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
        map.current = m;
        setState('ready');
      })
      .catch((e: Error) => { if (alive) { setWhy(e.message); setState('failed'); } });
    return () => { alive = false; };
  }, []);

  // 핀은 바뀔 때마다 다시 그린다. 처음 한 번만 핀이 다 보이게 범위를 맞춘다
  const fitted = useRef(false);
  useEffect(() => {
    const kakao = window.kakao;
    const m = map.current;
    if (state !== 'ready' || !m || !kakao) return;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = pins.map((p) => {
      const o = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(p.lat, p.lng), content: pinEl(p, onSelect), yAnchor: 1, clickable: true, zIndex: p.tone === 'selected' ? 2 : 1 });
      o.setMap(m);
      return o;
    });
    if (!fitted.current && pins.length === 1) {
      m.setCenter(new kakao.maps.LatLng(pins[0].lat, pins[0].lng));
      m.setLevel(4);
      fitted.current = true;
    } else if (!fitted.current && pins.length) {
      const b = new kakao.maps.LatLngBounds();
      pins.forEach((p) => b.extend(new kakao.maps.LatLng(p.lat, p.lng)));
      m.setBounds(b, 60, 40, 40, 40);
      fitted.current = true;
    }
  }, [state, pins, onSelect]);

  if (state === 'failed') return <>{fallback}{KEY && why && <p className="text-[12px] text-red-600 mt-1 text-center">지도 오류: {why} · 접속 주소 {location.origin}</p>}</>;
  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={box} className="absolute inset-0" />
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-500 bg-ink-100">지도를 불러오는 중…</div>}
    </div>
  );
}

/** 주소 → [위도, 경도]. 카카오맵 키가 없거나 못 찾으면 null */
export async function geocode(address: string): Promise<[number, number] | null> {
  if (!KEY || !address.trim()) return null;
  try {
    const kakao = await loadSdk();
    return await new Promise((resolve) => {
      new kakao.maps.services.Geocoder().addressSearch(address, (res: { x: string; y: string }[], status: string) => {
        resolve(status === kakao.maps.services.Status.OK && res[0] ? [Number(res[0].y), Number(res[0].x)] : null);
      });
    });
  } catch {
    return null;
  }
}

declare global {
  interface Window { daum?: any }
}
let postcodeSdk: Promise<void> | null = null;
/** 카카오(다음) 우편번호 검색 창을 el 안에 띄운다. 키 없이 무료 */
export function openPostcode(el: HTMLElement, onPick: (r: { address: string; sigungu: string }) => void): Promise<boolean> {
  postcodeSdk ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    s.onload = () => resolve();
    s.onerror = () => { postcodeSdk = null; reject(new Error('postcode')); };
    document.head.appendChild(s);
  });
  return postcodeSdk
    .then(() => {
      new window.daum!.Postcode({
        width: '100%',
        height: '100%',
        oncomplete: (d: { roadAddress?: string; address: string; sigungu: string }) => onPick({ address: d.roadAddress || d.address, sigungu: d.sigungu }),
      }).embed(el);
      return true;
    })
    .catch(() => false);
}
