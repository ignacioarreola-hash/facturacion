# Conector de Facturación CFDI 4.0 — Colossu

Roadmap interactivo y prototipos del conector de facturación de Colossu (Pod-SaaS, Spot2).

## Ver el flujo

Abre `index.html` — es una página con el flujo completo donde cada paso es clickeable y abre el prototipo de esa pantalla.

## Estructura

```
index.html                      → flujo clickeable (página principal)
RFC.md                          → RFC completo del conector
prototipos/
  01_ajustes_emisor.html        → Ajustes › Facturación (emisor multi-razón social)
  02_datos_inquilino.html       → Datos de facturación del inquilino (Contract 360)
  03_prefacturacion.html        → Prefacturación (tabla maestra, 1 cargo = 1 CFDI)
  04_facturas_emitidas.html     → Hub postfactura (REP, cancelar, NC, enviar)
  05_registrar_pago.html        → Modal de registrar pago → REP
  06_seccion_csf.html           → Sección CSF accedida desde contrato
  *.jsx                         → fuentes JSX de cada prototipo
build.js                        → compila los .jsx a .html standalone
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube todos estos archivos.
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. En 1–2 minutos estará en `https://<usuario>.github.io/<repo>/`.

El workflow en `.github/workflows/deploy.yml` también lo publica automáticamente en cada push a `main`.

## Regenerar los prototipos

Si editas un `.jsx`:

```bash
npm install @babel/core @babel/preset-react
node build.js
```

## Notas

- Los prototipos son standalone (React vía CDN, JSX pre-compilado). No requieren servidor ni build en el cliente.
- Datos ficticios canónicos (Bonacci / Torre Fibonacci).
- Colossu nunca timbra: el PAC (Fiscalapi) sella ante el SAT; Colossu guarda la referencia ligada al contrato.
