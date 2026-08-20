import { useEffect, useState } from "react";

const LINKS = [
  ["#sim", "Սցենար"],
  ["#arch", "Արխիտեկտուրա"],
  ["#db", "SQLite"],
  ["#python", "Python"],
  ["#n8n", "n8n"],
  ["#telegram", "Telegram"],
  ["#cert", "Սերտիֆիկատ"],
  ["#prod", "Production"],
] as const;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-ink-700/80 bg-ink-950/85 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <a href="#sim" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-amber-glow/50 bg-ink-850 transition-transform group-hover:-rotate-6">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f2b441" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
              <path d="M14 2v6h6" strokeLinejoin="round" />
              <path d="M8 13h8M8 17h5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight text-ink-100">
            PDF Converter <span className="text-amber-glow">/</span>{" "}
            <span className="hidden font-mono text-[11px] font-medium text-ink-300 sm:inline">n8n blueprint</span>
          </span>
        </a>

        <div className="hidden items-center gap-6 lg:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="nav-link text-[13px] font-medium text-ink-300 hover:text-ink-100">
              {label}
            </a>
          ))}
          <span className="flex items-center gap-2 rounded-md border border-mint-sig/40 bg-mint-sig/10 px-2.5 py-1 font-mono text-[10.5px] text-mint-sig">
            <i className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint-sig" />
            n8n · v1.74
          </span>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-ink-600 text-ink-200 lg:hidden"
          aria-label="Բացել մենյուն"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-700 bg-ink-950/95 px-5 py-4 backdrop-blur-md lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-md border border-ink-700 bg-ink-850 px-3 py-2.5 text-[13px] text-ink-200 hover:border-amber-glow/50"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
