import * as THREE from "three";
import { legendTexture, makeCanvas, type Mats } from "./materials";
import { addPort, box, cylY, cylZ, knob, ledDot, prismFromPlan, rocker, shadowed, type Ports } from "./parts";
import { legendText, strut, textPlate, type Built } from "./util";
import { SUB, TOP, trapezoidPrism } from "./audioModels";

/* ---------------- M20 speaker pole ---------------- */
export const POLE = { L: 0.8 };

export function buildPole(M: Mats): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const steel = new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.45, metalness: 0.85 });
  // M20 threaded stud (goes into the sub's socket)
  const stud = cylY(0.01, 0.01, 0.04, M.steel, 16);
  stud.position.y = -0.02;
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.0102, 0.0012, 5, 16), M.brushed);
    r.rotation.x = Math.PI / 2;
    r.position.y = -0.006 - i * 0.0055;
    body.add(r);
  }
  const flange = cylY(0.028, 0.03, 0.012, M.brushed, 32);
  flange.position.y = 0.006;
  const shaft = cylY(0.0175, 0.0175, POLE.L - 0.012, steel, 28);
  shaft.position.y = 0.012 + (POLE.L - 0.012) / 2;
  const bevel = cylY(0.0155, 0.0175, 0.012, steel, 28);
  bevel.position.y = POLE.L + 0.0;
  const collar = cylY(0.0215, 0.0215, 0.03, M.rubber, 28);
  collar.position.y = POLE.L - 0.1;
  const lock = cylZ(0.006, 0.006, 0.034, M.chrome, 12);
  lock.rotation.set(0, Math.PI / 2, 0);
  lock.position.set(0.026, 0.28, 0);
  const lockK = new THREE.Mesh(new THREE.SphereGeometry(0.011, 14, 10), M.knob);
  lockK.position.set(0.048, 0.28, 0);
  const sleeve = cylY(0.0235, 0.0235, 0.08, steel, 28);
  sleeve.position.y = 0.28;
  body.add(stud, flange, shaft, bevel, collar, sleeve, lock, lockK);
  addPort(body, ports, "top", { x: 0, y: POLE.L, z: 0 });
  shadowed(body);
  return { body, ports, size: { w: 0.05, h: POLE.L, d: 0.05 } };
}

/* ---------------- speaker tripod stand (preset 2) ---------------- */
export const TRIPOD = { H: 1.3 };

export function buildSpeakerTripod(M: Mats): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const steel = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.45, metalness: 0.85 });
  const hubY = 0.62;
  const col = cylY(0.0175, 0.0175, TRIPOD.H - 0.3, steel, 24);
  col.position.y = 0.3 + (TRIPOD.H - 0.3) / 2;
  const hub = cylY(0.04, 0.045, 0.09, M.plastic, 24);
  hub.position.y = hubY;
  const sleeve = cylY(0.0235, 0.0235, 0.4, steel, 24);
  sleeve.position.y = hubY + 0.18;
  const topCap = cylY(0.0195, 0.0195, 0.01, M.brushed, 24);
  topCap.position.y = TRIPOD.H;
  body.add(col, hub, sleeve, topCap);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const out = new THREE.Vector3(Math.cos(a) * 0.46, 0.012, Math.sin(a) * 0.46);
    const leg = strut(new THREE.Vector3(Math.cos(a) * 0.045, hubY - 0.02, Math.sin(a) * 0.045), out, 0.0135, steel);
    const brace = strut(new THREE.Vector3(0, hubY + 0.4 - 0.0, 0), new THREE.Vector3(Math.cos(a) * 0.16, hubY + 0.16, Math.sin(a) * 0.16), 0.0, steel);
    brace.visible = false;
    const foot = cylY(0.02, 0.022, 0.024, M.rubber, 16);
    foot.position.set(out.x, 0.012, out.z);
    body.add(leg, foot, brace);
  }
  addPort(body, ports, "top", { x: 0, y: TRIPOD.H, z: 0 });
  shadowed(body);
  return { body, ports, size: { w: 0.92, h: TRIPOD.H, d: 0.92 } };
}

/* ---------------- adjustable tripod boom stand ---------------- */
// In stand-local coordinates (metres). The boom arm points towards -X.
export const BOOM = {
  tip: new THREE.Vector3(-0.62, 1.54, 0),
  pivot: new THREE.Vector3(0.1, 1.38, 0),
};

