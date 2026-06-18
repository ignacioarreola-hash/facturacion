import { useState } from "react";

// ============================================================
// SECCIÓN FISCAL DEL CONTRATO — Gestión de CSF v1 · Colossu
// Acceso desde contrato · CSF guardada a nivel ENTIDAD
// Carga con OCR (extrae RFC, régimen, CP, tipo persona) → confirmar
// CSD se gestiona aparte en onboarding del emisor (no aquí)
// Estética Attio-like: teal-700 #115E59, neutros, DM Sans
// ============================================================

const FONT = "'DM Sans', -apple-system, system-ui, sans-serif";

// Estado de la CSF
const CSF_ST = {
  valid:   { label: "Vigente",    bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  expiring:{ label: "Por vencer", bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  missing: { label: "Faltante",   bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
  expired: { label: "Vencida",    bg: "#FEF2F2", text: "#991B1B", dot: "#EF4444" },
};

// Datos del contrato de ejemplo (Bonacci / Torre Fibonacci)
const CONTRACT = {
  id: "CT-2025-RT-001", espacio: "Torre Fibonacci · Local PB-02",
  receptor: {
    rol: "Receptor (inquilino)", razon: "Café Polanco SA de CV", rfc: "CPO210304K23",
    regimen: "601 · General de Ley Personas Morales", cp: "11560", tipo: "PM",
    csf: { status: "valid", file: "CSF_CafePolanco_2026.pdf", uploaded: "12 ene 2026", source: "OCR confirmado",
           otrosContratos: 1 },
  },
  emisor: {
    rol: "Emisor (propietario)", razon: "Inmobiliaria Bonacci SA de CV", rfc: "IBO190315KL8",
    regimen: "601 · General de Ley Personas Morales", cp: "06700", tipo: "PM",
    csf: { status: "expiring", file: "CSF_Bonacci_2025.pdf", uploaded: "03 mar 2025", source: "OCR confirmado",
           expiresIn: "23 días", otrosContratos: 14 },
  },
};

function CsfChip({ status }) {
  const s = CSF_ST[status];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: s.bg, fontSize: 10.5, fontWeight: 600, color: s.text, whiteSpace: "nowrap" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />{s.label}</span>;
}

function SrcBadge({ children }) {
  return <span style={{ fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", textTransform: "uppercase", letterSpacing: 0.3 }}>{children}</span>;
}

// ── Modal de carga con OCR ──
function UploadModal({ party, onClose, onConfirm }) {
  const [stage, setStage] = useState("upload"); // upload | processing | confirm
  const [ocr, setOcr] = useState(null);

  const simulateOcr = () => {
    setStage("processing");
    setTimeout(() => {
      setOcr({ rfc: party.rfc, razon: party.razon, regimen: party.regimen, cp: party.cp, tipo: party.tipo });
      setStage("confirm");
    }, 1400);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, background: "white", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #ECECEE" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 }}>{party.rol}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F4F47", marginTop: 3 }}>Actualizar Constancia de Situación Fiscal</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{party.razon}</div>
        </div>

        <div style={{ padding: "22px" }}>
          {stage === "upload" && (
            <>
              <div onClick={simulateOcr} style={{ border: "2px dashed #99F6E4", borderRadius: 12, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "#F0FDFA" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F766E" }}>Arrastra o haz clic para subir la CSF</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>PDF de la Constancia (SAT) · máx. 10 MB</div>
              </div>
              <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 12, lineHeight: 1.5 }}>
                Se extraerán automáticamente RFC, razón social, régimen fiscal, código postal y tipo de persona. Tú confirmas antes de guardar.
              </div>
            </>
          )}

          {stage === "processing" && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #E5E7EB", borderTopColor: "#14B8A6", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F4F47" }}>Leyendo la constancia…</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>Extrayendo datos fiscales con OCR</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {stage === "confirm" && ocr && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", background: "#ECFDF5", borderRadius: 8 }}>
                <span style={{ fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 11.5, color: "#065F46", fontWeight: 600 }}>Datos extraídos. Revisa y confirma antes de guardar.</span>
              </div>
              {[["RFC", "rfc"], ["Razón social", "razon"], ["Régimen fiscal", "regimen"], ["Código postal", "cp"], ["Tipo de persona", "tipo"]].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
                    <SrcBadge>OCR</SrcBadge>
                  </div>
                  <input defaultValue={ocr[key]} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #99F6E4", borderRadius: 7, fontSize: 12, fontFamily: FONT, outline: "none", background: "#F0FDFA", color: "#134E4A", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "8px 11px", marginTop: 6, lineHeight: 1.5 }}>
                ℹ Esta CSF se guardará a nivel de <strong>{party.razon}</strong> y aplicará a todos sus contratos en Colossu.
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #ECECEE", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
          {stage === "confirm" && <button onClick={onConfirm} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#115E59", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Guardar CSF</button>}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de una parte (receptor o emisor) ──
function PartyCard({ party, onUpload }) {
  const csf = party.csf;
  const s = CSF_ST[csf.status];

  return (
    <div style={{ border: "1px solid #ECECEE", borderRadius: 12, padding: "18px 20px", background: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#14B8A6", textTransform: "uppercase", letterSpacing: 0.5 }}>{party.rol}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F4F47", marginTop: 3 }}>{party.razon}</div>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6B7280", marginTop: 2 }}>{party.rfc}</div>
        </div>
        <CsfChip status={csf.status} />
      </div>

      {/* datos fiscales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", padding: "12px 14px", background: "#FAFAFB", borderRadius: 9, marginBottom: 14 }}>
        <div><div style={{ fontSize: 8.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Régimen</div><div style={{ fontSize: 11, color: "#1F2937", marginTop: 1 }}>{party.regimen}</div></div>
        <div><div style={{ fontSize: 8.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Código postal</div><div style={{ fontSize: 11, color: "#1F2937", marginTop: 1 }}>{party.cp}</div></div>
        <div><div style={{ fontSize: 8.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Tipo persona</div><div style={{ fontSize: 11, color: "#1F2937", marginTop: 1 }}>{party.tipo === "PM" ? "Persona Moral" : "Persona Física"}</div></div>
        <div><div style={{ fontSize: 8.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Aplica a</div><div style={{ fontSize: 11, color: "#1F2937", marginTop: 1 }}>{csf.otrosContratos + 1} contrato{csf.otrosContratos > 0 ? "s" : ""}</div></div>
      </div>

      {/* archivo CSF */}
      {csf.status !== "missing" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #ECECEE", borderRadius: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{csf.file}</div>
            <div style={{ fontSize: 9.5, color: "#9CA3AF" }}>Subida {csf.uploaded} · {csf.source}{csf.status === "expiring" ? ` · vence en ${csf.expiresIn}` : ""}</div>
          </div>
          <button style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid #E5E7EB", background: "white", fontSize: 10, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: FONT }}>Ver</button>
        </div>
      ) : (
        <div style={{ padding: "12px 14px", border: "1.5px dashed #FECACA", borderRadius: 9, background: "#FEF2F2", fontSize: 11, color: "#991B1B" }}>
          No hay CSF cargada. Es necesaria para poder facturar.
        </div>
      )}

      {csf.status === "expiring" && (
        <div style={{ fontSize: 10.5, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "8px 11px", marginTop: 10 }}>
          ⏰ Esta constancia vence pronto. Pide la actualizada para no interrumpir la facturación.
        </div>
      )}

      <button onClick={() => onUpload(party)} style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 8, border: csf.status === "missing" ? "none" : "1px solid #115E59", background: csf.status === "missing" ? "#115E59" : "white", color: csf.status === "missing" ? "white" : "#115E59", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
        {csf.status === "missing" ? "↑ Subir CSF" : "↻ Actualizar CSF"}
      </button>
    </div>
  );
}

export default function SeccionCsfContrato() {
  const [modal, setModal] = useState(null);

  return (
    <div style={{ fontFamily: FONT, background: "#FAFAFB", minHeight: "100vh", padding: "24px 28px", color: "#1F2937" }}>
      {/* breadcrumb / contexto del contrato */}
      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
        Contratos · <a href={`https://app.colossu.com/contratos/${CONTRACT.id}`} style={{ color: "#B45309", textDecoration: "none", fontWeight: 600 }}>{CONTRACT.id}</a> · Documentos fiscales
      </div>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F4F47", margin: 0 }}>Documentos fiscales</h1>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{CONTRACT.espacio} · constancias necesarias para facturar este contrato</div>
      </div>

      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, padding: "9px 14px", margin: "16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#1D4ED8" }}>
        <span style={{ fontSize: 13 }}>ℹ</span>
        Las constancias se guardan a nivel de cada empresa, no del contrato. Si actualizas una CSF aquí, se actualiza en todos los contratos de esa empresa.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <PartyCard party={CONTRACT.receptor} onUpload={setModal} />
        <PartyCard party={CONTRACT.emisor} onUpload={setModal} />
      </div>

      <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 18, lineHeight: 1.6 }}>
        El <strong>Certificado de Sello Digital (CSD)</strong> del emisor —necesario para timbrar— se gestiona por separado en la configuración de la empresa, no en esta vista.
      </div>

      {modal && <UploadModal party={modal} onClose={() => setModal(null)} onConfirm={() => setModal(null)} />}
    </div>
  );
}
