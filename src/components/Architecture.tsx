import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";

type NodeId = "client" | "n8n" | "github" | "telegram" | "sqlite";

const NODE_INFO: Record<NodeId, { title: string; role: string; points: string[]; chips: string[]; color: string }> = {
  client: {
    title: "PDF Converter · Python",
    role: "Desktop կլիենտ (Windows / macOS)",
    points: [
      "Մեկնարկին և ժամը մեկ անգամ հարցում է n8n /license/verify endpoint-ը",
      "Ed25519 բաց բանալիով ստուգում է սերտիֆիկատի ստորագրությունը (offline պաշտպանություն)",
      "Ըստ պատասխանի՝ բացում է LockWindow, MaintenanceScreen կամ BanScreen",
      "Փաթեթավորվում է PyInstaller-ով · բանալիները ներդրվում են build-ի մեջ",
    ],
    chips: ["requests", "cryptography", "customtkinter", "packaging", "PyInstaller"],
    color: "#f2b441",
  },
  n8n: {
    title: "n8n · Օրկեստրացիա",
    role: "Self-hosted ավտոմատացման միջուկ",
    points: [
      "6 webhook endpoint կլիենտի համար (verify, activate, update/check, request, status, ping)",
      "GitHub API՝ releases/latest ստուգում PAT-ով, տարբերակների համեմատում Code node-ում",
      "Telegram Bot API՝ հաստատումներ, inline keyboard-ներ, callback_query մշակում",
      "SQLite node-եր՝ read/write · signed URL գեներացիա 15 րոպե վավերականությամբ",
    ],
    chips: ["Webhook", "HTTP Request", "Code", "SQLite", "Telegram", "Schedule Trigger"],
    color: "#45d0b8",
  },
  github: {
    title: "GitHub · Private Repo",
    role: "Տարբերակների միակ աղբյուր (single source of truth)",
    points: [
      "Յուրաքանչյուր ռելիզ = նոր տարբերակ · asset = .exe ինստալյատոր",
      "n8n-ը կարդում է API-ով՝ read-only Personal Access Token-ով",
      "CI (GitHub Actions)՝ build → checksum → release հրապարակում",
      "Պահեստային տարբերակների պատմություն՝ rollback-ի համար",
    ],
    chips: ["releases/latest", "PAT (read-only)", "Actions CI", "SHA-256 assets"],
    color: "#8ab8f0",
  },
  telegram: {
    title: "Telegram · Bot",
    role: "Admin-ի հեռակա վերահսկողության վահանակ",
    points: [
      "/update — թարմացման հաստատում [Այո / Ոչ] inline կոճակներով",
      "/maintenance — սպասարկում 10 րոպեից մինչև 3 ժամ [On / Off]",
      "/ban — օգտատիրոջ արգելափակում ըստ Certificate ID՝ ժամկետով",
      "Սպիտակ ցուցակ՝ միայն admin chat_id-ն է ընդունվում",
    ],
    chips: ["Bot API", "callback_query", "inline_keyboard", "chat_id whitelist"],
    color: "#f0655a",
  },
  sqlite: {
    title: "SQLite · Տվյալների բազա",
    role: "Մեկ ֆայլ՝ ամբողջ վիճակը",
    points: [
      "5 աղյուսակ՝ certificates, bans, maintenance, update_requests, app_versions",
      "Ինդեքսներ certificate_id-ի և is_active կարգավիճակների վրա",
      "Nightly backup workflow (n8n Schedule Trigger → ֆայլի պատճեն)",
      "Production-ում մեծ ծավալի դեպքում՝ PostgreSQL-ի միգրացիայի ճանապարհ",
    ],
    chips: ["certificates", "bans", "maintenance", "update_requests", "WAL mode"],
    color: "#7bd88f",
  },
};

const EDGES: { id: string; d: string; color: string; label: string; labelPos: [number, number]; nodes: NodeId[] }[] = [
  {
    id: "e1",
    d: "M 240 235 L 330 235",
    color: "#f2b441",
    label: "verify · update · activate",
    labelPos: [285, 218],
    nodes: ["client", "n8n"],
  },
  {
    id: "e2",
    d: "M 592 175 C 640 150, 650 110, 682 88",
    color: "#8ab8f0",
    label: "releases/latest",
    labelPos: [655, 118],
    nodes: ["n8n", "github"],
  },
  {
    id: "e3",
    d: "M 592 290 C 645 320, 650 360, 682 382",
    color: "#f0655a",
    label: "հարցումներ ↔ հրամաններ",
    labelPos: [648, 348],
    nodes: ["n8n", "telegram"],
  },
  {
    id: "e4",
    d: "M 460 322 L 460 378",
    color: "#7bd88f",
    label: "read / write",
    labelPos: [496, 355],
    nodes: ["n8n", "sqlite"],
  },
];

