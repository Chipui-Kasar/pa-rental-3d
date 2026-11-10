import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { PresetId } from "../budget";
import { createMaterials, makeCanvas, type Mats } from "./materials";
import { buildMixer, buildPGA48, buildReceiver, buildSub, buildTop, buildWirelessMic, MIX, RX, SUB, TOP } from "./audioModels";
import {
  BOOM,
  buildBoomStand,
  buildCover,
  buildPhone,
  buildPole,
  buildPowerStrip,
  buildSpeakerTripod,
  buildTable,
  POLE,
  STRIP,
  TABLE,
  TRIPOD,
} from "./miscModels";
import type { Built } from "./util";
import { computePoses, MIC_ROLL, mkPose, type Pose } from "./layout";

export type ViewName = "front" | "rear" | "top" | "threeQuarter" | "exploded";
export type ToggleKey = "signal" | "power" | "covers" | "dims" | "labels";

export interface EngineCallbacks {
  onSelect: (specId: string | null, title: string | null) => void;
}

interface Item {
  id: string;
  label: string;
  specId: string;
  group: THREE.Group;
  built: Built;
  cur: Pose;
  tgt: Pose;
  labelObj: CSS2DObject;
  guides: THREE.Group;
  wasVisible: boolean;
  showLabel: boolean;
}

interface PortRef {
  item: string;
  port: string;
}

interface Cable {
  id: string;
  kind: "signal" | "power";
  label: string;
  a: PortRef;
  b: PortRef;
  presets: PresetId[];
  route: (e: boolean) => RV[];
  mesh: THREE.Mesh;
  plugA: THREE.Group;
  plugB: THREE.Group;
  beads: THREE.Mesh[];
  curve: THREE.Curve<THREE.Vector3> | null;
  needsBuild: boolean;
  shown: boolean;
}

interface Beam {
  group: THREE.Group;
  mesh: THREE.Mesh;
  beads: THREE.Mesh[];
  label: CSS2DObject;
  from: () => THREE.Vector3;
  to: () => THREE.Vector3;
  lift: number;
  curve: THREE.QuadraticBezierCurve3 | null;
}

interface WorldGuide {
  group: THREE.Group;
  line: THREE.Line;
  tickA: THREE.Line;
  tickB: THREE.Line;
  label: CSS2DObject;
  el: HTMLDivElement;
  fn: () => { a: THREE.Vector3; b: THREE.Vector3; text: string; approx: boolean; show: boolean };
  lastText: string;
}

type RV = THREE.Vector3 & { r?: number };
const F = 0.0068; // cable resting height on the floor
const TT = 0.75 + 0.0068; // cable resting height on the table top

/** straight runs joined by rounded corners (radius per way-point, default r) */
function roundedPath(pts: RV[], radius = 0.05): THREE.CurvePath<THREE.Vector3> {
  const P = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 1e-4);
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cur = P[0].clone();
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1];
    const b = P[i];
    const c = P[i + 1];
    const r = Math.min(b.r ?? radius, a.distanceTo(b) * 0.5, b.distanceTo(c) * 0.5);
    const e = b.clone().addScaledVector(a.clone().sub(b).normalize(), r);
    const x = b.clone().addScaledVector(c.clone().sub(b).normalize(), r);
    if (cur.distanceTo(e) > 1e-5) path.add(new THREE.LineCurve3(cur.clone(), e));
    path.add(new THREE.QuadraticBezierCurve3(e, b.clone(), x));
    cur = x;
  }
  path.add(new THREE.LineCurve3(cur, P[P.length - 1].clone()));
  return path;
}

