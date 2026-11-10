import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Mats } from "./materials";

export type Ports = Record<string, THREE.Object3D>;

export function shadowed<T extends THREE.Object3D>(o: T, cast = true, receive = true): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = cast;
      c.receiveShadow = receive;
    }
  });
  return o;
}

export function box(w: number, h: number, d: number, mat: THREE.Material, r = 0): THREE.Mesh {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)) : new THREE.BoxGeometry(w, h, d);
  return new THREE.Mesh(geo, mat);
}

/** cylinder with its axis along +Z (pointing out of a panel) */
export function cylZ(rTop: number, rBot: number, len: number, mat: THREE.Material, seg = 32): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}

export function cylY(rTop: number, rBot: number, len: number, mat: THREE.Material, seg = 32): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
}

/** rotary knob, axis +Z */
export function knob(M: Mats, r = 0.011, h = 0.014, indicator = true): THREE.Group {
  const g = new THREE.Group();
  const skirt = cylZ(r * 1.12, r * 1.18, h * 0.35, M.knob);
  skirt.position.z = h * 0.17;
  const body = cylZ(r * 0.92, r * 1.05, h, M.knob);
  body.position.z = h * 0.5;
  const cap = cylZ(r * 0.78, r * 0.86, h * 0.1, M.plastic);
  cap.position.z = h + h * 0.04;
  g.add(skirt, body, cap);
  if (indicator) {
    const line = box(r * 0.14, r * 0.8, h * 0.08, M.white);
    line.position.set(0, r * 0.45, h + h * 0.1);
    g.add(line);
  }
  return g;
}

/** Female XLR / combo / male XLR panel jack. Faces +Z. */
export function xlrJack(M: Mats, kind: "f" | "m" | "combo" = "f"): THREE.Group {
  const g = new THREE.Group();
  const ring = cylZ(0.0125, 0.0125, 0.007, M.chrome, 40);
  ring.position.z = 0.0035;
  const hole = cylZ(0.0102, 0.0102, 0.0075, M.foam, 40);
  hole.position.z = 0.0042;
  g.add(ring, hole);
  const pinPos: [number, number][] = [
    [-0.0048, 0.0035],
    [0.0048, 0.0035],
    [0, -0.0055],
  ];
  if (kind === "m") {
    // male XLR: hollow metal shell around three pins
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.011, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.2, metalness: 1, side: THREE.DoubleSide }));
    shell.rotation.x = Math.PI / 2;
    shell.position.z = 0.0085;
    const floor = cylZ(0.0127, 0.0127, 0.001, M.foam, 40);
    floor.position.z = 0.0035;
    g.add(shell, floor);
    pinPos.forEach(([x, y]) => {
      const p = cylZ(0.0013, 0.0013, 0.008, M.gold, 8);
      p.position.set(x, y, 0.0075);
      g.add(p);
    });
  } else {
    pinPos.forEach(([x, y]) => {
      const p = cylZ(0.0016, 0.0016, 0.002, M.gold, 8);
      p.position.set(x, y, 0.0078);
      g.add(p);
    });
    const key = box(0.003, 0.002, 0.0025, M.chrome);
    key.position.set(0, 0.0092, 0.0078);
    g.add(key);
    if (kind === "combo") {
      const t = cylZ(0.0044, 0.0044, 0.0016, M.chrome, 24);
      t.position.set(0, -0.0001, 0.008);
      const t2 = cylZ(0.0033, 0.0033, 0.0018, M.foam, 24);
      t2.position.set(0, -0.0001, 0.0082);
      g.add(t, t2);
    }
  }
  return g;
}

/** IEC C14 inlet with rocker power switch beside it. Faces +Z. */
export function iecInlet(M: Mats): THREE.Group {
  const g = new THREE.Group();
  const frame = box(0.05, 0.036, 0.006, M.plastic, 0.002);
  frame.position.z = 0.003;
  const well = box(0.04, 0.026, 0.008, M.foam);
  well.position.z = 0.0035;
  g.add(frame, well);
  [-0.011, 0, 0.011].forEach((x, i) => {
    const pin = box(0.0035, i === 1 ? 0.007 : 0.0055, 0.01, M.brushed);
    pin.position.set(x, i === 1 ? 0.003 : -0.0035, 0.0045);
    g.add(pin);
  });
  return g;
}

