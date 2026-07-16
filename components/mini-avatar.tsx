const PALETTE = ['#0369a1', '#0891b2', '#7c3aed', '#c026d3', '#e11d48', '#ea580c', '#65a30d', '#0d9488'];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function MiniAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${className ?? ''}`}
      style={{ backgroundColor: colorForName(name) }}
    >
      {initials(name) || '?'}
    </span>
  );
}
