import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-[10px] text-[#303060] uppercase tracking-widest mb-3">404</p>
      <h1 className="font-display font-800 text-3xl text-[#eeeeff] mb-3">Page not found</h1>
      <p className="font-mono text-sm text-[#6060a0] mb-8">This route doesn't exist in Hayai.</p>
      <Link href="/" className="font-mono text-xs text-[#7c6aff] border border-[#7c6aff]/30 px-5 py-2.5 rounded-lg hover:bg-[#7c6aff]/10 transition-all">
        ← Back to Feed
      </Link>
    </div>
  );
}
