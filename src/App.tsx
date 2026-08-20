import Nav from "./components/Nav";
import Simulator from "./components/Simulator";
import Architecture from "./components/Architecture";
import Database from "./components/Database";
import PythonCode from "./components/PythonCode";
import Workflows from "./components/Workflows";
import TelegramSection from "./components/TelegramSection";
import CertLab from "./components/CertLab";
import Checklist from "./components/Checklist";

export default function App() {
  return (
    <div className="bg-blueprint relative min-h-screen text-ink-100 antialiased">
      <div className="noise-overlay" aria-hidden />
      <Nav />
      <main>
        <div id="sim">
          <Simulator />
        </div>
        <Architecture />
        <Database />
        <PythonCode />
        <Workflows />
        <TelegramSection />
        <CertLab />
        <Checklist />
      </main>

      <footer className="border-t border-ink-700/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-amber-glow/40 bg-ink-850">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f2b441" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
                <path d="M14 2v6h6" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="font-mono text-[12px] text-ink-400">
              PDF Converter · n8n Production Blueprint · Python → n8n → Telegram → SQLite
            </p>
          </div>
          <div className="flex items-center gap-5">
            <p className="font-mono text-[11px] text-ink-500">
              30-օրյա սերտիֆիկատներ · Ed25519 · signed URLs
            </p>
            <a
              href="#sim"
              className="kbd-chip rounded-md px-3 py-1.5 font-mono text-[11px] text-ink-300 hover:text-amber-glow"
            >
              ↑ վերև
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
