interface IconProps {
  size?: number;
  className?: string;
}

export function GrassIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect width="16" height="16" fill="#6b4423" />
      <rect width="16" height="5" fill="#5da636" />
      <rect x="0" y="5" width="3" height="2" fill="#4b8c2a" />
      <rect x="5" y="5" width="4" height="3" fill="#5da636" />
      <rect x="11" y="5" width="3" height="2" fill="#4b8c2a" />
      <rect x="2" y="1" width="3" height="2" fill="#77c44b" />
      <rect x="10" y="2" width="2" height="1" fill="#77c44b" />
      <rect x="3" y="9" width="2" height="2" fill="#825632" />
      <rect x="10" y="10" width="3" height="2" fill="#4d2f18" />
      <rect x="6" y="13" width="2" height="2" fill="#825632" />
      <rect x="13" y="8" width="2" height="2" fill="#825632" />
    </svg>
  );
}

export function CraftingTableIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect width="16" height="16" fill="#7c522c" />
      <rect x="0" y="0" width="16" height="4" fill="#b48349" />
      <rect x="1" y="1" width="14" height="2" fill="#9a6c37" />
      <rect x="4" y="1" width="1" height="2" fill="#4e3218" />
      <rect x="8" y="1" width="1" height="2" fill="#4e3218" />
      <rect x="11" y="1" width="1" height="2" fill="#4e3218" />
      <rect x="1" y="5" width="14" height="10" fill="#a2713b" />
      <rect x="2" y="6" width="5" height="8" fill="#8b5e2e" />
      <rect x="9" y="6" width="5" height="8" fill="#8b5e2e" />
      <rect x="3" y="7" width="2" height="5" fill="#52525b" />
      <rect x="4" y="6" width="2" height="2" fill="#a1a1aa" />
      <rect x="10" y="7" width="3" height="2" fill="#d4d4d8" />
      <rect x="11" y="9" width="1" height="4" fill="#5b3a1b" />
    </svg>
  );
}

export function PortalCrystalIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="14" height="14" fill="#1e152a" />
      <rect x="2" y="2" width="12" height="12" fill="#3b1d5e" />
      <rect x="3" y="3" width="10" height="10" fill="#7e22ce" />
      <rect x="4" y="4" width="8" height="8" fill="#a855f7" />
      <rect x="6" y="5" width="4" height="6" fill="#d8b4fe" />
      <rect x="5" y="6" width="6" height="4" fill="#c084fc" />
      <rect x="7" y="7" width="2" height="2" fill="#faf5ff" />
      <rect x="2" y="2" width="2" height="2" fill="#581c87" />
      <rect x="12" y="12" width="2" height="2" fill="#581c87" />
    </svg>
  );
}

export function SunIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="5" width="6" height="6" fill="#facc15" />
      <rect x="6" y="6" width="4" height="4" fill="#fef08a" />
      <rect x="7" y="1" width="2" height="3" fill="#fbbf24" />
      <rect x="7" y="12" width="2" height="3" fill="#fbbf24" />
      <rect x="1" y="7" width="3" height="2" fill="#fbbf24" />
      <rect x="12" y="7" width="3" height="2" fill="#fbbf24" />
      <rect x="3" y="3" width="2" height="2" fill="#f59e0b" />
      <rect x="11" y="3" width="2" height="2" fill="#f59e0b" />
      <rect x="3" y="11" width="2" height="2" fill="#f59e0b" />
      <rect x="11" y="11" width="2" height="2" fill="#f59e0b" />
    </svg>
  );
}

export function MoonIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="2" width="6" height="2" fill="#e2e8f0" />
      <rect x="3" y="4" width="5" height="2" fill="#f8fafc" />
      <rect x="2" y="6" width="5" height="4" fill="#e2e8f0" />
      <rect x="3" y="10" width="6" height="2" fill="#cbd5e1" />
      <rect x="4" y="12" width="7" height="2" fill="#94a3b8" />
      <rect x="9" y="10" width="4" height="2" fill="#cbd5e1" />
      <rect x="11" y="3" width="2" height="2" fill="#fde047" />
      <rect x="13" y="6" width="1" height="1" fill="#fef08a" />
    </svg>
  );
}

export function CreeperIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect width="16" height="16" fill="#45a832" />
      <rect x="0" y="0" width="4" height="4" fill="#59c242" />
      <rect x="12" y="2" width="4" height="4" fill="#3a9128" />
      <rect x="2" y="11" width="3" height="3" fill="#59c242" />
      <rect x="11" y="11" width="4" height="4" fill="#358224" />
      {/* Eyes */}
      <rect x="3" y="4" width="3" height="3" fill="#111827" />
      <rect x="10" y="4" width="3" height="3" fill="#111827" />
      {/* Mouth */}
      <rect x="6" y="7" width="4" height="3" fill="#111827" />
      <rect x="5" y="9" width="6" height="4" fill="#111827" />
      <rect x="7" y="11" width="2" height="2" fill="#45a832" />
    </svg>
  );
}

export function GithubPixelIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="2" width="8" height="2" fill="currentColor" />
      <rect x="2" y="4" width="12" height="6" fill="currentColor" />
      <rect x="3" y="10" width="10" height="2" fill="currentColor" />
      <rect x="4" y="12" width="3" height="2" fill="currentColor" />
      <rect x="9" y="12" width="3" height="2" fill="currentColor" />
      <rect x="5" y="6" width="2" height="2" fill="#1e1e1e" />
      <rect x="9" y="6" width="2" height="2" fill="#1e1e1e" />
      <rect x="3" y="2" width="2" height="2" fill="currentColor" />
      <rect x="11" y="2" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function OreIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect width="16" height="16" fill="#6b7280" />
      <rect x="1" y="1" width="14" height="14" fill="#7f8694" />
      <rect x="3" y="3" width="3" height="2" fill="#22d3ee" />
      <rect x="9" y="4" width="3" height="3" fill="#34d399" />
      <rect x="4" y="9" width="4" height="3" fill="#22d3ee" />
      <rect x="10" y="10" width="3" height="2" fill="#fbbf24" />
    </svg>
  );
}

export function WaveIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="9" width="3" height="3" fill="#4ade80" />
      <rect x="5" y="6" width="3" height="3" fill="#38bdf8" />
      <rect x="9" y="4" width="3" height="3" fill="#818cf8" />
      <rect x="13" y="7" width="2" height="3" fill="#38bdf8" />
      <rect x="5" y="10" width="3" height="2" fill="#22c55e" opacity="0.6" />
      <rect x="9" y="8" width="3" height="2" fill="#38bdf8" opacity="0.6" />
    </svg>
  );
}

export function TrophyIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="2" width="8" height="6" fill="#facc15" />
      <rect x="2" y="3" width="2" height="3" fill="#eab308" />
      <rect x="12" y="3" width="2" height="3" fill="#eab308" />
      <rect x="5" y="8" width="6" height="2" fill="#eab308" />
      <rect x="7" y="10" width="2" height="3" fill="#ca8a04" />
      <rect x="4" y="13" width="8" height="2" fill="#facc15" />
    </svg>
  );
}
