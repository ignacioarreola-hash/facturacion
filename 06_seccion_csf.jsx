import { useState, useMemo } from "react";

// ============================================================
// FACTURAS EMITIDAS v5 (POSTFACTURA) — Colossu / Pod-SaaS
// Botones accionables EN LA FILA según estado: XML/PDF, Emitir REP,
// Cancelar/Sustituir, Acuse. PPD muestra botón de complemento directo.
// El registro de pago (monto) se hace en panel rápido. Todo en una vista.
// ============================================================

const FONT = "'DM Sans', -apple-system, system-ui, sans-serif";
const $f = (n) => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CARGO = {
  renta:        { label: "Renta",          color: "#0F766E", bg: "#F0FDFA" },
  mantenimiento:{ label: "Mantenimiento",  color: "#1D4ED8", bg: "#EFF6FF" },
  variable:     { label: "Renta variable", color: "#7C3AED", bg: "#F5F3FF" },
  servicio:     { label: "Servicios",      color: "#B45309", bg: "#FFFBEB" },
  pago:         { label: "Complemento pago",color: "#0E7490", bg: "#ECFEFF" },
};
const TIPO = { I: { label: "Ingreso", color: "#0F766E" }, P: { label: "Pago (REP)", color: "#0E7490" }, E: { label: "Egreso (NC)", color: "#B91C1C" } };
const STAMP = {
  stamped:   { label: "Timbrada",      bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  to_emit:   { label: "REP por emitir",bg: "#ECFEFF", text: "#155E75", dot: "#06B6D4" },
  cancelling:{ label: "En cancelación",bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  cancelled: { label: "Cancelada",     bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF" },
};
const DELIV = {
  not_sent: { label: "Sin enviar", text: "#9CA3AF", dot: "#D1D5DB" },
  sent:     { label: "Enviada",    text: "#1D4ED8", dot: "#3B82F6" },
};
const FORMAS_PAGO = ["01 · Efectivo", "02 · Cheque nominativo", "03 · Transferencia electrónica", "04 · Tarjeta de crédito", "28 · Tarjeta de débito"];
const MOTIVOS = [
  "01 · Comprobante con errores con relación (sustituye)",
  "02 · Comprobante con errores sin relación",
  "03 · No se llevó a cabo la operación",
  "04 · Operación en factura global",
];

const INIT = [
  { id: "F-1042", tipoComp: "I", tipo: "renta", concepto: "Renta comercial", contractId: "CT-2025-RT-001", periodo: "Jun 2026",
    receptor: "Café Polanco SA de CV", rfc: "CPO210304K23", espacio: "Torre Fibonacci · PB-02",
    total: 110200, uuid: "A1B2C3D4-E5F6-4789-A0B1-C2D3E4F5A6B7", fecha: "18 jun 2026", metodo: "PUE",
    stamp: "stamped", deliv: "sent", saldo: 0, reps: [], relatedTo: null },
  { id: "F-1045", tipoComp: "I", tipo: "renta", concepto: "Renta de oficina", contractId: "CT-2025-OF-014", periodo: "Jun 2026",
    receptor: "Leonardo Bonacci", rfc: "BACL850720HG3", espacio: "Torre Fibonacci · Of P5-03",
    total: 95000, uuid: "D4E5F6A7-B8C9-4012-D3E4-F5A6B7C8D9E0", fecha: "18 jun 2026", metodo: "PPD",
    stamp: "stamped", deliv: "sent", saldo: 95000, reps: [], relatedTo: null },
  { id: "F-1046", tipoComp: "I", tipo: "renta", concepto: "Renta mínima garantizada", contractId: "CT-2025-RT-012", periodo: "Jun 2026",
    receptor: "Zara Retail México SA de CV", rfc: "ZRM080115AB3", espacio: "Torre Fibonacci · PB-10",
    total: 139200, uuid: "E5F6A7B8-C9D0-4123-E4F5-A6B7C8D9E0F1", fecha: "18 jun 2026", metodo: "PPD",
    stamp: "stamped", deliv: "sent", saldo: 69200, reps: [{ id: "REP-0310", uuid: "REPA1B2C3D4", monto: 70000, parcialidad: 1 }], relatedTo: null },
  { id: "F-1047", tipoComp: "I", tipo: "servicio", concepto: "Renta industrial", contractId: "CT-2025-IN-003", periodo: "Jun 2026",
    receptor: "Logística Quattro SA de CV", rfc: "LQU180925RT1", espacio: "Nave Quattro · N-04",
    total: 200200, uuid: "F6A7B8C9-D0E1-4234-F5A6-B7C8D9E0F1A2", fecha: "18 jun 2026", metodo: "PUE",
    stamp: "stamped", deliv: "not_sent", saldo: 0, reps: [], relatedTo: null },
  { id: "F-1039", tipoComp: "I", tipo: "servicio", concepto: "Energía eléctrica", contractId: "CT-2025-RT-007", periodo: "May 2026",
    receptor: "Boutique Médici", rfc: "BME150810QP9", espacio: "Torre Fibonacci · PB-05",
    total: 4872, uuid: "9Z8Y7X6W-5V4U-4321-T0S1-R2Q3P4O5N6M7", fecha: "15 jun 2026", metodo: "PUE",
    stamp: "cancelled", deliv: "sent", saldo: 0, reps: [], relatedTo: null, cancelReason: "03 · No se llevó a cabo la operación", cancelDate: "16 jun 2026" },
];

function CargoTag({ tipo }) {
  const c = CARGO[tipo];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: c.bg, color: c.color, whiteSpace: "nowrap" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />{c.label}</span>;
}
function Chip({ map, state }) {
  const s = map[state];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: s.bg ? "3px 8px" : 0, borderRadius: 20, background: s.bg || "transparent", fontSize: 10, fontWeight: 600, color: s.text, whiteSpace: "nowrap" }}>{s.dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />}{s.label}</span>;
}

// Botón de acción de fila — estilos por intención
function ActBtn({ children, onClick, kind = "default" }) {
  const styles = {
    default: { border: "1px solid #E5E7EB", background: "white", color: "#374151" },
    danger:  { border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C" },
    primary: { border: "none", background: "#0E7490", color: "white" },
    teal:    { border: "1px solid #99F6E4", background: "#F0FDFA", color: "#0F766E" },
  };
  return <button onClick={(e) => { e.stopPropagation(); onClick?.(); }} style={{ ...styles[kind], padding: "6px 11px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>{children}</button>;
}

function SectionTitle({ children, sub }) {
  return <div style={{ margin: "20px 0 12px" }}><div style={{ fontSize: 10, fontWeight: 800, color: "#0F4F47", textTransform: "uppercase", letterSpacing: 0.6 }}>{children}</div>{sub && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>{sub}</div>}</div>;
}

// Modal cancelar/sustituir
function CancelModal({ row, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState(MOTIVOS[2]);
  const [subUuid, setSubUuid] = useState("");
  const sustituye = motivo.startsWith("01");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 470, background: "white", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #ECECEE" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#991B1B" }}>Cancelar o sustituir {row.id}</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{row.receptor} · {row.concepto} · {$f(row.total)}</div>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 6 }}>Motivo (SAT)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {MOTIVOS.map((m) => (
              <label key={m} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", border: motivo === m ? "1.5px solid #14B8A6" : "1px solid #E5E7EB", borderRadius: 9, cursor: "pointer", background: motivo === m ? "#F0FDFA" : "white" }}>
                <input type="radio" checked={motivo === m} onChange={() => setMotivo(m)} style={{ accentColor: "#0F766E" }} />
                <span style={{ fontSize: 11.5, color: "#1F2937", fontWeight: motivo === m ? 600 : 400 }}>{m}</span>
              </label>
            ))}
          </div>
          {sustituye && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>UUID de la factura que sustituye</div>
              <input value={subUuid} onChange={(e) => setSubUuid(e.target.value)} placeholder="UUID, o vacío para emitir nueva luego" style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #FDE68A", borderRadius: 7, fontSize: 11, fontFamily: "monospace", outline: "none", background: "white", boxSizing: "border-box" }} />
            </div>
          )}
          <div style={{ fontSize: 10.5, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "9px 12px", lineHeight: 1.5 }}>⚠ El cargo en Cobranza vuelve a pendiente. La cancelación se solicita al SAT y puede requerir aceptación del receptor.</div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #ECECEE", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: FONT }}>No cancelar</button>
          <button onClick={() => onConfirm(row.id, motivo)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#B91C1C", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{sustituye ? "Cancelar y sustituir" : "Cancelar factura"}</button>
        </div>
      </div>
    </div>
  );
}

// Modal rápido para registrar pago + emitir REP
function PagoModal({ row, onClose, onConfirm }) {
  const [monto, setMonto] = useState(String(row.saldo));
  const [fecha, setFecha] = useState("2026-06-18");
  const [forma, setForma] = useState(FORMAS_PAGO[2]);
  const montoNum = parseFloat(monto) || 0;
  const saldoInsoluto = Math.max(0, row.saldo - montoNum);
  const parcialidad = (row.reps?.length || 0) + 1;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: "white", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #ECECEE" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F4F47" }}>Registrar pago · {row.id}</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{row.receptor} · saldo {$f(row.saldo)}</div>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 5 }}>¿Cuánto te pagaron?</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#0F766E", fontWeight: 700 }}>$</span>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} style={{ width: "100%", padding: "12px 12px 12px 28px", border: "1.5px solid #99F6E4", borderRadius: 9, fontSize: 19, fontWeight: 700, fontFamily: FONT, outline: "none", background: "white", color: "#0F4F47", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => setMonto(String(row.saldo))} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "1px solid #99F6E4", background: "#F0FDFA", color: "#0F766E", cursor: "pointer", fontFamily: FONT }}>Pago total</button>
            <button onClick={() => setMonto(String(Math.round(row.saldo / 2)))} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB", background: "white", color: "#6B7280", cursor: "pointer", fontFamily: FONT }}>Mitad</button>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 5 }}>Fecha</div>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #99F6E4", borderRadius: 8, fontSize: 12, fontFamily: FONT, outline: "none", background: "white", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1.4 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 5 }}>Forma de pago</div>
              <select value={forma} onChange={(e) => setForma(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #99F6E4", borderRadius: 8, fontSize: 11.5, fontFamily: FONT, outline: "none", background: "white", appearance: "none", boxSizing: "border-box" }}>{FORMAS_PAGO.map((o) => <option key={o}>{o}</option>)}</select>
            </div>
          </div>
          <div style={{ background: "#FCFEFF", border: "1px solid #A5F3FC", borderRadius: 9, padding: "12px 14px", marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}><span style={{ color: "#6B7280" }}>Complemento (REP)</span><span style={{ fontWeight: 600, color: "#0E7490" }}>parcialidad #{parcialidad}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}><span style={{ color: "#6B7280" }}>Saldo después</span><span style={{ fontWeight: 800, color: saldoInsoluto > 0 ? "#92400E" : "#065F46" }}>{$f(saldoInsoluto)}</span></div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #ECECEE", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
          <button onClick={() => onConfirm(row.id, { monto: montoNum, parcialidad, saldoInsoluto })} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#0E7490", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Registrar y timbrar REP</button>
        </div>
      </div>
    </div>
  );
}

// Modal rápido de nota de crédito (CFDI de egreso)
function NotaCreditoModal({ row, onClose, onConfirm }) {
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("Bonificación");
  const montoNum = parseFloat(monto) || 0;
  const excede = montoNum > row.total;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: "white", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #ECECEE" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F4F47" }}>Nota de crédito sobre {row.id}</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{row.receptor} · factura por {$f(row.total)}</div>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 14, lineHeight: 1.5 }}>Una nota de crédito disminuye el monto de una factura ya emitida (bonificación, descuento posterior, ajuste a la baja). Se relaciona al CFDI original.</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 5 }}>Monto a acreditar</div>
          <div style={{ position: "relative", marginBottom: 4 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: "#B91C1C", fontWeight: 700 }}>$</span>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "12px 12px 12px 26px", border: `1.5px solid ${excede ? "#FECACA" : "#E5E7EB"}`, borderRadius: 9, fontSize: 18, fontWeight: 700, fontFamily: FONT, outline: "none", background: "white", color: "#0F4F47", boxSizing: "border-box" }} />
          </div>
          {excede && <div style={{ fontSize: 10.5, color: "#B91C1C", marginBottom: 8 }}>El monto no puede exceder el total de la factura ({$f(row.total)}).</div>}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 5 }}>Motivo</div>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontFamily: FONT, outline: "none", background: "white", appearance: "none", boxSizing: "border-box" }}>
              {["Bonificación", "Descuento posterior", "Ajuste de renta variable a la baja", "Devolución parcial"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #ECECEE", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "white", fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
          <button onClick={() => !excede && montoNum > 0 && onConfirm(row.id, { monto: montoNum, motivo })} disabled={excede || montoNum <= 0} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: excede || montoNum <= 0 ? "#D1D5DB" : "#0F766E", color: "white", fontSize: 12, fontWeight: 700, cursor: excede || montoNum <= 0 ? "not-allowed" : "pointer", fontFamily: FONT }}>Emitir nota de crédito</button>
        </div>
      </div>
    </div>
  );
}

