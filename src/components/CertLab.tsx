import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";
import { generateCert, fmtDate, daysLeft, type CertRecord } from "../lib/certs";

const LIFECYCLE = [
  { day: "Օր 0", title: "Թողարկում", desc: "Admin-ը ստեղծում է սերտիֆիկատը /newcert-ով՝ Ed25519 ստորագրությամբ", color: "#8ab8f0" },
  { day: "Օր 1–27", title: "Ակտիվ օգտագործում", desc: "Ժամը մեկ verify · ամեն ինչ ok · days_left-ը ցուցադրվում է հավելվածում", color: "#7bd88f" },
  { day: "Օր 28–29", title: "Նախազգուշացում", desc: "Schedule workflow-ը Telegram-ով հիշեցնում է օգտատիրոջը և admin-ին", color: "#f2b441" },
  { day: "Օր 30", title: "Արգելափակում", desc: "verify → expired · LockWindow՝ անվանում, նոր տարբերակ, «Թարմացնել» CTA", color: "#f0655a" },
  { day: "Օր 30+", title: "Թարմացում", desc: "GitHub-ից նոր տարբերակ → սերտիֆիկատը երկարացվում է ևս 30 օրով", color: "#45d0b8" },
];

export default function CertLab() {
  const [name, setName] = useState("Արամ Մկրտչյան");
  const [certs, setCerts] = useState<CertRecord[]>([]);
  const [latest, setLatest] = useState<CertRecord | null>(null);
  const [stampKey, setStampKey] = useState(0);

  const issue = () => {
    const trimmed = name.trim() || "Անանուն օգտատեր";
    const c = generateCert(trimmed);
    setCerts((p) => [c, ...p].slice(0, 4));
    setLatest(c);
    setStampKey((k) => k + 1);
  };

  return (
    <section id="cert" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="06"
        title="30-օրյա սերտիֆիկատներ"
        kicker="ԹՈՂԱՐԿՈՒՄ → ԱԿՏԻՎՈՒԹՅՈՒՆ → ԱՐԳԵԼԱՓԱԿՈՒՄ → ԵՐԿԱՐԱՑՈՒՄ"
        desc="Սերտիֆիկատը JSON օբյեկտ է՝ ստորագրված server-ի մասնավոր բանալիով։ Կլիենտը կարող է ստուգել վավերականությունը նույնիսկ առանց ինտերնետի, բայց չի կարող կեղծել կամ երկարացնել ժամկետը։ Փորձարկեք թողարկումը ստորև (դեմո)։"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* generator */}
        <Reveal className="lg:col-span-5">
          <div className="card-frame rounded-lg p-6">
            <p className="font-mono text-[10.5px] tracking-[0.2em] text-ink-400">ԴԵՄՈ ԹՈՂԱՐԿՈՒՄ · /newcert</p>
            <label className="mt-4 block font-mono text-[11.5px] text-ink-300" htmlFor="cert-name">
              Օգտատիրոջ անունը
            </label>
            <input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && issue()}
              className="mt-2 w-full rounded-md border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-[14px] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-amber-glow/70"
              placeholder="Անուն Ազգանուն"
            />
            <button
              onClick={issue}
              className="group mt-4 flex w-full items-center justify-center gap-2.5 rounded-md border border-teal-sig/60 bg-teal-sig/10 px-5 py-3 font-display text-[14.5px] font-bold text-teal-sig transition-all hover:bg-teal-sig/20 hover:shadow-[0_0_30px_-10px_rgba(69,208,184,0.6)] active:scale-[0.985]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="transition-transform group-hover:rotate-90">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Թողարկել 30-օրյա սերտիֆիկատ
            </button>

            <div className="mt-6">
              <p className="mb-2.5 font-mono text-[10.5px] tracking-[0.18em] text-ink-400">ԱՌԱՋԱԴՐՎԱԾ ՍԵՐՏԻՖԻԿԱՏՆԵՐ</p>
              {certs.length === 0 ? (
                <p className="rounded-md border border-dashed border-ink-600 px-4 py-5 text-center text-[12.5px] text-ink-500">
                  Դեռ սերտիֆիկատ չի թողարկվել
                </p>
              ) : (
                <ul className="space-y-2">
                  {certs.map((c) => (
                    <li key={c.id} className="rise-in flex items-center justify-between rounded-md border border-ink-700 bg-ink-900/60 px-3.5 py-2.5 transition-colors hover:border-teal-sig/40">
                      <div>
                        <code className="font-mono text-[12px] text-teal-sig">{c.id}</code>
                        <p className="text-[11.5px] text-ink-400">{c.user}</p>
                      </div>
                      <span className="rounded-sm border border-mint-sig/40 bg-mint-sig/10 px-2 py-0.5 font-mono text-[10.5px] text-mint-sig">
                        {daysLeft(c.expiresAt)} օր
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Reveal>

        {/* certificate visual */}
        <Reveal delay={140} className="lg:col-span-7">
          <div className="card-frame relative overflow-hidden rounded-lg p-6 sm:p-8">
            {latest ? (
              <div key={latest.id} className="rise-in relative mx-auto max-w-lg rounded-lg border-2 border-amber-glow/50 bg-[#10161f] p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-2 rounded-md border border-amber-glow/20" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.3em] text-amber-glow">PDF CONVERTER</p>
                    <p className="mt-1 font-display text-[22px] font-bold text-ink-100">LICENSE CERTIFICATE</p>
                  </div>
                  <span className="rounded-sm border border-teal-sig/50 bg-teal-sig/10 px-2 py-1 font-mono text-[10px] text-teal-sig">
                    Ed25519 SIGNED
                  </span>
                </div>

                <div className="mt-6 space-y-2.5 font-mono text-[12.5px]">
                  <div className="flex justify-between gap-4 border-b border-ink-700/70 pb-2">
                    <span className="text-ink-400">CERTIFICATE ID</span>
                    <span className="text-amber-glow">{latest.id}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-ink-700/70 pb-2">
                    <span className="text-ink-400">ՕԳՏԱՏԵՐ</span>
                    <span className="text-ink-100">{latest.user}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-ink-700/70 pb-2">
                    <span className="text-ink-400">ԹՈՂԱՐԿՎԵԼ Է</span>
                    <span className="text-ink-100 tabular">{fmtDate(latest.issuedAt)}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-ink-700/70 pb-2">
                    <span className="text-ink-400">ՎԱՎԵՐ Է ՄԻՆՉԵՎ</span>
                    <span className="text-coral-sig tabular">{fmtDate(latest.expiresAt)} · {daysLeft(latest.expiresAt)} օր</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-ink-700/70 pb-2">
                    <span className="text-ink-400">FINGERPRINT</span>
                    <span className="text-ink-300">{latest.fingerprint}</span>
                  </div>
                  <div className="pt-1">
                    <span className="block text-ink-400">SIGNATURE</span>
                    <span className="mt-1 block break-all text-[10.5px] leading-relaxed text-ink-500">{latest.signature}</span>
                  </div>
                </div>

                <div key={stampKey} className="stamp-in pointer-events-none absolute right-5 top-24 rounded-md border-[3px] border-mint-sig/80 px-3 py-1.5 text-center">
                  <p className="font-display text-[15px] font-bold leading-tight text-mint-sig/90">VALID</p>
                  <p className="font-mono text-[9px] tracking-[0.25em] text-mint-sig/80">30 DAYS</p>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[380px] place-items-center">
                <div className="text-center">
                  <svg className="mx-auto text-ink-500" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 4v16" />
                    <path d="M11.5 13h6M11.5 16h4" strokeLinecap="round" />
                  </svg>
                  <p className="mt-4 text-[14px] text-ink-400">Թողարկեք առաջին սերտիֆիկատը՝ ձևավորումը տեսնելու համար</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-500">certificate.json · ստորագրվում է n8n-ում</p>
                </div>
              </div>
            )}
          </div>

          {/* lifecycle */}
          <div className="mt-6">
            <p className="mb-3 font-mono text-[10.5px] tracking-[0.2em] text-ink-400">ԿՅԱՆՔԻ ՑԻԿԼԸ</p>
            <ol className="relative space-y-0">
              {LIFECYCLE.map((s, i) => (
                <li key={s.title} className="group relative flex gap-4 pb-6 last:pb-0">
                  {i < LIFECYCLE.length - 1 && (
                    <span className="absolute left-[9px] top-6 h-[calc(100%-14px)] w-px bg-ink-700" />
                  )}
                  <span
                    className="relative z-10 mt-1 h-[19px] w-[19px] shrink-0 rotate-45 border-2 transition-transform group-hover:scale-125"
                    style={{ borderColor: s.color, background: "#0f141d" }}
                  />
                  <div>
                    <p className="font-mono text-[10.5px]" style={{ color: s.color }}>{s.day}</p>
                    <p className="font-display text-[15px] font-bold text-ink-100">{s.title}</p>
                    <p className="mt-0.5 max-w-xl text-[12.5px] leading-relaxed text-ink-400">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
