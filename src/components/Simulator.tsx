import { useEffect, useRef, useState } from "react";
import { Reveal, useScramble, useNow } from "../lib/motion";
import { fmtDateTime } from "../lib/certs";

type Phase = "locked" | "requesting" | "telegram" | "downloading" | "done";

interface LogLine {
  t: string;
  tag: "client" | "github" | "sqlite" | "telegram" | "n8n";
  msg: string;
}

interface TgMsg {
  from: "bot" | "admin";
  text: string;
  buttons?: { label: string; kind: "yes" | "no" }[];
  dimmed?: boolean;
}

const TAG_STYLE: Record<LogLine["tag"], string> = {
  client: "text-amber-glow border-amber-glow/40 bg-amber-glow/10",
  github: "text-teal-sig border-teal-sig/40 bg-teal-sig/10",
  sqlite: "text-mint-sig border-mint-sig/40 bg-mint-sig/10",
  telegram: "text-coral-sig border-coral-sig/40 bg-coral-sig/10",
  n8n: "text-ink-300 border-ink-500 bg-ink-700/40",
};

const BOOT_LOGS: LogLine[] = [
  { t: "", tag: "client", msg: "PDF Converter v0.9.4 գործարկվեց · Windows 11" },
  { t: "", tag: "client", msg: "POST /webhook/license/verify → 200 {status:\"expired\"}" },
  { t: "", tag: "n8n", msg: "Սերտիֆիկատ PDFC-7F3A-90BD-C21E · ժամկետը լրացել է (30/30 օր)" },
  { t: "", tag: "client", msg: "Ամբողջական ֆունկցիոնալը արգելափակված է · բացվեց LockWindow-ը" },
];

