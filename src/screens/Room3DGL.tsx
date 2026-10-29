// 실사에 가까운 3D 매장 보기 (three.js).
// 조감도: 손가락으로 돌리고 두 손가락으로 확대. 걸어 보기: 눈높이 1.6m에서 밀어서 둘러보고, 바닥을 누르면 그쪽으로 걸어간다.
// 좌표: 평면도의 x → 3D x, 평면도의 y → 3D z. 단위는 미터.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import type { LayoutBox } from '@/types';

export type ViewMode = 'orbit' | 'walk';
type Pt = { x: number; y: number };

export interface Room3DProps {
  W: number; H: number; boxes: LayoutBox[]; path?: Pt[]; wallPhoto: string; mode: ViewMode;
  colorOf: (id?: string) => string; photoOf: (b: LayoutBox) => string | undefined; nameOf: (id?: string) => string; moodOf?: (id?: string) => string | undefined;
  catOf?: (id?: string) => string | undefined; // 브랜드 대표 카테고리: 진열대 상품 모양을 정한다
  selected: string | null; onPick: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void; // 3D에서 고른 물건을 끌어 옮겼을 때
}

const WALL_H = 2.8;
const EYE = 1.6;
const DOOR = 1.4;

// ───────── 재질 ─────────

function woodTexture() {
  // 가로 폭 0.2m, 길이 2m 남짓한 긴 마루판. 판마다 이음매를 엇갈리게
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d')!;
  const plank = 96;
  const cols = Math.ceil(c.width / plank);
  for (let i = 0; i < cols; i++) {
    const joint = (i * 397) % 1024;
    [[joint - 1024, joint], [joint, joint + 1024]].forEach(([y0, y1], k) => {
      const tone = 192 + Math.round(Math.sin(i * 5.3 + k * 2.1) * 9);
      g.fillStyle = `rgb(${tone}, ${tone - 34}, ${tone - 72})`;
      g.fillRect(i * plank, y0, plank, y1 - y0);
      g.fillStyle = 'rgba(70,45,20,.45)';
      g.fillRect(i * plank, y0, plank, 2);
    });
    // 나뭇결
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `rgba(110,75,40,${0.06 + (k % 3) * 0.03})`;
      g.lineWidth = 1 + (k % 2);
      g.beginPath();
      const x = i * plank + 10 + k * 12;
      g.moveTo(x, 0);
      for (let y = 0; y <= 1024; y += 64) g.lineTo(x + Math.sin(y / 90 + i + k) * 3, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(70,45,20,.5)';
    g.fillRect(i * plank, 0, 2, 1024);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function fabricTexture(color: string) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d')!;
  for (let x = 0; x < 256; x++) {
    const k = 0.82 + 0.18 * Math.sin(x / 9);
    g.fillStyle = color;
    g.fillRect(x, 0, 1, 64);
    g.fillStyle = `rgba(0,0,0,${(1 - k) * 0.9})`;
    g.fillRect(x, 0, 1, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function plasterTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f1eee8';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(150,135,115,.08)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');
// 사진은 다 받아진 뒤에만 입힌다. 못 받으면 브랜드 색으로 남는다(검게 나오지 않게)
const photoCache = new Map<string, Promise<THREE.Texture>>();
const photoReady = new Map<string, THREE.Texture>();
let onTextureLoad = () => {};
function loadPhoto(src: string) {
  let pr = photoCache.get(src);
  if (!pr) {
    pr = new Promise((resolve, reject) => loader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; photoReady.set(src, t); resolve(t); }, undefined, reject));
    pr.catch(() => photoCache.delete(src));
    photoCache.set(src, pr);
  }
  return pr;
}
/** 색으로 먼저 그리고, 사진이 오면 바꿔 입힌다. 이미 받은 사진은 바로 입힌다(다시 그릴 때 깜빡이지 않게).
 *  사진 한 장을 여러 물건이 같이 쓰고, 사진의 어느 부분을 쓸지는 모양의 UV(remapUV)로 정한다 */
function photoMat(src: string | undefined, fallback: THREE.ColorRepresentation, roughness: number) {
  const mat = new THREE.MeshStandardMaterial({ color: fallback, roughness });
  if (!src) return mat;
  const put = (t: THREE.Texture) => { mat.map = t; mat.color.set('#ffffff'); mat.needsUpdate = true; };
  const ready = photoReady.get(src);
  if (ready) put(ready);
  else loadPhoto(src).then((t) => { put(t); onTextureLoad(); }).catch(() => {});
  return mat;
}
// 옷감: 회색 결 무늬(색은 재질 색으로 입힌다). UV가 미터 단위라 반복해서 쓴다
let weaveTex: THREE.Texture | null = null;
function weaveTexture() {
  if (weaveTex) return weaveTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e9e9e9';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.03})`; g.fillRect(0, y, 128, 1); }
  for (let x = 0; x < 128; x += 2) { g.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.04})`; g.fillRect(x, 0, 1, 128); }
  // 세로로 늘어진 주름
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 128;
    const grd = g.createLinearGradient(x - 8, 0, x + 8, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x - 8, 0, 16, 128);
  }
  weaveTex = new THREE.CanvasTexture(c);
  weaveTex.wrapS = weaveTex.wrapT = THREE.RepeatWrapping;
  weaveTex.repeat.set(3, 3);
  weaveTex.colorSpace = THREE.SRGBColorSpace;
  return weaveTex;
}

// 브랜드 사진에서 대표 색 몇 개를 뽑는다(옷 색으로 씀)
const paletteCache = new Map<string, Promise<THREE.Color[]>>();
function photoPalette(src: string) {
  let pr = paletteCache.get(src);
  if (!pr) {
    pr = loadPhoto(src).then((t) => {
      const c = document.createElement('canvas');
      c.width = c.height = 10;
      const g = c.getContext('2d')!;
      g.drawImage(t.image as CanvasImageSource, 0, 0, 10, 10);
      const d = g.getImageData(0, 0, 10, 10).data;
      const px: [number, number, number][] = [];
      for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      // 채도 높은 색부터 보고, 서로 비슷한 색은 하나만
      const sat = (p: number[]) => Math.max(...p) - Math.min(...p);
      px.sort((a, b) => sat(b) - sat(a));
      const out: [number, number, number][] = [];
      px.forEach((p) => { if (out.length < 6 && out.every((q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 70)) out.push(p); });
      return out.map(([r, g2, b]) => new THREE.Color(`rgb(${r},${g2},${b})`));
    });
    pr.catch(() => paletteCache.delete(src));
    paletteCache.set(src, pr);
  }
  return pr;
}
/** 옷 재질: 결 무늬 + 브랜드 사진에서 뽑은 색(사진을 못 받으면 브랜드 색) */
function clothMat(src: string | undefined, fallback: THREE.Color, i: number, roughness: number) {
  const mat = new THREE.MeshStandardMaterial({ color: fallback, map: weaveTexture(), roughness });
  if (src) photoPalette(src).then((pal) => { if (pal.length) { mat.color.copy(pal[i % pal.length]).multiplyScalar(0.92 + ((i * 7) % 3) * 0.05); onTextureLoad(); } }).catch(() => {});
  return mat;
}

function remapUV(geo: THREE.BufferGeometry, rx: number, ry: number, ox: number, oy: number) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.min(1, Math.max(0, uv.getX(i) * rx + ox)), Math.min(1, Math.max(0, uv.getY(i) * ry + oy)));
  uv.needsUpdate = true;
  return geo;
}

// 옷 모양: 목선, 어깨, 소매(긴팔·반팔·민소매)가 있는 판
function garmentShape(w: number, len: number, sleeve: 'long' | 'short' | 'none', flare = 0) {
  const sw = w / 2; // 소매 바깥
  const bw = sleeve === 'none' ? w * 0.4 : w * 0.36; // 몸판 반폭
  const s = new THREE.Shape();
  s.moveTo(-0.065, 0);
  s.quadraticCurveTo(0, -0.06, 0.065, 0);
  const side = (k: 1 | -1) => {
    const pts: [number, number][] = [];
    if (sleeve === 'none') {
      pts.push([k * bw * 0.7, -0.03], [k * bw, -0.2]);
    } else if (sleeve === 'short') {
      pts.push([k * bw, -0.05], [k * sw, -0.12], [k * (sw - 0.03), -0.27], [k * bw, -0.24]);
    } else {
      const cuff = -Math.min(len * 0.78, 0.66);
      pts.push([k * bw, -0.05], [k * sw, -0.11], [k * (sw - 0.005), cuff], [k * (sw - 0.075), cuff], [k * (bw + 0.004), -0.26]);
    }
    pts.push([k * (bw + 0.012 + flare), -len]);
    return pts;
  };
  side(1).forEach(([x, y]) => s.lineTo(x, y));
  // 밑단은 살짝 둥글게
  const left = side(-1).reverse();
  s.quadraticCurveTo(0, -len - 0.02, left[0][0], left[0][1]);
  left.slice(1).forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  return s;
}

// 브랜드 이름 간판(흰 판 + 검은 글자) 텍스처
const signCache = new Map<string, THREE.Texture>();
function signTexture(name: string) {
  const hit = signCache.get(name);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf8'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#141414';
  let size = 64;
  g.font = `800 ${size}px Pretendard, sans-serif`;
  while (g.measureText(name).width > 440 && size > 28) { size -= 4; g.font = `800 ${size}px Pretendard, sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  signCache.set(name, t);
  return t;
}

// ───────── 물건 만들기 ─────────

function shade(color: string, k: number) {
  return new THREE.Color(color).multiplyScalar(k);
}

// 벽과 바닥이 만나는 구석의 은은한 어두움(구석 그림자 흉내)
let aoTex: THREE.Texture | null = null;
function aoMat() {
  if (!aoTex) {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 64, 0, 0);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.35, 'rgba(0,0,0,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 4, 64);
    aoTex = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: 0.22, depthWrite: false });
}

