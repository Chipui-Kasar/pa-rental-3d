import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { legendTexture, pxTexture, type Mats } from "./materials";
import {
  addPort,
  box,
  cylY,
  cylZ,
  iecInlet,
  knob,
  ledDot,
  prismFromPlan,
  pushButton,
  rocker,
  rubberFoot,
  shadowed,
  sideHandle,
  slideSwitch,
  xlrJack,
  type Ports,
} from "./parts";
import { legendText, textPlate, type Built } from "./util";

/** text helper for photo-pixel canvases */
function mkT(g: CanvasRenderingContext2D) {
  return (s: string, x: number, y: number, size = 8, col = "#c9ccd1", align: CanvasTextAlign = "center", wt = "600") => {
    g.fillStyle = col;
    g.textAlign = align;
    g.textBaseline = "middle";
    g.font = `${wt} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.fillText(s, x, y);
  };
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** knob with a coloured cap (as on the MG10XU reference photo). Axis +Z. */
function colorKnob(M: Mats, r: number, cap: number, pointer = 0xffffff, h = 0.011): THREE.Group {
  const g = new THREE.Group();
  const skirt = cylZ(r * 1.0, r * 1.08, h * 0.45, M.knob, 28);
  skirt.position.z = h * 0.22;
  const capM = new THREE.MeshStandardMaterial({ color: cap, roughness: 0.4, metalness: 0.1 });
  const top = cylZ(r * 0.8, r * 0.88, h * 0.55, capM, 28);
  top.position.z = h * 0.45 + h * 0.27;
  const pm = new THREE.MeshStandardMaterial({ color: pointer, roughness: 0.5 });
  const line = box(r * 0.16, r * 0.72, h * 0.06, pm);
  line.position.set(0, r * 0.36, h * 0.75 + h * 0.03);
  g.add(skirt, top, line);
  return g;
}

/* ================================================================== */
/* Mackie Thump118S – 540 × 530 × 605 mm (per brief)                   */
/* Shapes follow assets/mackie bass front.jpg and mackei thump bass back.jpg */
/* ================================================================== */

export const SUB = { W: 0.54, D: 0.53, H: 0.605 };

function subRearPanel(M: Mats, ports: Ports): THREE.Group {
  // panel region of the rear photo: 453 × 986 px, 1 px ≈ 0.363 mm
  const WP = 453;
  const HP = 986;
  const S = 0.000363;
  const P = (X: number, Y: number): [number, number] => [(X - WP / 2) * S, -(Y - HP / 2) * S];
  const g = new THREE.Group();
  const tex = pxTexture(WP, HP, 3, "#131415", (c) => {
    const T = mkT(c);
    c.strokeStyle = "#6b7075";
    c.lineWidth = 1.5;
    rr(c, 66, 35, 319, 340, 10);
    c.stroke();
    c.beginPath();
    c.moveTo(66, 169);
    c.lineTo(385, 169);
    c.moveTo(221, 35);
    c.lineTo(221, 161);
    c.moveTo(316, 35);
    c.lineTo(316, 161);
    c.stroke();
    // HIGH PASS MODE
    T("HIGH PASS MODE", 105, 46, 8, "#3fcf5a", "left", "700");
    T("FLAT", 100, 63, 6.5, "#c9ccd1", "right");
    T("DEEP", 100, 83, 6.5, "#c9ccd1", "right");
    T("PUNCH", 181, 63, 6.5, "#c9ccd1", "left");
    T("VARIABLE", 181, 83, 6.5, "#c9ccd1", "left");
    [113, 170].forEach((x) => {
      c.fillStyle = "#08090a";
      rr(c, x - 7, 56, 14, 36, 6);
      c.fill();
      c.strokeStyle = "#555a60";
      c.lineWidth = 1;
      c.stroke();
    });
    c.fillStyle = "#3fcf5a";
    c.beginPath();
    c.arc(113, 63, 3, 0, 7);
    c.fill();
    T("120Hz", 140, 110, 6, "#aab0b8");
    T("80Hz", 124, 156, 6, "#aab0b8");
    T("160Hz", 156, 156, 6, "#aab0b8");
    // FRONT LED
    T("FRONT LED", 268, 57, 6.5);
    T("OFF", 296, 69, 5.5, "#aab0b8", "left");
    T("ON", 296, 79, 5.5, "#aab0b8", "left");
    // SIG/OL + level
    T("SIG/OL", 240, 114, 6, "#c9ccd1");
    T("-6dB", 252, 157, 5.5, "#aab0b8");
    T("+6dB", 284, 157, 5.5, "#aab0b8");
    // PHASE / FR OUTPUT
    T("PHASE", 347, 57, 6.5);
    T("NORMAL", 357, 91, 5.5, "#aab0b8", "left");
    T("INVERT", 357, 100, 5.5, "#aab0b8", "left");
    T("FR OUTPUT", 347, 116, 6.5);
    T("STEREO", 357, 149, 5.5, "#aab0b8", "left");
    T("MONO", 357, 158, 5.5, "#aab0b8", "left");
    // XLR block labels + link lines
    c.strokeStyle = "#3fae45";
    c.lineWidth = 2;
    [221, 301].forEach((y) => {
      c.beginPath();
      c.moveTo(172, y);
      c.lineTo(196, y);
      c.moveTo(258, y);
      c.lineTo(282, y);
      c.stroke();
    });
    T("A", 95, 226, 7, "#3fae45");
    T("A", 358, 226, 7, "#3fae45");
    T("B", 95, 306, 7, "#3fae45");
    T("B", 358, 306, 7, "#3fae45");
    T("INPUT", 142, 354, 7);
    T("HIGH PASS", 226, 354, 7);
    T("OUT", 226, 363, 7);
    T("FULL RANGE", 310, 354, 7);
    T("OUT", 310, 363, 7);
    // model name (text instead of the brand logo)
    c.save();
    c.transform(1, 0, -0.18, 1, 0, 0);
    c.font = '900 38px "Arial Black", Impact, Arial, sans-serif';
    c.textBaseline = "middle";
    c.textAlign = "left";
    c.fillStyle = "#37c746";
    c.fillText("THUMP", 122 + 553 * 0.18, 553);
    c.fillStyle = "#9da2a8";
    c.fillText("118S", 142 + 553 * 0.18 + 142, 553);
    c.restore();
    // caution label
    c.fillStyle = "#8d9094";
    c.fillRect(135, 634, 182, 74);
    c.fillStyle = "#1a1b1c";
    c.fillRect(135, 634, 182, 30);
    T("CAUTION", 226, 645, 8, "#e5e7ea", "center", "700");
    T("RISK OF ELECTRIC SHOCK", 226, 656, 4.5, "#e5e7ea");
    T("SERIAL NUMBER", 170, 671, 4.5, "#202224");
    T("REVISION", 280, 671, 4.5, "#202224");
    for (let i = 0; i < 9; i++) T("········································", 226, 722 + i * 6.5, 4, "#4b4f55");
    // power
    T("100-240VAC", 295, 906, 5.5, "#aab0b8");
    T("50-60 Hz 75W", 295, 914, 5.5, "#aab0b8");
    c.fillStyle = "#0a0b0c";
    rr(c, 122, 836, 36, 56, 5);
    c.fill();
    c.strokeStyle = "#3a3d41";
    c.stroke();
    T("I", 140, 846, 8, "#aab0b8");
    c.strokeStyle = "#aab0b8";
    c.beginPath();
    c.arc(140, 878, 4, 0, 7);
    c.stroke();
    // screws
    c.fillStyle = "#2a2c2f";
    [
      [20, 173],
      [433, 173],
      [20, 493],
      [433, 493],
      [20, 808],
      [433, 808],
      [140, 965],
      [310, 965],
    ].forEach(([x, y]) => {
      c.beginPath();
      c.arc(x, y, 5, 0, 7);
      c.fill();
    });
  });
  const plate = box(WP * S, HP * S, 0.005, M.enclosure, 0.006);
  plate.position.z = 0.0005;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(WP * S, HP * S), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 }));
  face.position.z = 0.0033;
  g.add(plate, face);

  const jack = (name: string, X: number, Y: number, kind: "f" | "m") => {
    const [x, y] = P(X, Y);
    const j = xlrJack(M, kind);
    j.position.set(x, y, 0.0025);
    g.add(j);
    addPort(g, ports, name, { x, y, z: kind === "m" ? 0.0185 : 0.012 });
  };
  jack("in_a", 142, 221, "f");
  jack("in_b", 142, 301, "f");
  jack("hp_a", 227, 221, "m");
  jack("hp_b", 227, 301, "m");
  jack("fr_a", 310, 221, "m");
  jack("fr_b", 310, 301, "m");

  const kb = (X: number, Y: number, rot: number) => {
    const [x, y] = P(X, Y);
    const k = new THREE.Group();
    const body = cylZ(0.0078, 0.0086, 0.011, M.knob, 24);
    body.position.z = 0.0055;
    const cap = cylZ(0.0058, 0.0058, 0.002, M.chrome, 24);
    cap.position.z = 0.0118;
    const ind = box(0.0016, 0.0062, 0.0012, M.white);
    ind.position.set(0, 0.0032, 0.0132);
    k.add(body, cap, ind);
    k.position.set(x, y, 0.003);
    k.rotation.z = rot;
    g.add(k);
  };
  kb(140, 133, 0.5);
  kb(268, 133, -0.2);
  // small selector buttons
  [
    [140, 74],
    [267, 74],
    [347, 74],
    [347, 132],
  ].forEach(([X, Y]) => {
    const [x, y] = P(X, Y);
    const b = pushButton(M, 0.0042);
    b.position.set(x, y, 0.003);
    g.add(b);
  });
  const [lx, ly] = P(113, 63);
  const led = ledDot(M, 0x3fcf5a, 0.0025);
  led.position.set(lx, ly, 0.0045);
  g.add(led);
  const [sx, sy] = P(233, 132);
  const sig = ledDot(M, 0xf5a524, 0.0024);
  sig.position.set(sx, sy, 0.0045);
  g.add(sig);

  const [ix, iy] = P(295, 868);
  const iec = iecInlet(M);
  iec.position.set(ix, iy, 0.003);
  g.add(iec);
  addPort(g, ports, "power", { x: ix, y: iy, z: 0.015 });
  return g;
}

export function buildSub(M: Mats): Built {
  const { W, D, H } = SUB;
  const body = new THREE.Group();
  const ports: Ports = {};
  const foot = 0.012;
  const mainH = H - foot;
  const lip = 0.03;
  const tTop = 0.02;
  const tSide = 0.008;
  const cy = foot + mainH / 2;

  const main = box(W, mainH, D - lip, M.enclosure, 0.012);
  main.position.set(0, cy, -lip / 2);
  body.add(main);
  const bar = (w: number, h: number, x: number, y: number) => {
    const b = box(w, h, lip, M.enclosure, 0.006);
    b.position.set(x, y, D / 2 - lip / 2);
    body.add(b);
  };
  bar(W, tTop, 0, foot + mainH - tTop / 2);
  bar(W, tTop, 0, foot + tTop / 2);
  bar(tSide, mainH - 2 * tTop + 0.01, -W / 2 + tSide / 2, cy);
  bar(tSide, mainH - 2 * tTop + 0.01, W / 2 - tSide / 2, cy);

  const gw = W - 2 * tSide + 0.004;
  const gh = mainH - 2 * tTop + 0.004;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), M.foam);
  back.position.set(0, cy, D / 2 - lip + 0.002);
  body.add(back);
  // slotted "brick" grille – edge to edge
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), M.grilleSlots(gw, gh));
  grille.position.set(0, cy, D / 2 - 0.006);
  body.add(grille);
  // mid-height seam
  const seam = box(gw, 0.0014, 0.0012, M.foam);
  seam.position.set(0, cy - 0.027, D / 2 - 0.0052);
  body.add(seam);

  // corner caps (top + bottom) and screws, as in the photo
  [-1, 1].forEach((sx) => {
    [1, -1].forEach((sy) => {
      const cap = box(0.064, 0.021, 0.004, M.plastic, 0.002);
      cap.position.set(sx * (W / 2 - 0.032 - 0.002), sy > 0 ? H - 0.0115 : foot + 0.0115, D / 2 - 0.0045);
      body.add(cap);
    });
  });
  [-0.124, -0.046, 0.042, 0.125].forEach((x) => {
    [H - 0.0115, foot + 0.0115].forEach((y) => {
      const sc = cylZ(0.0042, 0.0042, 0.003, M.panel, 14);
      sc.position.set(x, y, D / 2 - 0.0016);
      body.add(sc);
    });
  });
  // green status LED + centre ring (model text instead of the brand figure)
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.0085, 0.0028, 0.0015), M.led(0x3dff5a));
  led.position.set(0, foot + 0.034, D / 2 - 0.0042);
  body.add(led);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0235, 0.0018, 10, 48), M.led(0x2fb83f));
  ring.position.set(0, cy, D / 2 - 0.0045);
  const disc = cylZ(0.0235, 0.0235, 0.0014, M.foam, 40);
  disc.position.set(0, cy, D / 2 - 0.0048);
  const tag = textPlate("118S", 0.028, 0.012, { color: "#e6e9ec", px: 4000 });
  tag.position.set(0, cy, D / 2 - 0.0032);
  body.add(disc, ring, tag);

  // feet (as in the photo: two rubber feet, inboard of the corners)
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const f = rubberFoot(M, 0.02, 0.012);
      f.position.set(sx * 0.2, 0, sz * (D / 2 - 0.06));
      body.add(f);
    });
    const h = sideHandle(M, 0.17, 0.052);
    h.position.set(sx * (W / 2), cy + 0.04, 0.0);
    h.rotation.y = sx * (Math.PI / 2);
    body.add(h);
  });

  // top: M20 threaded pole socket
  const collar = cylY(0.03, 0.034, 0.007, M.brushed, 40);
  collar.position.set(0, H + 0.0015, 0);
  const well = cylY(0.0195, 0.0195, 0.008, M.foam, 32);
  well.position.set(0, H + 0.0028, 0);
  const thread = new THREE.Mesh(new THREE.TorusGeometry(0.0145, 0.0015, 6, 28), M.steel);
  thread.rotation.x = Math.PI / 2;
  thread.position.set(0, H + 0.0066, 0);
  body.add(collar, well, thread);
  addPort(body, ports, "socket", { x: 0, y: H, z: 0 });

  // rear amp panel – narrow portrait plate centred on the back, like the photo
  const rp = subRearPanel(M, ports);
  rp.position.set(0, cy, -D / 2 - 0.0005);
  rp.rotation.y = Math.PI;
  body.add(rp);
  shadowed(body);
  grille.castShadow = false;
  back.castShadow = false;
  return { body, ports, size: { w: W, h: H, d: D } };
}

/* ================================================================== */
/* Alto TS415 – approximate dimensions; shape follows assets/alto *.jpg */
/* ================================================================== */

export const TOP = { Wf: 0.4175, Wr: 0.31, D: 0.402, H: 0.643, INSERT: 0.09 };

function inset(points: [number, number][], by: number): [number, number][] {
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
  const cz = points.reduce((a, p) => a + p[1], 0) / points.length;
  return points.map(([x, z]) => {
    const dx = cx - x;
    const dz = cz - z;
    const l = Math.hypot(dx, dz) || 1;
    return [x + (dx / l) * by, z + (dz / l) * by];
  });
}

export function trapezoidPrism(grow: number, height: number, mat: THREE.Material, bevel: number): THREE.Mesh {
  const hf = TOP.Wf / 2 + grow;
  const hr = TOP.Wr / 2 + grow;
  const zf = TOP.D / 2 + grow;
  const zr = -TOP.D / 2 - grow;
  const pts: [number, number][] = inset(
    [
      [-hr, zr],
      [hr, zr],
      [hf, zf],
      [-hf, zf],
    ],
    bevel,
  );
  return prismFromPlan(pts, height, mat, bevel);
}

/** Chamfered front profile extruded in depth, then tapered towards the back. */
function altoCabinet(mat: THREE.Material): THREE.Mesh {
  const { Wf, Wr, D, H } = TOP;
  const b = 0.006;
  const hw = Wf / 2 - b;
  const y0 = b;
  const y1 = H - b;
  const ct = 0.045;
  const cb = 0.03;
  const s = new THREE.Shape();
  s.moveTo(-hw + cb, y0);
  s.lineTo(hw - cb, y0);
  s.lineTo(hw, y0 + cb);
  s.lineTo(hw, y1 - ct);
  s.lineTo(hw - ct, y1);
  s.lineTo(-hw + ct, y1);
  s.lineTo(-hw, y1 - ct);
  s.lineTo(-hw, y0 + cb);
  s.closePath();
  const depth = D - 2 * b;
  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -depth / 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const k = Wr / Wf;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getZ(i) + D / 2) / D;
    pos.setX(i, pos.getX(i) * (k + (1 - k) * t));
  }
  geo = toCreasedNormals(geo, 0.6);
  return new THREE.Mesh(geo, mat);
}

function altoGrilleShape(): THREE.Shape {
  const { Wf, H } = TOP;
  const hw = Wf / 2 - 0.03;
  const y0 = 0.028;
  const y1 = H - 0.03;
  const ym = H * 0.46;
  const s = new THREE.Shape();
  s.moveTo(-hw + 0.022, y0);
  s.lineTo(hw - 0.022, y0);
  s.lineTo(hw, y0 + 0.022);
  s.lineTo(hw, ym - 0.13);
  s.bezierCurveTo(hw - 0.016, ym - 0.07, hw - 0.016, ym + 0.07, hw, ym + 0.13);
  s.lineTo(hw, y1 - 0.035);
  s.lineTo(hw - 0.035, y1);
  s.lineTo(0.062, y1);
  s.lineTo(0.048, y1 - 0.024);
  s.lineTo(-0.048, y1 - 0.024);
  s.lineTo(-0.062, y1);
  s.lineTo(-hw + 0.035, y1);
  s.lineTo(-hw, y1 - 0.035);
  s.lineTo(-hw, ym + 0.13);
  s.bezierCurveTo(-hw + 0.016, ym + 0.07, -hw + 0.016, ym - 0.07, -hw, ym - 0.13);
  s.lineTo(-hw, y0 + 0.022);
  s.closePath();
  return s;
}

function topRearPanel(M: Mats, ports: Ports): THREE.Group {
  // panel region of the rear photo: 213 × 470 px, 1 px ≈ 0.87 mm
  const WP = 213;
  const HP = 470;
  const S = 0.00087;
  const P = (X: number, Y: number): [number, number] => [(X - WP / 2) * S, -(Y - HP / 2) * S];
  const g = new THREE.Group();
  const tex = pxTexture(WP, HP, 5, "#121314", (c) => {
    const T = mkT(c);
    // top control block
    T("Bluetooth", 78, 22, 5.5, "#9aa0a8");
    T("LEVEL", 46, 98, 5, "#9aa0a8");
    T("LEVEL", 84, 98, 5, "#9aa0a8");
    T("INPUT 1", 46, 172, 5.5, "#c9ccd1");
    T("INPUT 2", 86, 172, 5.5, "#c9ccd1");
    T("MIX OUT", 124, 172, 5.5, "#c9ccd1");
    c.strokeStyle = "#555a60";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(18, 112);
    c.lineTo(150, 112);
    c.moveTo(18, 184);
    c.lineTo(150, 184);
    c.stroke();
    // right column: USB port + DSP / mode switches
    c.fillStyle = "#07080a";
    rr(c, 143, 34, 28, 13, 2);
    c.fill();
    c.strokeStyle = "#6b7075";
    c.stroke();
    [55, 72, 88, 104].forEach((y, i) => {
      c.fillStyle = "#26282b";
      rr(c, 165, y - 4, 22, 9, 2);
      c.fill();
      c.fillStyle = i % 2 ? "#f5a524" : "#3fcf5a";
      c.beginPath();
      c.arc(193, y, 2.2, 0, 7);
      c.fill();
    });
    T("Bluetooth Instructions", 106, 205, 5, "#8a9097");
    // model text instead of the brand logo
    T("TS415", 106, 247, 34, "#f1f3f5", "center", "800");
    T('2500-WATT 15" 2-WAY', 106, 268, 6, "#c9ccd1");
    T("POWERED LOUDSPEAKER", 106, 277, 6, "#c9ccd1");
    c.fillStyle = "#e9ebee";
    c.fillRect(40, 300, 58, 7);
    c.fillRect(112, 300, 52, 7);
    // power block
    T("POWER", 36, 308 + 0, 5, "#aab0b8");
    c.fillStyle = "#0a0b0c";
    rr(c, 26, 316, 20, 28, 3);
    c.fill();
    c.strokeStyle = "#3a3d41";
    c.stroke();
    c.fillStyle = "#8d9094";
    c.fillRect(70, 338, 82, 36);
    c.fillStyle = "#1a1b1c";
    c.fillRect(70, 338, 82, 12);
    T("CAUTION", 111, 344, 6, "#e5e7ea", "center", "700");
    T("AC INPUT", 43, 410, 5, "#9aa0a8");
    for (let i = 0; i < 4; i++) T("··························", 106, 392 + i * 5, 4, "#4b4f55");
    T("MADE IN CHINA", 106, 458, 4.5, "#6d7480");
    c.fillStyle = "#2a2c2f";
    [
      [10, 10],
      [203, 10],
      [10, 460],
      [203, 460],
    ].forEach(([x, y]) => {
      c.beginPath();
      c.arc(x, y, 3.5, 0, 7);
      c.fill();
    });
  });
  const plate = box(WP * S + 0.006, HP * S + 0.006, 0.005, M.enclosure, 0.004);
  plate.position.z = 0.0005;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(WP * S, HP * S), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 }));
  face.position.z = 0.0033;
  g.add(plate, face);

  const J = (name: string, X: number, Y: number, kind: "combo" | "m") => {
    const [x, y] = P(X, Y);
    const j = xlrJack(M, kind);
    j.scale.setScalar(1.35);
    j.position.set(x, y, 0.003);
    g.add(j);
    addPort(g, ports, name, { x, y, z: kind === "m" ? 0.02 : 0.0125 });
  };
  J("in_ch1", 46, 142, "combo");
  J("in_ch2", 86, 142, "combo");
  J("mix_out", 124, 140, "m");

  const K = (X: number, Y: number, r: number, rot: number) => {
    const [x, y] = P(X, Y);
    const k = knob(M, r, 0.014);
    k.position.set(x, y, 0.003);
    k.rotation.z = rot;
    g.add(k);
  };
  K(48, 36, 0.0148, -0.6); // large master-style knob (top left)
  K(46, 78, 0.0095, 0.3);
  K(84, 78, 0.0095, -0.2);
  [
    [85, 35],
    [121, 35],
  ].forEach(([X, Y]) => {
    const [x, y] = P(X, Y);
    const b = box(0.0155, 0.0105, 0.004, M.knob, 0.001);
    b.position.set(x, y, 0.0055);
    g.add(b);
  });
  const [bx, by] = P(110, 56);
  const bl = ledDot(M, 0x2f7bff, 0.0022);
  bl.position.set(bx, by, 0.005);
  g.add(bl);

  const [rx, ry] = P(36, 330);
  const sw = rocker(M, 0.012, 0.018);
  sw.position.set(rx, ry, 0.003);
  g.add(sw);
  const [ix, iy] = P(43, 385);
  const iec = iecInlet(M);
  iec.position.set(ix, iy, 0.003);
  g.add(iec);
  addPort(g, ports, "power", { x: ix, y: iy, z: 0.015 });
  return g;
}

export function buildTop(M: Mats): Built {
  const { Wf, Wr, D, H } = TOP;
  const body = new THREE.Group();
  const ports: Ports = {};

  body.add(altoCabinet(M.enclosureAlt));

  // perforated hex grille with the notch + S-curved flanks (photo)
  const gs = altoGrilleShape();
  const grille = new THREE.Mesh(new THREE.ShapeGeometry(gs, 12), M.grilleHex());
  grille.position.z = D / 2 + 0.0012;
  body.add(grille);
  const backing = new THREE.Mesh(new THREE.ShapeGeometry(gs, 12), M.foam);
  backing.position.z = D / 2 + 0.0004;
  body.add(backing);

  // corner screws
  [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ].forEach(([sx, sy]) => {
    const sc = cylZ(0.0048, 0.0048, 0.003, M.panel, 14);
    sc.position.set(sx * (Wf / 2 - (sy > 0 ? 0.034 : 0.026)), sy > 0 ? H - 0.024 : 0.019, D / 2 + 0.0012);
    body.add(sc);
  });

  // trapezoid badge at the bottom centre with the model text (no brand logo)
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.05),
    new THREE.MeshStandardMaterial({
      map: pxTexture(200, 100, 4, null, (c) => {
        c.fillStyle = "#0c0d0f";
        c.beginPath();
        c.moveTo(30, 94);
        c.lineTo(170, 94);
        c.lineTo(190, 8);
        c.lineTo(10, 8);
        c.closePath();
        c.fill();
        c.strokeStyle = "#22a8ea";
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(190, 8);
        c.lineTo(170, 94);
        c.lineTo(30, 94);
        c.lineTo(10, 8);
        c.stroke();
        c.fillStyle = "#f1f3f5";
        c.font = '800 38px "Helvetica Neue", Arial, sans-serif';
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("TS415", 100, 52);
      }),
      transparent: true,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  badge.position.set(0, 0.04, D / 2 + 0.0022);
  body.add(badge);

  // side handle recesses (vertical, sloped with the tapered sides)
  const a = Math.atan2(Wf / 2 - Wr / 2, D);
  const hwAt0 = (Wf + Wr) / 4;
  [-1, 1].forEach((sx) => {
    const h = sideHandle(M, 0.14, 0.06);
    h.rotation.order = "YXZ";
    h.rotation.y = sx * (Math.PI / 2 + a);
    h.rotation.z = Math.PI / 2;
    h.position.set(sx * (hwAt0 + 0.004), 0.32, 0);
    body.add(h);
  });
  // rear top + bottom handle recesses
  [H - 0.036, 0.036].forEach((y) => {
    const h = sideHandle(M, 0.13, 0.03);
    h.position.set(0, y, -D / 2 - 0.0005);
    h.rotation.y = Math.PI;
    body.add(h);
  });

  // pole cup (underside)
  const cup = cylY(0.032, 0.036, 0.012, M.brushed, 36);
  cup.position.set(0, -0.004, 0);
  const cupHole = cylY(0.0195, 0.0195, 0.014, M.foam, 32);
  cupHole.position.set(0, -0.0035, 0);
  body.add(cup, cupHole);
  addPort(body, ports, "cup", { x: 0, y: TOP.INSERT, z: 0 });

  // rear panel
  const rp = topRearPanel(M, ports);
  rp.position.set(0, 0.326, -D / 2 - 0.0008);
  rp.rotation.y = Math.PI;
  body.add(rp);

  shadowed(body);
  grille.castShadow = false;
  backing.castShadow = false;
  return { body, ports, size: { w: Wf, h: H, d: D } };
}

/* ================================================================== */
/* Yamaha MG10XU – 244 × 71 × 294 mm. Control layout follows           */
/* assets/yamaha front.jpg (top) and assets/yamaha side.jpg (rear).     */
/* ================================================================== */

export const MIX = { W: 0.244, H: 0.071, D: 0.294, Hf: 0.034 };

const MPW = MIX.W - 0.006;
const MPL = Math.hypot(MIX.D, MIX.H - MIX.Hf) - 0.004;
const MSX = MPW / 860;
const MSY = MPL / 1000;
/** photo px -> panel-local metres (x right, y towards the back) */
const mp = (X: number, Y: number): [number, number] => [(X - 430) * MSX, (500 - Y) * MSY];

const MONO_X = [78, 163, 247, 333];
const ST_X = [418, 497, 577];

function mixerTopTexture(): THREE.Texture {
  return pxTexture(860, 1000, 2.2, "#16181c", (c) => {
    const T = mkT(c);
    // blue panels
    c.fillStyle = "#1c62b2";
    rr(c, 575, 38, 275, 215, 8);
    c.fill();
    rr(c, 628, 690, 222, 300, 8);
    c.fill();
    c.fillStyle = "#124a8c";
    rr(c, 575, 8, 275, 30, 6);
    c.fill();
    // strip separators
    c.strokeStyle = "#2b78ce";
    c.lineWidth = 1.3;
    [37, 123, 208, 293, 378, 455, 532].forEach((x) => {
      c.beginPath();
      c.moveTo(x, 40);
      c.lineTo(x, 975);
      c.stroke();
    });
    c.beginPath();
    c.moveTo(37, 290);
    c.lineTo(575, 290);
    c.stroke();

    const ticks = (X: number, Y: number, r: number, col = "#d9dde2", n = 11) => {
      c.strokeStyle = col;
      c.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const a = (-135 + (270 * i) / (n - 1)) * (Math.PI / 180);
        const x1 = X + Math.sin(a) * (r + 5);
        const y1 = Y - Math.cos(a) * (r + 5);
        const x2 = X + Math.sin(a) * (r + 11);
        const y2 = Y - Math.cos(a) * (r + 11);
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
      }
    };

    MONO_X.forEach((x, i) => {
      T("MIC / LINE", x, 195, 9, "#d9dde2");
      [
        ["PAD", x - 20, "26dB"],
        ["HPF", x + 20, "80Hz"],
      ].forEach(([lab, bx, sub]) => {
        c.fillStyle = "#5e6166";
        rr(c, (bx as number) - 17, 218, 34, 30, 4);
        c.fill();
        c.fillStyle = "#2c2e32";
        rr(c, (bx as number) - 11, 226, 22, 18, 3);
        c.fill();
        T(lab as string, bx as number, 213, 8, "#e5e8ec");
        T(sub as string, bx as number, 256, 7, "#aab0b8");
      });
      T(String(i + 1), x, 300, 15, "#e5e8ec", "center", "700");
      T("GAIN", x - 34, 343, 8, "#e5e8ec", "left");
      ticks(x, 357, 27);
      T("+20", x - 28, 392, 6.5, "#aab0b8");
      T("+60", x + 30, 392, 6.5, "#aab0b8");
      if (i < 2) {
        T("COMP", x - 34, 432, 8, "#e5e8ec", "left");
        ticks(x, 450, 27, "#d9dde2", 7);
        T("0", x - 22, 485, 7, "#aab0b8");
        T("10", x + 24, 485, 7, "#aab0b8");
      }
      T("HIGH", x - 34, 522, 8, "#e5e8ec", "left");
      T("10kHz", x + 36, 522, 6.5, "#aab0b8", "right");
      T("MID", x - 34, 592, 8, "#e5e8ec", "left");
      T("2.5kHz", x + 36, 592, 6.5, "#aab0b8", "right");
      T("LOW", x - 34, 650, 8, "#e5e8ec", "left");
      T("100Hz", x + 36, 650, 6.5, "#aab0b8", "right");
      T("FX", x - 34, 718, 8, "#e5e8ec", "left");
      T("PAN", x - 34, 788, 8, "#e5e8ec", "left");
      T("L", x - 24, 822, 7, "#aab0b8");
      T("R", x + 24, 822, 7, "#aab0b8");
      c.fillStyle = "#c62828";
      c.beginPath();
      c.arc(x - 33, 843, 3.4, 0, 7);
      c.fill();
      T("PEAK", x - 12, 843, 7, "#e5e8ec", "left");
      T("LEVEL", x, 940, 9, "#e5e8ec", "center", "700");
      T(String(i + 1), x, 962, 13, "#e5e8ec", "center", "700");
    });
    // stereo strips
    ST_X.forEach((x, i) => {
      const name = ["5/6", "7/8", "9/10"][i];
      T(name, x, 300, 15, "#e5e8ec", "center", "700");
      T("HIGH", x - 30, 522, 8, "#e5e8ec", "left");
      T("LOW", x - 30, 650, 8, "#e5e8ec", "left");
      T("FX", x - 30, 718, 8, "#e5e8ec", "left");
      T(i === 2 ? "PAN/BAL" : "BAL", x - 30, 788, 8, "#e5e8ec", "left");
      T("LEVEL", x + 3, 940, 9, "#e5e8ec", "center", "700");
      T(i === 2 ? "9/10 USB IN" : name, x + 3, 962, i === 2 ? 9 : 13, "#e5e8ec", "center", "700");
    });
    T("FOOT SW", 435, 80, 7.5, "#d9dde2");
    T("FX ON/OFF", 435, 90, 7.5, "#d9dde2");
    T("LINE", 392, 150, 9, "#d9dde2", "left");
    T("-10dBu", 442, 150, 6.5, "#aab0b8", "left");
    T("UNBAL", 420, 205, 6.5, "#aab0b8");
    [
      [412, 5, 6],
      [487, 7, 8],
      [545, 9, 10],
    ].forEach(([x, a, b]) => {
      T(String(a), x - 25, 172, 8, "#d9dde2");
      T(String(b), x - 25, 232, 8, "#d9dde2");
    });
    T("L", 390, 192, 6, "#aab0b8");
    T("R", 390, 252, 6, "#aab0b8");
    // RCA labels
    T("5", 392, 365, 8, "#d9dde2");
    T("6", 392, 435, 8, "#d9dde2");
    T("7", 520, 365, 8, "#d9dde2");
    T("8", 520, 435, 8, "#d9dde2");
    // phantom
    c.strokeStyle = "#8c9097";
    c.lineWidth = 1;
    c.strokeRect(250, 418, 96, 28);
    c.fillStyle = "#cf2d2d";
    c.fillRect(300, 422, 40, 20);
    c.fillStyle = "#e23d3d";
    c.beginPath();
    c.arc(264, 432, 3, 0, 7);
    c.fill();
    T("PHANTOM +48V", 297, 411, 7.5, "#e5e8ec");
    T("CH1-4 MIC", 297, 458, 7.5, "#e5e8ec");
    // USB / line
    c.fillStyle = "#6c6f74";
    rr(c, 563, 396, 26, 24, 3);
    c.fill();
    T("24bit/192kHz", 577, 385, 6, "#aab0b8");
    T("LINE", 566, 436, 7, "#e5e8ec", "right");
    T("USB", 566, 446, 7, "#e5e8ec", "right");
    // blue panel legends
    T("FX SEND", 605, 62, 7.5, "#fff");
    T("+4dBu", 605, 72, 7, "#dbe8ff");
    T("MONITOR OUT", 605, 138, 7, "#fff");
    T("L", 585, 162, 7, "#fff");
    T("R", 585, 210, 7, "#fff");
    T("+4dBu", 605, 235, 7, "#dbe8ff");
    T("STEREO OUT", 725, 187, 8, "#fff", "center", "700");
    T("+4dBu", 725, 197, 7, "#dbe8ff");
    T("L", 645, 62, 8, "#fff");
    T("R", 810, 62, 8, "#fff");
    T("L", 640, 222, 7, "#fff");
    T("R", 742, 222, 7, "#fff");
    T("PHONES", 793, 195, 7.5, "#fff");
    // titles
    T("MIXING CONSOLE", 654, 347, 7.5, "#c9ccd1");
    T("MG10XU", 745, 347, 19, "#f1f3f5", "center", "700");
    // SPX display
    c.fillStyle = "#050607";
    rr(c, 640, 386, 86, 58, 4);
    c.fill();
    T("24", 683, 416, 46, "#ff8c1a", "center", "700");
    T("SPX", 760, 392, 12, "#e5e8ec", "center", "700");
    T("DIGITAL MULTI", 790, 408, 6, "#aab0b8");
    T("EFFECT PROCESSOR", 790, 417, 6, "#aab0b8");
    T("POWER", 802, 448, 7, "#e5e8ec", "right");
    c.fillStyle = "#f4f6f8";
    c.fillRect(765, 444, 14, 8);
    T("PROGRAM", 665, 468, 8, "#e5e8ec", "center", "700");
    T("PARAMETER", 665, 540, 8, "#e5e8ec", "center", "700");
    T("MIN", 645, 595, 6.5, "#aab0b8");
    T("MAX", 706, 595, 6.5, "#aab0b8");
    // meter
    [0, 1].forEach((col) => {
      const cols = ["#8d9094", "#f5a524", "#f5a524", "#f5a524", "#3fcf5a", "#3fcf5a", "#3fcf5a"];
      cols.forEach((cc, k) => {
        c.fillStyle = cc;
        c.fillRect(740 + col * 36, 466 + k * 17, 18, 8);
      });
    });
    ["PEAK", "+10", "+6", "0", "-6", "-12", "-20"].forEach((t, k) => T(t, 777, 470 + k * 17, 6.5, "#d9dde2"));
    // effect list
    c.fillStyle = "#0b0c0e";
    c.fillRect(628, 608, 190, 194);
    c.strokeStyle = "#7c8087";
    c.strokeRect(628, 608, 190, 194);
    const fx = [
      "REV HALL 1", "REV HALL 2", "REV ROOM 1", "REV ROOM 2", "REV STAGE 1", "REV STAGE 2", "REV PLATE", "DRUM AMB",
      "EARLY REF", "GATE REV", "SINGLE DLY", "DELAY", "VOCAL ECHO", "KARAOKE", "PHASER", "FLANGER",
      "CHORUS 1", "CHORUS 2", "SYMPHONIC", "TREMOLO", "AUTO WAH", "RADIO VOICE", "DISTORTION", "PITCH CHANGE",
    ];
    fx.forEach((name, k) => {
      const col = k < 16 ? 0 : 1;
      const row = k < 16 ? k : k - 16;
      T(String(k + 1), (col ? 724 : 637), 619 + row * 11.5, 7, "#e5e8ec", "left");
      T(name, (col ? 740 : 653), 619 + row * 11.5, 7, "#e5e8ec", "left");
    });
    // lower-right blue panel legends
    T("STEREO", 752, 706, 7, "#fff");
    T("MUTE", 752, 716, 7, "#fff");
    T("MONITOR/", 760, 818, 8, "#fff", "center", "700");
    T("PHONES", 760, 829, 8, "#fff", "center", "700");
    T("FX ON", 700, 830, 7, "#fff");
    T("LEVEL", 668, 933, 9, "#fff", "center", "700");
    T("FX RTN", 668, 945, 9, "#fff", "center", "700");
    T("LEVEL", 768, 933, 9, "#fff", "center", "700");
    T("STEREO", 768, 945, 9, "#fff", "center", "700");
    [
      [665, 885],
      [760, 775],
    ].forEach(([x, y]) => ticks(x, y, 30, "#ffffff"));
    ticks(765, 885, 34, "#ffffff");
    ticks(665, 490, 22, "#d9dde2", 11);
    ticks(675, 570, 22, "#d9dde2", 7);
    // mono/stereo knob scales for EQ rows
    MONO_X.forEach((x) => [540, 603, 668].forEach((y) => ticks(x, y, 27, "#3fcf5a", 5)));
    ST_X.forEach((x) => [540, 668].forEach((y) => ticks(x, y, 27, "#3fcf5a", 5)));
    [735, 805, 890].forEach((y) => {
      MONO_X.concat(ST_X).forEach((x) => ticks(x, y, y === 890 ? 31 : 27, y === 805 ? "#ff6a5c" : "#d9dde2", 7));
    });
    // screws
    c.fillStyle = "#2b2d31";
    [
      [18, 18], [842, 18], [18, 975], [842, 975], [455, 598], [660, 598],
    ].forEach(([x, y]) => {
      c.beginPath();
      c.arc(x, y, 6, 0, 7);
      c.fill();
    });
  });
}

function mixerRearPanel(M: Mats, ports: Ports): THREE.Group {
  const PW = MIX.W - 0.008;
  const PH = MIX.H - 0.008;
  // photo: assets/yamaha side.jpg – 700 px wide ≈ the panel width
  const sx = PW / 700;
  const P = (X: number, Y: number): [number, number] => [(X - 350) * sx, -(Y - 130) * sx];
  const g = new THREE.Group();
  const tex = pxTexture(700, Math.round(PH / sx), 4, "#15171a", (c) => {
    const T = mkT(c);
    T("AC ADAPTOR IN", 110, 82, 9.5, "#e5e8ec");
    T("USB 2.0", 350, 165, 8, "#e5e8ec", "center", "700");
    T("MIXING CONSOLE", 440, 95, 8.5, "#c9ccd1");
    T("MG10XU", 555, 95, 17, "#f1f3f5", "center", "700");
    c.fillStyle = "#2a2c2f";
    [
      [52, 95],
      [632, 95],
      [140, 182],
      [352, 112],
      [408, 130],
    ].forEach(([x, y]) => {
      c.beginPath();
      c.arc(x, y, 6, 0, 7);
      c.fill();
    });
    c.fillStyle = "#0b0c0e";
    rr(c, 154, 120, 40, 52, 5);
    c.fill();
    c.strokeStyle = "#5a5e64";
    c.stroke();
    T("I", 174, 128, 9, "#e5e8ec");
  });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.4 })));
  // 3-pin AC adaptor connector (external adaptor supplied separately)
  const [ax, ay] = P(110, 130);
  const ring = cylZ(0.0108, 0.0108, 0.008, M.chrome, 28);
  ring.position.set(ax, ay, 0.004);
  const well = cylZ(0.0085, 0.0085, 0.0085, M.foam, 28);
  well.position.set(ax, ay, 0.0045);
  g.add(ring, well);
  [0, 2.1, 4.2].forEach((a) => {
    const pin = cylZ(0.0013, 0.0013, 0.006, M.gold, 8);
    pin.position.set(ax + Math.sin(a) * 0.0048, ay + Math.cos(a) * 0.0048, 0.0058);
    g.add(pin);
  });
  addPort(g, ports, "power", { x: ax, y: ay, z: 0.011 });
  const [wx, wy] = P(174, 146);
  const sw = rocker(M, 0.0105, 0.0135);
  sw.position.set(wx, wy, 0.0005);
  g.add(sw);
  // USB type-B
  const [ux, uy] = P(350, 130);
  const usb = box(0.0305, 0.0135, 0.006, M.chrome, 0.001);
  usb.position.set(ux, uy, 0.003);
  const usbIn = box(0.0235, 0.0085, 0.0065, M.foam);
  usbIn.position.set(ux, uy - 0.0005, 0.0032);
  g.add(usb, usbIn);
  return g;
}

export function buildMixer(M: Mats): Built {
  const { W, H, D, Hf } = MIX;
  const body = new THREE.Group();
  const ports: Ports = {};

  const s = new THREE.Shape();
  s.moveTo(D / 2, 0);
  s.lineTo(D / 2, Hf);
  s.lineTo(-D / 2, H);
  s.lineTo(-D / 2, 0);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: W - 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate((W - 0.012) / 2, 0, 0);
  body.add(new THREE.Mesh(geo, M.enclosureAlt));
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const f = rubberFoot(M, 0.007, 0.004);
      f.position.set(sx * (W / 2 - 0.02), -0.0005, sz * (D / 2 - 0.025));
      body.add(f);
    });
  });

  const slope = Math.atan2(H - Hf, D);
  const panel = new THREE.Group();
  panel.position.set(0, (H + Hf) / 2 + 0.0046, 0);
  panel.rotation.x = -Math.PI / 2 + slope;
  panel.add(new THREE.Mesh(new THREE.PlaneGeometry(MPW, MPL), new THREE.MeshStandardMaterial({ map: mixerTopTexture(), roughness: 0.5, metalness: 0.3 })));

  const put = (o: THREE.Object3D, X: number, Y: number, z = 0.0004, rot = 0) => {
    const [x, y] = mp(X, Y);
    o.position.set(x, y, z);
    o.rotation.z = rot;
    panel.add(o);
  };
  const rK = 27 * MSX;
  const kRot = (i: number) => -0.7 + (i % 5) * 0.28;
  MONO_X.forEach((x, i) => {
    put(colorKnob(M, rK, 0x14161a, 0xffffff), x, 357, 0.0004, kRot(i)); // GAIN
    if (i < 2) put(colorKnob(M, rK, 0xf2c230, 0x111111), x, 450, 0.0004, 0.5 - i * 0.4); // COMP
    put(colorKnob(M, rK, 0x2aa65a, 0x0c0c0c), x, 540, 0.0004, 0);
    put(colorKnob(M, rK, 0x2aa65a, 0x0c0c0c), x, 603, 0.0004, 0.1);
    put(colorKnob(M, rK, 0x2aa65a, 0x0c0c0c), x, 668, 0.0004, -0.1);
    put(colorKnob(M, rK, 0xf1f2f4, 0x0c0c0c), x, 735, 0.0004, -0.9);
    put(colorKnob(M, rK, 0xd9302b, 0xffffff), x, 805, 0.0004, 0);
    put(colorKnob(M, rK * 1.12, 0xf1f2f4, 0x0c0c0c, 0.012), x, 890, 0.0004, -0.4 + i * 0.35);
  });
  ST_X.forEach((x, i) => {
    put(colorKnob(M, rK, 0x2aa65a, 0x0c0c0c), x, 540, 0.0004, 0);
    put(colorKnob(M, rK, 0x2aa65a, 0x0c0c0c), x, 668, 0.0004, -0.1);
    put(colorKnob(M, rK, 0xf1f2f4, 0x0c0c0c), x, 735, 0.0004, -0.9);
    put(colorKnob(M, rK, 0xd9302b, 0xffffff), x, 805, 0.0004, 0);
    put(colorKnob(M, rK * 1.12, 0xf1f2f4, 0x0c0c0c, 0.012), x + 3, 890, 0.0004, -0.2 + i * 0.3);
  });
  put(colorKnob(M, 22 * MSX, 0x14161a, 0xffffff), 665, 490, 0.0004, 0.8);
  put(colorKnob(M, 22 * MSX, 0x14161a, 0xffffff), 675, 570, 0.0004, 0.5);
  put(colorKnob(M, 30 * MSX, 0xf1f2f4, 0x0c0c0c, 0.012), 760, 775, 0.0004, 0.3);
  put(colorKnob(M, 30 * MSX, 0xf1f2f4, 0x0c0c0c, 0.012), 668, 885, 0.0004, 0.1);
  put(colorKnob(M, 34 * MSX, 0xd9302b, 0xffffff, 0.013), 765, 885, 0.0004, 0.2);

  // XLR / combo jacks (mic inputs 1-4 and stereo XLR outs are on the TOP panel)
  const jack = (name: string | null, X: number, Y: number, kind: "combo" | "m", scale = 0.93) => {
    const j = xlrJack(M, kind);
    j.scale.setScalar(scale);
    put(j, X, Y, 0.0003);
    if (name) {
      const [x, y] = mp(X, Y);
      addPort(panel, ports, name, { x, y, z: kind === "m" ? 0.0145 : 0.0095 });
    }
  };
  MONO_X.forEach((x, i) => jack(`ch${i + 1}`, x, 125, "combo"));
  jack("main_l", 688, 128, "m", 0.9);
  jack("main_r", 775, 128, "m", 0.9);

  // 6.3 mm line jacks + RCA pairs
  const trs = (X: number, Y: number) => {
    const g = new THREE.Group();
    const r = cylZ(0.0062, 0.0062, 0.0045, M.chrome, 20);
    r.position.z = 0.00225;
    const h = cylZ(0.0038, 0.0038, 0.005, M.foam, 14);
    h.position.z = 0.0026;
    g.add(r, h);
    put(g, X, Y, 0.0003);
  };
  [
    [412, 168], [412, 226], [487, 172], [487, 232], [545, 172], [545, 232],
    [435, 106], [605, 102], [605, 165], [605, 207], [662, 222], [727, 222], [790, 222],
  ].forEach(([x, y]) => trs(x, y));
  [
    [420, 375, 0xf2f2f2],
    [490, 375, 0xf2f2f2],
    [420, 430, 0xd9302b],
    [490, 430, 0xd9302b],
  ].forEach(([x, y, col]) => {
    const g = new THREE.Group();
    const r = cylZ(0.0058, 0.0058, 0.004, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }), 18);
    r.position.z = 0.002;
    const h = cylZ(0.0028, 0.0028, 0.0045, M.foam, 12);
    h.position.z = 0.0023;
    g.add(r, h);
    put(g, x, y, 0.0003);
  });
  // flat buttons already printed on the panel; add LEDs
  const led = (X: number, Y: number, col: number, r = 0.0022) => {
    const l = ledDot(M, col, r);
    put(l, X, Y, 0.002);
  };
  led(765, 448, 0xffffff, 0.003);
  [843].forEach((y) => MONO_X.forEach((x) => led(x - 33, y, 0xe23d3d)));
  led(264, 432, 0xe23d3d);
  body.add(panel);

  const rp = mixerRearPanel(M, ports);
  rp.position.set(0, H / 2 - 0.004, -D / 2 - 0.0062);
  rp.rotation.y = Math.PI;
  body.add(rp);
  void textPlate;
  void legendText;
  void legendTexture;
  void knob;
  void pushButton;
  void slideSwitch;
  void iecInlet;
  shadowed(body);
  return { body, ports, size: { w: W, h: H, d: D } };
}

/* ================================================================== */
/* Digimore D-330 dual wireless receiver – approximate                 */
/* ================================================================== */

export const RX = { W: 0.21, H: 0.045, D: 0.19 };

export function buildReceiver(M: Mats): Built {
  const { W, H, D } = RX;
  const body = new THREE.Group();
  const ports: Ports = {};
  const shell = box(W, H - 0.003, D, M.enclosure, 0.004);
  shell.position.y = (H - 0.003) / 2 + 0.003;
  body.add(shell);
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      const f = rubberFoot(M, 0.008, 0.003);
      f.position.set(sx * (W / 2 - 0.018), 0, sz * (D / 2 - 0.018));
      body.add(f);
    }),
  );
  // front panel (metal faceplate with printed legends)
  const PX = 3600;
  const tex = legendTexture(W - 0.006, H - 0.008, PX, "#1f2227", (c, m) => {
    legendText(c, m, PX, "D-330", -0.073, 0.007, 0.0105, "#e9ecef", "700");
    legendText(c, m, PX, "DUAL WIRELESS RECEIVER", -0.073, -0.006, 0.0036, "#8d949c", "500");
    legendText(c, m, PX, "A", -0.022, 0.0125, 0.005, "#aeb4bc");
    legendText(c, m, PX, "B", 0.02, 0.0125, 0.005, "#aeb4bc");
    legendText(c, m, PX, "VOL", 0.068, -0.012, 0.0032, "#aeb4bc");
    legendText(c, m, PX, "VOL", 0.093, -0.012, 0.0032, "#aeb4bc");
    legendText(c, m, PX, "(layout approximate)", -0.073, -0.0145, 0.0026, "#5f656d", "500");
    // display bars
    c.fillStyle = "#08130c";
    const [dx, dy] = m(-0.036, 0.011);
    c.fillRect(dx, dy, 0.066 * PX, 0.022 * PX);
    c.fillStyle = "#3de08a";
    for (let i = 0; i < 8; i++) {
      const [bx, by] = m(-0.034 + i * 0.0027, -0.006);
      c.fillRect(bx, by, 0.002 * PX, (0.0025 + (i % 5) * 0.0016) * PX * -1);
    }
    for (let i = 0; i < 6; i++) {
      const [bx, by] = m(0.007 + i * 0.0027, -0.006);
      c.fillRect(bx, by, 0.002 * PX, (0.0025 + (i % 4) * 0.0014) * PX * -1);
    }
  });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.006, H - 0.008), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.6 }));
  fp.position.set(0, H / 2 + 0.0015, D / 2 + 0.0003);
  body.add(fp);
  [0.068, 0.093].forEach((x) => {
    const k = knob(M, 0.0085, 0.01);
    k.position.set(x, H / 2 + 0.0015 + 0.004, D / 2 + 0.0004);
    body.add(k);
  });
  const pwr = pushButton(M, 0.0045, 0x39e08f);
  pwr.position.set(0.0475, H / 2 + 0.0015 + 0.004, D / 2 + 0.0004);
  body.add(pwr);

  // antennas (V-shaped whips on rear-top)
  [-1, 1].forEach((sx) => {
    const base = cylY(0.007, 0.0085, 0.012, M.chrome, 16);
    base.position.set(sx * 0.07, H + 0.004, -D / 2 + 0.02);
    const grp = new THREE.Group();
    grp.position.set(sx * 0.07, H + 0.01, -D / 2 + 0.02);
    grp.rotation.z = -sx * 0.4;
    grp.rotation.x = -0.12;
    const rod = cylY(0.0026, 0.0035, 0.24, M.steel, 10);
    rod.position.y = 0.12;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), M.steel);
    tip.position.y = 0.24;
    const tube = cylY(0.0055, 0.0055, 0.04, M.knob, 12);
    tube.position.y = 0.02;
    grp.add(rod, tip, tube);
    body.add(base, grp);
  });

  // rear panel
  const RP = new THREE.Group();
  const rtex = legendTexture(W - 0.006, H - 0.008, PX, "#23262b", (c, m) => {
    legendText(c, m, PX, "OUT 1", -0.06, -0.0165, 0.0034, "#aeb4bc");
    legendText(c, m, PX, "OUT 2", -0.02, -0.0165, 0.0034, "#aeb4bc");
    legendText(c, m, PX, "MIX OUT", 0.03, -0.0165, 0.0034, "#aeb4bc");
    legendText(c, m, PX, "DC IN", 0.075, -0.0165, 0.0034, "#aeb4bc");
  });
  RP.add(new THREE.Mesh(new THREE.PlaneGeometry(W - 0.006, H - 0.008), new THREE.MeshStandardMaterial({ map: rtex, roughness: 0.5, metalness: 0.5 })));
  const j1 = xlrJack(M, "m");
  j1.position.set(-0.06, 0.003, 0);
  const j2 = xlrJack(M, "m");
  j2.position.set(-0.02, 0.003, 0);
  RP.add(j1, j2);
  addPort(RP, ports, "out1", { x: -0.06, y: 0.003, z: 0.0155 });
  addPort(RP, ports, "out2", { x: -0.02, y: 0.003, z: 0.0155 });
  const mix = cylZ(0.0045, 0.0045, 0.009, M.chrome, 16);
  mix.position.set(0.03, 0.003, 0.0045);
  const dc = cylZ(0.0045, 0.0045, 0.008, M.plastic, 16);
  dc.position.set(0.075, 0.003, 0.004);
  RP.add(mix, dc);
  addPort(RP, ports, "power", { x: 0.075, y: 0.003, z: 0.009 });
  RP.position.set(0, H / 2 + 0.0015, -D / 2 - 0.0003);
  RP.rotation.y = Math.PI;
  body.add(RP);
  shadowed(body);
  return { body, ports, size: { w: W, h: H + 0.25, d: D } };
}

/* ================================================================== */
/* Microphones – origin at the centre, head towards +Y                 */
/* ================================================================== */

function micBody(M: Mats, o: { total: number; headR: number; bodyTop: number; bodyBot: number; colorBody: THREE.Material }): THREE.Group {
  const g = new THREE.Group();
  const half = o.total / 2;
  const headY = half - o.headR * 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(o.headR, 32, 20), M.mesh);
  head.position.y = headY;
  // mesh cross pattern bands
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(o.headR * (0.97 - i * 0.0), o.headR * 0.012, 6, 40), M.steel);
    t.rotation.x = Math.PI / 2;
    t.position.y = headY + (i - 1) * o.headR * 0.45;
    t.scale.setScalar(Math.sqrt(1 - Math.pow((i - 1) * 0.45, 2)));
    g.add(t);
  }
  const ringY = headY - o.headR * 0.78;
  const ring = cylY(o.bodyTop * 1.05, o.bodyTop * 1.0, 0.009, M.brushed, 32);
  ring.position.y = ringY;
  const prof = [
    new THREE.Vector2(o.bodyBot, -half),
    new THREE.Vector2(o.bodyBot * 1.02, -half + 0.01),
    new THREE.Vector2(o.bodyTop * 0.78, -half * 0.3),
    new THREE.Vector2(o.bodyTop, ringY - 0.004),
  ];
  const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), o.colorBody);
  g.add(head, ring, bodyMesh);
  return g;
}

export function buildWirelessMic(M: Mats): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.4, metalness: 0.75 });
  body.add(micBody(M, { total: 0.25, headR: 0.027, bodyTop: 0.0235, bodyBot: 0.0195, colorBody: bodyMat }));
  const sw = slideSwitch(M);
  sw.scale.setScalar(0.7);
  sw.position.set(0, 0.0, 0.0215);
  const led = ledDot(M, 0x39e08f, 0.0022);
  led.position.set(0, 0.025, 0.0235);
  const bg = new THREE.Group();
  bg.add(sw, led);
  body.add(bg);
  const cap = cylY(0.0196, 0.0196, 0.01, M.rubber, 24);
  cap.position.y = -0.125;
  body.add(cap);
  shadowed(body);
  return { body, ports, size: { w: 0.054, h: 0.25, d: 0.054 } };
}

export function buildPGA48(M: Mats): Built {
  const body = new THREE.Group();
  const ports: Ports = {};
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x191b1f, roughness: 0.55, metalness: 0.5 });
  body.add(micBody(M, { total: 0.175, headR: 0.0265, bodyTop: 0.0215, bodyBot: 0.0125, colorBody: bodyMat }));
  const j = xlrJack(M, "m");
  j.scale.setScalar(0.95);
  j.rotation.x = Math.PI / 2; // +Z -> -Y
  j.position.set(0, -0.0875, 0);
  body.add(j);
  addPort(body, ports, "xlr", { x: 0, y: -0.0875 - 0.0145, z: 0 }).rotation.x = Math.PI / 2;
  const plate = textPlate("PGA48", 0.024, 0.006, { color: "#9aa0a8", px: 4000 });
  plate.position.set(0, -0.015, 0.0196);
  plate.rotation.set(0, 0, Math.PI / 2);
  body.add(plate);
  shadowed(body);
  return { body, ports, size: { w: 0.053, h: 0.175, d: 0.053 } };
}
