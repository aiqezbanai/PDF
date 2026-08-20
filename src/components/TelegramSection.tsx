import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";

interface Cmd {
  cmd: string;
  args: string;
  desc: string;
  color: string;
  chat: { from: "admin" | "bot"; text: string; keys?: string[] }[];
}

const CMDS: Cmd[] = [
  {
    cmd: "/update",
    args: "(ինքնաշխատ՝ կլիենտի հարցումով)",
    desc: "Կլիենտի «Թարմացնել» կոճակը ստեղծում է հարցում, bot-ը admin-ին ուղարկում է [Այո / Ոչ] կոճակներով հաղորդագրություն։ Հաստատումից հետում կլիենտը ստանում է 15 րոպե վավեր signed_url։",
    color: "text-teal-sig border-teal-sig/40 bg-teal-sig/10",
    chat: [
      { from: "bot", text: "🔔 Թարմացման հարցում\n\nՍերտիֆիկատ՝ PDFC-7F3A-90BD-C21E\nՕգտատեր՝ Արամ Մ.\nv0.9.4 → v1.1.0", keys: ["✅ Այո", "❌ Ոչ"] },
      { from: "admin", text: "✅ Այո" },
      { from: "bot", text: "Հաստատված է ✔\nsigned_url-ը ուղարկվեց կլիենտին (վավեր՝ 15 րոպե)։" },
    ],
  },
  {
    cmd: "/maintenance",
    args: "on <տևողություն> | off",
    desc: "Գլոբալ սպասարկում բոլոր կլիենտների համար։ Տևողություններ՝ 10 | 15 | 20 | 25 | 30 րոպե, 1 | 2 | 3 ժամ։ Ակտիվ maintenance-ի դեպքում հավելվածը բացում է հետհաշվարկով էկրան։",
    color: "text-amber-glow border-amber-glow/40 bg-amber-glow/10",
    chat: [
      { from: "admin", text: "/maintenance on 30" },
      { from: "bot", text: "🛠 Maintenance միացված է\n\nՏևողություն՝ 30 րոպե\nԱվարտ՝ 14:32 (UTC)\nԲոլոր կլիենտները կտեսնեն սպասարկման էկրան։", keys: ["10 ր", "15 ր", "20 ր", "25 ր", "30 ր", "1 ժ", "2 ժ", "3 ժ", "OFF"] },
      { from: "admin", text: "/maintenance off" },
      { from: "bot", text: "Maintenance-ն անջատված է ✔ Կլիենտները կվերադառնան նորմալ ռեժիմի հաջորդ verify-ից։" },
    ],
  },
  {
    cmd: "/ban",
    args: "<certificate_id> <ժամկետ | no>",
    desc: "Ցանկացած օգտատիրոջ արգելափակում՝ ըստ Certificate ID-ի։ Ժամկետներ՝ 30min | 1hour | 2hour | 3hour | 5hour | 1day | 2day | 3day | 5day։ no արժեքը՝ ապաարգելափակում։",
    color: "text-coral-sig border-coral-sig/40 bg-coral-sig/10",
    chat: [
      { from: "admin", text: "/ban PDFC-7F3A-90BD-C21E 2hour" },
      { from: "bot", text: "⛔ Ban-ը ակտիվացվեց\n\nՍերտիֆիկատ՝ PDFC-7F3A-90BD-C21E\nՏևողություն՝ 2 ժամ\nԱվարտ՝ 15:47 (UTC)", keys: ["30min", "1hour", "2hour", "3hour", "5hour", "1day", "2day", "3day", "5day"] },
      { from: "admin", text: "/ban PDFC-7F3A-90BD-C21E no" },
      { from: "bot", text: "Ապաարգելափակված է ✔ is_active=0" },
    ],
  },
  {
    cmd: "/status",
    args: "—",
    desc: "Ամբողջ համակարգի վիճակը մեկ հաղորդագրությամբ՝ ակտիվ/լրացած սերտիֆիկատներ, ակտիվ ban-եր, maintenance, վերջին տարբերակ GitHub-ում։",
    color: "text-mint-sig border-mint-sig/40 bg-mint-sig/10",
    chat: [
      { from: "admin", text: "/status" },
      { from: "bot", text: "📊 Համակարգի վիճակը\n\nՍերտիֆիկատներ՝ 42 (ակտիվ 38)\nԱկտիվ ban-եր՝ 1\nMaintenance՝ անջատված\nՎերջին տարբերակ՝ v1.1.0 (GitHub)\nn8n uptime՝ 99.98%" },
    ],
  },
  {
    cmd: "/newcert",
    args: "<անուն ազգանուն>",
    desc: "Նոր 30-օրյա ստորագրված սերտիֆիկատի թողարկում։ Bot-ը վերադարձնում է certificate_id-ն ու ակտիվացման կոդը, որը օգտատերը մուտքագրում է հավելվածում։",
    color: "text-[#8ab8f0] border-[#8ab8f0]/40 bg-[#8ab8f0]/10",
    chat: [
      { from: "admin", text: "/newcert Արամ Մկրտչյան" },
      { from: "bot", text: "🎫 Սերտիֆիկատը թողարկվեց\n\nID՝ PDFC-9E21-44B7-A0D3\nՎավեր է մինչև՝ +30 օր\nԱկտիվացման կոդ՝ 8824-1907\nՍտորագրությունը՝ Ed25519 ✔" },
    ],
  },
];