const SIGNAL_COLOR = 0x2f9bff;
const POWER_COLOR = 0xff8a1f;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class PAEngine {
  private container: HTMLElement;
  private cb: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private M: Mats;
  private items = new Map<string, Item>();
  private cables: Cable[] = [];
  private beams: Beam[] = [];
  private worldGuides: WorldGuide[] = [];
  private cableRoot = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private hoverBox: THREE.BoxHelper;
  private selBox: THREE.BoxHelper;
  private selected: string | null = null;
  private hovered: string | null = null;
  private last = performance.now();
  private resizeObs: ResizeObserver;
  private disposed = false;
  private down: { x: number; y: number; t: number } | null = null;
  private tween: null | { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; q0: THREE.Vector3; q1: THREE.Vector3 } = null;

  private preset: PresetId = "full";
  private exploded = false;
  private toggles: Record<ToggleKey, boolean> = { signal: true, power: true, covers: false, dims: false, labels: true };
  private movingFrames = 3;
  private time = 0;

  constructor(container: HTMLElement, cb: EngineCallbacks) {
    this.container = container;
    this.cb = cb;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    const ld = this.labelRenderer.domElement;
    ld.style.position = "absolute";
    ld.style.inset = "0";
    ld.style.pointerEvents = "none";
    ld.style.overflow = "hidden";
    container.appendChild(ld);

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.05, 120);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.zoomSpeed = 0.7;
    this.controls.rotateSpeed = 0.7;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 16;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
    this.controls.zoomToCursor = true;
    this.controls.screenSpacePanning = true;

    this.M = createMaterials();
    this.setupWorld();
    this.buildItems();
    this.buildCables();
    this.buildBeams();
    this.buildWorldGuides();

    this.hoverBox = new THREE.BoxHelper(new THREE.Object3D(), 0x6fd3ff);
    this.selBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffc83d);
    [this.hoverBox, this.selBox].forEach((b) => {
      (b.material as THREE.LineBasicMaterial).depthTest = false;
      (b.material as THREE.LineBasicMaterial).transparent = true;
      b.renderOrder = 998;
      b.visible = false;
      this.scene.add(b);
    });
    (this.hoverBox.material as THREE.LineBasicMaterial).opacity = 0.55;

    this.resize();
    this.snapView("threeQuarter");
    this.applyTargets(true);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __pa?: PAEngine }).__pa = this;

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerleave", this.onLeave);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);

    this.renderer.setAnimationLoop(() => this.frame());
  }

  /* ------------------------------------------------------------------ */
  /* World                                                               */
  /* ------------------------------------------------------------------ */

  private setupWorld() {
    const { scene, renderer, M } = this;
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.Fog(0x06070a, 16, 38);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0x8da2c8, 0x0b0b0e, 0.35));

    const key = new THREE.SpotLight(0xfff6ea, 330, 40, 0.5, 0.7, 1.6);
    key.position.set(4.2, 8.5, 6.5);
    key.target.position.set(0, 0.6, 0.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 3;
    key.shadow.camera.far = 24;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 4;
    scene.add(key, key.target);

    const fill = new THREE.DirectionalLight(0x9db8ff, 0.55);
    fill.position.set(-6, 4, 4);
    scene.add(fill);

    const rim = new THREE.SpotLight(0xffd2b0, 70, 30, 0.7, 0.8, 1.6);
    rim.position.set(-3.5, 5, -5);
    rim.target.position.set(0, 1, 0.5);
    scene.add(rim, rim.target);

    const wash = new THREE.PointLight(0x5b7cff, 8, 14, 2);
    wash.position.set(0, 2.4, 4.2);
    scene.add(wash);

    // stage riser + floor
    const SW = 14;
    const SD = 10;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD), M.floor);
    top.rotation.x = -Math.PI / 2;
    top.position.set(0, 0, 1);
    top.receiveShadow = true;
    scene.add(top);
    const riser = new THREE.Mesh(new THREE.BoxGeometry(SW, 0.2, SD), new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.9 }));
    riser.position.set(0, -0.1 - 0.001, 1);
    scene.add(riser);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);

    // black drape behind the stage
    const [dc, dg] = makeCanvas(256, 8);
    const gr = dg.createLinearGradient(0, 0, 256, 0);
    for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, i % 2 ? "#08090b" : "#17181c");
    dg.fillStyle = gr;
    dg.fillRect(0, 0, 256, 8);
    const dt = new THREE.CanvasTexture(dc);
    dt.wrapS = dt.wrapT = THREE.RepeatWrapping;
    dt.repeat.set(5, 1);
    dt.colorSpace = THREE.SRGBColorSpace;
    const drape = new THREE.Mesh(new THREE.PlaneGeometry(SW, 5.5), new THREE.MeshStandardMaterial({ map: dt, roughness: 1 }));
    drape.position.set(0, 2.75, -3.9);
    scene.add(drape);

    scene.add(this.cableRoot);
  }

  /* ------------------------------------------------------------------ */
  /* Items                                                               */
  /* ------------------------------------------------------------------ */

  private labelEl(text: string, cls = "pa-label") {
    const el = document.createElement("div");
    el.className = cls;
    el.textContent = text;
    return el;
  }

  private addItem(id: string, label: string, specId: string, built: Built, labelY: number, showLabel = true) {
    const group = new THREE.Group();
    group.add(built.body);
    built.body.userData.ownerId = id;
    const guides = new THREE.Group();
    guides.visible = false;
    group.add(guides);
    const labelObj = new CSS2DObject(this.labelEl(label));
    labelObj.position.set(0, labelY, 0);
    group.add(labelObj);
    group.visible = false;
    this.scene.add(group);
    const pose = mkPose();
    pose.scale = 0;
    this.items.set(id, {
      id,
      label,
      specId,
      showLabel,
      group,
      built,
      cur: pose,
      tgt: { ...mkPose(), scale: 0 },
      labelObj,
      guides,
      wasVisible: false,
    });
  }

  private dimGuide(
    parent: THREE.Group,
    a: THREE.Vector3,
    b: THREE.Vector3,
    text: string,
    approx: boolean,
    tick: THREE.Vector3,
  ) {
    const color = approx ? 0xffa94d : 0x7fe0ff;
    const mat = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });
    const g = new THREE.Group();
    g.renderOrder = 997;
    const mk = (p: THREE.Vector3, q: THREE.Vector3) => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), mat);
      l.renderOrder = 997;
      return l;
    };
    g.add(mk(a, b), mk(a.clone().addScaledVector(tick, 0.03), a.clone().addScaledVector(tick, -0.03)), mk(b.clone().addScaledVector(tick, 0.03), b.clone().addScaledVector(tick, -0.03)));
    const el = this.labelEl(text, approx ? "pa-dim approx" : "pa-dim");
    const lab = new CSS2DObject(el);
    lab.position.copy(a).add(b).multiplyScalar(0.5);
    g.add(lab);
    parent.add(g);
  }

  private boxGuides(
    id: string,
    w: number,
    h: number,
    d: number,
    opts: { approx: boolean; texts?: [string, string, string]; off?: number; y0?: number },
  ) {
    const it = this.items.get(id)!;
    const off = opts.off ?? 0.07;
    const y0 = opts.y0 ?? 0;
    const f = (v: number) => (v * 100).toFixed(1).replace(/\.0$/, "");
    const pre = opts.approx ? "≈ " : "";
    const suf = opts.approx ? " cm (approx.)" : " cm";
    const [tw, th, td] = opts.texts ?? [`${pre}${f(w)}${suf}`, `${pre}${f(h)}${suf}`, `${pre}${f(d)}${suf}`];
    this.dimGuide(it.guides, new THREE.Vector3(-w / 2, y0, d / 2 + off), new THREE.Vector3(w / 2, y0, d / 2 + off), `W ${tw}`, opts.approx, new THREE.Vector3(0, 0, 1));
    this.dimGuide(it.guides, new THREE.Vector3(w / 2 + off, y0, -d / 2), new THREE.Vector3(w / 2 + off, y0, d / 2), `D ${td}`, opts.approx, new THREE.Vector3(1, 0, 0));
    this.dimGuide(it.guides, new THREE.Vector3(w / 2 + off, y0, d / 2 + off), new THREE.Vector3(w / 2 + off, y0 + h, d / 2 + off), `H ${th}`, opts.approx, new THREE.Vector3(1, 0, 0));
  }

  private buildItems() {
    const M = this.M;
    this.addItem("sub1", "Sub 1 · Thump118S", "sub", buildSub(M), SUB.H + 0.04);
    this.addItem("sub2", "Sub 2 · Thump118S", "sub", buildSub(M), SUB.H + 0.04);
    this.addItem("pole1", "M20 pole", "pole", buildPole(M), 0.5, false);
    this.addItem("pole2", "M20 pole", "pole", buildPole(M), 0.5, false);
    this.addItem("top1", "Top 1 · TS415", "top", buildTop(M), TOP.H + 0.04);
    this.addItem("top2", "Top 2 · TS415", "top", buildTop(M), TOP.H + 0.04);
    this.addItem("tripod1", "Speaker tripod", "tripod", buildSpeakerTripod(M), 0.5, false);
    this.addItem("tripod2", "Speaker tripod", "tripod", buildSpeakerTripod(M), 0.5, false);
    this.addItem("mixer", "Yamaha MG10XU", "mixer", buildMixer(M), MIX.H + 0.04);
    this.addItem("rx", "Digimore D-330", "rx", buildReceiver(M), 0.34);
    this.addItem("mic1", "Wireless mics ×2", "wmic", buildWirelessMic(M), 0.22);
    this.addItem("mic2", "Wireless mic 2", "wmic", buildWirelessMic(M), 0.07, false);
    this.addItem("pga", "Shure PGA48", "pga", buildPGA48(M), 0.12);
    this.addItem("boom", "Boom stand", "boom", buildBoomStand(M), 1.72, false);
    this.addItem("table", "Folding table", "table", buildTable(M), TABLE.H + 0.5, false);
    this.addItem("strip", "Surge-protected board", "strip", buildPowerStrip(M), 0.09, false);
    this.addItem("phone", "Source phone", "phone", buildPhone(M), 0.2);
    this.addItem("cov_sub1", "Sub cover", "cover", buildCover(M, "sub"), SUB.H + 0.06);
    this.addItem("cov_sub2", "Sub cover", "cover", buildCover(M, "sub"), SUB.H + 0.06);
    this.addItem("cov_top1", "Top cover", "cover", buildCover(M, "top"), TOP.H + 0.06);
    this.addItem("cov_top2", "Top cover", "cover", buildCover(M, "top"), TOP.H + 0.06);

    // dimension guides (published = cyan, approximate = amber)
    ["sub1", "sub2"].forEach((id) => this.boxGuides(id, SUB.W, SUB.H, SUB.D, { approx: false }));
    ["top1", "top2"].forEach((id) => this.boxGuides(id, TOP.Wf, TOP.H, TOP.D, { approx: true }));
    this.boxGuides("mixer", MIX.W, MIX.H, MIX.D, { approx: false, off: 0.03 });
    this.boxGuides("rx", RX.W, RX.H, RX.D, { approx: true, off: 0.03 });
    this.boxGuides("strip", STRIP.W, STRIP.H, STRIP.D, { approx: true, off: 0.03 });
    this.boxGuides("table", TABLE.W, TABLE.H, TABLE.D, { approx: true, off: 0.08 });
    ["pole1", "pole2"].forEach((id) => {
      const it = this.items.get(id)!;
      this.dimGuide(it.guides, new THREE.Vector3(0.08, 0, 0), new THREE.Vector3(0.08, POLE.L, 0), `≈ ${POLE.L * 100} cm (approx.)`, true, new THREE.Vector3(1, 0, 0));
    });
    ["tripod1", "tripod2"].forEach((id) => {
      const it = this.items.get(id)!;
      this.dimGuide(it.guides, new THREE.Vector3(0.1, 0, 0), new THREE.Vector3(0.1, TRIPOD.H, 0), `≈ ${TRIPOD.H * 100} cm (approx.)`, true, new THREE.Vector3(1, 0, 0));
    });
    const bg = this.items.get("boom")!;
    this.dimGuide(bg.guides, new THREE.Vector3(0.1, 0, 0.1), new THREE.Vector3(0.1, 1.38, 0.1), "≈ 138 cm (approx.)", true, new THREE.Vector3(1, 0, 0));
    const pg = this.items.get("pga")!;
    this.dimGuide(pg.guides, new THREE.Vector3(0.05, -0.0875, 0), new THREE.Vector3(0.05, 0.0875, 0), "≈ 17.5 cm (approx.)", true, new THREE.Vector3(1, 0, 0));
    ["mic1", "mic2"].forEach((id) => {
      const it = this.items.get(id)!;
      this.dimGuide(it.guides, new THREE.Vector3(0.06, -0.125, 0), new THREE.Vector3(0.06, 0.125, 0), "≈ 25 cm (approx.)", true, new THREE.Vector3(1, 0, 0));
    });
  }

  /* ------------------------------------------------------------------ */
  /* World-space (layout) guides                                         */
  /* ------------------------------------------------------------------ */

  private worldGuide(fn: WorldGuide["fn"]) {
    const color = 0xffa94d;
    const mat = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true });
    const mk = () => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)]), mat);
      l.renderOrder = 997;
      l.frustumCulled = false;
      return l;
    };
    const group = new THREE.Group();
    const line = mk();
    const tickA = mk();
    const tickB = mk();
    const el = this.labelEl("", "pa-dim layout");
    const label = new CSS2DObject(el);
    group.add(line, tickA, tickB, label);
    group.visible = false;
    this.scene.add(group);
    this.worldGuides.push({ group, line, tickA, tickB, label, el, fn, lastText: "" });
  }

  private buildWorldGuides() {
    const spacing = (a: string, b: string) => () => {
      const A = this.items.get(a)!;
      const B = this.items.get(b)!;
      const show = A.cur.scale > 0.95 && B.cur.scale > 0.95;
      return {
        a: new THREE.Vector3(A.cur.pos.x, 0.03, 0.62),
        b: new THREE.Vector3(B.cur.pos.x, 0.03, 0.62),
        text: `${Math.round(Math.abs(B.cur.pos.x - A.cur.pos.x) * 100)} cm between stacks (layout)`,
        approx: false,
        show,
      };
    };
    this.worldGuide(() => (this.items.get("sub1")!.cur.scale > 0.95 && this.items.get("sub2")!.cur.scale > 0.95 ? spacing("sub1", "sub2")() : spacing("top1", "top2")()));
    this.worldGuide(() => {
      const t = this.items.get("top1")!;
      const x = t.cur.pos.x - 0.55;
      const topY = t.cur.pos.y + TOP.H;
      return {
        a: new THREE.Vector3(x, 0, 0.1),
        b: new THREE.Vector3(x, topY, 0.1),
        text: `≈ ${Math.round(topY * 100)} cm to top of speaker (approx.)`,
        approx: true,
        show: t.cur.scale > 0.95,
      };
    });
    this.worldGuide(() => {
      const t = this.items.get("table")!;
      const frontOfSpk = 0.3;
      const x = 1.2;
      return {
        a: new THREE.Vector3(x, 0.03, frontOfSpk),
        b: new THREE.Vector3(x, 0.03, t.cur.pos.z - TABLE.D / 2),
        text: `≈ ${Math.round((t.cur.pos.z - TABLE.D / 2 - frontOfSpk) * 100)} cm speaker line → table (layout)`,
        approx: true,
        show: true,
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Cables                                                              */
  /* ------------------------------------------------------------------ */

  private portWorld(ref: PortRef) {
    const it = this.items.get(ref.item)!;
    const port = it.built.ports[ref.port];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    port.getWorldPosition(p);
    port.getWorldDirection(n);
    return { p, n };
  }

  private local(it: string, x: number, y: number, z: number) {
    return this.items.get(it)!.group.localToWorld(new THREE.Vector3(x, y, z));
  }

  /* ------------------------------------------------------------------ */
  /* Cables                                                              */
  /* ------------------------------------------------------------------ */
  // Every cable is a list of way-points joined by straight runs with rounded
  // corners (like a real lead): it leaves each plug in a straight line, hangs
  // straight down under gravity, lies flat on the floor / table and drops over
  // the table edge – no spline overshoot.

  private v(x: number, y: number, z: number, r?: number): RV {
    const p = new THREE.Vector3(x, y, z) as RV;
    if (r !== undefined) p.r = r;
    return p;
  }

  private tableRearEdge() {
    return this.items.get("table")!.cur.pos.z - TABLE.D / 2;
  }
  private tableFrontEdge() {
    return this.items.get("table")!.cur.pos.z + TABLE.D / 2;
  }
  private mixerRearZ() {
    return this.items.get("mixer")!.cur.pos.z - MIX.D / 2;
  }
  /** z of a cable that hangs over the table's rear edge; k separates neighbouring cables */
  private dropZ(k: number) {
    return this.tableRearEdge() - 0.014 - k * 0.017;
  }

  /**
   * Out of a jack on the mixer's TOP panel: up the plug, back over the mixer and
   * down behind it onto the table (the cable falls straight down from the plug boot).
   */
  private mixerExit(ref: PortRef, zr: number): RV[] {
    const { p, n } = this.portWorld(ref);
    const B = p.clone().addScaledVector(n, 0.115);
    return [this.v(p.x, p.y, p.z), this.v(B.x, B.y, B.z, 0.03), this.v(B.x, B.y, zr, 0.04), this.v(B.x, TT, zr, 0.03)];
  }

  /** floor (or tabletop) point → vertical rise → into a REAR-facing port */
  private riseToRearPort(ref: PortRef, Z: number, y0: number): RV[] {
    const { p } = this.portWorld(ref);
    return [this.v(p.x, y0, Z, 0.06), this.v(p.x, p.y, Z, 0.035), this.v(p.x, p.y, p.z)];
  }

  /** over the table's rear edge and down to the floor (hanging straight) */
  private rearEdgeDown(x: number, k: number): RV[] {
    const zd = this.dropZ(k);
    return [this.v(x, TT, zd, 0.018), this.v(x, F, zd, 0.07)];
  }

  private exploded3(A: { p: THREE.Vector3; n: THREE.Vector3 }, B: { p: THREE.Vector3; n: THREE.Vector3 }): RV[] {
    const QA = A.p.clone().addScaledVector(A.n, 0.2);
    const QB = B.p.clone().addScaledVector(B.n, 0.2);
    const mid = QA.clone().add(QB).multiplyScalar(0.5).add(A.n.clone().add(B.n).multiplyScalar(0.1));
    return [this.v(A.p.x, A.p.y, A.p.z), this.v(QA.x, QA.y, QA.z, 0.06), this.v(mid.x, mid.y, mid.z, 0.2), this.v(QB.x, QB.y, QB.z, 0.06), this.v(B.p.x, B.p.y, B.p.z)];
  }

  private addCable(
    id: string,
    kind: "signal" | "power",
    label: string,
    a: PortRef,
    b: PortRef,
    presets: PresetId[],
    route: (A: ReturnType<PAEngine["portWorld"]>, B: ReturnType<PAEngine["portWorld"]>) => RV[],
  ) {
    const color = kind === "signal" ? SIGNAL_COLOR : POWER_COLOR;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.05 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.castShadow = true;
    mesh.userData.ownerId = `cable:${id}`;
    mesh.frustumCulled = false;
    const mkPlug = () => {
      const g = new THREE.Group();
      const bodyMat = kind === "signal" ? this.M.chrome : this.M.plastic;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.055, 20), bodyMat);
      body.rotation.x = Math.PI / 2;
      body.position.z = 0.0275;
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0125, 0.05, 18), mat);
      boot.rotation.x = Math.PI / 2;
      boot.position.z = 0.08;
      g.add(body, boot);
      g.traverse((c) => ((c as THREE.Mesh).isMesh ? ((c as THREE.Mesh).userData.ownerId = `cable:${id}`) : null));
      return g;
    };
    const plugA = mkPlug();
    const plugB = mkPlug();
    const beads: THREE.Mesh[] = [];
    if (kind === "signal") {
      for (let i = 0; i < 3; i++) {
        const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfeaff }));
        beads.push(b2);
        this.cableRoot.add(b2);
      }
    }
    this.cableRoot.add(mesh, plugA, plugB);
    this.cables.push({
      id,
      kind,
      label,
      a,
      b,
      presets,
      route: (e) => {
        const A = this.portWorld(a);
        const B = this.portWorld(b);
        return e ? this.exploded3(A, B) : route(A, B);
      },
      mesh,
      plugA,
      plugB,
      beads,
      curve: null,
      needsBuild: true,
      shown: false,
    });
  }

  private buildCables() {
    const subW = SUB.W;
    const side = (x: number, ref: number) => (x >= ref ? 1 : -1);

    // ---- Mixer main L / R  →  sub Input A ------------------------------
    const main = (id: string, mixPort: string, sub: string, k: number, label: string) =>
      this.addCable(id, "signal", label, { item: "mixer", port: mixPort }, { item: sub, port: "in_a" }, ["full"], (A, B) => {
        const subX = this.items.get(sub)!.cur.pos.x;
        const s = side(A.p.x, subX);
        const zr = this.mixerRearZ() - 0.07 - k * 0.02;
        const zd = this.dropZ(k);
        const xs = subX + s * (subW / 2 + 0.2 + k * 0.04); // lane beside the sub, facing the table
        const Z = B.p.z - 0.16; // vertical lane behind the sub
        return [
          ...this.mixerExit({ item: "mixer", port: mixPort }, zr),
          this.v(A.p.x, TT, zd, 0.018),
          this.v(A.p.x, F, zd, 0.07),
          this.v(xs, F, zd, 0.12),
          this.v(xs, F, Z, 0.12),
          ...this.riseToRearPort({ item: sub, port: "in_a" }, Z, F),
        ];
      });
    main("main_l", "main_l", "sub1", 0, "Mixer Main L → Sub 1 Input A");
    main("main_r", "main_r", "sub2", 1, "Mixer Main R → Sub 2 Input A");

    // ---- Sub high-pass out  →  Alto input 1 (up behind the pole) ----------
    const hp = (id: string, sub: string, top: string, presets: PresetId[], label: string) =>
      this.addCable(id, "signal", label, { item: sub, port: "hp_a" }, { item: top, port: "in_ch1" }, presets, (A, B) => {
        const Z = Math.min(A.p.z, B.p.z) - 0.17;
        return [this.v(A.p.x, A.p.y, A.p.z), this.v(A.p.x, A.p.y, Z, 0.05), this.v(B.p.x, B.p.y, Z, 0.05), this.v(B.p.x, B.p.y, B.p.z)];
      });
    hp("hp1", "sub1", "top1", ["full", "onetop"], "Sub 1 High-Pass Out → Alto TS415 #1");
    hp("hp2", "sub2", "top2", ["full"], "Sub 2 High-Pass Out → Alto TS415 #2");

    // ---- Wireless receiver  →  mixer CH1 / CH2 (lying on the table) -----------
    const rx = (id: string, out: string, ch: string, k: number, label: string) =>
      this.addCable(id, "signal", label, { item: "rx", port: out }, { item: "mixer", port: ch }, ["full"], (A) => {
        const zr = this.mixerRearZ() - 0.128 - k * 0.017;
        const ex = this.mixerExit({ item: "mixer", port: ch }, zr).reverse();
        const Z = zr;
        const lift = TT + 0.0095 * (k + 1);
        return [
          this.v(A.p.x, A.p.y, A.p.z),
          this.v(A.p.x, lift, Z, 0.05),
          this.v(ex[0].x, lift, Z, 0.05),
          ...ex.slice(0),
        ];
      });
    rx("rx1", "out1", "ch1", 0, "Wireless receiver → Mixer CH 1");
    rx("rx2", "out2", "ch2", 1, "Wireless receiver → Mixer CH 2");

    // ---- PGA48 on the boom stand → mixer CH3 -----------------------------------
    this.addCable("pga", "signal", "Shure PGA48 → Mixer CH 3", { item: "pga", port: "xlr" }, { item: "mixer", port: "ch3" }, ["full"], (A, B) => {
      const k = 0;
      const zr = this.mixerRearZ() - 0.09;
      const ex = this.mixerExit({ item: "mixer", port: "ch3" }, zr).reverse();
      const zd = this.dropZ(k);
      const boom = this.items.get("boom")!.cur.pos;
      const lane = 1.02;
      return [
        this.v(A.p.x, A.p.y, A.p.z),
        this.v(...this.local("boom", -0.42, 1.485, 0.04).toArray(), 0.06),
        this.v(...this.local("boom", 0.07, 1.34, 0.045).toArray(), 0.08),
        this.v(...this.local("boom", 0.045, 0.9, 0.06).toArray(), 0.05),
        this.v(boom.x + 0.045, F, boom.z + 0.08 + 0.06, 0.1),
        this.v(lane, F, boom.z + 0.14, 0.15),
        this.v(lane, F, zd - 0.0, 0.15),
        this.v(B.p.x, F, zd, 0.12),
        this.v(B.p.x, TT, zd, 0.07),
        this.v(B.p.x, TT, zr, 0.04),
        ...ex,
      ];
    });

    // ---- single source (phone) → sub Input A in the "1 top + 1 sub" preset -----
    this.addCable("line", "signal", "Source → Sub 1 Input A (adapter lead, not in kit list)", { item: "phone", port: "line" }, { item: "sub1", port: "in_a" }, ["onetop"], (A, B) => {
      const front = this.tableFrontEdge();
      const subX = this.items.get("sub1")!.cur.pos.x;
      const tx = this.items.get("table")!.cur.pos.x;
      const zf = front + 0.016;
      const s = side(tx, subX);
      const xs = subX + s * (subW / 2 + 0.2);
      const Z = B.p.z - 0.16;
      return [
        this.v(A.p.x, A.p.y, A.p.z),
        this.v(A.p.x, TT, zf, 0.02),
        this.v(A.p.x, F, zf, 0.07),
        this.v(xs, F, zf, 0.14),
        this.v(xs, F, Z, 0.14),
        ...this.riseToRearPort({ item: "sub1", port: "in_a" }, Z, F),
      ];
    });

    // ---- power: extension board → every powered unit ---------------------------------
    /** plug on the board's top: up the plug, over, and straight down in front of the board */
    const stripOut = (A: { p: THREE.Vector3; n: THREE.Vector3 }, stagger = 0): RV[] => {
      // staggered drop depth so cords that head sideways pass behind the ones that go straight on
      const zs = A.p.z + 0.13 + stagger;
      return [this.v(A.p.x, A.p.y, A.p.z), this.v(A.p.x, A.p.y + 0.14, A.p.z, 0.03), this.v(A.p.x, A.p.y + 0.14, zs, 0.035), this.v(A.p.x, F, zs, 0.06)];
    };

    const pwSub = (id: string, sock: string, sub: string, presets: PresetId[], label: string) =>
      this.addCable(id, "power", label, { item: "strip", port: sock }, { item: sub, port: "power" }, presets, (A, B) => {
        const out = stripOut(A);
        const Z = B.p.z - 0.21;
        return [...out, this.v(A.p.x, F, Z, 0.12), ...this.riseToRearPort({ item: sub, port: "power" }, Z, F)];
      });
    pwSub("pw_sub1", "s1", "sub1", ["full", "onetop"], "Extension board → Sub 1 (IEC)");
    pwSub("pw_sub2", "s2", "sub2", ["full"], "Extension board → Sub 2 (IEC)");

    const pwTop = (id: string, sock: string, top: string, presets: PresetId[], label: string) =>
      this.addCable(id, "power", label, { item: "strip", port: sock }, { item: top, port: "power" }, presets, (A, B) => {
        const out = stripOut(A, sock === "s3" ? -0.03 : -0.06);
        const zs = out[out.length - 1].z;
        const tx = this.items.get(top)!.cur.pos.x;
        const dir = tx > 0.01 ? -1 : 1; // drop the lead on the inboard side
        const xo = B.p.x + dir * 0.14;
        const Z = B.p.z - 0.17;
        return [
          ...out,
          this.v(xo, F, zs, 0.12),
          this.v(xo, F, Z, 0.12),
          this.v(xo, B.p.y, Z, 0.06),
          this.v(B.p.x, B.p.y, Z, 0.04),
          this.v(B.p.x, B.p.y, B.p.z),
        ];
      });
    pwTop("pw_top1", "s3", "top1", ["full", "speakers", "onetop"], "Extension board → Alto TS415 #1 (IEC)");
    pwTop("pw_top2", "s4", "top2", ["full", "speakers"], "Extension board → Alto TS415 #2 (IEC)");

    const pwTable = (id: string, sock: string, unit: string, k: number, lane: number, label: string) =>
      this.addCable(id, "power", label, { item: "strip", port: sock }, { item: unit, port: "power" }, ["full"], (A, B) => {
        const out = stripOut(A, unit === "rx" ? -0.03 : 0);
        const zd = this.dropZ(k);
        const Z = B.p.z - 0.17;
        return [
          ...out,
          this.v(lane, F, out[out.length - 1].z, 0.14),
          this.v(lane, F, zd, 0.14),
          this.v(B.p.x, F, zd, 0.1),
          this.v(B.p.x, TT, zd, 0.07),
          this.v(B.p.x, TT, Z > this.tableRearEdge() ? Z : this.tableRearEdge() + 0.02, 0.03),
          this.v(B.p.x, B.p.y, Z > this.tableRearEdge() ? Z : this.tableRearEdge() + 0.02, 0.03),
          this.v(B.p.x, B.p.y, B.p.z),
        ];
      });
    pwTable("pw_mix", "s5", "mixer", 2, 0.16, "Extension board → Mixer power");
    pwTable("pw_rx", "s6", "rx", 0, 0.46, "Extension board → Wireless receiver power");
  }

  private rebuildCable(c: Cable) {
    const pts = c.route(this.exploded);
    const path = roundedPath(pts, 0.05);
    const len = path.getLength();
    const seg = Math.max(40, Math.min(420, Math.ceil(len * 42)));
    const geo = new THREE.TubeGeometry(path, seg, c.kind === "signal" ? 0.0055 : 0.0068, 8, false);
    c.mesh.geometry.dispose();
    c.mesh.geometry = geo;
    c.curve = path;
    const place = (plug: THREE.Group, ref: PortRef) => {
      const { p, n } = this.portWorld(ref);
      plug.position.copy(p);
      plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    };
    place(c.plugA, c.a);
    place(c.plugB, c.b);
  }

  /* ------------------------------------------------------------------ */
  /* Wireless beams (Speakers-only preset)                               */
  /* ------------------------------------------------------------------ */

  private addBeam(text: string, color: number, from: () => THREE.Vector3, to: () => THREE.Vector3, lift: number) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    const beads: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color }));
      beads.push(b);
      group.add(b);
    }
    const el = this.labelEl(text, "pa-beam");
    el.style.setProperty("--c", "#" + color.toString(16).padStart(6, "0"));
    const label = new CSS2DObject(el);
    group.add(label);
    group.visible = false;
    this.scene.add(group);
    this.beams.push({ group, mesh, beads, label, from, to, lift, curve: null });
  }

  private buildBeams() {
    const top1 = () => {
      const i = this.items.get("top1")!;
      return i.group.localToWorld(new THREE.Vector3(0, TOP.H * 0.55, TOP.D / 2 + 0.02));
    };
    const top2 = () => {
      const i = this.items.get("top2")!;
      return i.group.localToWorld(new THREE.Vector3(0, TOP.H * 0.55, TOP.D / 2 + 0.02));
    };
    const phone = () => this.items.get("phone")!.group.localToWorld(new THREE.Vector3(0, 0.03, 0));
    this.addBeam("Bluetooth · phone → speaker 1", 0x4aa3ff, phone, top1, 0.7);
    this.addBeam("Wireless link · speaker 1 ↔ speaker 2", 0x3df0b0, top1, top2, 0.5);
  }

  /* ------------------------------------------------------------------ */
  /* State API                                                           */
  /* ------------------------------------------------------------------ */

  setPreset(p: PresetId) {
    if (p === this.preset) return;
    this.preset = p;
    if (this.selected && this.cableId(this.selected) === null) {
      // re-evaluated after targets: deselect if hidden
    }
    this.applyTargets(false);
    this.cables.forEach((c) => (c.needsBuild = true));
    if (p === "full") this.flyTo("front");
    else this.flyTo("front");
  }

  setExploded(on: boolean) {
    if (on === this.exploded) return;
    this.exploded = on;
    this.applyTargets(false);
    this.cables.forEach((c) => (c.needsBuild = true));
    this.flyTo(on ? "exploded" : "threeQuarter");
  }

  setToggle(k: ToggleKey, v: boolean) {
    this.toggles[k] = v;
    if (k === "covers") this.applyTargets(false);
    this.movingFrames = 3;
  }

  setView(v: ViewName) {
    this.flyTo(v);
  }

  select(id: string | null) {
    this.setSelected(id);
  }

  focusSelected() {
    if (!this.selected) return;
    const it = this.items.get(this.selected);
    if (!it) return;
    const box = new THREE.Box3().setFromObject(it.built.body);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    const dist = Math.max(1.2, size * 1.8);
    this.startTween(c.clone().addScaledVector(dir, dist), c, 0.8);
  }

  /** dev helper */
  debugCamera(pos: [number, number, number], target: [number, number, number]) {
    this.tween = null;
    this.camera.position.set(...pos);
    this.controls.target.set(...target);
    this.controls.update();
  }

  private applyTargets(instant: boolean) {
    const poses = computePoses(this.preset, this.exploded, this.toggles.covers);
    this.items.forEach((it, id) => {
      const p = poses[id];
      if (!p) {
        it.tgt.scale = 0;
      } else {
        const wasHidden = it.cur.scale < 0.02;
        it.tgt.pos.copy(p.pos);
        it.tgt.rotY = p.rotY;
        it.tgt.pitch = p.pitch;
        it.tgt.roll = p.roll;
        it.tgt.scale = 1;
        it.tgt.sy = p.sy;
        if (wasHidden || instant) {
          it.cur.pos.copy(p.pos);
          it.cur.rotY = p.rotY;
          it.cur.pitch = p.pitch;
          it.cur.roll = p.roll;
          it.cur.sy = p.sy;
          if (instant) it.cur.scale = 1;
        }
      }
    });
    this.movingFrames = 3;
  }

  /* ------------------------------------------------------------------ */
  /* Camera                                                              */
  /* ------------------------------------------------------------------ */

  private viewSpec(v: ViewName): { pos: THREE.Vector3; target: THREE.Vector3 } {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const visAspect = (w >= 860 ? w - 400 : w) / h;
    const fit = visAspect < 1.16 ? Math.pow(1.16 / Math.max(visAspect, 0.3), 0.82) : 1;
    const mk = (target: THREE.Vector3, offset: THREE.Vector3) => ({ target, pos: target.clone().addScaledVector(offset, fit) });
    switch (v) {
      case "front":
        return mk(new THREE.Vector3(0.35, 0.85, 1.1), new THREE.Vector3(0, 1.7, 6.7));
      case "rear":
        return mk(new THREE.Vector3(0.2, 0.85, 1.1), new THREE.Vector3(0, 1.5, -6.7));
      case "top":
        return mk(new THREE.Vector3(0.4, 0, 1.1), new THREE.Vector3(0.0001, 9.6, 0.002));
      case "exploded":
        return mk(new THREE.Vector3(0, 1.45, 1.1), new THREE.Vector3(0, 1.1, 8.6));
      default:
        return mk(new THREE.Vector3(0.4, 0.9, 1.2), new THREE.Vector3(5.4, 2.9, 5.8));
    }
  }

  private snapView(v: ViewName) {
    const s = this.viewSpec(v);
    this.camera.position.copy(s.pos);
    this.controls.target.copy(s.target);
    this.controls.update();
  }

  private flyTo(v: ViewName) {
    const s = this.viewSpec(v);
    this.startTween(s.pos, s.target, 1.0);
  }

  private startTween(pos: THREE.Vector3, target: THREE.Vector3, dur: number) {
    this.tween = { t: 0, dur, p0: this.camera.position.clone(), p1: pos.clone(), q0: this.controls.target.clone(), q1: target.clone() };
  }

  /* ------------------------------------------------------------------ */
  /* Picking                                                             */
  /* ------------------------------------------------------------------ */

  private cableId(id: string): string | null {
    return id.startsWith("cable:") ? id.slice(6) : null;
  }

  private pointerNDC(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private pick(e: PointerEvent): string | null {
    this.raycaster.setFromCamera(this.pointerNDC(e), this.camera);
    const roots: THREE.Object3D[] = [];
    this.items.forEach((it) => {
      if (it.group.visible) roots.push(it.built.body);
    });
    this.cables.forEach((c) => {
      if (c.shown) roots.push(c.mesh, c.plugA, c.plugB);
    });
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData.ownerId) return o.userData.ownerId as string;
        o = o.parent;
      }
    }
    return null;
  }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.tween = null; // user takes over the camera
  };

  private onUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
    this.setSelected(this.pick(e));
  };

  private onMove = (e: PointerEvent) => {
    if (this.down && e.buttons) return;
    if (e.pointerType === "touch") return;
    const id = this.pick(e);
    if (id !== this.hovered) {
      this.hovered = id;
      this.renderer.domElement.style.cursor = id ? "pointer" : "";
    }
  };

  private onLeave = () => {
    this.hovered = null;
    this.renderer.domElement.style.cursor = "";
  };

  private setSelected(id: string | null) {
    this.selected = id;
    if (!id) {
      this.cb.onSelect(null, null);
      return;
    }
    const cid = this.cableId(id);
    if (cid) {
      const c = this.cables.find((x) => x.id === cid)!;
      this.cb.onSelect(c.kind === "signal" ? "xlr" : "power", c.label);
    } else {
      const it = this.items.get(id)!;
      this.cb.onSelect(it.specId, it.label);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Frame loop                                                          */
  /* ------------------------------------------------------------------ */

  private resize() {
    if (this.disposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    // keep the rig centred in the area not covered by the desktop side panel
    const inset = w >= 860 ? 400 : 0;
    if (inset) this.camera.setViewOffset(w, h, inset / 2, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;

    // camera tween
    if (this.tween) {
      const t = this.tween;
      t.t += dt / t.dur;
      const k = ease(Math.min(1, t.t));
      this.camera.position.lerpVectors(t.p0, t.p1, k);
      this.controls.target.lerpVectors(t.q0, t.q1, k);
      if (t.t >= 1) this.tween = null;
    }
    this.controls.update();

    // item poses
    const f = 1 - Math.exp(-dt * 6.5);
    let moving = false;
    this.items.forEach((it) => {
      const c = it.cur;
      const t = it.tgt;
      const d =
        c.pos.distanceToSquared(t.pos) + Math.abs(c.rotY - t.rotY) + Math.abs(c.scale - t.scale) + Math.abs(c.sy - t.sy) + Math.abs(c.pitch - t.pitch) + Math.abs(c.roll - t.roll);
      if (d > 1e-7) {
        moving = true;
        c.pos.lerp(t.pos, f);
        c.rotY += (t.rotY - c.rotY) * f;
        c.pitch += (t.pitch - c.pitch) * f;
        c.roll += (t.roll - c.roll) * f;
        c.scale += (t.scale - c.scale) * Math.min(1, f * 1.4);
        c.sy += (t.sy - c.sy) * f;
        if (d < 1e-6) {
          c.pos.copy(t.pos);
          c.rotY = t.rotY;
          c.pitch = t.pitch;
          c.roll = t.roll;
          c.scale = t.scale;
          c.sy = t.sy;
        }
      }
      const vis = c.scale > 0.02;
      it.group.visible = vis;
      if (vis) {
        const s = Math.max(c.scale, 1e-4);
        it.group.position.copy(c.pos);
        it.group.rotation.set(c.pitch, c.rotY, c.roll, "YXZ");
        it.group.scale.set(s, s * c.sy, s);
      }
      it.guides.visible = this.toggles.dims;
      it.labelObj.visible = it.showLabel && this.toggles.labels && !this.toggles.dims && c.scale > 0.9 && !it.id.startsWith("cov_");
    });
    if (moving) this.movingFrames = 3;

    // deselect hidden items
    if (this.selected && !this.cableId(this.selected)) {
      const s = this.items.get(this.selected);
      if (s && !s.group.visible) this.setSelected(null);
    }

    const needUpdate = this.movingFrames > 0;
    if (needUpdate) {
      this.scene.updateMatrixWorld(true);
      this.movingFrames--;
    }

    // cables
    this.cables.forEach((c) => {
      const A = this.items.get(c.a.item)!;
      const B = this.items.get(c.b.item)!;
      const want =
        c.presets.includes(this.preset) &&
        (c.kind === "signal" ? this.toggles.signal : this.toggles.power) &&
        A.cur.scale > 0.97 &&
        B.cur.scale > 0.97 &&
        A.group.visible &&
        B.group.visible;
      if (want !== c.shown) {
        c.shown = want;
        c.mesh.visible = want;
        c.plugA.visible = want;
        c.plugB.visible = want;
        c.beads.forEach((b) => (b.visible = want));
        if (want) c.needsBuild = true;
      }
      if (c.shown && (needUpdate || c.needsBuild)) {
        this.rebuildCable(c);
        c.needsBuild = false;
      }
      if (c.shown && c.curve && c.beads.length) {
        c.beads.forEach((b, i) => {
          const u = (this.time * 0.16 + i / c.beads.length) % 1;
          c.curve!.getPointAt(u, b.position);
        });
      }
      const m = c.mesh.material as THREE.MeshStandardMaterial;
      const sel = this.selected === `cable:${c.id}`;
      m.emissiveIntensity = sel ? 0.9 : 0.22;
    });

    // wireless beams: Speakers-only preset
    this.beams.forEach((b) => {
      const show = this.preset === "speakers" && this.items.get("top1")!.cur.scale > 0.97 && this.items.get("phone")!.cur.scale > 0.97;
      b.group.visible = show;
      if (!show) return;
      const a = b.from();
      const z = b.to();
      const mid = a.clone().add(z).multiplyScalar(0.5);
      mid.y += b.lift;
      b.curve = new THREE.QuadraticBezierCurve3(a, mid, z);
      b.mesh.geometry.dispose();
      b.mesh.geometry = new THREE.TubeGeometry(b.curve, 40, 0.0045, 6, false);
      b.beads.forEach((bead, i) => {
        const u = (this.time * 0.35 + i / b.beads.length) % 1;
        b.curve!.getPointAt(u, bead.position);
        bead.scale.setScalar(0.6 + 0.6 * Math.sin(u * Math.PI));
      });
      b.label.position.copy(b.curve.getPoint(0.5)).add(new THREE.Vector3(0, 0.08, 0));
      b.label.visible = this.toggles.labels;
    });
    // beam 2 only if both tops exist (always true in preset 2); phone beam handled same way
    // world guides
    this.worldGuides.forEach((g) => {
      const r = g.fn();
      const show = this.toggles.dims && r.show && !this.exploded;
      g.group.visible = show;
      if (!show) return;
      const set = (l: THREE.Line, p: THREE.Vector3, q: THREE.Vector3) => {
        const pos = l.geometry.getAttribute("position") as THREE.BufferAttribute;
        pos.setXYZ(0, p.x, p.y, p.z);
        pos.setXYZ(1, q.x, q.y, q.z);
        pos.needsUpdate = true;
      };
      set(g.line, r.a, r.b);
      const dir = r.b.clone().sub(r.a).normalize();
      const perp = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1).cross(dir).length() > 0.1 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
      set(g.tickA, r.a.clone().addScaledVector(perp, 0.04), r.a.clone().addScaledVector(perp, -0.04));
      set(g.tickB, r.b.clone().addScaledVector(perp, 0.04), r.b.clone().addScaledVector(perp, -0.04));
      g.label.position.copy(r.a).add(r.b).multiplyScalar(0.5);
      if (r.text !== g.lastText) {
        g.el.textContent = r.text;
        g.lastText = r.text;
      }
      g.el.className = "pa-dim layout" + (r.approx ? " approx" : "");
    });

    // outlines
    const updBox = (box: THREE.BoxHelper, id: string | null) => {
      if (!id || this.cableId(id)) {
        box.visible = false;
        return;
      }
      const it = this.items.get(id);
      if (!it || !it.group.visible) {
        box.visible = false;
        return;
      }
      box.setFromObject(it.built.body);
      box.visible = true;
    };
    updBox(this.selBox, this.selected);
    updBox(this.hoverBox, this.hovered && this.hovered !== this.selected ? this.hovered : null);

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObs.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    el.remove();
    this.labelRenderer.domElement.remove();
  }
}

void BOOM;
void MIC_ROLL;