// 브랜드를 정해 둘 수 있는 물건(이름표·조명·동선 대상)
const BRAND_KINDS: LayoutBox['kind'][] = ['hanger', 'table', 'photo', 'mannequin', 'shelf'];

// 바닥에 닿는 부분의 부드러운 그림자(가장자리로 갈수록 옅게)
let contactTex: THREE.Texture | null = null;
function contactShadow(w: number, d: number, strength: number) {
  if (!contactTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    contactTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, opacity: strength, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.renderOrder = 1;
  return m;
}

// 브랜드 무드마다 집기와 옷 모양을 다르게: 같은 매장 안에서도 브랜드 구역이 구분되게
type Sleeve = 'long' | 'short' | 'none';
type Look = { frame: string; top: string; cut: { len: number; sleeve: Sleeve; flare?: number; wide?: number; thick?: number }[]; twist: number };
const LOOKS: Record<string, Look> = {
  미니멀: { frame: 'chrome', top: 'white', twist: 0.02, cut: [{ len: 0.8, sleeve: 'long' }, { len: 0.8, sleeve: 'short' }] },
  빈티지: { frame: 'brass', top: 'woodDark', twist: 0.12, cut: [{ len: 1.1, sleeve: 'long', flare: 0.03 }, { len: 0.85, sleeve: 'long' }, { len: 1.15, sleeve: 'long', flare: 0.04 }] },
  클래식: { frame: 'brass', top: 'woodDark', twist: 0.05, cut: [{ len: 1.05, sleeve: 'long' }, { len: 0.78, sleeve: 'long' }] },
  스트릿: { frame: 'black', top: 'black', twist: 0.16, cut: [{ len: 0.72, sleeve: 'long', wide: 1.12, thick: 0.05 }, { len: 0.68, sleeve: 'short', wide: 1.1 }] },
  페미닌: { frame: 'brass', top: 'white', twist: 0.08, cut: [{ len: 1.1, sleeve: 'none', flare: 0.09 }, { len: 0.95, sleeve: 'short', flare: 0.07 }, { len: 0.6, sleeve: 'short' }] },
  아웃도어: { frame: 'black', top: 'wood', twist: 0.1, cut: [{ len: 0.78, sleeve: 'long', wide: 1.1, thick: 0.08 }, { len: 0.7, sleeve: 'long', thick: 0.06 }] },
  Y2K: { frame: 'chrome', top: 'white', twist: 0.12, cut: [{ len: 0.5, sleeve: 'short' }, { len: 0.55, sleeve: 'none' }, { len: 0.85, sleeve: 'none', flare: 0.05 }] },
  내추럴: { frame: 'wood', top: 'wood', twist: 0.1, cut: [{ len: 0.9, sleeve: 'long', flare: 0.02 }, { len: 0.75, sleeve: 'short' }, { len: 1.05, sleeve: 'none', flare: 0.05 }] },
  아방가르드: { frame: 'black', top: 'concrete', twist: 0.2, cut: [{ len: 1.2, sleeve: 'long', flare: 0.06 }, { len: 0.6, sleeve: 'none', wide: 1.15 }, { len: 0.95, sleeve: 'short' }] },
};
const BASE_LOOK: Look = { frame: 'metal', top: 'wood', twist: 0.12, cut: [{ len: 0.85, sleeve: 'long' }, { len: 0.7, sleeve: 'short' }, { len: 1.05, sleeve: 'none' }, { len: 0.75, sleeve: 'long' }, { len: 0.95, sleeve: 'short' }, { len: 0.65, sleeve: 'short' }] };

function buildItem(b: LayoutBox, photo: string | undefined, color: string, mats: Record<string, THREE.Material>, cat?: string, name?: string, mood?: string) {
  const look = (mood && LOOKS[mood]) || BASE_LOOK;
  const frame = mats[look.frame] ?? mats.metal;
  const g = new THREE.Group();
  const along = b.w >= b.h;
  const L = along ? b.w : b.h;
  const D = along ? b.h : b.w;
  // 행거 봉 방향이 x축이 되도록 그룹 안에서 그리고, 세로로 놓인 물건은 90도 돌린다
  const inner = new THREE.Group();
  g.add(inner);
  g.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
  g.userData.boxId = b.id;
  if (!along) inner.rotation.y = Math.PI / 2;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.boxId = b.id;
    inner.add(m);
    return m;
  };

  if (b.kind === 'hanger') {
    const thickPole = look.frame === 'wood' ? 0.022 : 0.014;
    const pole = new THREE.CylinderGeometry(thickPole, thickPole, 1.55, 12);
    [-L / 2 + 0.05, L / 2 - 0.05].forEach((x) => {
      add(pole, frame, x, 0.775, 0);
      add(new THREE.BoxGeometry(0.03, 0.025, D - 0.05), frame, x, 0.0125, 0);
    });
    const rail = add(new THREE.CylinderGeometry(0.012, 0.012, L - 0.1, 12), frame, 0, 1.52, 0);
    rail.rotation.z = Math.PI / 2;
    const n = Math.max(4, Math.round(L / (look.cut[0].thick ? 0.13 : 0.1)));
    for (let i = 0; i < n; i++) {
      const c = look.cut[i % look.cut.length];
      const len = c.len * (1 + Math.sin(i * 9.1) * 0.03);
      const th = c.thick ?? 0.035;
      const geo = new THREE.ExtrudeGeometry(garmentShape(Math.min(D - 0.02, 0.6) * (c.wide ?? 1), len, c.sleeve, c.flare ?? 0), { depth: th, bevelEnabled: true, bevelSize: 0.008, bevelThickness: th > 0.04 ? 0.02 : 0.008, bevelSegments: 2 });
      const mat = clothMat(photo, shade(color, 0.75 + ((i * 7) % 5) * 0.07), i, th > 0.04 ? 0.7 : 0.92);
      const m = add(geo, mat, -L / 2 + 0.12 + (i * (L - 0.24)) / Math.max(1, n - 1), 1.47, 0);
      // 옷마다 살짝 비틀리고 간격이 고르지 않게(미니멀은 반듯하게)
      m.rotation.y = Math.PI / 2 + Math.sin(i * 12.9898) * look.twist;
      m.position.x -= th / 2 - Math.sin(i * 78.233) * look.twist * 0.1;
      // 옷걸이
      const hook = add(new THREE.TorusGeometry(0.025, 0.004, 6, 12, Math.PI * 1.4), look.frame === 'brass' ? frame : mats.metal, m.position.x + th / 2, 1.54, 0);
      hook.rotation.y = Math.PI / 2;
    }
  } else if (b.kind === 'table') {
    const top = add(new THREE.BoxGeometry(L, 0.04, D), mats[look.top] ?? mats.wood, 0, 0.76, 0);
    top.receiveShadow = true;
    if (look.top === 'concrete' || look.top === 'black') {
      // 받침대형: 상판 아래 통짜 받침
      add(new THREE.BoxGeometry(L * 0.7, 0.74, D * 0.6), mats[look.top], 0, 0.37, 0);
    } else {
      const leg = new THREE.CylinderGeometry(0.022, 0.018, 0.74, 10);
      const legMat = look.frame === 'brass' || look.frame === 'chrome' ? frame : mats.woodDark;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(leg, legMat, sx * (L / 2 - 0.06), 0.37, sz * (D / 2 - 0.06)));
    }
    // 위에 놓인 상품: 카테고리에 따라 모양을 달리한다
    const y0 = 0.78;
    if (cat === '주얼리' || cat === '기타 액세서리') {
      // 벨벳 트레이 위 반지·목걸이
      const velvet = new THREE.MeshStandardMaterial({ color: '#2f2b2a', roughness: 1 });
      const gold = new THREE.MeshStandardMaterial({ color: '#d9b26a', metalness: 1, roughness: 0.25 });
      const silver = new THREE.MeshStandardMaterial({ color: '#d6d8db', metalness: 1, roughness: 0.2 });
      [[-L / 4, 0], [L / 4, 0]].forEach(([tx, tz], k) => {
        add(new THREE.BoxGeometry(L / 2 - 0.12, 0.03, D - 0.25), velvet, tx, y0 + 0.015, tz);
        for (let i = 0; i < 6; i++) {
          const ring = add(new THREE.TorusGeometry(0.018, 0.004, 8, 20), (i + k) % 2 ? gold : silver, tx - 0.15 + (i % 3) * 0.15, y0 + 0.04, tz - 0.08 + Math.floor(i / 3) * 0.16);
          ring.rotation.x = Math.PI / 2.4;
        }
      });
      // 목걸이 스탠드
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8), mats.black, 0, y0 + 0.15, -D / 2 + 0.1);
      add(new THREE.BoxGeometry(0.16, 0.012, 0.012), mats.black, 0, y0 + 0.3, -D / 2 + 0.1);
    } else if (cat === '가방') {
      // 손잡이 달린 가방 세 개
      [-L / 3, 0, L / 3].forEach((x, i) => {
        const bagMat = photoMat(photo, shade(color, 0.7 + i * 0.1), 0.7);
        add(new THREE.BoxGeometry(0.28, 0.22, 0.1), bagMat, x, y0 + 0.11, (i - 1) * 0.08);
        const handle = add(new THREE.TorusGeometry(0.07, 0.008, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: shade(color, 0.5), roughness: 0.6 }), x, y0 + 0.22, (i - 1) * 0.08);
        handle.castShadow = true;
      });
    } else if (cat === '모자') {
      [-L / 3, 0, L / 3].forEach((x, i) => {
        const capMat = photoMat(photo, shade(color, 0.7 + i * 0.1), 0.85);
        const crown = add(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat, x, y0, 0);
        crown.scale.set(1, 0.9, 1);
        add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 24), capMat, x, y0 + 0.005, 0);
      });
    } else if (cat === '신발') {
      [-L / 3, 0, L / 3].forEach((x, i) => {
        const shoe = photoMat(photo, shade(color, 0.75 + i * 0.08), 0.6);
        [-0.06, 0.06].forEach((dz) => {
          add(new THREE.BoxGeometry(0.1, 0.07, 0.26), shoe, x + dz, y0 + 0.035, 0);
          add(new THREE.BoxGeometry(0.1, 0.02, 0.27), mats.white, x + dz, y0 + 0.01, 0);
        });
      });
    } else {
      // 개어 놓은 옷 더미 두세 개
      [[-L / 3, -0.05, 4], [0, 0.08, 3], [L / 3, -0.02, 5]].forEach(([x, z, n], k) => {
        for (let i = 0; i < n; i++) {
          const fold = clothMat(photo, shade(color, 0.72 + ((i + k) % 4) * 0.08), i + k * 2, 0.95);
          const m = add(new THREE.BoxGeometry(0.3, 0.035, 0.24), fold, x + Math.sin(i * 3.1) * 0.01, y0 + 0.018 + i * 0.037, z + Math.cos(i * 2.3) * 0.01);
          m.rotation.y = Math.sin(i * 5.7) * 0.05;
        }
      });
    }
  } else if (b.kind === 'fit') {
    // 커튼 두 면과 위 봉
    const curtainGeo = (len: number) => {
      const geo = new THREE.PlaneGeometry(len, 2.05, 48, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 38) * 0.03);
      geo.computeVertexNormals();
      return geo;
    };
    inner.rotation.y = 0;
    add(curtainGeo(b.w), mats.curtain, 0, 1.08, b.h / 2);
    const side = add(curtainGeo(b.h), mats.curtain, -b.w / 2, 1.08, 0);
    side.rotation.y = Math.PI / 2;
    const rail = add(new THREE.CylinderGeometry(0.012, 0.012, b.w, 8), mats.metal, 0, 2.12, b.h / 2);
    rail.rotation.z = Math.PI / 2;
  } else if (b.kind === 'mirror') {
    inner.rotation.y = 0;
    add(new THREE.BoxGeometry(b.w + 0.02, 1.8, b.h + 0.06), mats.black, 0, 0.95, 0);
    // 진짜로 비치는 거울 (방 안쪽, -x 방향을 본다)
    const glass = new Reflector(new THREE.PlaneGeometry(b.h - 0.08, 1.66), { textureWidth: 512, textureHeight: 1024, color: 0xd9dee2 });
    glass.rotation.y = -Math.PI / 2;
    glass.position.set(-b.w / 2 - 0.012, 0.95, 0);
    glass.userData.boxId = b.id;
    inner.add(glass);
  } else if (b.kind === 'counter') {
    inner.rotation.y = 0;
    add(new THREE.BoxGeometry(b.w, 0.92, b.h), mats.white, 0, 0.46, 0);
    add(new THREE.BoxGeometry(b.w + 0.04, 0.04, b.h + 0.04), mats.wood, 0, 0.94, 0);
    // 위에 올린 것들: 긴 쪽을 따라 결제 단말기, 쇼핑백 더미, 작은 화병
    const along = (t: number) => (b.w >= b.h ? [b.w * t, 0] : [0, b.h * t]) as [number, number];
    const tilt = b.w >= b.h ? 0 : Math.PI / 2;
    const [px, pz] = along(0.32);
    const pos = add(new THREE.BoxGeometry(0.2, 0.05, 0.26), mats.black, px, 0.985, pz);
    pos.rotation.y = tilt;
    const screen = add(new THREE.BoxGeometry(0.18, 0.13, 0.012), new THREE.MeshStandardMaterial({ color: '#20242a', emissive: '#3a4a5c', emissiveIntensity: 0.35, roughness: 0.2 }), px, 1.06, pz);
    screen.rotation.set(-0.35, tilt, 0);
    const kraft = new THREE.MeshStandardMaterial({ color: '#c8a77c', roughness: 0.9 });
    const [bx, bz] = along(-0.3);
    for (let i = 0; i < 4; i++) {
      const bag = add(new THREE.BoxGeometry(0.28, 0.008, 0.36), kraft, bx + Math.sin(i * 2.1) * 0.01, 0.964 + i * 0.009, bz + Math.cos(i * 1.7) * 0.01);
      bag.rotation.y = tilt + Math.sin(i * 4.3) * 0.06;
    }
    const [vx, vz] = along(-0.05);
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 16), new THREE.MeshStandardMaterial({ color: '#e9e4dc', roughness: 0.35 }), vx, 1.04, vz);
    const stem = new THREE.MeshStandardMaterial({ color: '#6f7d5a', roughness: 0.8 });
    [-0.02, 0.015, 0.03].forEach((o, i) => {
      const st = add(new THREE.CylinderGeometry(0.003, 0.003, 0.32, 5), stem, vx + o, 1.24, vz);
      st.rotation.z = o * 3 + (i - 1) * 0.08;
    });
  } else if (b.kind === 'mannequin') {
    // 받침 + 몸통(브랜드 옷을 입힌다) + 머리 없는 목
    add(new THREE.CylinderGeometry(0.16, 0.18, 0.02, 24), frame, 0, 0.01, 0);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), frame, 0, 0.4, 0);
    const skin = new THREE.MeshStandardMaterial({ color: '#efe9e1', roughness: 0.45 });
    const legs = add(new THREE.CylinderGeometry(0.1, 0.07, 0.12, 16), skin, 0, 0.82, 0);
    legs.scale.z = 0.7;
    const cloth = clothMat(photo, shade(color, 0.85), 1, 0.9);
    const torso = add(new THREE.CylinderGeometry(0.17, 0.14, 0.62, 20), cloth, 0, 1.18, 0);
    torso.scale.z = 0.62;
    const shoulder = add(new THREE.SphereGeometry(0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cloth, 0, 1.49, 0);
    shoulder.scale.set(1.25, 0.45, 0.62);
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), skin, 0, 1.6, 0);
  } else if (b.kind === 'shelf') {
    // 벽에 붙이는 3단 선반: 개어 놓은 옷과 상자
    const plank = mats[look.top] ?? mats.wood;
    [0.9, 1.3, 1.7].forEach((y, k) => {
      add(new THREE.BoxGeometry(L, 0.03, D), plank, 0, y, 0);
      for (let i = 0; i < Math.max(2, Math.round(L / 0.35)); i++) {
        const x = -L / 2 + 0.2 + i * 0.35;
        if (x > L / 2 - 0.15) break;
        if ((i + k) % 3 === 2) add(new THREE.BoxGeometry(0.2, 0.14, D * 0.7), new THREE.MeshStandardMaterial({ color: shade(color, 0.95 + (i % 2) * 0.05), roughness: 0.7 }), x, y + 0.085, 0);
        else for (let j = 0; j < 3; j++) add(new THREE.BoxGeometry(0.26, 0.035, D * 0.75), clothMat(photo, shade(color, 0.8), i + j + k, 0.95), x, y + 0.033 + j * 0.036, 0);
      }
    });
    // 뒤판과 양옆 기둥(벽에서 떼어 놓아도 서 있게)
    add(new THREE.BoxGeometry(L, 1.9, 0.02), mats.white, 0, 0.95, -D / 2 + 0.01);
    [-L / 2 + 0.015, L / 2 - 0.015].forEach((x) => add(new THREE.BoxGeometry(0.03, 1.9, D), frame, x, 0.95, 0));
  } else if (b.kind === 'standmirror') {
    // 세워 두는 전신 거울(반사는 주변 빛으로만)
    inner.rotation.y = b.w >= b.h ? 0 : Math.PI / 2;
    add(new THREE.BoxGeometry(L, 1.7, 0.04), mats.woodDark, 0, 0.9, 0);
    const glass = add(new THREE.BoxGeometry(L - 0.06, 1.62, 0.01), new THREE.MeshStandardMaterial({ color: '#e7ecef', metalness: 1, roughness: 0.04 }), 0, 0.9, 0.022);
    glass.castShadow = false;
    const leg = add(new THREE.BoxGeometry(0.03, 1.2, 0.03), mats.woodDark, 0, 0.6, -0.25);
    leg.rotation.x = 0.35;
  } else if (b.kind === 'plant') {
    const pl = buildPlant(0, 0, mats);
    pl.traverse((o) => { o.userData.boxId = b.id; });
    inner.add(pl);
  } else if (b.kind === 'bench') {
    add(new THREE.BoxGeometry(L, 0.06, D), mats.wood, 0, 0.44, 0);
    [-L / 2 + 0.08, L / 2 - 0.08].forEach((x) => add(new THREE.BoxGeometry(0.05, 0.42, D - 0.06), mats.woodDark, x, 0.21, 0));
  } else if (b.kind === 'photo') {
    add(new THREE.BoxGeometry(L, 2.2, 0.06), photoMat(photo, color === '#f4f4f5' ? '#e7ddd0' : color, 0.7), 0, 1.1, 0);
    // 링 조명
    const ring = add(new THREE.TorusGeometry(0.22, 0.02, 10, 40), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff8ea', emissiveIntensity: 1.2 }), 0, 1.5, 1.1);
    ring.castShadow = false;
    add(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), mats.metal, 0, 0.75, 1.1);
  }
  // 바닥 접지 그림자
  if (b.kind !== 'fit' && b.kind !== 'mirror') {
    const sh = contactShadow(L + 0.35, D + 0.35, b.kind === 'hanger' ? 0.22 : 0.3);
    inner.add(sh);
  }
  // 브랜드 간판: 행거는 봉 위에 매단 판, 진열대는 앞쪽 탁상 카드
  if (name && b.brandId && (b.kind === 'hanger' || b.kind === 'table')) {
    const face = new THREE.MeshStandardMaterial({ map: signTexture(name), roughness: 0.6 });
    const edge = new THREE.MeshStandardMaterial({ color: '#fbfaf8', roughness: 0.6 });
    const mat = [edge, edge, edge, edge, face, face];
    if (b.kind === 'hanger') {
      const sw = Math.min(0.62, L * 0.55);
      add(new THREE.BoxGeometry(sw, sw / 4, 0.012), mat as unknown as THREE.Material, 0, 1.62 + sw / 8, 0);
      [-sw / 2 + 0.04, sw / 2 - 0.04].forEach((x) => add(new THREE.CylinderGeometry(0.002, 0.002, 0.1, 4), mats.metal, x, 1.57, 0));
    } else {
      const card = add(new THREE.BoxGeometry(0.26, 0.065, 0.006), mat as unknown as THREE.Material, 0, 0.82, D / 2 - 0.07);
      card.rotation.x = -0.35;
    }
  }
  return g;
}

