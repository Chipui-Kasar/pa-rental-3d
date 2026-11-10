"use client";

import dynamic from "next/dynamic";

// Three.js needs the browser (WebGL, canvas) – never render it on the server.
const Planner = dynamic(() => import("./Planner"), {
  ssr: false,
  loading: () => <div className="loading">Loading planner…</div>,
});

export default function PlannerLoader() {
  return <Planner />;
}