export function rocker(M: Mats, w = 0.016, h = 0.024): THREE.Group {
  const g = new THREE.Group();
  const f = box(w + 0.004, h + 0.004, 0.004, M.plastic, 0.001);
  f.position.z = 0.002;
  const r = box(w, h, 0.008, M.knob, 0.002);
  r.position.set(0, 0, 0.006);
  r.rotation.x = 0.18;
  g.add(f, r);
  return g;
}

export function slideSwitch(M: Mats): THREE.Group {
  const g = new THREE.Group();
  const f = box(0.026, 0.01, 0.003, M.plastic, 0.001);
  f.position.z = 0.0015;
  const s = box(0.009, 0.007, 0.007, M.chrome, 0.0008);
  s.position.set(0.006, 0, 0.0055);
  g.add(f, s);
  return g;
}

export function pushButton(M: Mats, r = 0.006, color?: number): THREE.Group {
  const g = new THREE.Group();
  const b = cylZ(r, r * 1.1, 0.005, color ? M.led(color) : M.knob);
  b.position.z = 0.0025;
  const rim = cylZ(r * 1.35, r * 1.35, 0.002, M.chrome);
  rim.position.z = 0.001;
  g.add(rim, b);
  return g;
}

export function ledDot(M: Mats, color: number, r = 0.0025): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), M.led(color));
  return m;
}

/** An anchor Object3D whose +Z axis points out of the connector (cable direction). */
export function addPort(parent: THREE.Object3D, ports: Ports, name: string, pos: THREE.Vector3Like, rot?: THREE.Euler): THREE.Object3D {
  const p = new THREE.Object3D();
  p.name = name;
  p.position.set(pos.x, pos.y, pos.z);
  if (rot) p.rotation.copy(rot);
  parent.add(p);
  ports[name] = p;
  return p;
}

/** Recessed side handle facing +Z (grip bar over a dark pocket). */
export function sideHandle(M: Mats, w = 0.15, h = 0.05): THREE.Group {
  const g = new THREE.Group();
  const pocket = box(w, h, 0.004, M.foam, 0.006);
  pocket.position.z = 0.001;
  const rimL = box(0.008, h + 0.012, 0.006, M.enclosure, 0.002);
  rimL.position.set(-w / 2 - 0.004, 0, 0.002);
  const rimR = rimL.clone();
  rimR.position.x = w / 2 + 0.004;
  const rimT = box(w + 0.016, 0.008, 0.006, M.enclosure, 0.002);
  rimT.position.set(0, h / 2 + 0.004, 0.002);
  const rimB = rimT.clone();
  rimB.position.y = -h / 2 - 0.004;
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, w - 0.03, 6, 12), M.rubber);
  grip.rotation.z = Math.PI / 2;
  grip.position.z = 0.014;
  const postL = cylZ(0.005, 0.005, 0.014, M.plastic, 12);
  postL.position.set(-w / 2 + 0.012, 0, 0.007);
  const postR = postL.clone();
  postR.position.x = w / 2 - 0.012;
  g.add(pocket, rimL, rimR, rimT, rimB, grip, postL, postR);
  return g;
}

export function rubberFoot(M: Mats, r = 0.018, h = 0.014): THREE.Mesh {
  const f = cylY(r, r * 1.1, h, M.rubber, 20);
  f.position.y = h / 2;
  return f;
}

/** Loft a closed rounded polygon (plan view, XZ) up to a height. Used for the trapezoid Alto cabinet. */
export function prismFromPlan(points: [number, number][], height: number, mat: THREE.Material, bevel = 0.012): THREE.Mesh {
  const s = new THREE.Shape();
  points.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)));
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2); // extrusion now goes up +Y; shape y -> -z, so z flips back
  geo.translate(0, bevel, 0);
  const m = new THREE.Mesh(geo, mat);
  return m;
}
