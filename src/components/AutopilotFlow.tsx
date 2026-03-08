import { useState, useEffect } from "react";

const PHASES = [
  {
    id: "prep", label: "Pre-Enrollment", phaseNum: 1, accent: "#60a5fa",
    steps: [
      { id: "hash", icon: "⬡", title: "Hardware Hash Registration", subtitle: "Device identity established in tenant", detail: "The device's 4K hardware hash is collected and uploaded to the Autopilot service — via OEM/reseller direct shipment, CSV import into Intune, or Graph API. This links the physical hardware to your Entra tenant before the device ships.", tags: ["OEM Direct", "CSV Upload", "Graph API", "4K Hash"], warning: null },
      { id: "profile", icon: "▤", title: "Autopilot Profile Assignment", subtitle: "Deployment profile bound to device", detail: "An Autopilot deployment profile is assigned via a dynamic or static Entra group. The profile controls deployment mode (User-Driven, Self-Deploying, Pre-Provisioning), OOBE screen suppression, naming template, and domain join type.", tags: ["User-Driven", "Self-Deploying", "Pre-Provisioning", "Hybrid Join"], warning: null },
    ],
  },
  {
    id: "oobe", label: "OOBE", phaseNum: 2, accent: "#38bdf8",
    steps: [
      { id: "boot", icon: "◈", title: "Device First Boot", subtitle: "Autopilot profile detected", detail: "Device reaches OOBE on first boot or after a factory/Autopilot reset. The Autopilot client queries the service using the hardware hash. If a profile is found, OOBE customization begins.", tags: ["OOBE", "Factory Reset", "Autopilot Reset", "Windows 11"], warning: null },
      { id: "network", icon: "◎", title: "Network Connectivity Check", subtitle: "Service endpoints verified", detail: "Key endpoints include *.microsoft.com, *.microsoftonline.com, *.manage.microsoft.com. Proxy/WPAD must allow these. Ethernet or Wi-Fi both supported.", tags: ["*.manage.microsoft.com", "*.microsoftonline.com", "Proxy/WPAD", "Firewall Rules"], warning: "Proxy or firewall blocking Autopilot endpoints is the #1 cause of enrollment failure at this stage." },
      { id: "oobe-profile", icon: "◫", title: "OOBE Customization Applied", subtitle: "Branded sign-in experience presented", detail: "Autopilot profile downloads and suppresses configured screens (EULA, region, keyboard, privacy). Tenant branding is applied. User sees a customized sign-in page.", tags: ["Skip EULA", "Custom Branding", "Screen Suppression", "Privacy Page"], warning: null },
    ],
  },
  {
    id: "identity", label: "Identity & Authentication", phaseNum: 3, accent: "#34d399",
    steps: [
      { id: "signin", icon: "◉", title: "User Sign-In", subtitle: "Corporate UPN entered", detail: "User enters their corporate UPN. For Self-Deploying or Pre-Provisioning mode, no user credentials are required — the device authenticates using TPM 2.0 attestation instead.", tags: ["UPN Login", "TPM 2.0 Attestation", "Self-Deploying: No User", "Licensed Account"], warning: null },
      { id: "entra", icon: "◐", title: "Entra ID Authentication", subtitle: "Identity verified against tenant", detail: "Entra ID evaluates the credential using PHS, PTA, or Federation (ADFS). Seamless SSO may apply on corporate networks. Token issued and used to authorize MDM enrollment.", tags: ["PHS", "PTA", "ADFS Federation", "Seamless SSO"], warning: null },
      { id: "mfa", icon: "◑", title: "Conditional Access Evaluation", subtitle: "MFA challenge & policy gate", detail: "CA policies targeting 'Microsoft Intune Enrollment' cloud app are evaluated. MFA challenge issued if required. Trusted location exclusions can inadvertently bypass MFA here.", tags: ["CA: Intune Enrollment App", "MFA Challenge", "Trusted Location Risk", "Named Locations"], warning: "Common misconfiguration: CA policies targeting 'Microsoft Intune' app (not 'Intune Enrollment') won't gate enrollment. Trusted location MFA exclusions can create bypass." },
    ],
  },
  {
    id: "mdm", label: "MDM Enrollment", phaseNum: 4, accent: "#a78bfa",
    steps: [
      { id: "register", icon: "◭", title: "Entra Device Registration", subtitle: "Device object created in tenant", detail: "Device joins Entra ID (cloud-native) or registers for Hybrid Entra Join (requires on-prem AD or WHfB cloud Kerberos trust). TrustType: AzureAD or ServerAD. Primary Refresh Token (PRT) issued.", tags: ["Entra Join", "Hybrid Join", "TrustType", "PRT Issued"], warning: null },
      { id: "enrollment", icon: "◬", title: "MDM Enrollment", subtitle: "OMA-DM channel established", detail: "MDM auto-enrollment triggered via the Entra ID MDM scope. Device contacts Intune, receives enrollment token, completes OMA-DM protocol. IME installed, enabling PowerShell scripts and Win32 app delivery.", tags: ["OMA-DM", "Enrollment Token", "IME Installed", "Win32 App Support"], warning: null },
      { id: "cert", icon: "◪", title: "Certificate Enrollment", subtitle: "SCEP / PKCS certs provisioned", detail: "SCEP or PKCS certificate profiles invoke NDES via the Intune Certificate Connector. Certificates used for Wi-Fi auth, VPN, S/MIME, or client authentication. Runs in parallel with ESP device phase.", tags: ["SCEP", "PKCS", "NDES", "Intune Connector", "Wi-Fi/VPN Auth"], warning: null },
    ],
  },
  {
    id: "esp", label: "Enrollment Status Page", phaseNum: 5, accent: "#fbbf24",
    steps: [
      { id: "esp-device", icon: "▣", title: "ESP — Device Setup Phase", subtitle: "Device policies, certs, and apps", detail: "Installs device-assigned apps (Win32, LOB, Store), applies device config profiles, certificates, compliance policies, and PowerShell scripts. Blocking apps must complete before advancing. 60 minute timeout.", tags: ["Device Apps", "Config Profiles", "Compliance Policies", "Scripts", "60min Timeout"], warning: "Win32 apps that fail silently (exit 0 but don't install) will hang ESP until timeout. Check IMELogs at C:\\ProgramData\\Microsoft\\IntuneManagementExtension\\Logs." },
      { id: "esp-account", icon: "▦", title: "ESP — Account Setup Phase", subtitle: "User apps, policies, and WHfB", detail: "Runs in user context. Installs user-assigned apps, applies user config profiles, prompts for Windows Hello for Business PIN/biometric enrollment. M365 Apps, KFM configured here.", tags: ["User Apps", "WHfB Setup", "M365 Apps", "KFM", "User Policies"], warning: null },
    ],
  },
  {
    id: "complete", label: "Managed & Compliant", phaseNum: 6, accent: "#4ade80",
    steps: [
      { id: "desktop", icon: "▩", title: "Desktop Reached", subtitle: "Device fully provisioned", detail: "User reaches desktop with all policies and apps applied. Device is Entra Joined, enrolled in Intune, evaluated for compliance. CA grants access to cloud resources. Zero-touch provisioning complete.", tags: ["Compliant Status", "CA Access Granted", "Zero-Touch", "Fully Managed"], warning: null },
      { id: "ongoing", icon: "↻", title: "Ongoing Management", subtitle: "Continuous compliance & policy sync", detail: "IME checks in ~every 60 minutes. Compliance evaluation remediates drift. Proactive Remediations, custom compliance scripts, and WUfB apply continuously. LAPS rotates local admin password per policy.", tags: ["IME ~60min Sync", "Proactive Remediation", "WUfB", "LAPS", "Company Portal Sync"], warning: null },
    ],
  },
];

