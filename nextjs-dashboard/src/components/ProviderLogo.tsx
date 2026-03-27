// Small square logo icons for known cloud providers.
// Falls back to a styled initial for unknown providers.

const LOGOS: Record<string, { bg: string; color: string; label: string }> = {
  coreweave:  { bg: "#7c3aed", color: "#fff", label: "CW" },
  runpod:     { bg: "#ea580c", color: "#fff", label: "RP" },
  lambda:     { bg: "#2563eb", color: "#fff", label: "λ"  },
  lambdalabs: { bg: "#2563eb", color: "#fff", label: "λ"  },
  nebius:     { bg: "#0891b2", color: "#fff", label: "NB" },
  crusoe:     { bg: "#059669", color: "#fff", label: "CR" },
  denvr:      { bg: "#e11d48", color: "#fff", label: "DV" },
  aws:        { bg: "#f59e0b", color: "#000", label: "AWS"},
  gcp:        { bg: "#4285f4", color: "#fff", label: "G"  },
  azure:      { bg: "#0078d4", color: "#fff", label: "Az" },
  paperspace: { bg: "#6366f1", color: "#fff", label: "PS" },
  vast:       { bg: "#8b5cf6", color: "#fff", label: "VA" },
  tensordock: { bg: "#06b6d4", color: "#fff", label: "TD" },
  datacrunch: { bg: "#10b981", color: "#fff", label: "DC" },
  lepton:     { bg: "#f97316", color: "#fff", label: "LP" },
  fluidstack: { bg: "#3b82f6", color: "#fff", label: "FS" },
  latitude:   { bg: "#64748b", color: "#fff", label: "LT" },
  hyperstack: { bg: "#7c3aed", color: "#fff", label: "HS" },
  oblivus:    { bg: "#0f766e", color: "#fff", label: "OB" },
  vultr:      { bg: "#007bfc", color: "#fff", label: "VU" },
  oracle:     { bg: "#c0392b", color: "#fff", label: "OC" },
};

export default function ProviderLogo({ name, size = 28 }: { name: string; size?: number }) {
  const key = name.toLowerCase();
  const cfg = LOGOS[key];
  const label = cfg?.label ?? name.slice(0, 2).toUpperCase();
  const bg    = cfg?.bg    ?? "#71717a";
  const color = cfg?.color ?? "#fff";
  const fontSize = label.length > 2 ? size * 0.28 : size * 0.36;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-bold leading-none"
      style={{
        width:      size,
        height:     size,
        background: bg,
        color,
        fontSize,
        letterSpacing: "-0.02em",
      }}
    >
      {label}
    </span>
  );
}
