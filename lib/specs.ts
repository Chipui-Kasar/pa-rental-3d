/**
 * Specification data shown in the click-to-inspect panel.
 *
 * Every value carries a verification status:
 *  - "published"   : taken from a manufacturer figure (or the figures supplied in the project brief)
 *  - "approximate" : modelled proportion / retailer-listed value – confirm on the official datasheet
 *  - "unverified"  : not verified – deliberately NOT filled in, to avoid inventing product details
 *
 * Nothing here should be quoted to a client without checking the current manufacturer datasheet.
 */

export type SpecStatus = "published" | "approximate" | "unverified";

export interface SpecRow {
  label: string;
  value: string;
  status: SpecStatus;
}

export interface ItemSpec {
  id: string;
  title: string;
  maker: string;
  role: string;
  rows: SpecRow[];
  notes?: string[];
}

const NV = "Not verified – see manufacturer datasheet";

export const SPECS: Record<string, ItemSpec> = {
  sub: {
    id: "sub",
    title: "Mackie Thump118S",
    maker: "Mackie",
    role: "18\" powered subwoofer (×2)",
    rows: [
      { label: "Dimensions (W × D × H)", value: "540 × 530 × 605 mm (per brief)", status: "published" },
      { label: "Weight", value: "29.7 kg (per brief)", status: "published" },
      { label: "Woofer", value: "18\"", status: "published" },
      { label: "Pole mount", value: "M20 threaded socket (top)", status: "published" },
      { label: "Inputs", value: "Stereo XLR (Input A / B)", status: "published" },
      { label: "Outputs", value: "Full-range XLR + high-pass XLR", status: "published" },
      { label: "High Pass Mode", value: "Flat / Deep / Punch / Variable", status: "published" },
      { label: "Variable crossover", value: "80 – 160 Hz", status: "published" },
      { label: "Other controls", value: "Level knob with SIG/OL LED, phase switch (normal / invert), FR output switch (stereo / mono), front-LED on/off (per reference photo)", status: "published" },
      { label: "Rear connector block", value: "2 × XLR input (A / B), 2 × high-pass out, 2 × full-range out (per reference photo)", status: "published" },
      { label: "Power inlet", value: "IEC with rocker switch; photo label reads 100–240 VAC, 50–60 Hz, 75 W", status: "published" },
      { label: "Amplifier / power rating", value: "Retailers list 1400 W Class-D – not manufacturer-verified", status: "unverified" },
      { label: "Frequency response / max SPL", value: NV, status: "unverified" },
      { label: "Handles", value: "Side handles (positions modelled approximately)", status: "approximate" },
    ],
    notes: [
      "Weight conflict: several retailers list ≈ 37.2 kg (82 lb) and ≈ 533 × 528 × 610 mm for this model. The brief's 29.7 kg has been kept in the model, but verify the weight on Mackie's datasheet before using it for transport planning.",
      "Rear-panel layout is schematic: the connector set follows the brief, not a photographic copy of the panel.",
    ],
  },
  top: {
    id: "top",
    title: "Alto Professional TS415",
    maker: "Alto Professional",
    role: "15\" powered loudspeaker (×2)",
    rows: [
      { label: "Dimensions (H × W × D)", value: "≈ 643 × 417 × 402 mm (approximate)", status: "approximate" },
      { label: "Weight", value: "≈ 17.2 kg (approximate)", status: "approximate" },
      { label: "Woofer", value: "15\"", status: "published" },
      { label: "HF driver", value: "1\" compression driver on horn (per brief) – retailer listings differ", status: "unverified" },
      { label: "Rear panel", value: "Brief: 3-channel mixer, Bluetooth + wireless-link, DSP. Reference photo: 2 combo XLR/TRS inputs, XLR mix out, master + level knobs, Bluetooth button, USB port, IEC inlet with rocker", status: "published" },
      { label: "Power rating", value: "2500-watt, 15\" 2-way (as printed on the rear panel in the reference photo)", status: "published" },
      { label: "Pole socket", value: "Pole cup on underside (retailers list a 36 mm socket) – approximate", status: "approximate" },
      { label: "Cabinet shape", value: "Chamfered front, tapered back, hex-perforated grille with top notch – modelled from the reference photos, proportions approximate", status: "approximate" },
      { label: "SPL, frequency response", value: NV, status: "unverified" },
    ],
    notes: [
      "All TS415 dimensions are retailer-listed (the most common set is shown); one retailer lists a different set. Treat every size as approximate until checked against Alto's official sheet.",
      "Rear-panel control positions are schematic.",
    ],
  },
  mixer: {
    id: "mixer",
    title: "Yamaha MG10XU",
    maker: "Yamaha",
    role: "10-input analog mixer with USB",
    rows: [
      { label: "Dimensions (W × H × D)", value: "244 × 71 × 294 mm", status: "published" },
      { label: "Weight", value: "2.1 kg", status: "published" },
      { label: "Inputs", value: "4 mono mic/line (XLR/TRS combo) + 3 stereo line = 10 inputs; mic/line jacks are on the top panel", status: "published" },
      { label: "Channel 1–4 switches", value: "PAD (26 dB), HPF (80 Hz), shared +48 V phantom switch (per reference photo)", status: "published" },
      { label: "Channel EQ", value: "3-band on mono channels (HIGH 10 kHz / MID 2.5 kHz / LOW 100 Hz), 2-band on stereo (per reference photo)", status: "published" },
      { label: "1-knob compressors", value: "Channels 1 – 2", status: "published" },
      { label: "Level controls", value: "Rotary LEVEL knobs – no channel faders on the MG10XU (faders belong to the larger MG10XUF)", status: "published" },
      { label: "Effects", value: "SPX digital multi-effect, 24 programs (reference photo)", status: "published" },
      { label: "USB", value: "USB audio interface port", status: "published" },
      { label: "Outputs", value: "Stereo out XLR L / R and 6.3 mm, monitor out, phones – all on the top panel (per reference photo)", status: "published" },
      { label: "Power supply", value: "External AC adaptor via a 3-pin \"AC ADAPTOR IN\" connector on the rear, with power switch (per reference photo)", status: "published" },
      { label: "Control-surface layout", value: "Schematic arrangement of knobs – not a 1:1 panel copy", status: "approximate" },
    ],
    notes: [
      "The brief asked for channel faders and a master fader; the real MG10XU uses rotary knobs, so the model follows the real unit.",
      "The brief also described 1-knob compressors on all four mic inputs; Yamaha's sheet puts them on channels 1 – 2 only.",
    ],
  },
  rx: {
    id: "rx",
    title: "Digimore D-330 dual wireless receiver",
    maker: "Digimore",
    role: "Dual-channel wireless microphone receiver",
    rows: [
      { label: "Dimensions (W × D × H)", value: "≈ 210 × 190 × 45 mm (approximate – modelled)", status: "approximate" },
      { label: "Antennas", value: "2 external antennas (per brief)", status: "published" },
      { label: "Outputs", value: "2 balanced XLR (modelled) – " + NV, status: "unverified" },
      { label: "Frequency band, range, power", value: NV, status: "unverified" },
    ],
    notes: ["No manufacturer datasheet was checked for this unit. All shapes and sizes are approximate."],
  },
  wmic: {
    id: "wmic",
    title: "Wireless handheld microphone",
    maker: "Supplied with Digimore D-330 set",
    role: "Handheld wireless transmitter (×2)",
    rows: [
      { label: "Dimensions", value: "≈ Ø50 mm head, ≈ 250 mm long (approximate – modelled)", status: "approximate" },
      { label: "Capsule / pattern / battery", value: NV, status: "unverified" },
    ],
  },
  pga: {
    id: "pga",
    title: "Shure PGA48",
    maker: "Shure",
    role: "Wired dynamic vocal microphone",
    rows: [
      { label: "Type", value: "Dynamic vocal microphone", status: "published" },
      { label: "Dimensions", value: "≈ 175 mm long, ≈ Ø52 mm head (approximate – modelled)", status: "approximate" },
      { label: "Polar pattern / frequency response", value: NV, status: "unverified" },
      { label: "Cable", value: "Some PGA48 variants ship with a cable, others do not – verify the variant you hire out", status: "unverified" },
    ],
    notes: ["Cable count: the brief lists 6 XLR cables but the signal flow needs 7 XLR runs (4 speaker feeds, 2 receiver outputs, 1 PGA48). The PGA48 run assumes the cable that ships with the mic."],
  },
  pole: {
    id: "pole",
    title: "Heavy-duty M20 speaker pole",
    maker: "Generic",
    role: "Sub-to-top pole (×2)",
    rows: [
      { label: "Thread", value: "M20 at the base (screws into the sub's top socket)", status: "published" },
      { label: "Length", value: "≈ 80 cm (approximate – modelled)", status: "approximate" },
      { label: "Top spigot", value: "≈ 35 mm into the speaker pole cup (approximate)", status: "approximate" },
      { label: "Load rating", value: NV, status: "unverified" },
    ],
  },
  boom: {
    id: "boom",
    title: "Adjustable tripod boom stand",
    maker: "Generic",
    role: "Microphone boom stand",
    rows: [
      { label: "Height range", value: "≈ 90 – 160 cm (approximate – modelled)", status: "approximate" },
      { label: "Boom arm", value: "≈ 70 cm (approximate)", status: "approximate" },
      { label: "Model / load rating", value: NV, status: "unverified" },
    ],
  },
  tripod: {
    id: "tripod",
    title: "Speaker tripod stand",
    maker: "Generic",
    role: "Used in the 'Speakers only' preset (×2)",
    rows: [
      { label: "Height", value: "≈ 130 cm (approximate – modelled)", status: "approximate" },
      { label: "Top spigot", value: "≈ 35 mm (approximate)", status: "approximate" },
      { label: "Price / model / load rating", value: "Not in the brief – " + NV, status: "unverified" },
    ],
    notes: ["These stands were not in the original equipment list, so no price is assumed. Enter one in the budget panel."],
  },
  xlr: {
    id: "xlr",
    title: "Balanced XLR cable",
    maker: "Generic",
    role: "Signal cable (×6 in brief)",
    rows: [
      { label: "Connectors", value: "XLR female ↔ XLR male, balanced", status: "published" },
      { label: "Length", value: "Modelled to fit the layout – real lengths not specified", status: "approximate" },
      { label: "Colour in this viewer", value: "Blue = signal (real cables are usually black)", status: "published" },
    ],
  },
  power: {
    id: "power",
    title: "IEC power cable",
    maker: "Generic",
    role: "Mains lead to each powered unit",
    rows: [
      { label: "Connector", value: "Mains plug ↔ IEC inlet (modelled)", status: "approximate" },
      { label: "Powered units fed", value: "2 subs, 2 tops, mixer, wireless receiver", status: "published" },
      { label: "Mixer / receiver power input", value: "May be an external adapter – " + NV, status: "unverified" },
      { label: "Colour in this viewer", value: "Orange = power (real cables are usually black)", status: "published" },
    ],
  },
  strip: {
    id: "strip",
    title: "Extension board (surge-protected)",
    maker: "Generic",
    role: "Power distribution",
    rows: [
      { label: "Sockets", value: "6 outlets, surge protection (per brief)", status: "published" },
      { label: "Dimensions", value: "≈ 400 × 70 × 45 mm (approximate – modelled)", status: "approximate" },
      { label: "Rating / model", value: NV, status: "unverified" },
    ],
    notes: ["Check the combined current draw of all amplifiers against the board's rating."],
  },
  cover: {
    id: "cover",
    title: "Padded protective cover",
    maker: "Generic",
    role: "Speaker cover (×4)",
    rows: [
      { label: "Fit", value: "One per speaker (2 sub, 2 top) – modelled ≈ 2 cm larger than the cabinet", status: "approximate" },
      { label: "Material / padding / model", value: NV, status: "unverified" },
    ],
    notes: ["Covers are only shown fitted on speakers that are in the current configuration; the rest stay folded beside the system."],
  },
  phone: {
    id: "phone",
    title: "Source phone",
    maker: "—",
    role: "Bluetooth / line source",
    rows: [
      { label: "Purpose", value: "Illustrates the Bluetooth link (Speakers only) or the single line source (1 top + 1 sub)", status: "published" },
      { label: "Adapter lead for the sub input", value: "Not in the equipment list – " + NV, status: "unverified" },
    ],
  },
  table: {
    id: "table",
    title: "Folding table",
    maker: "Generic",
    role: "Mixer / receiver desk",
    rows: [{ label: "Dimensions", value: "≈ 150 × 60 × 75 cm (approximate – modelled)", status: "approximate" }],
    notes: ["Not part of the hire equipment list; included for layout context."],
  },
};
