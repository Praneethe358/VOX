type MicWaveformProps = {
  active?: boolean;
};

// Inline styles are necessary for dynamic bar height animation
export default function MicWaveform({ active = false }: MicWaveformProps) {
  const bars = Array.from({ length: 14 }).map((_, index) => ({
    id: index,
    height: 20 + ((index * 11) % 45),
  }));

  return (
    <div className="flex h-16 items-end gap-1">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`w-1 rounded ${active ? "animate-pulse bg-indigo-400" : "bg-slate-600"}`}
          style={{ height: `${bar.height}px` }}
        />
      ))}
    </div>
  );
}