function buildPlant(x: number, z: number, mats: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.38, 24), mats.white);
  pot.position.y = 0.19;
  pot.castShadow = true;
  g.add(pot);
  const leaf = new THREE.MeshStandardMaterial({ color: '#4f6b45', roughness: 0.8 });
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), leaf);
    m.scale.set(1, 1.5, 0.35);
    const a = (i / 9) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.12, 0.6 + (i % 3) * 0.18, Math.sin(a) * 0.12);
    m.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6);
    m.castShadow = true;
    g.add(m);
  }
  g.position.set(x, 0, z);
  return g;
}

// ───────── 장면 ─────────

export default function Room3DGL(props: Room3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const labelsHost = useRef<HTMLDivElement>(null);
  const api = useRef<{ rebuild: (p: Room3DProps) => void; setMode: (m: ViewMode) => void; dispose: () => void; walk: (dir: number) => void; gyro: (on: boolean) => void; snap: () => string } | null>(null);
  const [gyroOn, setGyroOn] = useState(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#ebe8e3');
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 3;
    controls.maxDistance = 16;

    const mats: Record<string, THREE.Material> = {
      metal: new THREE.MeshStandardMaterial({ color: '#2a2a2d', metalness: 0.85, roughness: 0.35 }),
      wood: new THREE.MeshStandardMaterial({ color: '#c49a6c', roughness: 0.55 }),
      woodDark: new THREE.MeshStandardMaterial({ color: '#6f4e33', roughness: 0.55 }),
      white: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.6 }),
      black: new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.5 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b8925a', metalness: 1, roughness: 0.3 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#d4d6d9', metalness: 1, roughness: 0.15 }),
      concrete: new THREE.MeshStandardMaterial({ color: '#b9b6b1', roughness: 0.95 }),
      mirror: new THREE.MeshStandardMaterial({ color: '#dfe6ea', metalness: 1, roughness: 0.04 }),
      curtain: new THREE.MeshStandardMaterial({ map: fabricTexture('#cfc3b2'), roughness: 0.95, side: THREE.DoubleSide }),
      wall: new THREE.MeshStandardMaterial({ map: plasterTexture(), roughness: 0.95 }),
      base: new THREE.MeshStandardMaterial({ color: '#d8d2c8', roughness: 0.7 }),
    };
    const wood = woodTexture();

    const room = new THREE.Group();
    const items = new THREE.Group();
    scene.add(room, items);
    const walls: { mesh: THREE.Object3D; normal: THREE.Vector3; center: THREE.Vector3 }[] = [];
    let W = 0;
    let H = 0;
    let mode: ViewMode = props.mode;
    let selBox: THREE.Mesh | null = null;
    let pathObj: THREE.Object3D | null = null;

    // 조명: 은은한 하늘빛 + 천장 레일 조명 + 그림자를 만드는 주 조명
    scene.add(new THREE.HemisphereLight('#fff7ec', '#a8957a', 0.35));
    const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    const spots: THREE.Light[] = [];
    const pins: THREE.Object3D[] = [];

    const clear = (g: THREE.Group) => {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      g.clear();
    };

    const buildRoom = (p: Room3DProps) => {
      clear(room);
      walls.length = 0;
      spots.forEach((l) => scene.remove(l));
      spots.length = 0;
      W = p.W; H = p.H;
      // 바닥
      wood.repeat.set(W / 2.1, H / 4.2);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(W / 2, 0, H / 2);
      floor.receiveShadow = true;
      floor.userData.floor = true;
      room.add(floor);
      // 입구 매트
      const mat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.01, 0.6), new THREE.MeshStandardMaterial({ color: '#4d4844', roughness: 1 }));
      mat.position.set(W / 2, 0.005, H - 0.45);
      mat.receiveShadow = true;
      room.add(mat);
      // 벽: 뒤, 왼쪽, 오른쪽, 앞(입구 양옆)
      const wallGeo = (len: number) => new THREE.BoxGeometry(len, WALL_H, 0.1);
      const addWall = (len: number, x: number, z: number, rotY: number, normal: THREE.Vector3) => {
        const g = new THREE.Group();
        const m = new THREE.Mesh(wallGeo(len), mats.wall);
        m.position.y = WALL_H / 2;
        m.receiveShadow = true;
        g.add(m);
        const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.02), mats.base);
        base.position.set(0, 0.04, 0.06);
        g.add(base);
        // 구석 그림자: 벽 아래쪽과 벽 앞 바닥
        const aoWall = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.45), aoMat());
        aoWall.position.set(0, 0.225, 0.072);
        g.add(aoWall);
        const aoFloor = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.4), aoMat());
        aoFloor.rotation.x = -Math.PI / 2;
        aoFloor.rotation.z = Math.PI;
        aoFloor.position.set(0, 0.003, 0.25);
        g.add(aoFloor);
        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        room.add(g);
        walls.push({ mesh: g, normal, center: new THREE.Vector3(x, WALL_H / 2, z) });
        return g;
      };
      addWall(W + 0.2, W / 2, -0.05, 0, new THREE.Vector3(0, 0, 1));
      addWall(H + 0.2, -0.05, H / 2, Math.PI / 2, new THREE.Vector3(1, 0, 0));
      addWall(H + 0.2, W + 0.05, H / 2, -Math.PI / 2, new THREE.Vector3(-1, 0, 0));
      const side = (W - DOOR) / 2;
      addWall(side + 0.1, side / 2 - 0.05, H + 0.05, Math.PI, new THREE.Vector3(0, 0, -1));
      addWall(side + 0.1, W - side / 2 + 0.05, H + 0.05, Math.PI, new THREE.Vector3(0, 0, -1));
      // 뒤 벽에 걸린 큰 사진 (공간 사진)
      if (p.wallPhoto) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.04), mats.black);
        frame.position.set(W * 0.42, 1.75, 0.03);
        room.add(frame);
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.92), photoMat(p.wallPhoto, '#d9d2c7', 0.4));
        pic.position.set(W * 0.42, 1.75, 0.052);
        room.add(pic);
      }
      // 천장(걸어 보기에서만 보임)과 레일 조명
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: '#fafafa', roughness: 1 }));
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(W / 2, WALL_H, H / 2);
      ceil.userData.ceiling = true;
      room.add(ceil);
      // 천장 레일 두 줄과 은은한 채움 조명
      [H * 0.3, H * 0.7].forEach((z) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, 0.03, 0.04), mats.black);
        rail.position.set(W / 2, WALL_H - 0.02, z);
        rail.userData.ceiling = true;
        room.add(rail);
      });
      for (let i = 0; i < 2; i++) {
        const l = new THREE.PointLight('#ffe9cc', 2.2, 8, 1.6);
        l.position.set(W * (0.3 + i * 0.4), WALL_H - 0.3, H * 0.5);
        scene.add(l);
        spots.push(l);
      }
      room.add(buildPlant(0.4, H - 0.55, mats));
      // 왼쪽 벽 창문: 밝은 유리와 창틀, 햇빛은 창문 쪽에서 들어온다
      const winZ = H * 0.55;
      const glassMat = new THREE.MeshStandardMaterial({ color: '#eef4fa', emissive: '#f4f8ff', emissiveIntensity: 0.9, roughness: 0.1 });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), glassMat);
      glass.rotation.y = Math.PI / 2;
      glass.position.set(0.006, 1.65, winZ);
      room.add(glass);
      [[0, 0.65, 1.66, 0.05], [0, -0.65, 1.66, 0.05], [0.8, 0, 0.05, 1.36], [-0.8, 0, 0.05, 1.36], [0, 0, 0.03, 1.3]].forEach(([dz, dy, len, th]) => {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, th === 0.05 && len > 1 ? th : len === 0.05 ? 1.36 : len === 0.03 ? 1.3 : th, len > 1 ? len : len === 0.05 ? 0.05 : 0.03), mats.black);
        f.position.set(0.02, 1.65 + dy, winZ + dz);
        room.add(f);
      });
      sun.position.set(-3.5, 4.2, winZ + 0.8);
      sun.target.position.set(W * 0.45, 0, winZ);
      const r = Math.max(W, H);
      Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.5, far: 25 });
      sun.shadow.camera.updateProjectionMatrix();
      controls.target.set(W / 2, 0.6, H / 2);
    };

    // 물건마다 만든 결과를 기억해 두고, 모양이 바뀐 것만 새로 만든다(옮기기만 했으면 위치만 바꾼다)
    const built = new Map<string, { key: string; group: THREE.Group }>();
    const buildItems = (p: Room3DProps) => {
      const keep = new Set<string>();
      p.boxes.forEach((b) => {
        const photo = p.photoOf(b);
        const color = p.colorOf(b.brandId);
        const cat = p.catOf?.(b.brandId);
        const name = b.brandId ? p.nameOf(b.brandId) : undefined;
        const mood = p.moodOf?.(b.brandId);
        const key = JSON.stringify([b.kind, b.w, b.h, b.brandId, b.label, photo, color, cat, name, mood]);
        let hit = built.get(b.id);
        if (!hit || hit.key !== key) {
          if (hit) { clear(hit.group); items.remove(hit.group); }
          hit = { key, group: buildItem(b, photo, color, mats, cat, name, mood) };
          built.set(b.id, hit);
          items.add(hit.group);
        }
        hit.group.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
        keep.add(b.id);
      });
      built.forEach((v, id) => { if (!keep.has(id)) { clear(v.group); items.remove(v.group); built.delete(id); } });
      // 행거·진열대마다 천장 레일에서 비추는 핀 조명 (최대 8개)
      pins.forEach((o) => scene.remove(o));
      pins.length = 0;
      p.boxes.filter((b) => BRAND_KINDS.includes(b.kind)).slice(0, 8).forEach((b) => {
        const cx = b.x + b.w / 2;
        const cz = b.y + b.h / 2;
        const railZ = Math.abs(cz - H * 0.3) < Math.abs(cz - H * 0.7) ? H * 0.3 : H * 0.7;
        const sp = new THREE.SpotLight('#ffe4c2', 9, 6, 0.45, 0.65, 1.4);
        sp.position.set(Math.max(0.4, Math.min(W - 0.4, cx)), WALL_H - 0.08, railZ);
        sp.target.position.set(cx, b.kind === 'table' ? 0.8 : 1.0, cz);
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 16), mats.black);
        can.position.copy(sp.position).setY(WALL_H - 0.12);
        can.lookAt(sp.target.position);
        can.rotateX(Math.PI / 2);
        can.userData.ceiling = true;
        scene.add(sp, sp.target, can);
        pins.push(sp, sp.target, can);
      });
      // 고른 물건: 바닥 테두리
      if (selBox) { scene.remove(selBox); selBox = null; }
      const sel = p.boxes.find((b) => b.id === p.selected);
      if (sel) {
        const ring = new THREE.Mesh(new THREE.PlaneGeometry(sel.w + 0.2, sel.h + 0.2), new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.25 }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(sel.x + sel.w / 2, 0.006, sel.y + sel.h / 2);
        scene.add(ring);
        selBox = ring;
      }
      // 손님 동선: 바닥에 점선과 화살표
      if (pathObj) { scene.remove(pathObj); pathObj = null; }
      if (p.path && p.path.length > 1) {
        const g = new THREE.Group();
        const red = new THREE.MeshBasicMaterial({ color: '#e0482a' });
        for (let i = 0; i < p.path.length - 1; i++) {
          const a = new THREE.Vector3(p.path[i].x, 0.012, p.path[i].y);
          const c = new THREE.Vector3(p.path[i + 1].x, 0.012, p.path[i + 1].y);
          const len = a.distanceTo(c);
          const dir = c.clone().sub(a).normalize();
          const steps = Math.floor(len / 0.3);
          for (let k = 0; k < steps; k++) {
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), red);
            dash.rotation.x = -Math.PI / 2;
            dash.rotation.z = -Math.atan2(dir.z, dir.x);
            dash.position.copy(a).addScaledVector(dir, 0.15 + k * 0.3);
            g.add(dash);
          }
          // 화살촉은 긴 구간 가운데와 마지막 끝에만
          const last = i === p.path.length - 2;
          if (!last && len < 1.2) continue;
          const tri = new THREE.Shape();
          tri.moveTo(0.12, 0); tri.lineTo(-0.06, 0.08); tri.lineTo(-0.06, -0.08); tri.closePath();
          const arrow = new THREE.Mesh(new THREE.ShapeGeometry(tri), red);
          arrow.rotation.x = -Math.PI / 2;
          arrow.rotation.z = -Math.atan2(dir.z, dir.x);
          arrow.position.copy(last ? c.clone().addScaledVector(dir, -0.1) : a.clone().addScaledVector(dir, len / 2));
          g.add(arrow);
        }
        // 크기를 가늠할 수 있게 동선 위에 손님 두 명(다리·팔·머리가 있는 사람 모양, 옷 색은 사람마다)
        const mat = (c: string, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
        const skin = mat('#e0bfa2', 0.6);
        const hairM = mat('#2a221d', 0.7);
        const shoeM = mat('#26262a', 0.5);
        const person = (x: number, z: number, face: number, h: number, look: { top: string; bottom: string; long?: boolean; skirt?: boolean }) => {
          const f = new THREE.Group();
          const k = h / 1.7;
          const put = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number, rx = 0, rz = 0) => {
            const o = new THREE.Mesh(geo, m);
            o.position.set(px * k, py * k, pz * k);
            o.rotation.set(rx, 0, rz);
            o.scale.setScalar(k);
            o.castShadow = true;
            f.add(o);
            return o;
          };
          const top = mat(look.top, 0.9);
          const bottom = mat(look.bottom, 0.85);
          // 다리(한 발 살짝 앞으로)와 신발
          [[-0.075, 0.08], [0.075, -0.06]].forEach(([lx, st]) => {
            put(new THREE.CylinderGeometry(0.065, 0.05, 0.82, 12), bottom, lx, 0.47, st * 0.5, -st * 0.5);
            put(new THREE.BoxGeometry(0.09, 0.06, 0.24), shoeM, lx, 0.03, st + 0.04);
          });
          if (look.skirt) put(new THREE.CylinderGeometry(0.17, 0.26, 0.42, 20), bottom, 0, 0.7, 0);
          // 골반·몸통·어깨
          const hip = put(new THREE.CylinderGeometry(0.16, 0.15, 0.16, 18), bottom, 0, 0.9, 0);
          hip.scale.z = 0.62 * k;
          const torso = put(new THREE.CylinderGeometry(0.19, 0.16, 0.5, 20), top, 0, 1.2, 0);
          torso.scale.z = 0.6 * k;
          const sh = put(new THREE.SphereGeometry(0.19, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), top, 0, 1.43, 0);
          sh.scale.set(1.1 * k, 0.42 * k, 0.6 * k);
          // 팔(살짝 벌려 내린 모양)과 손
          [-1, 1].forEach((sd) => {
            put(new THREE.CylinderGeometry(0.05, 0.042, 0.6, 10), top, sd * 0.235, 1.15, 0, 0, sd * 0.08);
            put(new THREE.SphereGeometry(0.045, 10, 8), skin, sd * 0.26, 0.82, 0);
          });
          // 목·머리·머리카락
          put(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), skin, 0, 1.5, 0);
          const head = put(new THREE.SphereGeometry(0.1, 20, 16), skin, 0, 1.61, 0.005);
          head.scale.y = 1.15 * k;
          const hair = put(new THREE.SphereGeometry(0.106, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), hairM, 0, 1.63, -0.008);
          hair.scale.y = 1.1 * k;
          if (look.long) {
            const back = put(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 14, 1, true, Math.PI * 0.6, Math.PI * 0.8), hairM, 0, 1.47, -0.005);
            back.rotation.y = Math.PI;
          }
          f.position.set(x, 0, z);
          f.rotation.y = face;
          f.userData.person = true;
          g.add(f);
        };
        const at = (t: number) => {
          const pts = p.path!;
          const segs = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
          let d = segs.reduce((x, y) => x + y, 0) * t;
          for (let i = 0; i < segs.length; i++) {
            if (d <= segs[i] || i === segs.length - 1) {
              const k = Math.min(1, d / (segs[i] || 1));
              const a = pts[i];
              const b = pts[i + 1];
              return { x: a.x + (b.x - a.x) * k, z: a.y + (b.y - a.y) * k, face: Math.atan2(b.x - a.x, b.y - a.y) };
            }
            d -= segs[i];
          }
          return { x: pts[0].x, z: pts[0].y, face: 0 };
        };
        const p1 = at(0.3);
        const p2 = at(0.68);
        person(p1.x, p1.z, p1.face, 1.74, { top: '#e8e2d6', bottom: '#3d434c' });
        person(p2.x, p2.z, p2.face, 1.63, { top: '#7d8a99', bottom: '#cdbfa6', long: true, skirt: true });
        scene.add(g);
        pathObj = g;
      }
      // 브랜드 이름표 (화면 위에 HTML로)
      const lh = labelsHost.current!;
      lh.innerHTML = '';
      const byBrand = new Map<string, { x: number; z: number; n: number; y: number }>();
      p.boxes.forEach((b) => {
        if (!b.brandId || !BRAND_KINDS.includes(b.kind)) return;
        const l = byBrand.get(b.brandId) ?? { x: 0, z: 0, n: 0, y: 0 };
        l.x += b.x + b.w / 2; l.z += b.y + b.h / 2; l.n += 1; l.y = Math.max(l.y, b.kind === 'table' ? 1.15 : 1.9);
        byBrand.set(b.brandId, l);
      });
      labels = [...byBrand.entries()].map(([id, l]) => {
        const d = document.createElement('div');
        d.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;background:#fff;border:1px solid #111;padding:2px 6px;font-size:10px;font-weight:800;color:#111;display:flex;align-items:center;gap:4px;pointer-events:none;will-change:transform';
        d.innerHTML = `<span style="width:7px;height:7px;background:${p.colorOf(id)};border:1px solid rgba(0,0,0,.3)"></span>`;
        d.appendChild(document.createTextNode(p.nameOf(id)));
        lh.appendChild(d);
        return { el: d, pos: new THREE.Vector3(l.x / l.n, l.y, l.z / l.n) };
      });
    };
    let labels: { el: HTMLDivElement; pos: THREE.Vector3 }[] = [];

    // 걸어 보기 상태
    let yaw = 0;
    let pitch = -0.2;
    const walkPos = new THREE.Vector3();
    const prevPos = new THREE.Vector3();
    let entering = false;
    let walkTarget: THREE.Vector3 | null = null;
    let moveDir = 0;
    const setMode = (m: ViewMode) => {
      invalidate();
      mode = m;
      controls.enabled = m === 'orbit';
      if (m === 'walk') {
        // 문밖에서 걸어 들어오는 것으로 시작
        walkPos.set(W / 2, EYE, H + 1.2);
        prevPos.copy(walkPos);
        entering = true;
        yaw = 0; pitch = -0.2; walkTarget = new THREE.Vector3(W / 2, EYE, H - 0.6);
      } else {
        camera.position.set(W / 2 + W * 0.2, Math.max(W, H) * 0.85, H + Math.max(W, H) * 0.8);
        controls.target.set(W / 2, 0.6, H / 2);
        controls.update();
      }
      camera.fov = m === 'walk' ? 70 : 48;
      camera.updateProjectionMatrix();
    };

    const rebuild = (p: Room3DProps) => {
      invalidate();
      const sizeChanged = p.W !== W || p.H !== H;
      if (sizeChanged) buildRoom(p);
      buildItems(p);
      if (sizeChanged) setMode(mode);
    };

    // 화면 크기
    const resize = () => {
      invalidate();
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + 'px';
      renderer.domElement.style.height = h + 'px';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // 누르기: 물건 고르기 / 걸어 보기에서는 바닥으로 걸어가기 / 밀어서 둘러보기
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;
    // 고른 물건을 누른 채 끌면 바닥 위에서 옮긴다
    let drag: { id: string; group: THREE.Object3D; dx: number; dz: number; b: LayoutBox } | null = null;
    // 숨긴 벽(부모가 숨겨진 것 포함)은 누를 수 없게
    const shown = (o: THREE.Object3D | null) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const toNdc = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const floorPoint = (e: PointerEvent) => {
      ray.setFromCamera(toNdc(e), camera);
      return ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false };
      // 물건(계산대·피팅룸 포함)은 고르지 않고 바로 집어서 옮길 수 있다
      if (mode !== 'orbit' || !propsRef.current.onMove) return;
      ray.setFromCamera(toNdc(e), camera);
      const hit = ray.intersectObjects(items.children, true).find((h) => shown(h.object));
      let o: THREE.Object3D | null = hit?.object ?? null;
      while (o && o.parent !== items) o = o.parent;
      const b = o && propsRef.current.boxes.find((x) => x.id === o!.userData.boxId);
      if (o && b) {
        const selId = b.id;
        const fp = floorPoint(e);
        if (!fp) return;
        drag = { id: selId, group: o, dx: fp.x - o.position.x, dz: fp.z - o.position.z, b };
        controls.enabled = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      if (drag && down.moved) {
        const fp = floorPoint(e);
        if (fp) {
          const { b } = drag;
          drag.group.position.x = Math.max(b.w / 2, Math.min(W - b.w / 2, fp.x - drag.dx));
          drag.group.position.z = Math.max(b.h / 2, Math.min(H - b.h / 2, fp.z - drag.dz));
          if (selBox) selBox.position.set(drag.group.position.x, 0.006, drag.group.position.z);
          invalidate();
        }
        return;
      }
      if (mode === 'walk' && down.moved) {
        yaw = down.yaw + dx * 0.006;
        pitch = Math.max(-0.7, Math.min(0.5, down.pitch + dy * 0.004));
        invalidate();
      }
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (drag) {
        const g = drag;
        drag = null;
        controls.enabled = mode === 'orbit';
        if (d?.moved) {
          if (propsRef.current.selected !== g.id) propsRef.current.onPick(g.id);
          propsRef.current.onMove?.(g.id, Math.round((g.group.position.x - g.b.w / 2) * 10) / 10, Math.round((g.group.position.z - g.b.h / 2) * 10) / 10);
          return;
        }
      }
      if (!d || d.moved) return;
      ray.setFromCamera(toNdc(e), camera);
      const hits = ray.intersectObjects([...items.children, ...room.children], true);
      const hit = hits.find((h) => shown(h.object));
      if (!hit) return;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.boxId && !o.userData.floor) o = o.parent;
      if (o?.userData.boxId) {
        const b = propsRef.current.boxes.find((x) => x.id === o!.userData.boxId);
        if (b) propsRef.current.onPick(b.id);
      } else if (o?.userData.floor && mode === 'walk') {
        walkTarget = new THREE.Vector3(Math.max(0.35, Math.min(W - 0.35, hit.point.x)), EYE, Math.max(0.35, Math.min(H - 0.35, hit.point.z)));
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // 그리기
    const v = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    // 휴대폰을 돌리면 고개를 돌린 것처럼 (세로 화면 기준)
    const gyro: { on: boolean; alpha0: number | null; yaw0: number; yaw: number | null; pitch: number } = { on: false, alpha0: null, yaw0: 0, yaw: null, pitch: 0 };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null) return;
      if (gyro.alpha0 === null) { gyro.alpha0 = e.alpha; gyro.yaw0 = yaw; }
      gyro.yaw = gyro.yaw0 + THREE.MathUtils.degToRad(e.alpha - gyro.alpha0);
      gyro.pitch = Math.max(-0.8, Math.min(0.7, THREE.MathUtils.degToRad(e.beta - 90)));
      invalidate();
    };
    let raf = 0;
    let last = performance.now();
    let frames = 5;
    function invalidate() { frames = 3; }
    onTextureLoad = invalidate;
    controls.addEventListener('change', invalidate);
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // 움직임이 없으면 그리지 않는다 (휴대폰 배터리·발열)
      const moving = mode === 'orbit' ? controls.update() : !!moveDir || !!walkTarget || gyro.on;
      if (!moving && frames <= 0) return;
      frames -= 1;
      if (mode === 'orbit') {
        // controls.update()는 위에서 했다
      } else {
        if (moveDir) {
          const f = new THREE.Vector3(Math.sin(yaw) * -1, 0, -Math.cos(yaw));
          walkPos.addScaledVector(f, moveDir * dt * 1.3);
          walkTarget = null;
        } else if (walkTarget) {
          const to = walkTarget.clone().sub(walkPos);
          const dist = to.length();
          if (dist < 0.05) walkTarget = null;
          else {
            walkPos.addScaledVector(to.normalize(), Math.min(dist, dt * 1.4));
            // 걷는 쪽으로 천천히 고개를 돌린다
            const want = Math.atan2(-to.x, -to.z);
            let diff = want - yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            yaw += diff * Math.min(1, dt * 3);
          }
        }
        if (entering && walkPos.z < H - 0.35) entering = false;
        walkPos.x = Math.max(0.3, Math.min(W - 0.3, walkPos.x));
        if (!entering) walkPos.z = Math.max(0.3, Math.min(H - 0.3, walkPos.z));
        // 물건에 부딪히면 그 자리에서 멈춘다
        const blocked = propsRef.current.boxes.some((b) => b.kind !== 'fit' && walkPos.x > b.x - 0.25 && walkPos.x < b.x + b.w + 0.25 && walkPos.z > b.y - 0.25 && walkPos.z < b.y + b.h + 0.25);
        if (blocked) { walkPos.copy(prevPos); walkTarget = null; }
        prevPos.copy(walkPos);
        camera.position.copy(walkPos);
        // 걸을 때 살짝 위아래로 흔들린다
        if (moveDir || walkTarget) camera.position.y += Math.sin(now / 110) * 0.012;
        if (gyro.on && gyro.yaw !== null) { yaw = gyro.yaw; pitch = gyro.pitch; }
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
      }
      // 조감도에서는 카메라 쪽 벽과 천장을 숨겨 안이 보이게 한다
      camera.getWorldDirection(camDir);
      walls.forEach((w) => {
        const toCam = v.copy(camera.position).sub(w.center);
        w.mesh.visible = mode === 'walk' || toCam.dot(w.normal) > 0;
      });
      room.children.forEach((o) => { if (o.userData.ceiling) o.visible = mode === 'walk'; });
      pins.forEach((o) => { if (o.userData.ceiling) o.visible = mode === 'walk'; });
      renderer.render(scene, camera);
      // 이름표 위치
      const r = renderer.domElement.getBoundingClientRect();
      labels.forEach((l) => {
        v.copy(l.pos).project(camera);
        // 걸어 볼 때는 매장 안 간판으로 충분하니 화면 이름표는 숨긴다
        const behind = v.z > 1 || mode === 'walk';
        l.el.style.display = behind ? 'none' : 'flex';
        l.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
      });
    };

    api.current = {
      rebuild,
      setMode,
      walk: (dir) => { moveDir = dir; invalidate(); },
      // 지금 보이는 장면을 사진으로 (이름표까지 함께 그린다)
      snap: () => {
        renderer.render(scene, camera);
        const src = renderer.domElement;
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const g = c.getContext('2d')!;
        g.drawImage(src, 0, 0);
        const k = src.width / src.getBoundingClientRect().width;
        g.font = `800 ${10 * k}px Pretendard, sans-serif`;
        labels.forEach((l) => {
          if (l.el.style.display === 'none') return;
          const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(l.el.style.transform);
          if (!m) return;
          const text = l.el.textContent ?? '';
          const w = g.measureText(text).width + 12 * k;
          const x = Number(m[1]) * k - w / 2;
          const y = Number(m[2]) * k - 18 * k;
          g.fillStyle = '#fff'; g.fillRect(x, y, w, 18 * k);
          g.strokeStyle = '#111'; g.lineWidth = k; g.strokeRect(x, y, w, 18 * k);
          g.fillStyle = '#111'; g.fillText(text, x + 6 * k, y + 13 * k);
        });
        return c.toDataURL('image/png');
      },
      gyro: (on) => {
        gyro.on = on;
        gyro.alpha0 = null;
        if (on) window.addEventListener('deviceorientation', onOrient);
        else window.removeEventListener('deviceorientation', onOrient);
      },
      dispose: () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('deviceorientation', onOrient);
        ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        controls.dispose();
        clear(room);
        clear(items);
        pmrem.dispose();
        renderer.dispose();
        el.removeChild(renderer.domElement);
      },
    };
    resize();
    rebuild(props);
    setMode(props.mode);
    tick();
    return () => api.current?.dispose();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 배치가 바뀌면 물건만 다시 만든다
  useEffect(() => { api.current?.rebuild(props); }, [props.W, props.H, props.boxes, props.path, props.selected, props.wallPhoto]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.current?.setMode(props.mode);
    if (props.mode !== 'walk') { api.current?.gyro(false); setGyroOn(false); }
  }, [props.mode]);

  const hold = (dir: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); api.current?.walk(dir); },
    onPointerUp: () => api.current?.walk(0),
    onPointerLeave: () => api.current?.walk(0),
  });

  return (
    <div className="relative w-full h-full">
      <div ref={host} className="absolute inset-0" />
      <div ref={labelsHost} className="absolute inset-0 overflow-hidden pointer-events-none" />
      {props.mode === 'walk' && typeof DeviceOrientationEvent !== 'undefined' && 'ontouchstart' in window && (
        <button
          onClick={async () => {
            const next = !gyroOn;
            // 아이폰은 기울기 센서를 쓰려면 먼저 허락을 받아야 한다
            const req = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
            const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
            if (next && ios && req && (await req().catch(() => 'denied')) !== 'granted') return;
            setGyroOn(next);
            api.current?.gyro(next);
          }}
          className={`absolute left-3 top-3 h-9 px-3 border text-[12px] font-bold ${gyroOn ? 'bg-ink-900 text-white border-ink-900' : 'bg-white/90 border-ink-900'}`}
        >
          {gyroOn ? '휴대폰으로 둘러보는 중' : '휴대폰 돌려서 보기'}
        </button>
      )}
      <button
        onClick={async () => {
          const url = api.current?.snap();
          if (!url) return;
          // 휴대폰은 공유 창으로, 컴퓨터는 파일로 저장
          try {
            const blob = await (await fetch(url)).blob();
            const file = new File([blob], 'offstage-배치.png', { type: 'image/png' });
            const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
            if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: 'OFF STAGE 배치' }); return; }
          } catch { /* 공유 취소 등은 파일 저장으로 */ }
          const a = document.createElement('a');
          a.href = url; a.download = 'offstage-배치.png'; a.click();
        }}
        className="absolute right-3 top-3 h-9 px-3 border border-ink-900 bg-white/90 text-[12px] font-bold"
      >
        장면 저장
      </button>
      {props.mode === 'walk' && (
        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
          <button {...hold(1)} aria-label="앞으로" className="w-11 h-11 bg-white/90 border border-ink-900 text-[18px] font-bold select-none">↑</button>
          <button {...hold(-1)} aria-label="뒤로" className="w-11 h-11 bg-white/90 border border-ink-900 text-[18px] font-bold select-none">↓</button>
        </div>
      )}
    </div>
  );
}
