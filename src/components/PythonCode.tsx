import { useState } from "react";
import { Reveal } from "../lib/motion";
import SectionHead from "./SectionHead";
import CodeBlock from "./CodeBlock";

const LIBS = [
  ["requests", "HTTP", "n8n webhook-ների կանչեր՝ verify, update/check, request, polling", "text-amber-glow"],
  ["cryptography", "Ed25519", "սերտիֆիկատի ստորագրության offline ստուգում բաց բանալիով", "text-teal-sig"],
  ["customtkinter", "GUI", "LockWindow / MaintenanceScreen / BanScreen պատուհաններ", "text-coral-sig"],
  ["packaging", "semver", "տարբերակների ճիշտ համեմատում (1.10.0 > 1.9.0)", "text-mint-sig"],
  ["psutil", "system", "սարքի fingerprint՝ սերտիֆիկատը մեկ PC-ի կապելու համար", "text-[#8ab8f0]"],
] as const;

const FILES: { name: string; lang: "python" | "bash" | "text"; desc: string; code: string }[] = [
  {
    name: "requirements.txt",
    lang: "text",
    desc: "Նվազագույն կախվածությունները՝ ամրագրված տարբերակներով։",
    code: `requests==2.32.3
cryptography==43.0.1
customtkinter==5.2.2
packaging==24.1
psutil==6.0.0
`,
  },
  {
    name: "license_manager.py",
    lang: "python",
    desc: "Երկշերտ ստուգում՝ offline (Ed25519 ստորագրություն) + online (n8n verify)։ n8n-ի անհասանելիության դեպքում՝ grace ժամանակահատված։",
    code: `# license_manager.py
import base64, json, time, uuid, hashlib, platform
from pathlib import Path
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.exceptions import InvalidSignature

N8N_BASE      = "https://n8n.example.com/webhook"
PUBLIC_PEM    = Path(__file__).parent / "keys" / "license_pub.pem"
CERT_FILE     = Path.home() / ".pdfconverter" / "certificate.json"
GRACE_SECONDS = 6 * 3600                    # offline հանդուրժողականություն


def machine_fingerprint() -> str:
    """Սարքի եզակի hash՝ սերտիֆիկատը մեկ PC-ի կապելու համար։"""
    raw = f"{platform.node()}|{uuid.getnode()}|{platform.system()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


class LicenseManager:
    def __init__(self):
        self._pub = load_pem_public_key(PUBLIC_PEM.read_bytes())
        self._last_ok = None                # վերջին վավեր պատասխանը

    # ---------- 1) OFFLINE · ստորագրության ստուգում ----------
    def verify_signature(self, cert: dict) -> bool:
        payload = json.dumps(
            {k: cert[k] for k in
             ("certificate_id", "issued_at", "expires_at", "fingerprint")},
            sort_keys=True, separators=(",", ":"),
        ).encode()
        try:
            self._pub.verify(base64.b64decode(cert["signature"]), payload)
            return True
        except InvalidSignature:
            return False

    def local_status(self) -> str:
        if not CERT_FILE.exists():
            return "no_license"
        cert = json.loads(CERT_FILE.read_text())
        if not self.verify_signature(cert):
            return "tampered"
        if cert["fingerprint"] != machine_fingerprint():
            return "wrong_machine"
        expires = datetime.fromisoformat(cert["expires_at"])
        return "active" if datetime.now(timezone.utc) < expires else "expired"

    # ---------- 2) ONLINE · n8n verify ----------
    def online_check(self, version: str) -> dict:
        cert = json.loads(CERT_FILE.read_text())
        r = requests.post(
            f"{N8N_BASE}/license/verify",
            json={
                "certificate_id": cert["certificate_id"],
                "fingerprint": machine_fingerprint(),
                "app_version": version,
                "ts": int(time.time()),
            },
            timeout=8,
        )
        r.raise_for_status()
        self._last_ok = {"data": r.json(), "at": time.time()}
        return r.json()

    def check(self, version: str) -> dict:
        """Վերադարձնում է՝ ok | expired | banned | maintenance | ..."""
        try:
            return self.online_check(version)
        except Exception:
            local = self.local_status()
            if local != "active":
                return {"status": local}
            if self._last_ok and time.time() - self._last_ok["at"] < GRACE_SECONDS:
                return self._last_ok["data"]          # grace period
            return {"status": "offline_locked"}
`,
  },
  {
    name: "update_client.py",
    lang: "python",
    desc: "Թարմացման ամբողջ հոսքը՝ ստուգում → հարցում → polling → ներբեռնում → silent install։",
    code: `# update_client.py
import sys, time, subprocess, tempfile
import requests
from packaging.version import Version

N8N_BASE = "https://n8n.example.com/webhook"
POLL_INTERVAL, POLL_TIMEOUT = 3, 180


class UpdateClient:
    def __init__(self):
        self.session = requests.Session()

    # 1. կա՞ արդյոք նոր տարբերակ GitHub Private Repo-ում
    def check_update(self, current: str, certificate_id: str) -> dict:
        r = self.session.post(
            f"{N8N_BASE}/update/check",
            json={"app_version": current, "certificate_id": certificate_id},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        data["update_available"] = Version(data["latest"]) > Version(current)
        return data

    # 2. հարցում՝ admin-ի հաստատման համար (Telegram)
    def request_update(self, certificate_id: str, from_v: str, to_v: str) -> str:
        r = self.session.post(
            f"{N8N_BASE}/update/request",
            json={"certificate_id": certificate_id, "from": from_v, "to": to_v},
            timeout=10,
        )
        r.raise_for_status()
        return r.json()["request_id"]

    # 3. polling, մինչև admin-ը սեղմի Այո/Ոչ
    def wait_for_approval(self, request_id: str) -> dict:
        deadline = time.time() + POLL_TIMEOUT
        while time.time() < deadline:
            r = self.session.get(
                f"{N8N_BASE}/update/status",
                params={"request_id": request_id}, timeout=10,
            )
            data = r.json()
            if data["status"] in ("approved", "rejected"):
                return data
            time.sleep(POLL_INTERVAL)
        return {"status": "timeout"}

    # 4. ներբեռնում + checksum + silent install
    def download_and_install(self, url: str, sha256: str) -> None:
        import hashlib
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".exe")
        h = hashlib.sha256()
        with requests.get(url, stream=True, timeout=120) as r:
            r.raise_for_status()
            for chunk in r.iter_content(1 << 16):
                tmp.write(chunk)
                h.update(chunk)
        tmp.close()
        if h.hexdigest() != sha256:
            raise RuntimeError("Checksum mismatch — install aborted")
        subprocess.Popen([tmp.name, "/SILENT"])       # Inno Setup
        sys.exit(0)
`,
  },
  {
    name: "lock_window.py",
    lang: "python",
    desc: "Արգելափակման պատուհանը՝ ըստ ձեր սպեցիֆիկացիայի. անվանում, նոր տարբերակ, «Թարմացնել» CTA։",
    code: `# lock_window.py
import threading
import customtkinter as ctk


class LockWindow(ctk.CTk):
    APP_NAME    = "PDF Converter"
    NEW_VERSION = "v1.0.0"

    REASONS = {
        "expired":      "Սերտիֆիկատի 30 օրը լրացել է",
        "banned":       "Արգելափակված է admin-ի կողմից",
        "revoked":      "Սերտիֆիկատը չեղարկված է",
        "tampered":     "Սերտիֆիկատը վնասված է",
        "no_license":   "Սերտիֆիկատ չի գտնվել",
    }

    def __init__(self, reason: str, on_update):
        super().__init__()
        ctk.set_appearance_mode("dark")
        self.title(f"{self.APP_NAME} — արգելափակված")
        self.geometry("540x400")
        self.resizable(False, False)

        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(expand=True, fill="both", padx=44, pady=26)

        ctk.CTkLabel(
            frame, text=self.APP_NAME,
            font=ctk.CTkFont(size=30, weight="bold"),
        ).pack()

        ctk.CTkLabel(
            frame, text=self.REASONS.get(reason, reason),
            text_color="#f0655a",
        ).pack(pady=(4, 16))

        info = ctk.CTkFrame(frame, fg_color="#131a25", corner_radius=8)
        info.pack(fill="x")
        ctk.CTkLabel(
            info, text=f"Հավելվածի նոր տարբերակ՝ {self.NEW_VERSION}",
            font=ctk.CTkFont(size=15),
        ).pack(pady=12)

        ctk.CTkButton(
            frame, text="Թարմացնել", height=46,
            fg_color="#f2b441", hover_color="#ffd070",
            text_color="#0b0f16",
            font=ctk.CTkFont(size=16, weight="bold"),
            command=lambda: threading.Thread(
                target=on_update, args=(self,), daemon=True,
            ).start(),
        ).pack(pady=20, fill="x")

        self.protocol("WM_DELETE_WINDOW", lambda: None)  # չփակվի
`,
  },
  {
    name: "main.py",
    lang: "python",
    desc: "Մեկնարկային տրամաբանությունը՝ վիճակից կախված երեք ճյուղ։",
    code: `# main.py
from license_manager import LicenseManager
from update_client import UpdateClient
from lock_window import LockWindow
from maintenance_screen import MaintenanceScreen
from app import PDFConverterApp

APP_VERSION = "0.9.4"


def update_flow(window):
    uc = UpdateClient()
    cert_id = "PDFC-7F3A-90BD-C21E"           # certificate.json-ից
    upd = uc.check_update(APP_VERSION, cert_id)
    if not upd["update_available"]:
        return

    req = uc.request_update(cert_id, APP_VERSION, upd["latest"])
    result = uc.wait_for_approval(req)         # polling n8n

    if result["status"] == "approved":
        uc.download_and_install(result["download_url"], result["sha256"])
    # rejected / timeout → հավելվածը մնում է արգելափակված


def boot():
    state = LicenseManager().check(APP_VERSION)

    if state["status"] == "ok":
        PDFConverterApp(state).mainloop()
    elif state["status"] == "maintenance":
        MaintenanceScreen(until=state["until"]).mainloop()
    else:   # expired | banned | revoked | tampered | no_license
        LockWindow(reason=state["status"], on_update=update_flow).mainloop()


if __name__ == "__main__":
    boot()
`,
  },
  {
    name: "build.sh",
    lang: "bash",
    desc: "PyInstaller փաթեթավորում՝ բաց բանալին build-ի մեջ ներդրված (մասնավոր բանալին երբեք չդրվի կլիենտում)։",
    code: `# Windows-ի համար՝ --add-data "keys\\license_pub.pem;keys"
pyinstaller --onefile --windowed \\
  --name "PDFConverter" \\
  --icon assets/icon.ico \\
  --add-data "keys/license_pub.pem:keys" \\
  main.py

# արդյունքը՝ dist/PDFConverter, վերբեռնվում է GitHub Release
gh release create v1.0.0 \\
  ./installer/PDFConverterSetup-1.0.0.exe \\
  --repo acme/pdf-converter --notes "Առաջին թողարկում"
`,
  },
];

