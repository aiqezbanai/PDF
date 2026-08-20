import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";
import CodeBlock from "./CodeBlock";

interface TableDef {
  name: string;
  purpose: string;
  cols: [string, string, string][];
  sql: string;
}

export const TABLES: TableDef[] = [
  {
    name: "certificates",
    purpose: "Յուրաքանչյուր օգտատիրոջ 30-օրյա ստորագրված լիցենզիան։ status-ը հաշվարկվում է verify-ի ժամանակ՝ expires_at-ից, իսկ revoked-ը նշվում է admin-ի կողմից։",
    cols: [
      ["certificate_id", "TEXT UNIQUE", "PDFC-XXXX-XXXX-XXXX ձևաչափ"],
      ["user_name", "TEXT", "օգտատիրոջ անունը"],
      ["telegram_chat_id", "TEXT", "օպցիոնալ կապ Telegram-ի հետ"],
      ["fingerprint", "TEXT", "սարքի hash (24 նիշ)"],
      ["issued_at / expires_at", "TEXT (ISO8601)", "թողարկում և +30 օր"],
      ["status", "TEXT CHECK", "active | revoked"],
      ["signature", "TEXT", "Ed25519 ստորագրություն (Base64)"],
    ],
    sql: `CREATE TABLE certificates (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id   TEXT UNIQUE NOT NULL,          -- PDFC-7F3A-90BD-C21E
  user_name        TEXT NOT NULL,
  telegram_chat_id TEXT,
  fingerprint      TEXT,                          -- սարքի եզակի hash
  issued_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  expires_at       TEXT NOT NULL,                 -- issued_at + 30 օր
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','revoked')),
  signature        TEXT NOT NULL                  -- Ed25519, Base64
);

CREATE INDEX idx_cert_id ON certificates(certificate_id);`,
  },
  {
    name: "bans",
    purpose: "Արգելափակումներ՝ ըստ Certificate ID-ի, ցանկալի ժամկետով։ Մեկ սերտիֆիկատը կարող է ունենալ պատմության մի քանի գրառում, ակտիվ է միայն is_active = 1-ը։",
    cols: [
      ["certificate_id", "TEXT FK", "կապ certificates-ի հետ"],
      ["reason", "TEXT", "արգելափակման պատճառը"],
      ["started_at / until", "TEXT (ISO8601)", "մեկնարկ և ավարտ"],
      ["duration_minutes", "INTEGER", "30 րոպե … 5 օր"],
      ["is_active", "INTEGER", "1 = ակտիվ, 0 = հանված"],
    ],
    sql: `CREATE TABLE bans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id   TEXT NOT NULL REFERENCES certificates(certificate_id),
  reason           TEXT,
  started_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  until            TEXT NOT NULL,                 -- started_at + տևողություն
  duration_minutes INTEGER NOT NULL,
  is_active        INTEGER NOT NULL DEFAULT 1
);

-- ակտիվ ban-ի արագ որոնում verify-ի ժամանակ
CREATE INDEX idx_bans_active
  ON bans(certificate_id, is_active, until);

-- մեկ սերտիֆիկատի համար միաժամանակ միայն մեկ ակտիվ ban
CREATE UNIQUE INDEX idx_bans_one_active
  ON bans(certificate_id) WHERE is_active = 1;`,
  },
  {
    name: "maintenance",
    purpose: "Գլոբալ սպասարկման ռեժիմ բոլոր կլիենտների համար։ /maintenance on <տևողություն> հրամանը ստեղծում է նոր գրառում, /maintenance off-ը՝ անջատում։",
    cols: [
      ["started_at / until", "TEXT (ISO8601)", "պատուհանի սահմանները"],
      ["minutes", "INTEGER", "10 | 15 | 20 | 25 | 30 | 60 | 120 | 180"],
      ["is_active", "INTEGER", "1 = սպասարկումը միացված է"],
      ["note", "TEXT", "admin-ի մեկնաբանությունը"],
    ],
    sql: `CREATE TABLE maintenance (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  until      TEXT NOT NULL,
  minutes    INTEGER NOT NULL
             CHECK (minutes IN (10,15,20,25,30,60,120,180)),
  is_active  INTEGER NOT NULL DEFAULT 1,
  note       TEXT
);

CREATE INDEX idx_maint_active ON maintenance(is_active, until);`,
  },
  {
    name: "update_requests",
    purpose: "Թարմացման հարցումների կյանքի ցիկլը՝ pending → approved/rejected։ Կլիենտը polling է անում /update/status-ով, admin-ը հաստատում է Telegram-ով։",
    cols: [
      ["request_id", "TEXT UNIQUE", "upd-XXXX-XXXX"],
      ["certificate_id", "TEXT FK", "հարցնող օգտատերը"],
      ["from_version → to_version", "TEXT", "0.9.4 → 1.1.0"],
      ["chat_id", "TEXT", "admin chat՝ հաստատման համար"],
      ["status", "TEXT CHECK", "pending | approved | rejected"],
    ],
    sql: `CREATE TABLE update_requests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id     TEXT UNIQUE NOT NULL,            -- upd-84C2-77AF
  certificate_id TEXT NOT NULL REFERENCES certificates(certificate_id),
  from_version   TEXT NOT NULL,
  to_version     TEXT NOT NULL,
  chat_id        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX idx_upd_pending
  ON update_requests(status, created_at);`,
  },
  {
    name: "app_versions",
    purpose: "GitHub Releases-ի քեշը n8n-ի կողմից (Schedule Trigger-ով թարմացվում է 15 րոպեն մեկ), որպեսզի verify-ն արագ պատասխանի՝ առանց ամեն անգամ GitHub կանչելու։",
    cols: [
      ["version", "TEXT PK", "semver՝ 1.1.0"],
      ["download_url", "TEXT", "asset-ի հղումը"],
      ["sha256", "TEXT", "ինստալյատորի checksum"],
      ["notes", "TEXT", "թողարկման նշումներ"],
      ["released_at", "TEXT (ISO8601)", "հրապարակման պահը"],
    ],
    sql: `CREATE TABLE app_versions (
  version      TEXT PRIMARY KEY,                  -- sync՝ GitHub Release-ից
  download_url TEXT NOT NULL,
  sha256       TEXT NOT NULL,
  notes        TEXT,
  released_at  TEXT NOT NULL
);

-- ամենավերջին տարբերակը մեկ հարցումով
CREATE VIEW latest_version AS
  SELECT * FROM app_versions
  ORDER BY released_at DESC LIMIT 1;`,
  },
];

