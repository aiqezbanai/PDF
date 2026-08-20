import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";
import CodeBlock from "./CodeBlock";

interface Block {
  filename: string;
  lang: "json" | "js" | "text";
  code: string;
  note: string;
}

interface Workflow {
  id: string;
  title: string;
  trigger: string;
  triggerColor: string;
  pipeline: string[];
  points: string[];
  blocks: Block[];
}

const WORKFLOWS: Workflow[] = [
  {
    id: "WF-01",
    title: "Լիցենզիայի ստուգում",
    trigger: "POST /webhook/license/verify",
    triggerColor: "text-amber-glow border-amber-glow/40 bg-amber-glow/10",
    pipeline: ["Webhook", "SQLite · certificate", "SQLite · active ban", "SQLite · maintenance", "SQLite · latest ver.", "Code · որոշում", "Respond"],
    points: [
      "Կլիենտը կանչում է մեկնարկին և ժամը մեկ՝ ուղարկելով certificate_id + fingerprint",
      "Չորս զուգահեռ SQLite SELECT՝ նվազագույն latency-ով",
      "Code node-ը վերադարձնում է մեկ վերջնական վիճակ. ամբողջ բիզնես-տրամաբանությունը server-ում է",
      "fingerprint-ի անհամապատասխանություն → status: wrong_machine (կլոնավորման պաշտպանություն)",
    ],
    blocks: [
      {
        filename: "webhook_node.json",
        lang: "json",
        note: "Webhook node-ի կարգավորումը․ պատասխանը գալիս է վերջին Respond node-ից։",
        code: `{
  "name": "License Verify",
  "type": "n8n-nodes-base.webhook",
  "webhookId": "license-verify",
  "parameters": {
    "httpMethod": "POST",
    "path": "license/verify",
    "responseMode": "responseNode",
    "options": {}
  }
}
`,
      },
      {
        filename: "determine_status.js",
        lang: "js",
        note: "Code node-ի տրամաբանությունը (ցուցադրվում է JS)․ կարգը կարևոր է՝ maintenance > revoked > ban > expired > ok։",
        code: `const cert   = $('Load Certificate').first().json;
const ban    = $('Active Ban').first().json;
const maint  = $('Maintenance Window').first().json;
const latest = $('Latest Version').first().json;

// 1) գլոբալ maintenance — բոլոր կլիենտների համար
if (maint && maint.is_active && new Date(maint.until) > new Date())
  return [{ json: { status: 'maintenance', until: maint.until } }];

// 2) չեղարկված սերտիֆիկատ
if (!cert || cert.status === 'revoked')
  return [{ json: { status: 'revoked' } }];

// 3) fingerprint — մեկ սերտիֆիկատ, մեկ սարք
if (cert.fingerprint && cert.fingerprint !== $('Webhook').first().json.body.fingerprint)
  return [{ json: { status: 'wrong_machine' } }];

// 4) ակտիվ ban՝ ժամկետով
if (ban && ban.is_active && new Date(ban.until) > new Date())
  return [{ json: { status: 'banned', until: ban.until, reason: ban.reason } }];

// 5) 30 օրը լրացել է → արգելափակում + նոր տարբերակի առաջարկ
if (new Date(cert.expires_at) <= new Date())
  return [{ json: { status: 'expired', latest_version: latest.version } }];

return [{ json: {
  status: 'ok',
  days_left: Math.ceil((new Date(cert.expires_at) - Date.now()) / 864e5),
  latest_version: latest.version,
}}];
`,
      },
    ],
  },
  {
    id: "WF-02",
    title: "30-օրյա սերտիֆիկատի թողարկում",
    trigger: "Telegram · /newcert Արամ Մ.",
    triggerColor: "text-coral-sig border-coral-sig/40 bg-coral-sig/10",
    pipeline: ["Telegram Trigger", "Code · ID + Ed25519 sign", "SQLite · INSERT", "Telegram · պատասխան"],
    points: [
      "Admin-ը Telegram-ով ստեղծում է սերտիֆիկատ՝ /newcert անուն ազգանուն",
      "ID՝ PDFC-XXXX-XXXX-XXXX, expires_at = now + 30 օր",
      "Ստորագրվում է Ed25519 մասնավոր բանալիով (միայն server-ում) — կլիենտը չի կարող կեղծել",
      "Օգտատերը ստանում է certificate.json ֆայլը կամ ակտիվացման կոդը",
    ],
    blocks: [
      {
        filename: "sign_certificate.js",
        lang: "js",
        note: "Code node (JS)․ մասնավոր բանալին՝ n8n environment-ում (N8N_BLOCK_ENV_ACCESS_IN_NODE=false)։",
        code: `const crypto = require('crypto');          // n8n Code node-ը թույլ է տալիս

const item = $input.first().json;          // { user_name, chat_id }
const now  = new Date();
const exp  = new Date(now.getTime() + 30 * 864e5);   // +30 օր

const block = () => crypto.randomBytes(2).toString('hex').toUpperCase();
const certificate_id = \`PDFC-\${block()}-\${block()}-\${block()}\`;

const payload = {
  certificate_id,
  issued_at:  now.toISOString(),
  expires_at: exp.toISOString(),
  fingerprint: "",                          // լրացվում է activate-ի ժամանակ
};

const privateKey = crypto.createPrivateKey($env.LICENSE_PRIVATE_KEY);
const signature  = crypto
  .sign(null, Buffer.from(JSON.stringify(payload)), privateKey)
  .toString('base64');

return [{ json: {
  ...payload, signature,
  user_name: item.user_name,
  chat_id:   item.chat_id,
}}];
`,
      },
    ],
  },
  {
    id: "WF-03",
    title: "Թարմացում GitHub-ից՝ Telegram հաստատմամբ",
    trigger: "POST /webhook/update/request + Telegram callback",
    triggerColor: "text-teal-sig border-teal-sig/40 bg-teal-sig/10",
    pipeline: ["Webhook · request", "SQLite · INSERT pending", "Telegram · [Այո / Ոչ]", "callback_query", "Switch", "SQLite · UPDATE", "signed_url"],
    points: [
      "Կլիենտի «Թարմացնել» կոճակը ստեղծում է pending հարցում և ստանում request_id",
      "Admin-ը Telegram-ում սեղմում է inline կոճակ → callback_query → Switch (approve/reject)",
      "Հաստատման դեպքում գեներացվում է 15 րոպե վավեր HMAC signed_url (asset-ի հղումը չի արտահոսում)",
      "Կլիենտը polling է անում /update/status-ը, ներբեռնում և ստուգում SHA-256-ը",
      "Երկրորդ workflow՝ /update/check. կարդում է app_versions (GitHub-ի 15-րոպեանոց քեշ)",
    ],
    blocks: [
      {
        filename: "telegram_approval.json",
        lang: "json",
        note: "Telegram node՝ inline keyboard-ով․ callback_data-ն կրում է գործողությունը և request_id-ն։",
        code: `{
  "name": "Ask Admin Approval",
  "type": "n8n-nodes-base.telegram",
  "parameters": {
    "resource": "message",
    "operation": "sendMessage",
    "chatId": "={{ $json.chat_id }}",
    "text": "=🔔 Թարմացման հարցում\\n{{ $json.certificate_id }}\\n{{ $json.from_version }} → {{ $json.to_version }}",
    "additionalFields": {
      "reply_markup": "{\\"inline_keyboard\\":[[{\\"text\\":\\"✅ Այո\\",\\"callback_data\\":\\"upd:approve:{{ $json.request_id }}\\"},{\\"text\\":\\"❌ Ոչ\\",\\"callback_data\\":\\"upd:reject:{{ $json.request_id }}\\"}]]}"
    }
  }
}
`,
      },
      {
        filename: "signed_url.js",
        lang: "js",
        note: "Code node (JS)․ download URL-ը վավեր է 15 րոպե՝ առանց GitHub PAT-ը կլիենտին տալու։",
        code: `const crypto = require('crypto');

const url = $json.download_url;            // GitHub release asset
const exp = Date.now() + 15 * 60 * 1000;   // 15 րոպե

const sig = crypto
  .createHmac('sha256', $env.URL_SIGN_SECRET)
  .update(url + exp)
  .digest('hex');

return [{ json: {
  download_url: url + '?expires=' + exp + '&sig=' + sig,
  sha256: $json.sha256,
}}];
`,
      },
    ],
  },
  {
    id: "WF-04",
    title: "Maintenance՝ միացնել / անջատել",
    trigger: "Telegram · /maintenance on 30 | /maintenance off",
    triggerColor: "text-coral-sig border-coral-sig/40 bg-coral-sig/10",
    pipeline: ["Telegram Trigger", "Code · parse", "Switch · on/off", "SQLite · upsert", "Telegram · տևողություններ"],
    points: [
      "Թույլատրված տևողություններ՝ 10 | 15 | 20 | 25 | 30 րոպե, 1 | 2 | 3 ժամ",
      "Միացնելիս maintenance աղյուսակում նոր գրառում is_active=1 և until=now+minutes",
      "Անջատելիս՝ is_active=0․ կլիենտները հաջորդ verify-ից ազատվում են",
      "Առաջին հաղորդագրությանը կից inline keyboard՝ տևողությունների ցանկով (առանց ձեռքով գրելու)",
    ],
    blocks: [
      {
        filename: "maintenance_parse.js",
        lang: "js",
        note: "Code node (JS)․ սպիտակ ցուցակ + տևողության վավերացում CHECK constraint-ի հետ համաձայն։",
        code: `// /maintenance on 30   → 30 րոպե
// /maintenance off     → անջատել
const [cmd, mode, raw] = $json.text.trim().split(/\\s+/);

if (String($json.chat.id) !== $env.ADMIN_CHAT_ID)
  return [{ json: { reply: '⛔ Չթույլատրված է' } }];

if (mode === 'off')
  return [{ json: { action: 'off' } }];

const ALLOWED = [10, 15, 20, 25, 30, 60, 120, 180];
const minutes = Number(raw);
if (!ALLOWED.includes(minutes))
  return [{ json: { reply: 'Տևողություններ՝ ' + ALLOWED.join(' / ') + ' րոպե' } }];

const until = new Date(Date.now() + minutes * 6e4).toISOString();
return [{ json: { action: 'on', minutes, until } }];
`,
      },
    ],
  },
  {
    id: "WF-05",
    title: "Ban՝ ըստ Certificate ID-ի",
    trigger: "Telegram · /ban PDFC-… 2hour | /ban PDFC-… no",
    triggerColor: "text-coral-sig border-coral-sig/40 bg-coral-sig/10",
    pipeline: ["Telegram Trigger", "Code · parse", "SQLite · cert գոյությո՞ւն", "SQLite · insert / is_active=0", "Telegram · հաստատում"],
    points: [
      "Ժամկետներ՝ 30min | 1hour | 2hour | 3hour | 5hour | 1day | 2day | 3day | 5day",
      "/ban PDFC-XXXX no → ապաարգելափակում (is_active=0)",
      "Ստուգվում է սերտիֆիկատի գոյությունը․ սխալ ID-ի դեպքում bot-ը հստակ սխալ է վերադարձնում",
      "Կլիենտը արգելափակվում է հաջորդ verify-ի պահին (≤ 1 ժամ) կամ ping-ի դեպքում անմիջապես",
    ],
    blocks: [
      {
        filename: "ban_parse.js",
        lang: "js",
        note: "Code node (JS)․ տևողությունների քարտեզ + մասնակի (partial) match-ի պաշտպանություն։",
        code: `const DUR = {
  '30min': 30,  '1hour': 60,  '2hour': 120, '3hour': 180, '5hour': 300,
  '1day': 1440, '2day': 2880, '3day': 4320, '5day': 7200,
};

const [cmd, certId, raw] = $json.text.trim().split(/\\s+/);

if (String($json.chat.id) !== $env.ADMIN_CHAT_ID)
  return [{ json: { reply: '⛔ Չթույլատրված է' } }];

if (!/^PDFC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(certId))
  return [{ json: { reply: 'Սխալ Certificate ID ձևաչափ' } }];

// /ban PDFC-XXXX no  → ապաարգելափակում
if (raw === 'no')
  return [{ json: { action: 'unban', certificate_id: certId } }];

const minutes = DUR[raw];
if (!minutes)
  return [{ json: { reply: 'Ժամկետներ՝ ' + Object.keys(DUR).join(' / ') } }];

const until = new Date(Date.now() + minutes * 6e4).toISOString();
return [{ json: {
  action: 'ban', certificate_id: certId,
  duration_minutes: minutes, until,
}}];
`,
      },
    ],
  },
];

