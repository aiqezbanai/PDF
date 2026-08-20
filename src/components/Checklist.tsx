import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";
import CodeBlock from "./CodeBlock";

const GROUPS: { title: string; color: string; items: string[] }[] = [
  {
    title: "Անվտանգություն",
    color: "text-coral-sig",
    items: [
      "HTTPS/TLS բոլոր webhook-ների համար (Let's Encrypt · ոչ self-signed)",
      "GitHub PAT՝ read-only scope, պահված n8n credentials-ում, ոչ env-ում",
      "Telegram՝ միայն ADMIN_CHAT_ID սպիտակ ցուցակով",
      "Ed25519 մասնավոր բանալին միայն server-ում, հանրայինը՝ կլիենտի build-ում",
      "Replay-պաշտպանություն՝ ts + nonce + HMAC client → n8n հարցումներում",
      "Download հղումները՝ 15 րոպե վավեր HMAC signed_url-ով",
    ],
  },
  {
    title: "Հուսալիություն",
    color: "text-mint-sig",
    items: [
      "SQLite WAL ռեժիմ + nightly backup workflow (WF-08)",
      "Error workflow (WF-09) → անմիջապես Telegram alert",
      "Offline grace period կլիենտում (6 ժամ՝ վերջին ստորագրված պատասխանով)",
      "Retry՝ exponential backoff-ով n8n և GitHub կանչերի համար",
      "Ժամի ստուգում server-ից (կլիենտի ժամացույցի կեղծման դեմ)",
    ],
  },
  {
    title: "Թարմացումների անվտանգություն",
    color: "text-amber-glow",
    items: [
      "SHA-256 checksum պարտադիր ստուգում նախքան install-ը",
      "Նախորդ տարբերակի պահուստ՝ ավտոմատ rollback-ի համար",
      "Staging workflow՝ test սերտիֆիկատներով նախքան production",
      "Տարբերակների ֆիքսում․ երբեք «latest» production-ում",
    ],
  },
];

const COMPOSE = `services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:1.74
    restart: always
    ports:
      - "127.0.0.1:5678:5678"        # միայն localhost, TLS-ը՝ proxy-ից
    environment:
      - DB_TYPE=sqlite
      - GENERIC_TIMEZONE=Asia/Yerevan
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
      - LICENSE_PRIVATE_KEY=\${LICENSE_PRIVATE_KEY}
      - ADMIN_CHAT_ID=\${ADMIN_CHAT_ID}
      - URL_SIGN_SECRET=\${URL_SIGN_SECRET}
    volumes:
      - ./n8n_data:/home/node/.n8n

  caddy:                               # TLS termination + reverse proxy
    image: caddy:2
    restart: always
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  caddy_data:
`;

const ENV_EXAMPLE = `# .env — երբեք չcommit-արվի (gitignore)
GITHUB_PAT=ghp_xxxxReadOnLyxxxx          # repo read-only
TELEGRAM_BOT_TOKEN=7000000000:AAxxxx
ADMIN_CHAT_ID=-1001234567890
URL_SIGN_SECRET=64-random-hex-chars
LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMC4C..."
`;

const KEYGEN = `# Բանալիների զույգի գեներացիա (մեկ անգամ)
openssl genpkey -algorithm ed25519 -out license_priv.pem   # միայն n8n server
openssl pkey -in license_priv.pem -pubout -out license_pub.pem  # կլիենտի build
chmod 600 license_priv.pem
`;

export default function Checklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const all = GROUPS.flatMap((g) => g.items);
  const done = all.filter((i) => checked[i]).length;
  const pct = Math.round((done / all.length) * 100);

  const toggle = (item: string) => setChecked((p) => ({ ...p, [item]: !p[item] }));

  return (
    <section id="prod" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="07"
        title="Production-Ready թռիչքային ցուցակ"
        kicker="ՄԻՆՉԵՎ ԹՈՂԱՐԿՈՒՄ՝ ՆՇԵՔ ԲՈԼՈՐԸ"
        desc="Production-ը սկսվում է ոչ թե կոդից, այլ այս ցուցակից։ Նշեք կատարված կետերը՝ պատրաստվածությունը գնահատելու համար, և օգտագործեք deploy կոնֆիգուրացիան որպես մեկնարկ։"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="mb-5 flex items-center gap-4 rounded-lg border border-ink-700 bg-ink-850/70 px-5 py-4">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#222d3f" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="24" fill="none"
                  stroke={pct === 100 ? "#7bd88f" : "#f2b441"}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-mono text-[12px] font-semibold text-ink-100 tabular">{pct}%</span>
            </div>
            <div>
              <p className="font-display text-[17px] font-bold text-ink-100">
                {pct === 100 ? "Թռիչքի պատրաստ է 🚀" : `${done} / ${all.length} կետ կատարված`}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-400">
                {pct === 100
                  ? "Բոլոր կետերը նշված են — կարելի է թողարկել։"
                  : "Չնշված կետերը production-ում վերածվում են ինցիդենտների։"}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className={`mb-2.5 font-mono text-[11px] tracking-[0.2em] ${g.color}`}>{g.title.toUpperCase()}</p>
                <ul className="space-y-1.5">
                  {g.items.map((item) => {
                    const on = !!checked[item];
                    return (
                      <li key={item}>
                        <button
                          onClick={() => toggle(item)}
                          className={`flex w-full items-start gap-3 rounded-md border px-3.5 py-2.5 text-left transition-all ${
                            on
                              ? "border-mint-sig/40 bg-mint-sig/[0.06]"
                              : "border-ink-700 bg-ink-850/50 hover:border-ink-500"
                          }`}
                        >
                          <span
                            className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-sm border transition-all ${
                              on ? "border-mint-sig bg-mint-sig text-ink-950" : "border-ink-500"
                            }`}
                          >
                            {on && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className={`text-[13px] leading-relaxed transition-colors ${on ? "text-ink-300 line-through decoration-mint-sig/50" : "text-ink-200"}`}>
                            {item}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150} className="lg:col-span-5">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div>
              <p className="mb-2 text-[12.5px] text-ink-400">
                <span className="font-mono text-amber-glow">deploy ·</span> n8n-ը՝ Docker-ով, Caddy TLS proxy-ի հետևում, SQLite-ը volumes-ում։
              </p>
              <CodeBlock code={COMPOSE} lang="yaml" filename="docker-compose.yml" maxHeight={340} />
            </div>
            <div>
              <p className="mb-2 text-[12.5px] text-ink-400">
                <span className="font-mono text-coral-sig">գաղտնիքներ ·</span> բոլոր secrets-ը՝ առանձին .env ֆայլում։
              </p>
              <CodeBlock code={ENV_EXAMPLE} lang="bash" filename=".env.example" maxHeight={240} />
            </div>
            <div>
              <p className="mb-2 text-[12.5px] text-ink-400">
                <span className="font-mono text-teal-sig">բանալիներ ·</span> Ed25519 զույգը գեներացվում է մեկ անգամ։
              </p>
              <CodeBlock code={KEYGEN} lang="bash" filename="keygen.sh" maxHeight={200} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
