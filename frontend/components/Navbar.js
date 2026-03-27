"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",             label: "Markets"      },
  { href: "/whales",       label: "Whales 🐳"    },
  { href: "/liquidations", label: "Liquidations" },
  { href: "/funding",      label: "Funding"      },
  { href: "/feed",         label: "Feed"         },
  { href: "/leaderboard",  label: "Leaderboard"  },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e2a38] bg-[#0a0e13]/97 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold"
            style={{background:"rgba(0,232,198,0.15)", border:"1px solid rgba(0,232,198,0.3)", color:"#00e8c6"}}>
            速
          </div>
          <span className="font-bold text-[15px] tracking-tight text-[#e8f0f8] group-hover:text-[#00e8c6] transition-colors">
            Hayai
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-4 bg-[#1e2a38]" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`px-3 py-1.5 rounded text-[13px] font-medium transition-all whitespace-nowrap ${
                  active
                    ? "text-[#00e8c6] bg-[#00e8c6]/10"
                    : "text-[#5a7a9a] hover:text-[#e8f0f8] hover:bg-[#161d28]"
                }`}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#2a4060]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-[#00e8c6] opacity-60" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-[#00e8c6]" />
          </span>
          LIVE
        </div>

        {/* Trade on HL */}
        <a href="https://app.hyperliquid.xyz" target="_blank" rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded border border-[#1e2a38] text-[#5a7a9a] hover:border-[#00e8c6]/40 hover:text-[#00e8c6] transition-all">
          Trade on HL ↗
        </a>
      </div>
    </header>
  );
}
