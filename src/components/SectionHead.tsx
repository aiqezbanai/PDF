import { Reveal } from "../lib/motion";

export default function SectionHead({
  no,
  title,
  kicker,
  desc,
}: {
  no: string;
  title: string;
  kicker: string;
  desc?: string;
}) {
  return (
    <Reveal className="mb-10">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[13px] font-semibold text-amber-glow">{no}</span>
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink-100 sm:text-4xl">{title}</h2>
      </div>
      <p className="mt-2 font-mono text-[11.5px] tracking-[0.18em] text-teal-sig">{kicker}</p>
      {desc && <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-ink-300">{desc}</p>}
      <div className="mt-6 h-px w-full bg-gradient-to-r from-amber-glow/60 via-ink-600 to-transparent" />
    </Reveal>
  );
}