interface Step {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  detail: string;
  tags: string[];
  warning: string | null;
}

interface StepMeta extends Step {
  phaseAccent: string;
  phaseLabel: string;
  phaseNum: number;
}

const ALL_STEPS: StepMeta[] = PHASES.flatMap((p) =>
  p.steps.map((s) => ({ ...s, phaseAccent: p.accent, phaseLabel: p.label, phaseNum: p.phaseNum }))
);

function getStepMeta(id: string): StepMeta | undefined {
  return ALL_STEPS.find((s) => s.id === id);
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap');

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }

  @keyframes signal-travel {
    0% { stroke-dashoffset: 200; opacity: 0; }
    20% { opacity: 1; }
    100% { stroke-dashoffset: 0; opacity: 0; }
  }

  @keyframes slide-in-left {
    from { opacity: 0; transform: translateX(-18px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slide-in-right {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 8px var(--accent-color, #60a5fa44); }
    50% { box-shadow: 0 0 24px var(--accent-color, #60a5fa88), 0 0 40px var(--accent-color, #60a5fa33); }
  }

  @keyframes phase-line-grow {
    from { transform: scaleY(0); transform-origin: top; }
    to { transform: scaleY(1); transform-origin: top; }
  }

  @keyframes dot-ping {
    0% { transform: scale(1); }
    50% { transform: scale(1.6); opacity: 0.5; }
    100% { transform: scale(1); }
  }

  @keyframes scan-line {
    0% { top: 0%; opacity: 0.6; }
    100% { top: 100%; opacity: 0; }
  }

  @keyframes float-badge {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes warning-flash {
    0%, 100% { border-color: #78350f; background: #1c1400; }
    50% { border-color: #f59e0b88; background: #251a00; }
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes connector-flow {
    0% { stroke-dashoffset: 60; }
    100% { stroke-dashoffset: 0; }
  }

  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  .step-card {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .step-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
    background-size: 200% 100%;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .step-card:hover::before {
    opacity: 1;
    animation: shimmer 1.5s ease infinite;
  }

  .step-card.selected {
    animation: glow-pulse 2s ease-in-out infinite;
  }

  .phase-line {
    animation: phase-line-grow 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .phase-dot {
    animation: dot-ping 3s ease-in-out infinite;
  }

  .detail-panel {
    animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .tag-item {
    transition: all 0.15s ease;
  }
  .tag-item:hover {
    transform: translateY(-1px);
  }
`;

function PulseRing({ color }: { color: string }) {
  return (
    <div style={{ position: "relative", width: "10px", height: "10px", flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, animation: "pulse-ring 2s ease-out infinite",
      }} />
      <div style={{
        position: "absolute", inset: "2px", borderRadius: "50%",
        background: color, boxShadow: `0 0 6px ${color}`,
      }} />
    </div>
  );
}

function AnimatedConnector({ accent, phaseGap = false }: { accent: string; phaseGap?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: phaseGap ? "8px 0" : "3px 0" }}>
      <svg width="16" height={phaseGap ? 32 : 18} viewBox={`0 0 16 ${phaseGap ? 32 : 18}`} fill="none" overflow="visible">
        <line
          x1="8" y1="0" x2="8" y2={phaseGap ? 24 : 12}
          stroke={accent} strokeWidth="1"
          strokeDasharray="60" strokeDashoffset="60"
          opacity="0.4"
          style={{ animation: "connector-flow 1.5s linear infinite" }}
        />
        <polygon
          points={`4,${phaseGap ? 24 : 12} 12,${phaseGap ? 24 : 12} 8,${phaseGap ? 32 : 18}`}
          fill={accent} opacity="0.4"
        />
      </svg>
    </div>
  );
}

function StepCard({ step, accent, isSelected, onClick, index, isLast }: {
  step: Step; accent: string; isSelected: boolean; onClick: () => void; index: number; isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        className={`step-card ${isSelected ? "selected" : ""}`}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          "--accent-color": `${accent}44`,
          border: `1px solid ${isSelected ? accent : hovered ? `${accent}55` : "#111827"}`,
          borderLeft: `3px solid ${isSelected ? accent : hovered ? `${accent}80` : "#1f2937"}`,
          borderRadius: "4px",
          padding: "11px 14px",
          background: isSelected ? `${accent}12` : hovered ? "#0b1120" : "#070c18",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          animationDelay: `${index * 80}ms`,
          animation: `fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 60}ms both`,
        } as React.CSSProperties}
      >
        {isSelected && (
          <div style={{
            position: "absolute", left: 0, right: 0, height: "1px",
            background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
            animation: "scan-line 2s linear infinite",
          }} />
        )}

        <span style={{
          fontSize: "1.1rem",
          color: isSelected ? accent : hovered ? `${accent}cc` : "#334155",
          fontFamily: "monospace",
          lineHeight: 1,
          transition: "all 0.15s",
          filter: isSelected ? `drop-shadow(0 0 6px ${accent})` : "none",
        }}>
          {step.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.78rem", fontWeight: "700",
            color: isSelected ? accent : hovered ? "#e2e8f0" : "#94a3b8",
            letterSpacing: "0.02em", transition: "color 0.15s",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontFamily: "'Space Mono', monospace",
          }}>
            {step.title}
          </div>
          <div style={{ fontSize: "0.62rem", color: "#374151", marginTop: "2px", fontFamily: "'Space Mono', monospace" }}>
            {step.subtitle}
          </div>
        </div>
        {step.warning && (
          <span style={{
            fontSize: "0.65rem", color: "#f59e0b",
            animation: "float-badge 2s ease-in-out infinite",
          }}>⚠</span>
        )}
        <span style={{
          fontSize: "0.6rem",
          color: isSelected ? accent : "#1f2937",
          transition: "all 0.2s",
          transform: isSelected ? "translateX(3px)" : hovered ? "translateX(2px)" : "none",
        }}>▶</span>
      </div>
      {!isLast && <AnimatedConnector accent={accent} />}
    </>
  );
}

function PhaseBlock({ phase, selectedId, onSelect, globalIndex, isLast }: {
  phase: typeof PHASES[number]; selectedId: string | null; onSelect: (id: string | null) => void; globalIndex: number; isLast: boolean;
}) {
  return (
    <div style={{ marginBottom: 0, animation: `slide-in-left 0.5s cubic-bezier(0.4,0,0.2,1) ${globalIndex * 100}ms both` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0 10px" }}>
        <PulseRing color={phase.accent} />
        <span style={{
          fontSize: "0.58rem", letterSpacing: "0.18em",
          textTransform: "uppercase", color: phase.accent,
          fontWeight: "700", fontFamily: "'Space Mono', monospace",
        }}>
          {String(phase.phaseNum).padStart(2, "0")} — {phase.label}
        </span>
        <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${phase.accent}40, transparent)` }} />
      </div>

      <div className="phase-line" style={{
        paddingLeft: "20px",
        borderLeft: `1px solid ${phase.accent}35`,
        marginLeft: "4px",
        animationDelay: `${globalIndex * 100}ms`,
      }}>
        {phase.steps.map((step, si) => (
          <StepCard
            key={step.id}
            step={step}
            accent={phase.accent}
            isSelected={selectedId === step.id}
            onClick={() => onSelect(selectedId === step.id ? null : step.id)}
            index={globalIndex + si}
            isLast={si === phase.steps.length - 1}
          />
        ))}
      </div>

      {!isLast && <AnimatedConnector accent="#1e2a3a" phaseGap />}
    </div>
  );
}

function DetailPanel({ stepId, onClose }: { stepId: string; onClose: () => void }) {
  const step = getStepMeta(stepId);
  if (!step) return null;
  const accent = step.phaseAccent;

  return (
    <div className="detail-panel" style={{
      width: "340px", flexShrink: 0,
      background: "#050810",
      borderLeft: `1px solid ${accent}25`,
      maxHeight: "100vh", overflowY: "auto",
      position: "sticky", top: 0, alignSelf: "flex-start",
    }}>
      <div style={{
        height: "2px",
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        animation: "shimmer 3s ease infinite",
        backgroundSize: "200% 100%",
      }} />

      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{
              fontSize: "0.58rem", letterSpacing: "0.18em",
              textTransform: "uppercase", color: accent,
              fontWeight: "700", marginBottom: "8px",
              fontFamily: "'Space Mono', monospace",
            }}>
              Phase {step.phaseNum} · {step.phaseLabel}
            </div>
            <div style={{
              fontSize: "2rem", lineHeight: 1, color: accent,
              fontFamily: "monospace",
              filter: `drop-shadow(0 0 10px ${accent}88)`,
              animation: "dot-ping 3s ease-in-out infinite",
            }}>
              {step.icon}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${accent}30`,
            borderRadius: "3px", color: `${accent}88`,
            cursor: "pointer", fontSize: "0.72rem",
            padding: "4px 8px", fontFamily: "'Space Mono', monospace",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = accent; (e.currentTarget as HTMLButtonElement).style.color = accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}30`; (e.currentTarget as HTMLButtonElement).style.color = `${accent}88`; }}>
            ✕
          </button>
        </div>

        <h2 style={{
          fontSize: "1rem", fontWeight: "800", color: "#f1f5f9",
          margin: "0 0 4px", letterSpacing: "-0.01em",
          fontFamily: "'Syne', sans-serif",
          animation: "fade-up 0.3s ease both",
        }}>
          {step.title}
        </h2>
        <div style={{ fontSize: "0.68rem", color: "#475569", marginBottom: "16px", fontFamily: "'Space Mono', monospace" }}>
          {step.subtitle}
        </div>

        <div style={{ height: "1px", background: `linear-gradient(90deg, ${accent}40, transparent)`, marginBottom: "16px" }} />

        <p style={{
          fontSize: "0.74rem", lineHeight: "1.7",
          color: "#94a3b8", margin: "0 0 20px",
          fontFamily: "'Space Mono', monospace",
          animation: "fade-up 0.4s ease 0.1s both",
        }}>
          {step.detail}
        </p>

        {step.warning && (
          <div style={{
            background: "#1c1400", border: "1px solid #78350f",
            borderLeft: "3px solid #f59e0b",
            borderRadius: "4px", padding: "10px 12px", marginBottom: "20px",
            animation: "warning-flash 3s ease-in-out infinite, fade-up 0.4s ease 0.15s both",
          }}>
            <p style={{ fontSize: "0.7rem", color: "#fde68a", lineHeight: 1.55, fontFamily: "'Space Mono', monospace" }}>
              {step.warning}
            </p>
          </div>
        )}

        <div style={{
          fontSize: "0.56rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#1e3a4a",
          marginBottom: "8px", fontFamily: "'Space Mono', monospace",
        }}>
          Keywords
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", paddingBottom: "24px" }}>
          {step.tags.map((tag, ti) => (
            <span key={tag} className="tag-item" style={{
              fontSize: "0.6rem", padding: "3px 8px",
              background: `${accent}10`, border: `1px solid ${accent}30`,
              borderRadius: "2px", color: `${accent}cc`,
              fontFamily: "'Space Mono', monospace",
              animation: `fade-up 0.3s ease ${0.2 + ti * 0.05}s both`,
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      <svg width="100%" height="100%" style={{ opacity: 0.025 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div style={{
        position: "absolute", top: "20%", left: "15%",
        width: "300px", height: "300px",
        background: "radial-gradient(circle, #3b82f620 0%, transparent 70%)",
        animation: "dot-ping 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "25%", right: "10%",
        width: "250px", height: "250px",
        background: "radial-gradient(circle, #4ade8015 0%, transparent 70%)",
        animation: "dot-ping 10s ease-in-out infinite 3s",
      }} />
    </div>
  );
}

export default function AutopilotFlow() {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  let globalIdx = 0;

  return (
    <>
      <style>{css}</style>
      <div style={{
        display: "flex", minHeight: "100vh",
        background: "#04070f",
        fontFamily: "'Space Mono', monospace",
        color: "#e2e8f0",
        position: "relative",
      }}>
        <GridBackground />

        <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 2rem 3rem", minWidth: 0, position: "relative", zIndex: 1 }}>
          <div style={{
            marginBottom: "2rem",
            animation: "fade-up 0.6s cubic-bezier(0.4,0,0.2,1) both",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "#0d1525", border: "1px solid #1e2a3a",
              borderRadius: "3px", padding: "4px 10px", marginBottom: "12px",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#3b82f6",
                boxShadow: "0 0 8px #3b82f6",
                animation: "pulse-ring 2s ease-out infinite",
              }} />
              <span style={{ fontSize: "0.58rem", letterSpacing: "0.2em", color: "#3b82f6", fontWeight: "700" }}>
                MICROSOFT INTUNE · WINDOWS AUTOPILOT
              </span>
            </div>
            <h1 style={{
              fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc",
              margin: "0 0 6px", letterSpacing: "-0.03em",
              fontFamily: "'Syne', sans-serif",
              background: "linear-gradient(135deg, #f8fafc 0%, #60a5fa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Device Enrollment Flow
            </h1>
            <p style={{ fontSize: "0.63rem", color: "#1e3a4a", letterSpacing: "0.06em" }}>
              {selected ? "Press ESC or click step to deselect" : "Click any step → view technical detail · ⚠ = common misconfiguration"}
            </p>
          </div>

          {PHASES.map((phase, pi) => {
            const idx = globalIdx;
            globalIdx += phase.steps.length + 1;
            return (
              <PhaseBlock
                key={phase.id}
                phase={phase}
                selectedId={selected}
                onSelect={setSelected}
                globalIndex={idx}
                isLast={pi === PHASES.length - 1}
              />
            );
          })}

          <div style={{
            marginTop: "2.5rem", paddingTop: "1rem",
            borderTop: "1px solid #0f1824",
            fontSize: "0.58rem", color: "#0f1824",
            letterSpacing: "0.1em",
          }}>
            Autopilot v1 · v2 · Entra Join · Hybrid Join · Windows 10/11
          </div>
        </div>

        {selected ? (
          <DetailPanel stepId={selected} onClose={() => setSelected(null)} />
        ) : (
          <div style={{
            width: "180px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "2rem", borderLeft: "1px solid #0a0f1a",
            position: "relative", zIndex: 1,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "1.8rem", marginBottom: "12px",
                color: "#1e2a3a",
                animation: "spin-slow 8s linear infinite",
                display: "inline-block",
              }}>◎</div>
              <p style={{ fontSize: "0.58rem", color: "#1e2a3a", lineHeight: 1.7, letterSpacing: "0.08em" }}>
                SELECT<br />A STEP
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