function NodeBox({
  id,
  x,
  y,
  w,
  h,
  title,
  sub,
  color,
  active,
  onClick,
  icon,
}: {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  color: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      aria-label={title}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={active ? "rgba(29,39,54,0.98)" : "rgba(19,26,37,0.92)"}
        stroke={color}
        strokeWidth={active ? 2 : 1.1}
        strokeOpacity={active ? 1 : 0.55}
        style={{ transition: "all .25s", filter: active ? `drop-shadow(0 0 14px ${color}55)` : "none" }}
      />
      <g transform={`translate(${x + 16}, ${y + (h - 26) / 2})`}>{icon}</g>
      <text x={x + 54} y={y + h / 2 - 4} fill="#e4eaf4" fontSize="14.5" fontWeight="700" fontFamily="Space Grotesk, Noto Sans Armenian, sans-serif">
        {title}
      </text>
      <text x={x + 54} y={y + h / 2 + 15} fill="#8494ae" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
        {sub}
      </text>
    </g>
  );
}

export default function Architecture() {
  const [sel, setSel] = useState<NodeId>("n8n");
  const info = NODE_INFO[sel];

  return (
    <section id="arch" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="01"
        title="Համակարգի արխիտեկտուրա"
        kicker="ՀԻՆԳ ՀԱՆԳՈՒՅՑ · ՄԵԿ ՃՇՄԱՐՏՈՒԹՅՈՒՆ՝ n8n"
        desc="Կլիենտը երբեք ուղիղ չի խոսում GitHub-ի կամ Telegram-ի հետ. ամբողջ տրամաբանությունը կենտրոնացված է n8n-ում, իսկ կլիենտը ստանում է միայն վերջնական որոշումը՝ ok / expired / banned / maintenance / update։ Սեղմեք հանգույցների վրա՝ դերը տեսնելու համար։"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="card-frame rounded-lg p-3 sm:p-5">
            <svg viewBox="0 0 920 470" className="h-auto w-full">
              <defs>
                <marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                  <path d="M0,0 L9,4.5 L0,9" fill="none" stroke="context-stroke" strokeWidth="1.4" />
                </marker>
              </defs>

              {EDGES.map((e) => {
                const hot = e.nodes.includes(sel);
                return (
                  <g key={e.id}>
                    <path
                      d={e.d}
                      fill="none"
                      stroke={e.color}
                      strokeWidth={hot ? 2.4 : 1.3}
                      strokeOpacity={hot ? 0.95 : 0.35}
                      strokeDasharray="7 6"
                      className="anim-dash"
                      markerEnd="url(#arr)"
                      style={{ transition: "all .25s" }}
                    />
                    <text
                      x={e.labelPos[0]}
                      y={e.labelPos[1]}
                      textAnchor="middle"
                      fontSize="10.5"
                      fill={hot ? e.color : "#5a6a85"}
                      fontFamily="JetBrains Mono, monospace"
                      style={{ transition: "fill .25s" }}
                    >
                      {e.label}
                    </text>
                  </g>
                );
              })}

              <NodeBox
                id="client" x={28} y={175} w={212} h={120}
                title="PDF Converter" sub="python · desktop"
                color={NODE_INFO.client.color} active={sel === "client"} onClick={() => setSel("client")}
                icon={
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f2b441" strokeWidth="1.7">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" strokeLinecap="round" />
                  </svg>
                }
              />
              <NodeBox
                id="n8n" x={330} y={130} w={262} h={192}
                title="n8n" sub="webhooks · logic · sqlite"
                color={NODE_INFO.n8n.color} active={sel === "n8n"} onClick={() => setSel("n8n")}
                icon={
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#45d0b8" strokeWidth="1.7">
                    <circle cx="5" cy="12" r="2.4" />
                    <circle cx="19" cy="5.5" r="2.4" />
                    <circle cx="19" cy="18.5" r="2.4" />
                    <path d="M7.2 11 16.8 6.3M7.2 13l9.6 4.7" strokeLinecap="round" />
                  </svg>
                }
              />
              <NodeBox
                id="github" x={682} y={20} w={212} h={110}
                title="GitHub" sub="private repo · releases"
                color={NODE_INFO.github.color} active={sel === "github"} onClick={() => setSel("github")}
                icon={
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8ab8f0" strokeWidth="1.7">
                    <circle cx="6" cy="5" r="2.4" />
                    <circle cx="6" cy="19" r="2.4" />
                    <circle cx="18" cy="9" r="2.4" />
                    <path d="M6 7.5v9M18 11.5c0 4-4 3.5-8 4.5" strokeLinecap="round" />
                  </svg>
                }
              />
              <NodeBox
                id="telegram" x={682} y={330} w={212} h={110}
                title="Telegram Bot" sub="admin · /commands"
                color={NODE_INFO.telegram.color} active={sel === "telegram"} onClick={() => setSel("telegram")}
                icon={
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f0655a" strokeWidth="1.7">
                    <path d="M21.5 4.5 2.8 11.6l5.6 2 2.2 5.9 3.2-3.6 5.4 4z" strokeLinejoin="round" />
                  </svg>
                }
              />
              <NodeBox
                id="sqlite" x={354} y={378} w={212} h={80}
                title="SQLite" sub="5 tables · 1 file"
                color={NODE_INFO.sqlite.color} active={sel === "sqlite"} onClick={() => setSel("sqlite")}
                icon={
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7bd88f" strokeWidth="1.7">
                    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
                    <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
                  </svg>
                }
              />
            </svg>
          </div>

          <Reveal delay={100} className="mt-6">
            <p className="mb-3 font-mono text-[11px] tracking-[0.18em] text-ink-400">ԿԼԻԵՆՏԻ ԲԱՑԱՀԱՅՏՎԱԾ ENDPOINT-ՆԵՐ</p>
            <div className="overflow-hidden rounded-lg border border-ink-700">
              {[
                ["POST", "/webhook/license/verify", "ամենժամյա ստուգում՝ վերադարձնում է ամբողջ վիճակը", "text-amber-glow"],
                ["POST", "/webhook/license/activate", "սերտիֆիկատի կապում սարքի հետ (fingerprint)", "text-amber-glow"],
                ["POST", "/webhook/update/check", "ընթացիկ տարբերակի համեմատում GitHub-ի հետ", "text-teal-sig"],
                ["POST", "/webhook/update/request", "թարմացման հարցում → Telegram հաստատում", "text-teal-sig"],
                ["GET", "/webhook/update/status", "polling՝ հաստատվե՞լ է արդյոք հարցումը", "text-teal-sig"],
                ["GET", "/webhook/system/ping", "maintenance / ban արագ ստուգում", "text-coral-sig"],
              ].map(([m, p, d, c], i) => (
                <div
                  key={p}
                  className={`group flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-ink-850 ${i !== 0 ? "border-t border-ink-700/70" : ""}`}
                >
                  <span className={`w-12 font-mono text-[11px] font-semibold ${c}`}>{m}</span>
                  <code className="font-mono text-[12.5px] text-ink-100 transition-transform group-hover:translate-x-1">{p}</code>
                  <span className="ml-auto hidden text-[12px] text-ink-400 md:block">{d}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </Reveal>

        <Reveal delay={150} className="lg:col-span-5">
          <div className="card-frame sticky top-24 rounded-lg p-6" key={sel}>
            <div className="rise-in">
              <p className="font-mono text-[10.5px] tracking-[0.2em] text-ink-400">ԸՆՏՐՎԱԾ ՀԱՆԳՈՒՅՑ</p>
              <h3 className="mt-2 font-display text-[22px] font-bold" style={{ color: info.color }}>
                {info.title}
              </h3>
              <p className="mt-1 text-[13px] text-ink-300">{info.role}</p>
              <ul className="mt-5 space-y-3">
                {info.points.map((p, i) => (
                  <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-ink-200">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: info.color }} />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {info.chips.map((c) => (
                  <span key={c} className="rounded border border-ink-600 bg-ink-850 px-2 py-0.5 font-mono text-[10.5px] text-ink-300">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