export default function PythonCode() {
  const [idx, setIdx] = useState(1);
  const f = FILES[idx];

  return (
    <section id="python" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHead
        no="03"
        title="Desktop հավելվածի կոդը"
        kicker="ԱՎԵԼԱՑՎՈՂ ՄՈԴՈՒԼՆԵՐ · PYTHON"
        desc="Ձեր առկա PDF Converter-ին ավելացնում եք երեք մոդուլ՝ license_manager, update_client և lock_window, գումարած մեկնարկային boot() տրամաբանությունը։ Կլիենտը պահում է միայն հանրային բանալին — ստորագրել կարող է միայն n8n-ը։"
      />

      <Reveal className="mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LIBS.map(([name, tag, desc, color]) => (
            <div key={name} className="group rounded-lg border border-ink-700 bg-ink-850/60 p-4 transition-all hover:-translate-y-1 hover:border-ink-500">
              <div className="flex items-center justify-between">
                <code className="font-mono text-[13px] font-semibold text-ink-100">{name}</code>
                <span className={`font-mono text-[9.5px] uppercase tracking-wider ${color}`}>{tag}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-400 transition-colors group-hover:text-ink-300">{desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="mb-4 flex flex-wrap gap-2">
          {FILES.map((file, i) => (
            <button
              key={file.name}
              onClick={() => setIdx(i)}
              className={`kbd-chip rounded-md px-3.5 py-2 font-mono text-[12px] ${
                i === idx ? "border-amber-glow/70 bg-amber-glow/10 text-amber-glow" : "text-ink-300"
              }`}
            >
              {file.name}
            </button>
          ))}
        </div>
        <div key={f.name} className="rise-in">
          <p className="mb-3 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-300">
            <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f2b441" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
            {f.desc}
          </p>
          <CodeBlock code={f.code} lang={f.lang} filename={f.name} />
        </div>
      </Reveal>
    </section>
  );
}
