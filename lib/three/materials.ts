import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function tex(c: HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// deterministic PRNG so the look is stable between loads
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fine speckle – used as bump + roughness for textured polyurea / ABS enclosure paint. */
function speckleTexture(size = 256, seed = 7) {
  const [c, g] = makeCanvas(size, size);
  const r = rng(seed);
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 90 + r() * 130;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, { repeat: true, srgb: false });
}

/** Diagonal-staggered perforation. White = metal, black = hole (alphaMap reads green). */
function perforationTexture() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#000";
  for (let j = -1; j < 9; j++) {
    for (let i = -1; i < 5; i++) {
      const x = i * 32 + (j % 2 === 0 ? 0 : 16) + 16;
      const y = j * 16 + 8;
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c, { repeat: true, srgb: false });
}

/** Staggered rectangular slots (Thump118S-style grille). White = metal, black = hole. */
function slotTexture() {
  const [c, g] = makeCanvas(112, 96);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 112, 96);
  g.fillStyle = "#000";
  for (let j = 0; j < 8; j++) {
    for (let i = -1; i < 5; i++) {
      const x = i * 28 + (j % 2 ? 14 : 0) + 3;
      g.fillRect(x, j * 12 + 2, 20, 7);
    }
  }
  return tex(c, { repeat: true, srgb: false });
}

/** Fine hexagonal round-hole perforation (TS415-style grille). 120×104 px = 10 × 8.66 mm. */
function hexTexture() {
  const [c, g] = makeCanvas(120, 104);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 120, 104);
  g.fillStyle = "#000";
  const hole = (x: number, y: number) => {
    g.beginPath();
    g.arc(x, y, 17, 0, Math.PI * 2);
    g.fill();
  };
  [30, 90].forEach((x) => hole(x, 26));
  [0, 60, 120].forEach((x) => hole(x, 78));
  return tex(c, { repeat: true, srgb: false });
}

/** Canvas drawn in a photo's own pixel coordinates (draw() works in px; K = supersampling). */
export function pxTexture(wPx: number, hPx: number, K: number, bg: string | null, draw: (g: CanvasRenderingContext2D) => void) {
  const [c, g] = makeCanvas(Math.round(wPx * K), Math.round(hPx * K));
  g.scale(K, K);
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, wPx, hPx);
  }
  draw(g);
  return tex(c);
}

function stageFloorTexture() {
  const [c, g] = makeCanvas(1024, 1024);
  const r = rng(21);
  g.fillStyle = "#18181b";
  g.fillRect(0, 0, 1024, 1024);
  // plywood-ish plank grain, painted black
  for (let p = 0; p < 8; p++) {
    const y0 = p * 128;
    const shade = 20 + r() * 9;
    g.fillStyle = `rgb(${shade},${shade},${shade + 3})`;
    g.fillRect(0, y0, 1024, 128);
    for (let k = 0; k < 90; k++) {
      g.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
      g.lineWidth = 0.6 + r() * 1.4;
      const y = y0 + r() * 128;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(300, y + (r() - 0.5) * 6, 700, y + (r() - 0.5) * 6, 1024, y + (r() - 0.5) * 4);
      g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(0, y0, 1024, 2);
    // butt joints
    const jx = r() * 900 + 50;
    g.fillRect(jx, y0, 2, 128);
  }
  // scuffs
  for (let k = 0; k < 500; k++) {
    g.fillStyle = `rgba(150,150,160,${r() * 0.07})`;
    g.fillRect(r() * 1024, r() * 1024, 1 + r() * 14, 1);
  }
  return tex(c, { repeat: true });
}

function quiltTexture() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = "#34363b";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#17181b";
  g.lineWidth = 2;
  for (let i = -256; i < 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(i + 256, 0);
    g.lineTo(i, 256);
    g.stroke();
  }
  return tex(c, { repeat: true });
}

function quiltBump() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#000";
  g.lineWidth = 8;
  for (let i = -256; i < 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(i + 256, 0);
    g.lineTo(i, 256);
    g.stroke();
  }
  return tex(c, { repeat: true, srgb: false });
}

