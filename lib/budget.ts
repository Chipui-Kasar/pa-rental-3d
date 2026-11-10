export const BUDGET_LIMIT = 300000;

export type PresetId = "full" | "speakers" | "onetop";

export interface BudgetLine {
  id: string;
  label: string;
  note?: string;
  price: number; // INR per unit (indicative, editable)
  /** default quantity for each preset */
  qty: Record<PresetId, number>;
  specId: string;
}

/** Indicative prices, November 2026 – all editable in the UI. */
export const DEFAULT_LINES: BudgetLine[] = [
  {
    id: "sub",
    label: "Mackie Thump118S 18\" sub",
    price: 78000,
    qty: { full: 2, speakers: 0, onetop: 1 },
    specId: "sub",
  },
  {
    id: "top",
    label: "Alto TS415 15\" top",
    price: 48000,
    qty: { full: 2, speakers: 2, onetop: 1 },
    specId: "top",
  },
  {
    id: "mixer",
    label: "Yamaha MG10XU mixer",
    price: 20000,
    qty: { full: 1, speakers: 0, onetop: 0 },
    specId: "mixer",
  },
  {
    id: "pga",
    label: "Shure PGA48 mic",
    price: 3200,
    qty: { full: 1, speakers: 0, onetop: 0 },
    specId: "pga",
  },
  {
    id: "bundle",
    label: "Wireless system, poles, stand, cables, power, covers",
    note: "Lump-sum estimate for the full kit – set qty to 1 to include it in a smaller preset",
    price: 25000,
    qty: { full: 1, speakers: 0, onetop: 0 },
    specId: "wmic",
  },
  {
    id: "tripods",
    label: "Speaker tripod stands",
    note: "Not in the brief – no price assumed, enter one if you hire them",
    price: 0,
    qty: { full: 0, speakers: 2, onetop: 0 },
    specId: "tripod",
  },
];

export const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