export function buildBoomStand(M: Mats): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const steel = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.4, metalness: 0.85 });
  const hubY = 0.4;
  const hub = cylY(0.032, 0.038, 0.08, M.plastic, 24);
  hub.position.y = hubY;
  const lower = cylY(0.0125, 0.0125, 0.47, steel, 20);
  lower.position.y = hubY + 0.23;
  const upper = cylY(0.0105, 0.0105, 0.55, M.chrome, 20);
  upper.position.y = 0.82 + 0.275;
  const clutch = cylY(0.0175, 0.0175, 0.04, M.plastic, 20);
  clutch.position.y = 0.86;
  const clutchK = knob(M, 0.012, 0.014, false);
  clutchK.position.set(0, 0.86, 0.0175);
  clutchK.rotation.x = 0;
  body.add(hub, lower, upper, clutch, clutchK);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const out = new THREE.Vector3(Math.cos(a) * 0.36, 0.012, Math.sin(a) * 0.36);
    const leg = strut(new THREE.Vector3(Math.cos(a) * 0.03, hubY - 0.02, Math.sin(a) * 0.03), out, 0.0095, steel);
    const foot = cylY(0.016, 0.018, 0.022, M.rubber, 14);
    foot.position.set(out.x, 0.011, out.z);
    body.add(leg, foot);
  }
  // boom head + arm + counterweight
  const head = cylY(0.0225, 0.0225, 0.05, M.plastic, 20);
  head.position.set(0, 1.375, 0);
  const headK = knob(M, 0.011, 0.013, false);
  headK.position.set(0, 1.375, 0.022);
  const dir = new THREE.Vector3().subVectors(BOOM.tip, BOOM.pivot).normalize();
  const arm = strut(BOOM.pivot, BOOM.tip, 0.0095, steel);
  const cwStart = BOOM.pivot.clone().addScaledVector(dir, -0.02);
  const cwEnd = BOOM.pivot.clone().addScaledVector(dir, -0.09);
  const cw = strut(cwStart, cwEnd, 0.026, M.knob, 20);
  const holder = strut(BOOM.tip.clone().addScaledVector(new THREE.Vector3(-0.78, 0.62, 0), -0.02), BOOM.tip.clone().add(new THREE.Vector3(-0.78, 0.62, 0).multiplyScalar(0.035)), 0.0185, M.plastic, 20);
  body.add(head, headK, arm, cw, holder);
  shadowed(body);
  return { body, ports, size: { w: 0.8, h: 1.6, d: 0.8 } };
}

/* ---------------- folding table ---------------- */
export const TABLE = { W: 1.5, D: 0.6, H: 0.75 };

export function buildTable(M: Mats): Built {
  const { W, D, H } = TABLE;
  const body = new THREE.Group();
  const ports: Ports = {};
  const top = box(W, 0.03, D, M.tableTop, 0.006);
  top.position.y = H - 0.015;
  const trim = box(W + 0.006, 0.012, D + 0.006, M.rubber, 0.004);
  trim.position.y = H - 0.026;
  body.add(top, trim);
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.5, metalness: 0.8 });
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      const leg = cylY(0.016, 0.016, H - 0.04, steel, 16);
      leg.position.set(sx * (W / 2 - 0.07), (H - 0.04) / 2, sz * (D / 2 - 0.07));
      const foot = cylY(0.02, 0.022, 0.02, M.rubber, 14);
      foot.position.set(sx * (W / 2 - 0.07), 0.01, sz * (D / 2 - 0.07));
      body.add(leg, foot);
    }),
  );
  [-1, 1].forEach((sx) => {
    const cross = strut(new THREE.Vector3(sx * (W / 2 - 0.07), 0.3, -(D / 2 - 0.07)), new THREE.Vector3(sx * (W / 2 - 0.07), 0.3, D / 2 - 0.07), 0.009, steel);
    body.add(cross);
  });
  shadowed(body);
  return { body, ports, size: { w: W, h: H, d: D } };
}

/* ---------------- surge-protected extension board ---------------- */
export const STRIP = { W: 0.4, H: 0.045, D: 0.07, socketX: (i: number) => -0.12 + 0.05 * i };

export function buildPowerStrip(M: Mats): Built {
  const { W, H, D } = STRIP;
  const body = new THREE.Group();
  const ports: Ports = {};
  const shell = box(W, H, D, M.white, 0.01);
  shell.position.y = H / 2;
  body.add(shell);
  for (let i = 0; i < 6; i++) {
    const x = STRIP.socketX(i);
    const sock = box(0.042, 0.003, 0.046, M.plastic, 0.002);
    sock.position.set(x, H + 0.0004, 0);
    body.add(sock);
    // 3 pin holes (round-pin style)
    [[-0.011, 0.007], [0.011, 0.007], [0, -0.0095]].forEach(([dx, dz]) => {
      const h = cylY(i === 2 ? 0.003 : 0.0032, 0.0032, 0.004, M.foam, 12);
      h.position.set(x + dx, H + 0.0018, dz);
      body.add(h);
    });
    const p = new THREE.Object3D();
    p.name = `s${i + 1}`;
    p.position.set(x, H + 0.002, 0);
    p.rotation.x = -Math.PI / 2; // +Z -> +Y
    body.add(p);
    ports[p.name] = p;
  }
  const sw = rocker(M, 0.014, 0.022);
  sw.rotation.x = -Math.PI / 2;
  sw.position.set(-0.178, H + 0.001, 0);
  const rockerLit = ledDot(M, 0xff7a1a, 0.0035);
  rockerLit.position.set(-0.178, H + 0.0048, 0.021);
  const led = ledDot(M, 0x39e08f, 0.0028);
  led.position.set(0.18, H + 0.003, 0);
  const label = textPlate("SURGE PROTECTED · 6 WAY", 0.12, 0.011, { color: "#3a3d44", px: 4000 });
  label.rotation.x = -Math.PI / 2;
  label.position.set(0.0, H + 0.0007, 0.028);
  body.add(sw, rockerLit, led, label);
  shadowed(body);
  return { body, ports, size: { w: W, h: H, d: D } };
}