export default function TelegramSection() {
  const [idx, setIdx] = useState(0);
  const c = CMDS[idx];

  return (
    <section id="telegram" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="05"
        title="Telegram Bot վերահսկողություն"
        kicker="ՀԻՆԳ ՀՐԱՄԱՆ · ՄԵԿ ADMIN · ՍՊԻՏԱԿ ՑՈՒՑԱԿ"
        desc="Bot-ը ընդունում է միայն մեկ chat_id (ADMIN_CHAT_ID env)։ Յուրաքանչյուր հրաման անցնում է parse → SQLite → հաստատում փուլերով, իսկ callback_query-ները մշակվում են առանձին workflow-ով։ Ընտրեք հրամանը՝ զրույցի օրինակը տեսնելու համար։"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="space-y-3">
            {CMDS.map((cmd, i) => (
              <button
                key={cmd.cmd}
                onClick={() => setIdx(i)}
                className={`w-full rounded-lg border px-5 py-4 text-left transition-all ${
                  i === idx
                    ? "border-coral-sig/50 bg-coral-sig/[0.05] shadow-[0_0_30px_-16px_rgba(240,101,90,0.6)]"
                    : "border-ink-700 bg-ink-850/60 hover:border-ink-500 hover:bg-ink-850"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className={`font-mono text-[16px] font-bold ${i === idx ? "text-coral-sig" : "text-ink-100"}`}>{cmd.cmd}</code>
                  <code className="font-mono text-[11px] text-ink-400">{cmd.args}</code>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{cmd.desc}</p>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={140} className="lg:col-span-5">
          <div className="card-frame sticky top-24 overflow-hidden rounded-lg" key={c.cmd}>
            <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-850 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-coral-sig/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0655a" strokeWidth="1.8">
                  <path d="M21.5 4.5 2.8 11.6l5.6 2 2.2 5.9 3.2-3.6 5.4 4z" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="font-mono text-[13px] font-semibold text-ink-100">PDFConverterBot</p>
                <p className="font-mono text-[10.5px] text-mint-sig">online · admin chat</p>
              </div>
              <span className="ml-auto rounded-sm border border-ink-600 px-2 py-0.5 font-mono text-[10px] text-ink-400">{c.cmd}</span>
            </div>
            <div className="rise-in flex min-h-[300px] flex-col gap-2.5 bg-[#0d1219] px-4 py-4">
              {c.chat.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-lg px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                    m.from === "admin"
                      ? "self-end rounded-br-sm border border-teal-sig/30 bg-teal-sig/[0.12] text-ink-100"
                      : "self-start rounded-bl-sm border border-ink-700 bg-ink-800 text-ink-200"
                  }`}
                >
                  <p className="whitespace-pre-line font-[450]">{m.text}</p>
                  {m.keys && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.keys.map((k) => (
                        <span key={k} className="kbd-chip cursor-default rounded px-2 py-1 font-mono text-[10.5px] text-ink-200">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="mt-auto self-center pt-2 font-mono text-[10px] text-ink-500">
                webhook mode · getUpdates-ի փոխարեն (n8n Telegram Trigger)
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
