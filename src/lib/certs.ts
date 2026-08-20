export interface CertRecord {
  id: string;
  user: string;
  issuedAt: Date;
  expiresAt: Date;
  fingerprint: string;
  signature: string;
}

function randBlock(len: number): string {
  const chars = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Demo-grade fingerprint/signature generator (mimics the real Ed25519 flow). */
function fakeHash(input: string, bytes: number): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  const out: string[] = [];
  for (let b = 0; b < bytes; b++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    out.push(((h2 >>> 0) ^ (h1 >>> 0)).toString(16).padStart(8, "0"));
  }
  return out.join("").slice(0, bytes * 8);
}

export function generateCert(userName: string): CertRecord {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 30 * 24 * 3600 * 1000);
  const id = `PDFC-${randBlock(4)}-${randBlock(4)}-${randBlock(4)}`;
  const fingerprint = fakeHash(`${userName}|${id}|${Date.now()}`, 3).slice(0, 24);
  const signature = fakeHash(`${id}:${userName}:${expiresAt.toISOString()}`, 8).slice(0, 64);
  return { id, user: userName, issuedAt, expiresAt, fingerprint, signature };
}

const ARM_MONTHS = ["հունվ", "փետր", "մարտ", "ապր", "մայիս", "հուն", "հուլ", "օգոս", "սեպտ", "հոկտ", "նոյ", "դեկտ"];

export function fmtDate(d: Date): string {
  return `${d.getDate()} ${ARM_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function daysLeft(d: Date): number {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (24 * 3600 * 1000)));
}
