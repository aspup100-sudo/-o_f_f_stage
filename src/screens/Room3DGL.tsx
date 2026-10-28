// 실사에 가까운 3D 매장 보기 (three.js).
// 조감도: 손가락으로 돌리고 두 손가락으로 확대. 걸어 보기: 눈높이 1.6m에서 밀어서 둘러보고, 바닥을 누르면 그쪽으로 걸어간다.
// 좌표: 평면도의 x → 3D x, 평면도의 y → 3D z. 단위는 미터.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import type { LayoutBox } from '@/types';

export type ViewMode = 'orbit' | 'walk';
type Pt = { x: number; y: number };

export interface Room3DProps {
  W: number; H: number; boxes: LayoutBox[]; path?: Pt[]; wallPhoto: string; mode: ViewMode;
  colorOf: (id?: string) => string; photoOf: (b: LayoutBox) => string | undefined; nameOf: (id?: string) => string;
  selected: string | null; onPick: (id: string) => void;
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
const photoCache = new Map<string, THREE.Texture>();
function photoTexture(src: string) {
  let t = photoCache.get(src);
  if (!t) {
    t = loader.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    photoCache.set(src, t);
  }
  return t;
}

// 옷 모양(어깨선이 있는 판)
function garmentShape(w: number, len: number) {
  const s = new THREE.Shape();
  s.moveTo(-0.06, 0);
  s.lineTo(0.06, 0);
  s.lineTo(w / 2, -0.07);
  s.lineTo(w / 2 - 0.01, -len);
  s.lineTo(-w / 2 + 0.01, -len);
  s.lineTo(-w / 2, -0.07);
  s.closePath();
  return s;
}

// ───────── 물건 만들기 ─────────

function shade(color: string, k: number) {
  return new THREE.Color(color).multiplyScalar(k);
}

function buildItem(b: LayoutBox, photo: string | undefined, color: string, mats: Record<string, THREE.Material>) {
  const g = new THREE.Group();
  const along = b.w >= b.h;
  const L = along ? b.w : b.h;
  const D = along ? b.h : b.w;
  // 행거 봉 방향이 x축이 되도록 그룹 안에서 그리고, 세로로 놓인 물건은 90도 돌린다
  const inner = new THREE.Group();
  g.add(inner);
  g.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
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
    const pole = new THREE.CylinderGeometry(0.014, 0.014, 1.55, 12);
    [-L / 2 + 0.05, L / 2 - 0.05].forEach((x) => {
      add(pole, mats.metal, x, 0.775, 0);
      add(new THREE.BoxGeometry(0.03, 0.025, D - 0.05), mats.metal, x, 0.0125, 0);
    });
    const rail = add(new THREE.CylinderGeometry(0.012, 0.012, L - 0.1, 12), mats.metal, 0, 1.52, 0);
    rail.rotation.z = Math.PI / 2;
    const n = Math.max(4, Math.round(L / 0.1));
    const tex = photo ? photoTexture(photo) : null;
    for (let i = 0; i < n; i++) {
      const len = [0.85, 0.7, 1.05, 0.75, 0.95, 0.65][i % 6];
      const geo = new THREE.ExtrudeGeometry(garmentShape(D - 0.06, len), { depth: 0.035, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
      let mat: THREE.Material;
      if (tex) {
        const t = tex.clone();
        t.needsUpdate = true;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        // ExtrudeGeometry UV는 미터 좌표(x: -D/2~D/2, y: -len~0)라 사진의 한 조각에 맞춘다
        const ox = (i * 0.37) % 0.7;
        const oy = 0.1 + ((i * 0.23) % 0.3);
        t.repeat.set(0.22 / D, 0.5 / len);
        t.offset.set(ox + 0.11, oy + 0.5);
        mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: shade(color, 0.75 + ((i * 7) % 5) * 0.07), roughness: 0.9 });
      }
      const m = add(geo, mat, -L / 2 + 0.12 + (i * (L - 0.24)) / Math.max(1, n - 1), 1.47, 0);
      // 옷마다 살짝 비틀리고 간격이 고르지 않게
      m.rotation.y = Math.PI / 2 + Math.sin(i * 12.9898) * 0.12;
      m.position.x -= 0.0175 - Math.sin(i * 78.233) * 0.012;
      // 옷걸이
      const hook = add(new THREE.TorusGeometry(0.025, 0.004, 6, 12, Math.PI * 1.4), mats.metal, m.position.x + 0.0175, 1.54, 0);
      hook.rotation.y = Math.PI / 2;
    }
  } else if (b.kind === 'table') {
    const top = add(new THREE.BoxGeometry(L, 0.04, D), mats.wood, 0, 0.76, 0);
    top.receiveShadow = true;
    const leg = new THREE.CylinderGeometry(0.022, 0.018, 0.74, 10);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(leg, mats.woodDark, sx * (L / 2 - 0.06), 0.37, sz * (D / 2 - 0.06)));
    // 위에 놓인 상품: 개어 놓은 옷 더미와 작은 상자
    const tex = photo ? photoTexture(photo) : null;
    const items: [number, number, number, number, number][] = [[-L / 2 + 0.22, -D / 2 + 0.22, 0.3, 0.06, 0.25], [-L / 2 + 0.22, -D / 2 + 0.22, 0.28, 0.06, 0.23], [0.05, 0.1, 0.22, 0.12, 0.16], [L / 2 - 0.25, D / 2 - 0.25, 0.26, 0.08, 0.2]];
    items.forEach(([x, z, w, h, d], i) => {
      const mat = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }) : new THREE.MeshStandardMaterial({ color: shade(color, 0.8 + i * 0.06), roughness: 0.85 });
      add(new THREE.BoxGeometry(w, h, d), mat, x, 0.78 + h / 2 + (i === 1 ? 0.06 : 0), z);
    });
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
    add(new THREE.BoxGeometry(0.3, 0.12, 0.24), mats.black, b.w / 2 - 0.3, 1.02, 0);
  } else if (b.kind === 'photo') {
    const tex = photo ? photoTexture(photo) : null;
    add(new THREE.BoxGeometry(L, 2.2, 0.06), tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: '#e7ddd0', roughness: 0.9 }), 0, 1.1, 0);
    // 링 조명
    const ring = add(new THREE.TorusGeometry(0.22, 0.02, 10, 40), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff8ea', emissiveIntensity: 1.2 }), 0, 1.5, 1.1);
    ring.castShadow = false;
    add(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), mats.metal, 0, 0.75, 1.1);
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
  const api = useRef<{ rebuild: (p: Room3DProps) => void; setMode: (m: ViewMode) => void; dispose: () => void; walk: (dir: number) => void } | null>(null);
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
      woodDark: new THREE.MeshStandardMaterial({ color: '#9b7552', roughness: 0.6 }),
      white: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.6 }),
      black: new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.5 }),
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
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62 }));
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
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.92), new THREE.MeshStandardMaterial({ map: photoTexture(p.wallPhoto), roughness: 0.4 }));
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

    const buildItems = (p: Room3DProps) => {
      clear(items);
      p.boxes.forEach((b) => items.add(buildItem(b, p.photoOf(b), p.colorOf(b.brandId), mats)));
      // 행거·진열대마다 천장 레일에서 비추는 핀 조명 (최대 8개)
      pins.forEach((o) => scene.remove(o));
      pins.length = 0;
      p.boxes.filter((b) => b.kind === 'hanger' || b.kind === 'table' || b.kind === 'photo').slice(0, 8).forEach((b) => {
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
          const tri = new THREE.Shape();
          tri.moveTo(0.12, 0); tri.lineTo(-0.06, 0.08); tri.lineTo(-0.06, -0.08); tri.closePath();
          const arrow = new THREE.Mesh(new THREE.ShapeGeometry(tri), red);
          arrow.rotation.x = -Math.PI / 2;
          arrow.rotation.z = -Math.atan2(dir.z, dir.x);
          arrow.position.copy(c).addScaledVector(dir, -0.1);
          g.add(arrow);
        }
        scene.add(g);
        pathObj = g;
      }
      // 브랜드 이름표 (화면 위에 HTML로)
      const lh = labelsHost.current!;
      lh.innerHTML = '';
      const byBrand = new Map<string, { x: number; z: number; n: number; y: number }>();
      p.boxes.forEach((b) => {
        if (!b.brandId || (b.kind !== 'hanger' && b.kind !== 'table' && b.kind !== 'photo')) return;
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
    let walkTarget: THREE.Vector3 | null = null;
    let moveDir = 0;
    const setMode = (m: ViewMode) => {
      mode = m;
      controls.enabled = m === 'orbit';
      if (m === 'walk') {
        walkPos.set(W / 2, EYE, H - 0.5);
        prevPos.copy(walkPos);
        yaw = 0; pitch = -0.2; walkTarget = null;
      } else {
        camera.position.set(W / 2 + W * 0.2, Math.max(W, H) * 0.85, H + Math.max(W, H) * 0.8);
        controls.target.set(W / 2, 0.6, H / 2);
        controls.update();
      }
      camera.fov = m === 'walk' ? 70 : 48;
      camera.updateProjectionMatrix();
    };

    const rebuild = (p: Room3DProps) => {
      const sizeChanged = p.W !== W || p.H !== H;
      if (sizeChanged) buildRoom(p);
      buildItems(p);
      if (sizeChanged) setMode(mode);
    };

    // 화면 크기
    const resize = () => {
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
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false }; };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      if (mode === 'walk' && down.moved) {
        yaw = down.yaw + dx * 0.006;
        pitch = Math.max(-0.7, Math.min(0.5, down.pitch + dy * 0.004));
      }
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || d.moved) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hits = ray.intersectObjects([...items.children, ...room.children], true);
      const hit = hits.find((h) => h.object.visible);
      if (!hit) return;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.boxId && !o.userData.floor) o = o.parent;
      if (o?.userData.boxId) {
        const b = propsRef.current.boxes.find((x) => x.id === o!.userData.boxId);
        if (b && (b.kind === 'hanger' || b.kind === 'table' || b.kind === 'photo')) propsRef.current.onPick(b.id);
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
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (mode === 'orbit') {
        controls.update();
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
        walkPos.x = Math.max(0.3, Math.min(W - 0.3, walkPos.x));
        walkPos.z = Math.max(0.3, Math.min(H - 0.3, walkPos.z));
        // 물건에 부딪히면 그 자리에서 멈춘다
        const blocked = propsRef.current.boxes.some((b) => b.kind !== 'fit' && walkPos.x > b.x - 0.25 && walkPos.x < b.x + b.w + 0.25 && walkPos.z > b.y - 0.25 && walkPos.z < b.y + b.h + 0.25);
        if (blocked) { walkPos.copy(prevPos); walkTarget = null; }
        prevPos.copy(walkPos);
        camera.position.copy(walkPos);
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
        const behind = v.z > 1;
        l.el.style.display = behind ? 'none' : 'flex';
        l.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -100%)`;
      });
    };

    api.current = {
      rebuild,
      setMode,
      walk: (dir) => { moveDir = dir; },
      dispose: () => {
        cancelAnimationFrame(raf);
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
  useEffect(() => { api.current?.setMode(props.mode); }, [props.mode]);

  const hold = (dir: number) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); api.current?.walk(dir); },
    onPointerUp: () => api.current?.walk(0),
    onPointerLeave: () => api.current?.walk(0),
  });

  return (
    <div className="relative w-full h-full">
      <div ref={host} className="absolute inset-0" />
      <div ref={labelsHost} className="absolute inset-0 overflow-hidden pointer-events-none" />
      {props.mode === 'walk' && (
        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
          <button {...hold(1)} aria-label="앞으로" className="w-11 h-11 bg-white/90 border border-ink-900 text-[18px] font-bold select-none">↑</button>
          <button {...hold(-1)} aria-label="뒤로" className="w-11 h-11 bg-white/90 border border-ink-900 text-[18px] font-bold select-none">↓</button>
        </div>
      )}
    </div>
  );
}
