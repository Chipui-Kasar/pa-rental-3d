import * as THREE from "three";
import type { PresetId } from "../budget";
import { SUB, TOP, MIX, RX } from "./audioModels";
import { BOOM, POLE, TABLE, TRIPOD } from "./miscModels";

export interface Pose {
  pos: THREE.Vector3;
  rotY: number;
  pitch: number;
  roll: number;
  scale: number;
  sy: number; // extra Y squash (folded covers)
}

export const mkPose = (x = 0, y = 0, z = 0, rotY = 0, pitch = 0, roll = 0): Pose => ({
  pos: new THREE.Vector3(x, y, z),
  rotY,
  pitch,
  roll,
  scale: 1,
  sy: 1,
});

export const SPEAKER_X = 1.5; // → 3 m between the two stacks
export const TABLE_Z = 2.4;
export const MIC_ROLL = 0.9; // boom-mic tilt (rad)

const COVER_OF: Record<string, string> = {
  cov_sub1: "sub1",
  cov_sub2: "sub2",
  cov_top1: "top1",
  cov_top2: "top2",
};

/** Poses of everything visible in a preset, assembled (not exploded). Missing key = hidden. */
export function assembledPoses(preset: PresetId): Record<string, Pose> {
  const P: Record<string, Pose> = {};
  P.table = mkPose(0, 0, TABLE_Z);
  P.strip = mkPose(0, 0, -0.85);
  const tableTop = TABLE.H;

  if (preset === "full") {
    P.sub1 = mkPose(-SPEAKER_X, 0, 0);
    P.sub2 = mkPose(SPEAKER_X, 0, 0);
    P.pole1 = mkPose(-SPEAKER_X, SUB.H, 0);
    P.pole2 = mkPose(SPEAKER_X, SUB.H, 0);
    const ty = SUB.H + POLE.L - TOP.INSERT;
    P.top1 = mkPose(-SPEAKER_X, ty, 0);
    P.top2 = mkPose(SPEAKER_X, ty, 0);
    P.mixer = mkPose(-0.28, tableTop, TABLE_Z);
    P.rx = mkPose(0.36, tableTop, TABLE_Z);
    P.mic1 = mkPose(0.04, tableTop + 0.0275, TABLE_Z + 0.24, 0, 0, -Math.PI / 2);
    P.mic2 = mkPose(0.06, tableTop + 0.0275, TABLE_Z + 0.175, 0, 0, Math.PI / 2);
    P.boom = mkPose(1.45, 0, 2.85);
    const d = new THREE.Vector3(-Math.sin(MIC_ROLL), Math.cos(MIC_ROLL), 0);
    const c = P.boom.pos.clone().add(BOOM.tip).addScaledVector(d, 0.0625);
    P.pga = mkPose(c.x, c.y, c.z, 0, 0, MIC_ROLL);
  } else if (preset === "speakers") {
    P.tripod1 = mkPose(-SPEAKER_X, 0, 0);
    P.tripod2 = mkPose(SPEAKER_X, 0, 0);
    const ty = TRIPOD.H - TOP.INSERT;
    P.top1 = mkPose(-SPEAKER_X, ty, 0);
    P.top2 = mkPose(SPEAKER_X, ty, 0);
    P.phone = mkPose(0.05, tableTop, TABLE_Z + 0.1, 0.25);
  } else {
    P.sub1 = mkPose(0, 0, 0);
    P.pole1 = mkPose(0, SUB.H, 0);
    P.top1 = mkPose(0, SUB.H + POLE.L - TOP.INSERT, 0);
    // table slides aside so the single sub stays in view
    P.table = mkPose(1.55, 0, TABLE_Z);
    P.phone = mkPose(1.6, tableTop, TABLE_Z + 0.1, 0.25);
  }
  return P;
}

/** Exploded offsets: separate every item and turn rear panels towards the +Z camera. */
export function explodePose(id: string, p: Pose): void {
  const s = Math.sign(Math.round(p.pos.x * 100) / 100);
  switch (id) {
    case "sub1":
    case "sub2":
      p.pos.x += s * 0.95;
      p.rotY = Math.PI;
      break;
    case "pole1":
    case "pole2":
      p.pos.x += s * 0.95;
      p.pos.y += 0.5;
      break;
    case "top1":
    case "top2":
      p.pos.x += s * 0.95;
      p.pos.y += 1.15;
      p.rotY = Math.PI;
      break;
    case "tripod1":
    case "tripod2":
      p.pos.x += s * 0.95;
      break;
    case "mixer":
      p.pos.x -= 0.4;
      p.pos.y += 0.55;
      p.pos.z += 0.1;
      p.rotY = Math.PI;
      break;
    case "rx":
      p.pos.x += 0.55;
      p.pos.y += 0.75;
      p.rotY = Math.PI;
      break;
    case "mic1":
      p.pos.x -= 0.35;
      p.pos.y += 0.9;
      break;
    case "mic2":
      p.pos.x += 0.05;
      p.pos.y += 0.9;
      break;
    case "boom":
      p.pos.x += 0.85;
      break;
    case "pga":
      p.pos.x += 0.85;
      p.pos.y += 0.75;
      break;
    case "strip":
      p.pos.z -= 0.7;
      break;
    case "phone":
      p.pos.y += 0.55;
      break;
    default:
  }
}

/** Where covers rest folded when they are not fitted. */
export const FOLDED_X = 2.85;

export function computePoses(preset: PresetId, exploded: boolean, coversOn: boolean): Record<string, Pose | null> {
  const base = assembledPoses(preset);
  const out: Record<string, Pose | null> = {};
  const ids = [
    "table", "strip", "sub1", "sub2", "pole1", "pole2", "top1", "top2", "tripod1", "tripod2",
    "mixer", "rx", "mic1", "mic2", "boom", "pga", "phone", "cov_sub1", "cov_sub2", "cov_top1", "cov_top2",
  ];
  ids.forEach((id) => {
    if (id.startsWith("cov_")) return;
    const p = base[id];
    if (!p) {
      out[id] = null;
      return;
    }
    if (exploded) explodePose(id, p);
    out[id] = p;
  });
  // covers: fitted on the speaker, or folded in a pile beside the system
  let folded = 0;
  Object.entries(COVER_OF).forEach(([cid, sid]) => {
    const spk = base[sid];
    if (!spk) {
      out[cid] = null;
      return;
    }
    if (coversOn && !exploded) {
      const p = mkPose(spk.pos.x, spk.pos.y, spk.pos.z, spk.rotY);
      out[cid] = p;
    } else {
      const p = mkPose((exploded ? 4.1 : FOLDED_X) + (folded % 2 ? 0.03 : -0.02), folded * 0.075, 0.35 + (folded % 2) * 0.02, folded * 0.12 - 0.1);
      p.sy = 0.11;
      out[cid] = p;
      folded++;
    }
  });
  return out;
}

export const VIEW_TARGET = new THREE.Vector3(0, 0.95, 0.9);
export { MIX, RX };