export default function Simulator() {
  const title = useScramble("PDF CONVERTER");
  const now = useNow();
  const [phase, setPhase] = useState<Phase>("locked");
  const [logs, setLogs] = useState<LogLine[]>(() =>
    BOOT_LOGS.map((l) => ({ ...l, t: fmtDateTime(new Date()) })),
  );
  const [tg, setTg] = useState<TgMsg[]>([
    { from: "bot", text: "Բարև, Admin։ PDFConverterBot-ը միացված է · հրամանները՝ /update /maintenance /ban /status" },
  ]);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const pushLog = (tag: LogLine["tag"], msg: string) =>
    setLogs((p) => [...p, { t: fmtDateTime(new Date()), tag, msg }]);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const reset = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setPhase("locked");
    setProgress(0);
    setLogs(BOOT_LOGS.map((l) => ({ ...l, t: fmtDateTime(new Date()) })));
    setTg([{ from: "bot", text: "Նստաշրջանը վերսկսվեց։ Կլիենտը կրկին արգելափակված է։" }]);
  };

  const startUpdate = () => {
    if (phase !== "locked") return;
    setPhase("requesting");
    pushLog("client", "Կոճակ «Թարմացնել» · POST /webhook/update/check");
    schedule(() => pushLog("github", "GET api.github.com/repos/acme/pdf-converter/releases/latest"), 500);
    schedule(() => pushLog("github", "200 · latest tag v1.1.0 · asset: PDFConverterSetup-1.1.0.exe"), 1050);
    schedule(() => pushLog("n8n", "version_compare: 1.1.0 > 0.9.4 → update_available = true"), 1500);
    schedule(() => pushLog("sqlite", "INSERT update_requests (…) → request_id = upd-84C2-77AF (pending)"), 2000);
    schedule(() => {
      pushLog("telegram", "sendMessage → Admin · inline keyboard [Այո / Ոչ]");
      setTg((p) => [
        ...p,
        {
          from: "bot",
          text: "🔔 Թարմացման հարցում\n\nՍերտիֆիկատ՝ PDFC-7F3A-90BD-C21E\nՕգտատեր՝ Արամ Մ.\nv0.9.4 → v1.1.0",
          buttons: [
            { label: "✅ Այո", kind: "yes" },
            { label: "❌ Ոչ", kind: "no" },
          ],
        },
      ]);
      setPhase("telegram");
    }, 2550);
  };

  const approve = (yes: boolean) => {
    if (phase !== "telegram") return;
    setTg((p) => [
      ...p.map((m) => (m.buttons ? { ...m, dimmed: true, buttons: undefined } : m)),
      { from: "admin", text: yes ? "✅ Այո" : "❌ Ոչ" },
    ]);
    if (yes) {
      pushLog("telegram", "callback_query: upd:approve:84C2-77AF · admin_id=***4821");
      schedule(() => pushLog("sqlite", "UPDATE update_requests SET status='approved'"), 350);
      schedule(() => pushLog("n8n", "Գեներացվեց 15 րոպե վավեր signed_url → ուղարկվեց կլիենտին"), 800);
      schedule(() => {
        pushLog("client", "Ներբեռնում PDFConverterSetup-1.1.0.exe (18.4 MB)…");
        setPhase("downloading");
        let p = 0;
        const iv = window.setInterval(() => {
          p = Math.min(100, p + 4 + Math.random() * 9);
          setProgress(Math.round(p));
          if (p >= 100) {
            window.clearInterval(iv);
            pushLog("client", "SHA-256 checksum ✓ · Inno Setup /SILENT · վերագործարկում…");
            pushLog("n8n", "Թարմացումն ավարտված է · կլիենտը կվերադառնա /license/verify");
            setPhase("done");
          }
        }, 130);
        timers.current.push(iv as unknown as number);
      }, 1300);
    } else {
      pushLog("sqlite", "UPDATE update_requests SET status='rejected'");
      pushLog("client", "409 · հարցումը մերժվեց admin-ի կողմից");
      setTg((p) => [...p, { from: "bot", text: "Մերժված է։ Կլիենտը ստացավ 409 · հավելվածը մնում է արգելափակված։" }]);
      schedule(() => setPhase("locked"), 700);
    }
  };

  const windowBody = () => {
    if (phase === "done") {
      return (
        <div className="rise-in flex flex-col items-center justify-center gap-4 px-8 py-10 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-mint-sig/60 bg-mint-sig/10">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7bd88f" strokeWidth="2.4">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="font-display text-xl font-bold text-ink-100">Թարմացումը տեղադրվեց</p>
            <p className="mt-1 font-mono text-[13px] text-teal-sig">v0.9.4 → v1.1.0</p>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-ink-300">
            Սերտիֆիկատը երկարացվեց ևս 30 օրով։ Հավելվածը կվերագործարկվի ավտոմատ։
          </p>
          <button
            onClick={reset}
            className="kbd-chip rounded-md px-4 py-2 font-mono text-[12px] text-ink-200"
          >
            ↺ Նվագարկել սցենարը նորից
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-4 px-8 py-8 text-center">
        <div className="float-soft grid h-14 w-14 place-items-center rounded-lg border border-amber-glow/40 bg-ink-800">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f2b441" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
            <path d="M14 2v6h6" strokeLinejoin="round" />
            <path d="M8 13h8M8 17h5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-ink-100">PDF Converter</p>
          <p className="mt-1.5 text-[13px] text-coral-sig">
            Սերտիֆիկատի ժամկետը լրացել է · օգտագործումն արգելափակված է
          </p>
        </div>

        <div className="w-full max-w-sm rounded-md border border-ink-700 bg-ink-900/70 px-4 py-3 text-left">
          <div className="flex items-center justify-between font-mono text-[11.5px]">
            <span className="text-ink-400">Հավելվածի անվանում</span>
            <span className="text-ink-100">PDF Converter</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[11.5px]">
            <span className="text-ink-400">Հավելվածի նոր տարբերակ</span>
            <span className="text-amber-glow">v1.0.0</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[11.5px]">
            <span className="text-ink-400">Certificate ID</span>
            <span className="text-ink-300">PDFC-7F3A-90BD-C21E</span>
          </div>
        </div>

        {phase === "downloading" ? (
          <div className="w-full max-w-sm">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
              <div className="shimmer-bar h-full rounded-full transition-[width] duration-150" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 font-mono text-[12px] text-ink-300 tabular">
              Ներբեռնում v1.1.0 · {progress}%
            </p>
          </div>
        ) : (
          <button
            onClick={startUpdate}
            disabled={phase !== "locked"}
            className={`group relative mt-1 w-full max-w-sm overflow-hidden rounded-md border px-6 py-3 font-display text-[15px] font-bold tracking-wide transition-all ${
              phase === "locked"
                ? "border-amber-glow bg-amber-glow text-ink-950 hover:bg-[#ffd070] hover:shadow-[0_0_34px_-6px_rgba(242,180,65,0.55)] active:scale-[0.985]"
                : "cursor-wait border-ink-600 bg-ink-800 text-ink-300"
            }`}
          >
            {phase === "locked" ? (
              <span className="flex items-center justify-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v12M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Թարմացնել
              </span>
            ) : phase === "requesting" ? (
              <span className="flex items-center justify-center gap-2.5">
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
                </svg>
                Հարցումն ուղարկվում է…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-coral-sig" />
                Սպասում է admin-ի հաստատմանը…
              </span>
            )}
          </button>
        )}
        <p className="font-mono text-[10.5px] text-ink-500">
          Թարմացումը կատարվում է n8n → GitHub Private Repo → Telegram հաստատում
        </p>
      </div>
    );
  };

  return (
    <header className="relative mx-auto max-w-7xl px-5 pb-16 pt-28 sm:px-8 lg:pt-32">
      <div className="grid items-end gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <p className="font-mono text-[12px] tracking-[0.22em] text-teal-sig">
            // ՃԱՐՏԱՐԱՊԵՏԱԿԱՆ ԲԼՈՒՓՐԻՆԹ · PYTHON + n8n + TELEGRAM + SQLITE
          </p>
          <h1 className="mt-4 font-display text-[13vw] font-bold leading-[0.95] tracking-tight text-ink-100 sm:text-6xl lg:text-[76px]">
            {title || "PDF CONVERTER"}
          </h1>
          <p className="mt-4 font-display text-lg font-semibold text-amber-glow sm:text-xl">
            Լիցենզավորում · Թարմացում · Վերահսկողություն
          </p>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-300">
            Production-ready համակարգ Python Desktop հավելվածի համար՝ <span className="text-ink-100">30-օրյա ստորագրված
            սերտիֆիկատներ</span>, GitHub Private Repo-ից թարմացումներ <span className="text-ink-100">n8n</span>-ի միջոցով,
            և ամբողջական վերահսկողություն <span className="text-ink-100">Telegram Bot</span>-ով՝ maintenance, ban և
            update հաստատումներ։ Ստորև՝ կենդանի սցենարը, որը կարող եք անցնել քայլ առ քայլ։
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["n8n self-hosted", "GitHub Private Repo", "Telegram Bot API", "SQLite", "Ed25519", "PyInstaller"].map((c) => (
              <span key={c} className="rounded-md border border-ink-600 bg-ink-850/80 px-2.5 py-1 font-mono text-[11px] text-ink-300 transition-colors hover:border-teal-sig/50 hover:text-teal-sig">
                {c}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150} className="lg:col-span-5">
          <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-ink-700 bg-ink-850 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex gap-1.5">
                <i className="h-3 w-3 rounded-full bg-coral-sig/80" />
                <i className="h-3 w-3 rounded-full bg-amber-glow/80" />
                <i className="h-3 w-3 rounded-full bg-mint-sig/80" />
              </span>
              <span className="font-mono text-[12px] text-ink-300">PDF Converter — desktop client</span>
            </div>
            <span className="rounded-sm border border-coral-sig/50 bg-coral-sig/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-coral-sig">
              LICENSE LOCK
            </span>
          </div>
          <div className="rounded-b-lg rounded-tr-lg border border-ink-700 bg-ink-900/85 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]">
            {windowBody()}
          </div>
        </Reveal>
      </div>

      {/* n8n console + telegram — interlocked below */}
      <div className="mt-10 grid gap-5 lg:grid-cols-12">
        <Reveal delay={100} className="lg:col-span-7">
          <div className="card-frame overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850 px-4 py-2">
              <span className="font-mono text-[12px] text-ink-300">n8n · webhook console</span>
              <span className="flex items-center gap-2 font-mono text-[10.5px] text-mint-sig">
                <i className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint-sig" />
                online · {fmtDateTime(now)}
              </span>
            </div>
            <div ref={consoleRef} className="h-44 overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-[1.9]">
              {logs.map((l, i) => (
                <div key={i} className="rise-in flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-ink-500 tabular">{l.t}</span>
                  <span className={`rounded-sm border px-1.5 text-[9.5px] uppercase tracking-wider ${TAG_STYLE[l.tag]}`}>{l.tag}</span>
                  <span className="text-ink-200">{l.msg}</span>
                </div>
              ))}
              {phase !== "done" && <span className="cursor-blink" />}
            </div>
          </div>
        </Reveal>

        <Reveal delay={220} className="lg:col-span-5">
          <div className="card-frame overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850 px-4 py-2">
              <div className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-sig/15 font-mono text-[10px] font-semibold text-teal-sig">PC</span>
                <div>
                  <p className="font-mono text-[12px] leading-tight text-ink-100">PDFConverterBot</p>
                  <p className="font-mono text-[10px] leading-tight text-ink-400">admin chat · -100***4821</p>
                </div>
              </div>
              <span className="font-mono text-[10.5px] text-ink-400">Telegram</span>
            </div>
            <div className="flex max-h-64 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
              {tg.map((m, i) => (
                <div key={i} className={`rise-in max-w-[88%] rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed ${
                  m.from === "bot"
                    ? "self-start border-ink-700 bg-ink-800 text-ink-200"
                    : "self-end border-teal-sig/40 bg-teal-sig/10 text-ink-100"
                } ${m.dimmed ? "opacity-55" : ""}`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                  {m.buttons && !m.dimmed && (
                    <div className="mt-2.5 flex gap-2">
                      {m.buttons.map((b) => (
                        <button
                          key={b.label}
                          onClick={() => approve(b.kind === "yes")}
                          className={`rounded-md border px-3 py-1.5 font-mono text-[11.5px] transition-all hover:-translate-y-0.5 ${
                            b.kind === "yes"
                              ? "border-mint-sig/50 bg-mint-sig/10 text-mint-sig hover:bg-mint-sig/20"
                              : "border-coral-sig/50 bg-coral-sig/10 text-coral-sig hover:bg-coral-sig/20"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {phase === "telegram" && (
                <p className="self-start font-mono text-[10.5px] text-amber-glow">
                  ← սեղմեք «Այո» կամ «Ոչ»՝ հոսքը շարունակելու համար
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* stats strip */}
      <Reveal delay={120} className="mt-14">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700 bg-ink-700 lg:grid-cols-4">
          {[
            ["30 օր", "սերտիֆիկատի վավերականություն", "text-amber-glow"],
            ["6 endpoint", "n8n webhook API", "text-teal-sig"],
            ["5 հրաման", "Telegram bot վերահսկողություն", "text-coral-sig"],
            ["5 աղյուսակ", "SQLite տվյալների բազա", "text-mint-sig"],
          ].map(([n, d, c]) => (
            <div key={n} className="group bg-ink-900/95 px-6 py-5 transition-colors hover:bg-ink-850">
              <p className={`font-display text-[26px] font-bold leading-none ${c}`}>{n}</p>
              <p className="mt-2 text-[12.5px] text-ink-300">{d}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </header>
  );
}
