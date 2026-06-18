const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const protos = [
  { file: '01_ajustes_emisor.jsx', title: 'Ajustes · Facturación (Emisor)', comp: 'AjustesFacturacionV3' },
  { file: '02_datos_inquilino.jsx', title: 'Datos de Facturación (Inquilino)', comp: 'DatosFacturacionInquilinoV2' },
  { file: '03_prefacturacion.jsx', title: 'Prefacturación', comp: 'VistaPrefacturacion' },
  { file: '04_facturas_emitidas.jsx', title: 'Facturas Emitidas', comp: 'FacturasEmitidasV5' },
  { file: '05_registrar_pago.jsx', title: 'Registrar Pago → REP', comp: 'ModalRegistrarPagoRep' },
  { file: '06_seccion_csf.jsx', title: 'Sección CSF (desde Contrato)', comp: 'SeccionCsfContrato' },
];

const dir = path.join(__dirname, 'prototipos');

protos.forEach(p => {
  let code = fs.readFileSync(path.join(dir, p.file), 'utf8');
  // strip imports
  code = code.replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  // export default function X -> function X
  code = code.replace(/export\s+default\s+function/, 'function');
  // pre-compile JSX
  const compiled = babel.transformSync(code, { presets: [['@babel/preset-react', { runtime: 'classic', development: false }]], filename: p.file }).code;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.title} · Colossu</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet">
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'DM Sans', sans-serif; background: #FAFAFB; }
  .topbar { position: sticky; top: 0; z-index: 100; background: white; border-bottom: 1px solid #ECECEE; padding: 12px 20px; display: flex; align-items: center; gap: 14px; }
  .topbar a { font-size: 13px; font-weight: 600; color: #0F766E; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .topbar .crumb { font-size: 12px; color: #9CA3AF; }
  .topbar .badge { margin-left: auto; font-size: 10px; font-weight: 700; color: #B45309; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 5px; padding: 3px 9px; text-transform: uppercase; }
</style>
</head>
<body>
<div class="topbar">
  <a href="../index.html">← Volver al flujo</a>
  <span class="crumb">Conector de Facturación · ${p.title}</span>
  <span class="badge">Prototipo</span>
</div>
<div id="root"></div>
<script>
const { useState, useMemo, useReducer, useEffect, useRef } = React;
${compiled}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${p.comp}));
</script>
</body>
</html>`;

  const outName = p.file.replace('.jsx', '.html');
  fs.writeFileSync(path.join(dir, outName), html);
  console.log('✓ ' + outName);
});
console.log('Build completo.');
