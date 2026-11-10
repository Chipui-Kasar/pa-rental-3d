"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BUDGET_LIMIT, DEFAULT_LINES, inr, type PresetId } from "@/lib/budget";
import { SPECS, type SpecStatus } from "@/lib/specs";
import type { PAEngine, ToggleKey, ViewName } from "@/lib/three/engine";

const PRESETS: { id: PresetId; label: string; sub: string }[] = [
  { id: "full", label: "Full system", sub: "2 subs · 2 tops · mixer · mics" },
  { id: "speakers", label: "Speakers only", sub: "2 tops on tripods · Bluetooth" },
  { id: "onetop", label: "1 top + 1 sub", sub: "single source" },
];

const VIEWS: { id: ViewName; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "rear", label: "Rear" },
  { id: "top", label: "Top" },
  { id: "threeQuarter", label: "3/4" },
];

const TOGGLES: { id: ToggleKey; label: string }[] = [
  { id: "signal", label: "Signal cables" },
  { id: "power", label: "Power cables" },
  { id: "covers", label: "Covers" },
  { id: "dims", label: "Dimensions" },
  { id: "labels", label: "Labels" },
];

const STATUS_LABEL: Record<SpecStatus, string> = {
  published: "Published",
  approximate: "Approximate",
  unverified: "Not verified",
};

type Tab = "budget" | "specs";