export default function Database() {
  const [idx, setIdx] = useState(0);
  const t = TABLES[idx];

  return (
    <section id="db" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="02"
        title="Տվյալների բազա · SQLite"
        kicker="ՄԵԿ ՖԱՅԼ · ՀԻՆԳ ԱՂՅՈՒՍԱԿ · WAL ՌԵԺԻՄ"
        desc="Ամբողջ վիճակը՝ սերտիֆիկատներ, ban-եր, maintenance և թարմացման հարցումներ, ապրում է մեկ SQLite ֆայլում՝ n8n-ի կողքին։ Միացրեք WAL ռեժիմը (PRAGMA journal_mode=WAL)՝ զուգահեռ ընթերցում/գրում ստանալու համար։"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <div className="flex flex-col gap-2">
            {TABLES.map((tb, i) => (
              <button
                key={tb.name}
                onClick={() => setIdx(i)}
                className={`group flex items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-all ${
                  i === idx
                    ? "border-mint-sig/60 bg-mint-sig/[0.07] shadow-[0_0_28px_-14px_rgba(123,216,143,0.5)]"
                    : "border-ink-700 bg-ink-850/60 hover:border-ink-500 hover:bg-ink-850"
                }`}
              >
                <span>
                  <span className={`font-mono text-[14px] font-semibold ${i === idx ? "text-mint-sig" : "text-ink-100"}`}>
                    {tb.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-400">{tb.cols.length} սյունակ</span>
                </span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={i === idx ? "#7bd88f" : "#5a6a85"} strokeWidth="2"
                  className={`transition-transform ${i === idx ? "translate-x-0.5" : "group-hover:translate-x-0.5"}`}
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
            <div className="mt-3 rounded-lg border border-ink-700 bg-ink-850/60 p-4">
              <p className="font-mono text-[10.5px] tracking-[0.18em] text-ink-400">ԽՈՐՀՈՒՐԴ · PRODUCTION</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
                Ավելացրեք n8n Schedule Trigger (ամեն գիշեր 03:00)՝ <code className="font-mono text-mint-sig">.backup</code> ֆայլի
                պատճեն և 30 օրվա վաղեմության մաքրում։ Օգտատերերի աճի դեպքում SQLite-ը հեշտությամբ միգրացվում է PostgreSQL
                n8n-ի նույն node-երով։
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} className="lg:col-span-8">
          <div key={t.name} className="rise-in">
            <div className="card-frame rounded-lg p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-mono text-[17px] font-semibold text-mint-sig">{t.name}</h3>
                <span className="rounded-sm border border-ink-600 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                  table
                </span>
              </div>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-300">{t.purpose}</p>
              <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {t.cols.map(([c, ty, note]) => (
                  <div key={c} className="flex items-baseline gap-2 rounded-md border border-ink-700/70 bg-ink-900/60 px-3 py-2">
                    <code className="font-mono text-[11.5px] text-ink-100">{c}</code>
                    <code className="ml-auto shrink-0 font-mono text-[10px] text-teal-sig">{ty}</code>
                    <span className="hidden text-[11px] text-ink-400 xl:inline">· {note}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <CodeBlock code={t.sql} lang="sql" filename={`schema_${t.name}.sql`} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
