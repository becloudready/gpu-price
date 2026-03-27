import Image from "next/image";

// Providers that have a logo file in /public/providers/
const LOGO_FILES: Record<string, string> = {
  coreweave:  "/providers/coreweave.png",
  runpod:     "/providers/runpod.png",
  lambda:     "/providers/lambda.png",
  lambdalabs: "/providers/lambda.png",
  nebius:     "/providers/nebius.png",
  crusoe:     "/providers/crusoe.png",
  denvr:      "/providers/denvr.png",
  aws:        "/providers/aws.png",
  gcp:        "/providers/gcp.png",
  azure:      "/providers/azure.png",
};

// Fallback letter-avatar config for providers without a logo file
const FALLBACK: Record<string, { bg: string; color: string; label: string }> = {
  paperspace: { bg: "#6366f1", color: "#fff", label: "PS" },
  vast:       { bg: "#8b5cf6", color: "#fff", label: "VA" },
  tensordock: { bg: "#06b6d4", color: "#fff", label: "TD" },
  datacrunch: { bg: "#10b981", color: "#fff", label: "DC" },
  lepton:     { bg: "#f97316", color: "#fff", label: "LP" },
  fluidstack: { bg: "#3b82f6", color: "#fff", label: "FS" },
  latitude:   { bg: "#64748b", color: "#fff", label: "LT" },
  hyperstack: { bg: "#7c3aed", color: "#fff", label: "HS" },
  vultr:      { bg: "#007bfc", color: "#fff", label: "VU" },
  oracle:     { bg: "#c0392b", color: "#fff", label: "OC" },
};

export default function ProviderLogo({ name, size = 28 }: { name: string; size?: number }) {
  const key = name.toLowerCase();
  const logoSrc = LOGO_FILES[key];

  if (logoSrc) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white"
        style={{ width: size, height: size }}
      >
        <Image
          src={logoSrc}
          alt={name}
          width={size}
          height={size}
          className="object-contain"
        />
      </span>
    );
  }

  // Letter-avatar fallback
  const fb = FALLBACK[key];
  const label = fb?.label ?? name.slice(0, 2).toUpperCase();
  const bg    = fb?.bg    ?? "#71717a";
  const color = fb?.color ?? "#fff";
  const fontSize = label.length > 2 ? size * 0.28 : size * 0.36;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-bold leading-none"
      style={{ width: size, height: size, background: bg, color, fontSize, letterSpacing: "-0.02em" }}
    >
      {label}
    </span>
  );
}