/* ---------------- source phone ---------------- */
export function buildPhone(M: Mats): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const W = 0.072;
  const L = 0.152;
  const T = 0.0078;
  const shell = box(W, T, L, M.plastic, 0.007);
  shell.position.y = T / 2;
  body.add(shell);
  const [c, g] = makeCanvas(300, 620);
  const grad = g.createLinearGradient(0, 0, 0, 620);
  grad.addColorStop(0, "#0e2a52");
  grad.addColorStop(1, "#06101f");
  g.fillStyle = grad;
  g.fillRect(0, 0, 300, 620);
  g.strokeStyle = "#5aa2ff";
  g.lineWidth = 12;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.beginPath();
  // Bluetooth rune
  g.moveTo(105, 215);
  g.lineTo(195, 295);
  g.lineTo(150, 340);
  g.lineTo(150, 170);
  g.lineTo(195, 215);
  g.lineTo(105, 295);
  g.stroke();
  g.fillStyle = "#cfe2ff";
  g.textAlign = "center";
  g.font = "600 34px Arial, sans-serif";
  g.fillText("SOURCE", 150, 420);
  g.font = "500 24px Arial, sans-serif";
  g.fillStyle = "#7fa8dc";
  g.fillText("Bluetooth / line out", 150, 458);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.007, L - 0.012), new THREE.MeshBasicMaterial({ map: tex }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = T + 0.0003;
  body.add(screen);
  addPort(body, ports, "line", { x: 0, y: T / 2, z: L / 2 });
  shadowed(body, true, true);
  return { body, ports, size: { w: W, h: T, d: L } };
}

/* ---------------- padded protective covers ---------------- */
export type CoverKind = "sub" | "top";

export function buildCover(M: Mats, kind: CoverKind): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const grow = 0.016;
  let H: number;
  if (kind === "sub") {
    const { W, D, H: h } = SUB;
    H = h + 0.03;
    const shell = box(W + grow * 2, H, D + grow * 2, M.cover, 0.035);
    shell.position.y = H / 2 - 0.006;
    body.add(shell);
    const fb = box(W + grow * 2 - 0.05, 0.012, 0.006, M.rubber, 0.003);
    fb.position.set(0, 0.04, D / 2 + grow + 0.002);
    body.add(fb);
    const tag = textPlate("THUMP118S COVER", 0.12, 0.018, { color: "#e1e4e8", bg: "#18191c" });
    tag.position.set(W / 2 - 0.1, 0.075, D / 2 + grow + 0.0035);
    body.add(tag);
    [-1, 1].forEach((sx) => {
      const slot = box(0.17, 0.045, 0.01, M.rubber, 0.012);
      slot.rotation.y = sx * (Math.PI / 2);
      slot.position.set(sx * (W / 2 + grow), 0.4, 0);
      body.add(slot);
    });
    const gromm = cylY(0.026, 0.026, 0.006, M.brushed, 28);
    gromm.position.set(0, H - 0.004, 0);
    body.add(gromm);
  } else {
    H = TOP.H + 0.03;
    const shell = trapezoidPrism(grow, H, M.cover, 0.03);
    shell.position.y = -0.012;
    body.add(shell);
    const tag = textPlate("TS415 COVER", 0.1, 0.018, { color: "#e1e4e8", bg: "#18191c" });
    tag.position.set(0.1, 0.07, TOP.D / 2 + grow + 0.0035);
    body.add(tag);
    const fb = box(TOP.Wf - 0.04, 0.012, 0.006, M.rubber, 0.003);
    fb.position.set(0, 0.04, TOP.D / 2 + grow + 0.002);
    body.add(fb);
    const slot = box(0.15, 0.045, 0.01, M.rubber, 0.012);
    slot.position.set(0, TOP.H - 0.05, TOP.D / 2 + grow + 0.002);
    body.add(slot);
  }
  // piping around the base
  shadowed(body);
  void prismFromPlan;
  void cylZ;
  void legendTexture;
  void legendText;
  return { body, ports, size: { w: 0.6, h: H, d: 0.6 } };
}