const G = "92px 1.3fr 1fr 116px 104px 108px 86px 200px";

export default function FacturasEmitidasV5() {
  const [rows, setRows] = useState(INIT);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [ncTarget, setNcTarget] = useState(null);
  const [filter, setFilter] = useState("all");

  const doPago = (id, pago) => {
    setRows((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const newRep = { id: "REP-0" + (312 + r.reps.length), uuid: "REP" + Math.random().toString(36).slice(2, 10).toUpperCase(), monto: pago.monto, parcialidad: pago.parcialidad };
      return { ...r, saldo: pago.saldoInsoluto, reps: [...r.reps, newRep] };
    }));
    setPayTarget(null);
  };
  const doCancel = (id, motivo) => {
    setCancelTarget(null);
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, stamp: "cancelling" } : r));
    setTimeout(() => setRows((rs) => rs.map((r) => r.id === id ? { ...r, stamp: "cancelled", cancelReason: motivo, cancelDate: "18 jun 2026" } : r)), 600);
  };
  const doSend = (id) => setRows((rs) => rs.map((r) => r.id === id ? { ...r, deliv: "sent" } : r));
  const doNotaCredito = (id, data) => {
    setNcTarget(null);
    setRows((rs) => {
      const orig = rs.find((r) => r.id === id);
      const nc = {
        id: "NC-0" + (200 + rs.filter((r) => r.tipoComp === "E").length), tipoComp: "E", tipo: orig.tipo,
        concepto: "Nota de crédito · " + orig.concepto, contractId: orig.contractId, periodo: orig.periodo,
        receptor: orig.receptor, rfc: orig.rfc, espacio: orig.espacio, total: data.monto,
        uuid: "NC" + Math.random().toString(36).slice(2, 10).toUpperCase(), fecha: "18 jun 2026", metodo: "—",
        stamp: "stamped", deliv: "not_sent", saldo: 0, reps: [], relatedTo: id,
      };
      return [...rs, nc];
    });
  };

  const filtered = useMemo(() => {
    if (filter === "por_cobrar") return rows.filter((r) => r.metodo === "PPD" && r.saldo > 0 && r.stamp === "stamped");
    if (filter === "cancelled") return rows.filter((r) => r.stamp === "cancelled");
    if (filter === "active") return rows.filter((r) => r.stamp === "stamped");
    return rows;
  }, [rows, filter]);

  const stats = useMemo(() => ({
    total: rows.length,
    porCobrar: rows.filter((r) => r.metodo === "PPD" && r.saldo > 0 && r.stamp === "stamped").length,
    saldoTotal: rows.reduce((a, r) => a + (r.metodo === "PPD" && r.stamp === "stamped" ? r.saldo : 0), 0),
    cancelled: rows.filter((r) => r.stamp === "cancelled").length,
  }), [rows]);

  return (
    <div style={{ fontFamily: FONT, background: "#FAFAFB", minHeight: "100vh", padding: "24px 28px", color: "#1F2937" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#14B8A6", letterSpacing: 0.5, textTransform: "uppercase" }}>Cobranza · Facturación</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F4F47", margin: "4px 0 0" }}>Facturas emitidas</h1>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>Acciones directas: descargar, emitir complemento, cancelar o sustituir</div>
        </div>
        {stats.porCobrar > 0 && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, padding: "8px 14px", textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#92400E", fontWeight: 600 }}>POR COBRAR ({stats.porCobrar})</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#92400E" }}>{$f(stats.saldoTotal)}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, margin: "18px 0 12px", flexWrap: "wrap" }}>
        {[["all", `Todas ${stats.total}`], ["por_cobrar", `Por cobrar ${stats.porCobrar}`], ["active", "Activas"], ["cancelled", `Canceladas ${stats.cancelled}`]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 13px", borderRadius: 8, border: filter === k ? "1.5px solid #14B8A6" : "1px solid #E5E7EB", background: filter === k ? "#F0FDFA" : "white", fontSize: 11.5, fontWeight: 600, color: filter === k ? "#0F766E" : "#6B7280", cursor: "pointer", fontFamily: FONT }}>{l}</button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #ECECEE", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: G, padding: "11px 18px", borderBottom: "1px solid #ECECEE", background: "#FAFAFB" }}>
          {["Folio / tipo", "Concepto", "Receptor", "Contrato", "Total", "Estado fiscal", "Entrega", "Acciones"].map((h, i) => (
            <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, textAlign: i === 7 ? "right" : "left" }}>{h}</div>
          ))}
        </div>

        {filtered.map((r) => {
          const cancelled = r.stamp === "cancelled";
          const cancelling = r.stamp === "cancelling";
          const esPPD = r.metodo === "PPD";
          const tieneSaldo = r.saldo > 0;
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: G, padding: "13px 18px", borderBottom: "1px solid #F3F4F6", alignItems: "center", opacity: cancelled ? 0.6 : 1 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1F2937" }}>{r.id}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: TIPO[r.tipoComp].color, textTransform: "uppercase" }}>{TIPO[r.tipoComp].label}</div>
                <span style={{ fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: esPPD ? "#F5F3FF" : "#F0FDFA", color: esPPD ? "#5B21B6" : "#0F766E" }}>{r.metodo}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ marginBottom: 3 }}><CargoTag tipo={r.tipo} /></div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.concepto}</div>
                {r.relatedTo && <div style={{ fontSize: 9, color: "#0E7490", fontWeight: 600 }}>↩ {r.relatedTo}</div>}
                {esPPD && tieneSaldo && !cancelled && <div style={{ fontSize: 9.5, color: "#92400E", fontWeight: 600 }}>saldo {$f(r.saldo)}</div>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.receptor}</div>
                <div style={{ fontSize: 9.5, color: "#9CA3AF", fontFamily: "monospace" }}>{r.rfc}</div>
              </div>
              <div><a href={`https://app.colossu.com/contratos/${r.contractId}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 5, padding: "1px 6px", textDecoration: "none", whiteSpace: "nowrap" }}>🔗 {r.contractId} ↗</a></div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F4F47" }}>{$f(r.total)}</div>
              <div><Chip map={STAMP} state={r.stamp} /></div>
              <div>{cancelled || cancelling ? <span style={{ fontSize: 10, color: "#D1D5DB" }}>—</span> : <Chip map={DELIV} state={r.deliv} />}</div>
              {/* ACCIONES EN LA FILA */}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {cancelled && <ActBtn>Acuse</ActBtn>}
                {cancelling && <span style={{ fontSize: 10, color: "#92400E" }}>procesando…</span>}
                {!cancelled && !cancelling && <>
                  <ActBtn>PDF</ActBtn>
                  <ActBtn>XML</ActBtn>
                  {r.deliv === "not_sent" && <ActBtn kind="teal" onClick={() => doSend(r.id)}>✉ Enviar</ActBtn>}
                  {esPPD && tieneSaldo && <ActBtn kind="primary" onClick={() => setPayTarget(r)}>Emitir REP</ActBtn>}
                  {r.tipoComp === "I" && <ActBtn onClick={() => setNcTarget(r)}>Nota de crédito</ActBtn>}
                  <ActBtn kind="danger" onClick={() => setCancelTarget(r)}>Cancelar</ActBtn>
                </>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>Sin facturas en este filtro</div>}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center", flexWrap: "wrap", fontSize: 10.5, color: "#9CA3AF" }}>
        <span style={{ fontWeight: 700, textTransform: "uppercase" }}>Acciones por estado:</span>
        <span>PUE → descargar y cancelar</span><span>·</span>
        <span style={{ color: "#0E7490" }}>PPD con saldo → "Emitir REP"</span><span>·</span>
        <span>Cancelada → acuse</span>
        <span style={{ marginLeft: "auto" }}>Todo se archiva en Fiscalapi · referencia ligada al contrato en Colossu</span>
      </div>

      {payTarget && <PagoModal row={rows.find((r) => r.id === payTarget.id)} onClose={() => setPayTarget(null)} onConfirm={doPago} />}
      {ncTarget && <NotaCreditoModal row={ncTarget} onClose={() => setNcTarget(null)} onConfirm={doNotaCredito} />}
      {cancelTarget && <CancelModal row={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={doCancel} />}
    </div>
  );
}
