import * as THREE from "three";
import { makeCanvas } from "./materials";

export interface Built {
  body: THREE.Group;
  ports: Record<string, THREE.Object3D>;
  /** modelled outer size in metres (w, h, d) */
  size: { w: number; h: number; d: number };
}

/** Cylinder between two points. */
export function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 14): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** A flat plane carrying printed text – used instead of brand logos (model-name plates). */
export function textPlate(
  text: string,
  w: number,
  h: number,
  opts: { color?: string; bg?: string | null; weight?: string; px?: number } = {},
): THREE.Mesh {
  const px = opts.px ?? 2400;
  const [c, g] = makeCanvas(Math.max(64, Math.round(w * px)), Math.max(32, Math.round(h * px)));
  if (opts.bg) {
    g.fillStyle = opts.bg;
    g.fillRect(0, 0, c.width, c.height);
  }
  g.fillStyle = opts.color ?? "#d8dbe0";
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = c.height * 0.72;
  g.font = `${opts.weight ?? "600"} ${size}px "Helvetica Neue", Arial, sans-serif`;
  const tw = g.measureText(text).width;
  if (tw > c.width * 0.94) {
    size *= (c.width * 0.94) / tw;
    g.font = `${opts.weight ?? "600"} ${size}px "Helvetica Neue", Arial, sans-serif`;
  }
  g.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: t,
      transparent: !opts.bg,
      roughness: 0.6,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  return m;
}

/** helper for legend canvases – text with metre-based position */
export function legendText(
  g: CanvasRenderingContext2D,
  m: (x: number, y: number) => [number, number],
  pxPerM: number,
  s: string,
  x: number,
  y: number,
  size = 0.0055,
  color = "#d9dde2",
  weight = "600",
) {
  const [px, py] = m(x, y);
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${weight} ${size * pxPerM}px "Helvetica Neue", Arial, sans-serif`;
  g.fillText(s, px, py);
}

export function legendLine(
  g: CanvasRenderingContext2D,
  m: (x: number, y: number) => [number, number],
  pxPerM: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = "#8a9099",
  w = 0.0006,
) {
  const [a, b] = m(x1, y1);
  const [c, d] = m(x2, y2);
  g.strokeStyle = color;
  g.lineWidth = w * pxPerM;
  g.beginPath();
  g.moveTo(a, b);
  g.lineTo(c, d);
  g.stroke();
}

export function legendBox(
  g: CanvasRenderingContext2D,
  m: (x: number, y: number) => [number, number],
  pxPerM: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color = "#8a9099",
  lw = 0.0006,
) {
  const [px, py] = m(cx - w / 2, cy + h / 2);
  g.strokeStyle = color;
  g.lineWidth = lw * pxPerM;
  g.strokeRect(px, py, w * pxPerM, h * pxPerM);
}
