export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 shimmer rounded" />
          <div className="flex gap-2">
            <div className="h-4 w-14 shimmer rounded" />
            <div className="h-4 w-20 shimmer rounded" />
            <div className="h-4 w-24 shimmer rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return <div className="card p-4 space-y-2"><div className="h-3 w-20 shimmer rounded" /><div className="h-7 w-28 shimmer rounded" /></div>;
}

export function RowSkeleton({ cols = 6 }) {
  return (
    <tr className="border-b border-[#16162a]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3 shimmer rounded" style={{ width: `${50 + (i * 19) % 45}%` }} />
        </td>
      ))}
    </tr>
  );
}