export default function Planner() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PAEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const [preset, setPreset] = useState<PresetId>("full");
  const [exploded, setExploded] = useState(false);
  const [view, setView] = useState<ViewName | null>("threeQuarter");
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    signal: true,
    power: true,
    covers: false,
    dims: false,
    labels: true,
  });
  const [tab, setTab] = useState<Tab>("budget");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<{ specId: string; title: string } | null>(null);

  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries(DEFAULT_LINES.map((l) => [l.id, l.price])));
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(DEFAULT_LINES.map((l) => [l.id, l.qty.full])));

  /* ---- engine lifecycle ------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    let engine: PAEngine | null = null;
    (async () => {
      try {
        const { PAEngine } = await import("@/lib/three/engine");
        if (cancelled || !mountRef.current) return;
        engine = new PAEngine(mountRef.current, {
          onSelect: (specId, title) => {
            if (specId && title) {
              setSelected({ specId, title });
              setTab("specs");
              setSheetOpen(true);
            } else setSelected(null);
          },
        });
        engineRef.current = engine;
        setReady(true);
      } catch (e) {
        console.error(e);
        setWebglError(e instanceof Error ? e.message : "WebGL could not start in this browser.");
      }
    })();
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
      setReady(false);
    };
  }, []);

  // push React state into the engine once it exists
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.setPreset(preset);
  }, [preset, ready]);
  useEffect(() => {
    engineRef.current?.setExploded(exploded);
  }, [exploded, ready]);
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    (Object.keys(toggles) as ToggleKey[]).forEach((k) => e.setToggle(k, toggles[k]));
  }, [toggles, ready]);

  const choosePreset = useCallback((p: PresetId) => {
    setPreset(p);
    setExploded(false);
    setView("front");
    setQty(Object.fromEntries(DEFAULT_LINES.map((l) => [l.id, l.qty[p]])));
    setSelected(null);
  }, []);

  const goView = (v: ViewName) => {
    setView(v);
    engineRef.current?.setView(v);
  };

  /* ---- budget ---------------------------------------------------------- */
  const total = useMemo(() => DEFAULT_LINES.reduce((s, l) => s + (prices[l.id] || 0) * (qty[l.id] || 0), 0), [prices, qty]);
  const over = total > BUDGET_LIMIT;
  const pct = Math.min(100, (total / BUDGET_LIMIT) * 100);
  const state = over ? "over" : pct >= 90 ? "warn" : "ok";

  const spec = selected ? SPECS[selected.specId] : null;

  return (
    <div className="app">
      <div className="stage" ref={mountRef} aria-label="Interactive 3D view of the PA system" />

      {!ready && !webglError && <div className="loading">Building the rig…</div>}
      {webglError && (
        <div className="loading error">
          <strong>3D view could not start.</strong>
          <span>{webglError}</span>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>PA Rental Planner</h1>
            <p>Portable PA · event hire · budget ₹3,00,000</p>
          </div>
        </div>
        <div className="presets" role="tablist" aria-label="Rental configuration">
          {PRESETS.map((p) => (
            <button key={p.id} role="tab" aria-selected={preset === p.id} className={preset === p.id ? "on" : ""} onClick={() => choosePreset(p.id)}>
              <span>{p.label}</span>
              <small>{p.sub}</small>
            </button>
          ))}
        </div>
      </header>

      <div className="viewbar">
        <div className="group" aria-label="Camera">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id && !exploded ? "on" : ""} onClick={() => goView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <button
          className={"explode" + (exploded ? " on" : "")}
          aria-pressed={exploded}
          onClick={() => {
            setExploded((x) => !x);
            setView(null);
          }}
        >
          Exploded view
        </button>
        <div className="group toggles" aria-label="Layers">
          {TOGGLES.map((t) => (
            <label key={t.id} className={"chip" + (toggles[t.id] ? " on" : "")}>
              <input type="checkbox" checked={toggles[t.id]} onChange={(e) => setToggles((s) => ({ ...s, [t.id]: e.target.checked }))} />
              {t.id === "covers" ? (toggles.covers ? "Covers fitted" : "Covers folded") : t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="legend" aria-hidden>
        <span><i className="sw signal" /> Signal (XLR)</span>
        <span><i className="sw power" /> Power (IEC)</span>
        <span><i className="sw pub" /> Published size</span>
        <span><i className="sw apx" /> Approximate</span>
      </div>

      <aside className={"panel" + (sheetOpen ? " open" : "")}>
        <button className="sheet-handle" onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen}>
          <span className="grip" />
          <span className={"mini " + state}>
            {tab === "budget" ? `${inr.format(total)} / ${inr.format(BUDGET_LIMIT)}` : spec ? spec.title : "Specifications"}
          </span>
        </button>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "budget"} className={tab === "budget" ? "on" : ""} onClick={() => setTab("budget")}>
            Budget
          </button>
          <button role="tab" aria-selected={tab === "specs"} className={tab === "specs" ? "on" : ""} onClick={() => setTab("specs")}>
            Specifications
          </button>
        </div>

        <div className="panel-body">
          {tab === "budget" && (
            <section>
              <div className={"status " + state} role="status" aria-live="polite">
                <div className="status-top">
                  <strong>{inr.format(total)}</strong>
                  <span>
                    {over ? `Over budget by ${inr.format(total - BUDGET_LIMIT)}` : `${inr.format(BUDGET_LIMIT - total)} remaining`}
                  </span>
                </div>
                <div className="bar" aria-hidden>
                  <div className="fill" style={{ width: pct + "%" }} />
                </div>
                <div className="status-foot">
                  <span>{PRESETS.find((p) => p.id === preset)?.label}</span>
                  <span>Limit {inr.format(BUDGET_LIMIT)}</span>
                </div>
              </div>

              <table className="budget">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit ₹</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_LINES.map((l) => {
                    const q = qty[l.id] || 0;
                    const p = prices[l.id] || 0;
                    return (
                      <tr key={l.id} className={q === 0 ? "dim" : ""}>
                        <td>
                          <button className="link" onClick={() => { setSelected({ specId: l.specId, title: l.label }); setTab("specs"); }}>
                            {l.label}
                          </button>
                          {l.note && <small>{l.note}</small>}
                        </td>
                        <td>
                          <input
                            aria-label={`${l.label} quantity`}
                            type="number"
                            min={0}
                            max={9}
                            inputMode="numeric"
                            value={q}
                            onChange={(e) => setQty((s) => ({ ...s, [l.id]: Math.max(0, Math.min(9, Number(e.target.value) || 0)) }))}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`${l.label} unit price in rupees`}
                            className="price"
                            type="number"
                            min={0}
                            step={500}
                            inputMode="numeric"
                            value={p}
                            onChange={(e) => setPrices((s) => ({ ...s, [l.id]: Math.max(0, Number(e.target.value) || 0) }))}
                          />
                        </td>
                        <td className="num">{inr.format(p * q)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Running total</td>
                    <td className="num">{inr.format(total)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="fine">
                Indicative prices, November 2026 – all editable. Quantities follow the selected configuration; the accessories line is a lump-sum estimate for the full kit.
              </p>
              <button
                className="ghost"
                onClick={() => {
                  setPrices(Object.fromEntries(DEFAULT_LINES.map((l) => [l.id, l.price])));
                  setQty(Object.fromEntries(DEFAULT_LINES.map((l) => [l.id, l.qty[preset]])));
                }}
              >
                Reset prices &amp; quantities
              </button>
            </section>
          )}

          {tab === "specs" && (
            <section>
              {!spec && (
                <div className="empty">
                  <strong>Click any item in the 3D view</strong>
                  <p>Equipment, poles, stands, cables and covers open here with their specification. Only published values are stated as fact – everything else is labelled <em>approximate</em> or <em>not verified</em>.</p>
                </div>
              )}
              {spec && (
                <article className="spec">
                  <header>
                    <div>
                      <h2>{spec.title}</h2>
                      <p>{spec.role}</p>
                    </div>
                    <div className="actions">
                      <button className="ghost" onClick={() => engineRef.current?.focusSelected()}>Focus</button>
                      <button className="ghost" onClick={() => { setSelected(null); engineRef.current?.select(null); }} aria-label="Close specification">✕</button>
                    </div>
                  </header>
                  <dl>
                    {spec.rows.map((r) => (
                      <div key={r.label} className="row">
                        <dt>{r.label}</dt>
                        <dd>
                          <span>{r.value}</span>
                          <b className={"tag " + r.status}>{STATUS_LABEL[r.status]}</b>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {spec.notes?.map((n, i) => (
                    <p key={i} className="note">{n}</p>
                  ))}
                  <p className="fine">Always confirm against the current manufacturer datasheet before quoting to a client.</p>
                </article>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
