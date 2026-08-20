import { useMemo, useState } from "react";

type Lang = "python" | "sql" | "json" | "bash" | "yaml" | "js" | "text";

interface Rule {
  re: RegExp;
  cls: string;
}

const TOKEN_CLS = {
  kw: "text-[#f2b441]",
  str: "text-[#7bd88f]",
  num: "text-[#45d0b8]",
  com: "text-[#5a6a85] italic",
  fn: "text-[#8ab8f0]",
  key: "text-[#e8b4f0]",
  op: "text-[#8494ae]",
};

const RULES: Record<Lang, Rule[]> = {
  python: [
    { re: /#[^\n]*/g, cls: TOKEN_CLS.com },
    { re: /"""[\s\S]*?"""|"[^"\n]*"|'[^'\n]*'/g, cls: TOKEN_CLS.str },
    { re: /\b(import|from|def|class|return|if|elif|else|for|while|try|except|with|as|not|in|is|None|True|False|raise|lambda|pass|self)\b/g, cls: TOKEN_CLS.kw },
    { re: /\b\d[\d._]*\b/g, cls: TOKEN_CLS.num },
    { re: /\b([A-Za-z_]\w*)(?=\()/g, cls: TOKEN_CLS.fn },
  ],
  sql: [
    { re: /--[^\n]*/g, cls: TOKEN_CLS.com },
    { re: /'[^'\n]*'/g, cls: TOKEN_CLS.str },
    { re: /\b(CREATE|TABLE|INDEX|TRIGGER|PRIMARY|KEY|AUTOINCREMENT|UNIQUE|NOT|NULL|DEFAULT|CHECK|IN|REFERENCES|TEXT|INTEGER|REAL|AFTER|INSERT|ON|SELECT|FROM|WHERE|AND|UPDATE|SET|VALUES|BEGIN|END)\b/gi, cls: TOKEN_CLS.kw },
    { re: /\b\d+\b/g, cls: TOKEN_CLS.num },
  ],
  json: [
    { re: /"(?:[^"\\]|\\.)*"(?=\s*:)/g, cls: TOKEN_CLS.key },
    { re: /"(?:[^"\\]|\\.)*"/g, cls: TOKEN_CLS.str },
    { re: /\b(true|false|null)\b/g, cls: TOKEN_CLS.kw },
    { re: /-?\b\d[\d.eE+-]*\b/g, cls: TOKEN_CLS.num },
  ],
  bash: [
    { re: /#[^\n]*/g, cls: TOKEN_CLS.com },
    { re: /"[^"\n]*"|'[^'\n]*'/g, cls: TOKEN_CLS.str },
    { re: /^\s*[\w./-]+(?==)|(?<=\s)--?[\w-]+/g, cls: TOKEN_CLS.kw },
    { re: /\$\{?[\w@]+\}?/g, cls: TOKEN_CLS.num },
  ],
  yaml: [
    { re: /#[^\n]*/g, cls: TOKEN_CLS.com },
    { re: /^[\s-]*[\w.-]+(?=:)/gm, cls: TOKEN_CLS.key },
    { re: /"[^"\n]*"|'[^'\n]*'/g, cls: TOKEN_CLS.str },
    { re: /\b(true|false|null)\b/g, cls: TOKEN_CLS.kw },
    { re: /\b\d[\d.]*\b/g, cls: TOKEN_CLS.num },
  ],
  js: [
    { re: /\/\/[^\n]*/g, cls: TOKEN_CLS.com },
    { re: /`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, cls: TOKEN_CLS.str },
    { re: /\b(const|let|var|function|return|if|else|for|while|new|await|async|true|false|null|this|require|typeof|import|from)\b/g, cls: TOKEN_CLS.kw },
    { re: /\b\d[\d.eE_]*\b/g, cls: TOKEN_CLS.num },
    { re: /\b([A-Za-z_$][\w$]*)(?=\()/g, cls: TOKEN_CLS.fn },
  ],
  text: [{ re: /(?!)/g, cls: "" }],
};

export function tokenizeLine(line: string, lang: Lang): { t: string; c: string }[] {
  const rules = RULES[lang] ?? RULES.text;
  const marks: { start: number; end: number; cls: string }[] = [];

  for (const { re, cls } of rules) {
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = r.exec(line)) !== null) {
      if (m[0].length === 0) { r.lastIndex++; continue; }
      const start = m.index;
      const end = start + m[0].length;
      if (!marks.some((mk) => start < mk.end && end > mk.start)) {
        marks.push({ start, end, cls });
      }
      if (r.lastIndex === start) r.lastIndex++;
    }
  }

  marks.sort((a, b) => a.start - b.start);
  const out: { t: string; c: string }[] = [];
  let pos = 0;
  for (const mk of marks) {
    if (mk.start > pos) out.push({ t: line.slice(pos, mk.start), c: "" });
    out.push({ t: line.slice(mk.start, mk.end), c: mk.cls });
    pos = mk.end;
  }
  if (pos < line.length) out.push({ t: line.slice(pos), c: "" });
  return out;
}

export default function CodeBlock({
  code,
  lang,
  filename,
  maxHeight = 460,
}: {
  code: string;
  lang: Lang;
  filename?: string;
  maxHeight?: number;
}) {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900/90">
      <div className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-850 px-4 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-coral-sig/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-amber-glow/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-mint-sig/70" />
          </span>
          {filename && (
            <span className="truncate font-mono text-[12px] text-ink-300">{filename}</span>
          )}
          <span className="rounded-sm border border-ink-600 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">
            {lang}
          </span>
        </div>
        <button
          onClick={copy}
          className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all ${
            copied
              ? "border-mint-sig/60 bg-mint-sig/10 text-mint-sig"
              : "border-ink-600 bg-ink-800 text-ink-300 hover:border-amber-glow/60 hover:text-amber-glow"
          }`}
          aria-label="Պատճենել կոդը"
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? "Պատճենվեց" : "Պատճենել"}
        </button>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="min-w-max px-0 py-3 font-mono text-[12.5px] leading-[1.65]">
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-ink-850/60">
              <span className="w-11 shrink-0 select-none pr-3 text-right text-ink-500">{i + 1}</span>
              <code className="pr-5 text-ink-200">
                {line.length === 0
                  ? " "
                  : tokenizeLine(line, lang).map((tk, j) =>
                      tk.c ? (
                        <span key={j} className={tk.c}>{tk.t}</span>
                      ) : (
                        <span key={j}>{tk.t}</span>
                      ),
                    )}
              </code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