/* ------------------------------------------------------------------ */
/* Shared materials                                                    */
/* ------------------------------------------------------------------ */

const speckle = speckleTexture();
const perf = perforationTexture();
const slots = slotTexture();
const hex = hexTexture();

function paintedBlack(repeat = 3) {
  const bump = speckle.clone();
  bump.repeat.set(repeat, repeat);
  bump.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    color: 0x16171a,
    roughness: 0.72,
    metalness: 0.05,
    bumpMap: bump,
    bumpScale: 0.9,
    roughnessMap: bump,
  });
}

export interface Mats {
  enclosure: THREE.MeshStandardMaterial;
  enclosureAlt: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  brushed: THREE.MeshStandardMaterial;
  panel: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  knob: THREE.MeshStandardMaterial;
  foam: THREE.MeshStandardMaterial;
  cone: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  led: (c: number) => THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  mesh: THREE.MeshStandardMaterial;
  grille: (w: number, h: number) => THREE.MeshStandardMaterial;
  grilleSlots: (w: number, h: number) => THREE.MeshStandardMaterial;
  grilleHex: () => THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  cover: THREE.MeshStandardMaterial;
  tableTop: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
}

export function createMaterials(): Mats {
  const floorTex = stageFloorTexture();
  floorTex.repeat.set(6, 5);
  const quilt = quiltTexture();
  const quiltB = quiltBump();
  quilt.repeat.set(2.5, 2.5);
  quiltB.repeat.set(2.5, 2.5);

  return {
    enclosure: paintedBlack(4),
    enclosureAlt: paintedBlack(10),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.95, metalness: 0 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.95 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 }),
    brushed: new THREE.MeshStandardMaterial({ color: 0xb6bac0, roughness: 0.42, metalness: 0.9 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: 0.55, metalness: 0.55 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.45, metalness: 0.1 }),
    knob: new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.38, metalness: 0.2 }),
    foam: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1, metalness: 0 }),
    cone: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9e9ec, roughness: 0.5, metalness: 0 }),
    led: (c: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.8, roughness: 0.4 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.3, metalness: 1 }),
    mesh: new THREE.MeshStandardMaterial({ color: 0x5d6168, roughness: 0.55, metalness: 0.55 }),
    grille: (w: number, h: number) => {
      const a = perf.clone();
      a.repeat.set(w / 0.032, h / 0.032);
      a.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        color: 0x202226,
        roughness: 0.38,
        metalness: 0.85,
        alphaMap: a,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });
    },
    grilleSlots: (w: number, h: number) => {
      const a = slots.clone();
      a.repeat.set(w / 0.056, h / 0.048);
      a.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ color: 0x232528, roughness: 0.42, metalness: 0.75, alphaMap: a, alphaTest: 0.5, side: THREE.DoubleSide });
    },
    // UVs are in metres (ShapeGeometry) – one tile is 10 × 8.66 mm
    grilleHex: () => {
      const a = hex.clone();
      a.repeat.set(100, 115.47);
      a.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.45, metalness: 0.7, alphaMap: a, alphaTest: 0.5, side: THREE.DoubleSide });
    },
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.82, metalness: 0 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 1 }),
    cover: new THREE.MeshStandardMaterial({
      color: 0x6b6e75,
      map: quilt,
      bumpMap: quiltB,
      bumpScale: 1.1,
      roughness: 0.92,
      metalness: 0,
    }),
    tableTop: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.8, metalness: 0.05 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.08, metalness: 0.6 }),
  };
}

/** Draws printed legends for a panel and returns a texture + the pixel/metre scale used. */
export function legendTexture(
  wM: number,
  hM: number,
  pxPerM: number,
  bg: string,
  draw: (g: CanvasRenderingContext2D, m: (x: number, y: number) => [number, number]) => void,
) {
  const [c, g] = makeCanvas(Math.round(wM * pxPerM), Math.round(hM * pxPerM));
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  // metres (origin = panel centre, +x right, +y up) -> pixels
  const m = (x: number, y: number): [number, number] => [c.width / 2 + x * pxPerM, c.height / 2 - y * pxPerM];
  draw(g, m);
  return tex(c);
}
