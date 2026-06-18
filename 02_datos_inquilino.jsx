import { useState } from "react";

// ============================================================
// AJUSTES › FACTURACIÓN (Emisores) v3 · Colossu
// Formato simple: una tarjeta detallada por razón social (CSF + CSD),
// apiladas, con botón "Agregar otra razón social" al final.
// El contrato define qué razón social emite cada factura.
// ============================================================

const FONT = "'DM Sans', -apple-system, system-ui, sans-serif";

const TABS = [
  { id: "perfil", label: "Perfil", icon: "👤" },
  { id: "pass", label: "Contraseña", icon: "🔒" },
  { id: "apar", label: "Apariencia", icon: "🎨" },
  { id: "idioma", label: "Idioma", icon: "🌐" },
  { id: "mcp", label: "MCP", icon: "⚡" },
  { id: "fact", label: "Facturación", icon: "🧾" },
  { id: "notif", label: "Notificaciones", icon: "🔔" },
];

const ST = {
  valid:   { label: "Lista para facturar", bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  expiring:{ label: "Certificado por vencer", bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  incomplete:{ label: "Incompleta",        bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
};
const DOC = { ok: { bg: "#ECFDF5", color: "#10B981", icon: "✓" }, warn: { bg: "#FFFBEB", color: "#F59E0B", icon: "!" }, missing: { bg: "#FEF2F2", color: "#EF4444", icon: "×" } };

const EMISORES = [
  { id: "em1", razon: "Inmobiliaria Bonacci SA de CV", rfc: "IBO190315KL8", regimen: "601 · General de Ley PM", cp: "06700", tipo: "Persona Moral", status: "valid", contratos: 9,
    csf: { state: "ok", file: "CSF_Bonacci_2026.pdf", info: "subida 12 ene 2026" },
    cer: { state: "ok", info: "No. serie 00001000000512345678 · vigencia hasta 14 mar 2028" },
    key: { state: "ok", info: "CSD_Bonacci.key · subida 12 ene 2026" },
    pass: { state: "ok", info: "Configurada y cifrada" } },
  { id: "em2", razon: "Desarrollos Pisa SA de CV", rfc: "DPI200612MN4", regimen: "601 · General de Ley PM", cp: "06700", tipo: "Persona Moral", status: "expiring", contratos: 5,
    csf: { state: "ok", file: "CSF_Pisa_2025.pdf", info: "subida 03 mar 2025" },
    cer: { state: "warn", info: "No. serie 00001000000598765432 · vence en 23 días" },
    key: { state: "ok", info: "CSD_Pisa.key · subida 03 mar 2025" },
    pass: { state: "ok", info: "Configurada y cifrada" } },
];

function StatusChip({ status }) {
  const s = ST[status];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: s.bg, fontSize: 10.5, fontWeight: 600, color: s.text, whiteSpace: "nowrap" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />{s.label}</span>;
}

function DocRow({ icon, title, doc, action, sensitive }) {
  const d = DOC[doc.state];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #ECECEE", borderRadius: 10, background: "white" }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: sensitive ? "#FEF2F2" : "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1F2937" }}>{title}</span>
          <span style={{ width: 15, height: 15, borderRadius: "50%", background: d.bg, color: d.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{d.icon}</span>
        </div>
        <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: doc.file ? "inherit" : "monospace", marginTop: 2 }}>{doc.file ? `${doc.file} · ${doc.info}` : doc.info}</div>
      </div>
      <button style={{ padding: "6px 12px", borderRadius: 7, border: doc.state === "missing" ? "none" : "1px solid #E5E7EB", background: doc.state === "missing" ? "#115E59" : "white", color: doc.state === "missing" ? "white" : "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>{action}</button>
    </div>
  );
}

function EmisorCard({ e }) {
  return (
    <div style={{ border: "1px solid #ECECEE", borderRadius: 12, padding: "20px 22px", background: "white" }}>
      {/* encabezado de la razón social */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F4F47" }}>{e.razon}</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}><span style={{ fontFamily: "monospace" }}>{e.rfc}</span> · {e.regimen} · CP {e.cp}</div>
          <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>Emite en {e.contratos} contrato{e.contratos !== 1 ? "s" : ""}</div>
        </div>
        <StatusChip status={e.status} />
      </div>

      {/* CSF */}
      <div style={{ fontSize: 10, fontWeight: 800, color: "#0F4F47", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Constancia de Situación Fiscal</div>
      <DocRow icon="📄" title="CSF del propietario" doc={e.csf} action="↻ Actualizar" />

      {/* CSD */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 10px" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#0F4F47", textTransform: "uppercase", letterSpacing: 0.5 }}>Certificado de Sello Digital (CSD)</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase" }}>Sensible</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <DocRow icon="📜" title="Certificado (.cer)" doc={e.cer} action="↻ Reemplazar" sensitive />
        <DocRow icon="🔑" title="Llave privada (.key)" doc={e.key} action="↻ Reemplazar" sensitive />
        <DocRow icon="🔐" title="Contraseña de la llave" doc={e.pass} action="Cambiar" sensitive />
      </div>

      {e.status === "expiring" && (
        <div style={{ fontSize: 10.5, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "8px 11px", marginTop: 12 }}>
          ⏰ El certificado vence pronto. Reemplázalo para no interrumpir la facturación de esta razón social.
        </div>
      )}
    </div>
  );
}

function FacturacionTab() {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F4F47", margin: 0 }}>Información de facturación</h2>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>Administra las razones sociales con las que emites CFDI. Cada contrato define cuál de ellas factura.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
        {EMISORES.map((e) => <EmisorCard key={e.id} e={e} />)}

        {/* agregar otra razón social */}
        <button style={{ padding: "16px", borderRadius: 12, border: "1.5px dashed #99F6E4", background: "#F0FDFA", color: "#0F766E", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>+</span> Agregar otra razón social
        </button>
      </div>
    </div>
  );
}

export default function AjustesFacturacionV3() {
  const [tab, setTab] = useState("fact");
  return (
    <div style={{ fontFamily: FONT, background: "white", minHeight: "100vh", padding: "24px 28px", color: "#1F2937" }}>
      <h1 style={{ fontSize: 19, fontWeight: 700, color: "#111827", margin: 0 }}>Ajustes</h1>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Administra tu perfil y configuración de cuenta</div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", background: "#F3F4F6", borderRadius: 9, padding: 4, marginTop: 16, width: "fit-content" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 7, border: "none", background: tab === t.id ? "white" : "transparent", color: tab === t.id ? "#111827" : "#6B7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, boxShadow: tab === t.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        {tab === "fact" ? <FacturacionTab /> : <div style={{ fontSize: 13, color: "#9CA3AF", padding: "40px 0" }}>Sección "{TABS.find((t) => t.id === tab)?.label}" (fuera del foco de este prototipo)</div>}
      </div>
    </div>
  );
}