const EXTRA_WF = [
  ["WF-06", "Schedule · ժամկետի հիշեցում", "D-3 և D-1 օրերին Telegram նախազգուշացում օգտատիրոջը", "text-amber-glow"],
  ["WF-07", "Schedule · GitHub sync", "15 րոպեն մեկ՝ releases/latest → app_versions աղյուսակ", "text-teal-sig"],
  ["WF-08", "Schedule · nightly backup", "03:00-ին SQLite ֆայլի պատճեն + 30 օրվա ռոտացիա", "text-mint-sig"],
  ["WF-09", "Error workflow", "Ցանկացած workflow-ի սխալ → անմիջապես Telegram alert admin-ին", "text-coral-sig"],
];

export default function Workflows() {
  const [openId, setOpenId] = useState("WF-03");

  return (
    <section id="n8n" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="04"
        title="n8n Workflow-ներ"
        kicker="ՀԻՆԳ ՀԻՄՆԱԿԱՆ + ՉՈՐՍ ՍՊԱՍԱՐԿՈՂ · PRODUCTION-READY"
        desc="Յուրաքանչյուր workflow պատասխանատու է մեկ գործողության համար։ Սխալների մշակումը՝ Try/Catch wrapper-ով ամեն node-ի շուրջ, Error Workflow-ը միացված է բոլորին։ Սեղմեք workflow-ի վրա՝ node-երի կարգավորումները տեսնելու համար։"
      />

      <div className="space-y-4">
        {WORKFLOWS.map((wf, wi) => {
          const open = openId === wf.id;
          return (
            <Reveal key={wf.id} delay={wi * 60}>
              <div className={`card-frame overflow-hidden rounded-lg transition-colors ${open ? "" : "hover:border-ink-500"}`}>
                <button
                  onClick={() => setOpenId(open ? "" : wf.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <span className="font-mono text-[13px] font-semibold text-teal-sig">{wf.id}</span>
                  <span className="font-display text-[17px] font-bold text-ink-100">{wf.title}</span>
                  <span className={`rounded-md border px-2.5 py-1 font-mono text-[10.5px] ${wf.triggerColor}`}>{wf.trigger}</span>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8494ae" strokeWidth="2"
                    className={`ml-auto transition-transform duration-300 ${open ? "rotate-180 text-amber-glow" : ""}`}
                    style={{ stroke: open ? "#f2b441" : undefined }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {open && (
                  <div className="rise-in border-t border-ink-700 px-5 pb-6 pt-5">
                    {/* pipeline */}
                    <div className="flex flex-wrap items-center gap-y-2.5">
                      {wf.pipeline.map((step, i) => (
                        <span key={i} className="flex items-center">
                          <span className="rounded-md border border-ink-600 bg-ink-850 px-2.5 py-1.5 font-mono text-[11px] text-ink-200 transition-colors hover:border-teal-sig/60 hover:text-teal-sig">
                            {step}
                          </span>
                          {i < wf.pipeline.length - 1 && (
                            <svg width="22" height="12" viewBox="0 0 22 12" className="mx-1 shrink-0 text-ink-500">
                              <path d="M1 6h17M14 1.5 19.5 6 14 10.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-12">
                      <div className="xl:col-span-4">
                        <p className="mb-3 font-mono text-[10.5px] tracking-[0.18em] text-ink-400">ԻՆՉՊԵՍ Է ԱՇԽԱՏՈՒՄ</p>
                        <ul className="space-y-2.5">
                          {wf.points.map((p, i) => (
                            <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-300">
                              <span className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-amber-glow" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4 xl:col-span-8">
                        {wf.blocks.map((b) => (
                          <div key={b.filename}>
                            <p className="mb-2 text-[12px] text-ink-400">{b.note}</p>
                            <CodeBlock code={b.code} lang={b.lang} filename={b.filename} maxHeight={380} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={120} className="mt-8">
        <p className="mb-3 font-mono text-[11px] tracking-[0.18em] text-ink-400">ՍՊԱՍԱՐԿՈՂ WORKFLOW-ՆԵՐ · ԱՌԱՆՑ ԴՐԱՆՑ PRODUCTION ՉԷ</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXTRA_WF.map(([id, title, desc, color]) => (
            <div key={id} className="group flex items-start gap-4 rounded-lg border border-ink-700 bg-ink-850/60 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-ink-500">
              <span className={`font-mono text-[12px] font-semibold ${color}`}>{id}</span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink-100">{title}</p>
                <p className="mt-0.5 text-[12px] text-ink-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
