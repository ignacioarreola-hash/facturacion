# [RFC][WIP][SWARCH] Conector de Facturación CFDI 4.0 (Colossu)

**Authors:**

- @nacho (Product — Pod-SaaS)

**Reviewers sugeridos:** @gabriel (frontend), @dante (Tech Lead), @josue (backend)

---

## 1 Executive Summary

Colossu se conecta a un PAC (Proveedor Autorizado de Certificación) para que nuestros clientes —desarrolladores inmobiliarios y administradores de portafolio— emitan, gestionen y entreguen sus CFDI directamente desde la plataforma, aprovechando que ya tenemos el dato de sus cargos y pagos en el módulo de Cobranza.

El conector cubre el ciclo fiscal completo del arrendamiento: emisión de la factura de ingreso, complemento de pago (REP) para cobros diferidos, cancelación/sustitución y nota de crédito. Colossu **nunca timbra**: el PAC (Fiscalapi para esta fase) sella, timbra ante el SAT y archiva los documentos por 5 años. Colossu captura el dato mínimo en el momento correcto del flujo, mapea hacia el PAC, y guarda una referencia (UUID) ligada al contrato para operar y dar trazabilidad.

El principio rector: cada evento que ya capturamos en Cobranza es un disparador de facturación. No inventamos eventos nuevos; conectamos los existentes al PAC.

## 2 Motivation

La facturación es un dolor operativo recurrente para nuestros clientes: hoy la resuelven fuera de Colossu, recapturando manualmente datos que ya viven en sus contratos y en su cobranza. Esto rompe la tesis de Colossu como sistema operativo indispensable: si el cliente sale de la plataforma para facturar, debilitamos el moat.

Tenemos una ventaja única: ya poseemos el dato de qué se cobra (cargos), a quién (inquilino), bajo qué condiciones (contrato) y cuándo se paga (Cobranza). Convertir eso en facturación es un paso natural que:

- Elimina recaptura y errores de transcripción fiscal.
- Cierra el ciclo cobranza → facturación dentro de Colossu.
- Refuerza la indispensabilidad: el cliente factura donde ya opera.

El valor no es el XML (es commodity, cualquier PAC lo genera). El valor es la relación entre ese XML y nuestro mundo operativo: contrato, saldo, inquilino, historial. Eso vive en Colossu y no es exportable.

## 3 Proposed Implementation

### 3.1 Modelo de roles: qué hace el PAC vs. qué hace Colossu

| Responsabilidad | PAC (Fiscalapi) | Colossu |
|---|---|---|
| Sellar y timbrar ante el SAT | ✅ | — |
| Archivar XML/PDF (5 años) | ✅ | — |
| Catálogos SAT (formas de pago, claves, regímenes) | ✅ (se consultan) | — |
| Validar coherencia fiscal (cadena de saldos, EFOS) | ✅ | — |
| Capturar el hecho operativo (cuánto se cobró, cómo, cuándo) | — | ✅ |
| Mapear datos del contrato/cobranza al payload | — | ✅ |
| Llevar el saldo insoluto de cada PPD | — | ✅ (Cobranza = libro mayor) |
| Guardar referencia (UUID) ligada al contrato | — | ✅ |

**Punto crítico de arquitectura:** el saldo de las facturas PPD lo lleva Colossu, no el PAC. La documentación de Fiscalapi confirma que el complemento de pago requiere que nosotros enviemos saldo anterior, importe pagado y saldo insoluto; el PAC valida que la cadena cuadre, pero el estado vive en nuestro sistema. Esto coincide con que Cobranza ya es el libro mayor de quién debe cuánto.

### 3.2 El ciclo completo y sus disparadores

Cada documento fiscal nace de un evento que ya existe en Colossu:

| Documento | Tipo CFDI | Disparador en Colossu | Dato nuevo a capturar |
|---|---|---|---|
| Factura de renta | I (Ingreso) | Emisión de prefactura (día x) | Ninguno (ya está en contrato + prefactura) |
| Complemento de pago | P (REP) | Registrar pago de una PPD | Forma de pago real + referencia |
| Nota de crédito | E (Egreso) | Acción sobre factura emitida | Monto a acreditar + motivo |
| Cancelación / sustitución | — | Acción sobre factura emitida | Motivo SAT (01–04) + UUID sustituto si aplica |

### 3.3 Paso 0 — Configuración fiscal (onboarding)

**Emisor (propietario) — vive en Ajustes › Facturación.** Es configuración de cuenta, se hace una vez. Soporta múltiples razones sociales (un propietario puede tener varias SA de CV en su portafolio). Cada razón social administra:

- Su CSF (Constancia de Situación Fiscal): define sus datos fiscales como emisor. Se procesa por OCR (mismo motor que ContractsAI) para extraer RFC, razón social, régimen, CP.
- Su CSD (Certificado de Sello Digital: .cer, .key, contraseña): lo que firma y timbra. Se carga cifrado al PAC; Colossu nunca lo expone. **No pasa por OCR.**

El contrato define qué razón social emite cada factura (se elige al crear el contrato).

**Receptor (inquilino) — vive en Contract 360 › Cobranza › Datos de facturación.** Es dato del tercero, se opera donde el usuario trabaja. Incluye:

- CSF del inquilino, guardada **a nivel entidad** (no por contrato): si el inquilino tiene varios contratos, su CSF es una sola compartida. Acceso desde el contrato, almacenamiento a nivel entidad.
- Configuración de cómo se le factura: uso de CFDI, método de pago habitual (PUE/PPD), forma de pago, condiciones de pago. Estos valores pre-llenan la prefacturación.

**Distinción clave:** CSF da datos (entra por OCR). CSD da capacidad de timbrar (se carga al PAC). Ambos viven en onboarding, no en la operación diaria.

### 3.4 Prefacturación (día x-1)

El sistema arma las prefacturas del día siguiente desde los cargos de Cobranza y notifica al usuario (notificación día x-1), dándole una ventana de revisión antes del timbrado.

- **Modelo: 1 cargo = 1 CFDI.** Cada cargo (renta, mantenimiento, renta variable/excedente, servicios, penalización) es una factura independiente con su enlace a su contrato origen.
- Vista de tabla maestra con cada cargo como fila; panel de detalle editable al hacer click.
- El origen de cada dato es visible: Contrato, CSF, Sistema, Editable.
- El usuario puede editar campos, agregar notas, o **excluir** cargos (condonaciones, excepciones).
- Validación previa antes de timbrar: RFC válido, no en lista negra (69-B / EFOS), y CP del receptor coincide con su CSF.
- PUE vs PPD se hereda del contrato y se puede ajustar por excepción en la prefactura.

### 3.5 Emisión (día x)

El sistema escanea las prefacturas no excluidas, valida, y las envía a Fiscalapi (una llamada por factura). Fiscalapi timbra y devuelve UUID + XML + PDF. Colossu guarda la referencia ligada al cargo y al contrato.

Modo de integración recomendado: **por referencias** (alta única de emisor y receptor; cada factura envía solo IDs + monto), para minimizar el payload por timbrado.

### 3.6 Entrega al inquilino

Para esta fase, el envío de la factura (XML + PDF) al correo del receptor se realiza **vía Fiscalapi** (su endpoint de email). Decisión pragmática para acelerar el beta sin construir infraestructura de entregabilidad. El correo del receptor sale de su configuración de facturación.

*Evolución futura (fuera de scope de esta fase):* migrar la entrega a canal propio de Colossu con identidad del tenant, y sumar WhatsApp como canal operativo, alineado con el módulo de Difusión y el motor de notificaciones existente.

### 3.7 Complemento de pago (REP) — semiautomático

Aplica solo a facturas PPD (el caso típico de renta comercial: facturas la renta y cobras después).

- El usuario registra el pago **desde la vista de Facturas emitidas**: abre la factura PPD, captura cuánto le pagaron (con atajos "pago total / mitad"), fecha y forma de pago real.
- El catálogo de formas de pago se consulta de Fiscalapi; el usuario solo elige la real.
- El sistema calcula parcialidad, saldo anterior y saldo insoluto (la cadena de saldos vive en Colossu).
- Al confirmar, se timbra el REP ligado al UUID de la factura original.
- Una factura PPD puede tener varios REP (uno por cada abono) hasta que el saldo insoluto llega a cero.

El registro del pago baja cuentas por cobrar (esto es "Registrar Pago", Fase 1). La conciliación bancaria contra el estado de cuenta ("Conciliar", vía Syncfy) es Fase 2 y es una operación distinta — no confundir.

### 3.8 Cancelación, sustitución y nota de crédito

Todas son acciones directas sobre una factura emitida, desde la misma vista de Facturas emitidas (botones accionables en la fila):

- **Cancelación:** modal que pide motivo SAT (01–04). Si el motivo es 01 (con relación), pide el UUID que sustituye. La solicitud va al SAT vía Fiscalapi y puede requerir aceptación del receptor. Al cancelar, el cargo asociado en Cobranza vuelve a estado pendiente para decidir si se re-factura.
- **Nota de crédito (egreso):** modal que pide monto a acreditar (no puede exceder el total de la factura) y motivo (bonificación, descuento posterior, ajuste de renta variable a la baja, devolución parcial). Genera un CFDI tipo E ligado a la factura origen.

### 3.9 Almacenamiento

Doble ubicación, sin duplicar el archivo pesado:

- **Fiscalapi:** archiva el documento fiscal completo (XML/PDF/UUID) por 5 años, recuperable por API.
- **Colossu:** guarda la referencia ligera — UUID + ligas a contrato, cargo, inquilino, tipo, monto, estado, saldo insoluto. Esto permite ver y operar los comprobantes desde dos lados: la vista de Facturas emitidas y el Contract 360, porque la liga al contrato vive en nuestro dato.

### 3.10 Decisiones de producto (binding)

1. **CSD por vencer:** el sistema avisa antes del vencimiento del certificado. Si el CSD ya venció al llegar el día x, **no se envía la prefactura** de los contratos de esa razón social y se notifica al usuario.
2. **Dependencia entre cargos:** cuando un cargo depende de otro del mismo contrato (ej. penalización que depende de la renta), van **atados** — no se emiten por separado. Si el cargo base se bloquea, el dependiente también.
3. **Moneda USD + tipo de cambio:** la capacidad ya existe en el sistema. Solo se requiere definir la moneda y el tipo de cambio (Banxico) al momento de emitir/enviar la factura.

## 4 Metrics & Dashboards

Métricas a instrumentar desde el día 1:

- **Adopción:** % de cuentas activas que emiten al menos 1 CFDI por Colossu en 2 semanas post-launch.
- **Volumen:** CFDI emitidos por tipo (ingreso / REP / egreso) y por tenant.
- **Recurrencia operativa (North Star):** % de cargos facturados vía Colossu vs. total de cargos (mide si reemplazamos su flujo externo).
- **Salud del flujo:** tasa de rechazo de timbrado por el PAC, tiempo de timbrado, tasa de cancelaciones.
- **Cobertura PPD:** % de pagos PPD con su REP emitido (mide cumplimiento fiscal asistido).
- **Costo:** timbres consumidos por tenant (línea de gasto principal del conector).

## 5 Drawbacks

- **Dependencia de un PAC externo:** disponibilidad y rate limits de Fiscalapi nos afectan, sobre todo en cobranza masiva de fin de mes. Mitigación: abstracción propia de PAC para poder cambiar de proveedor sin reescribir el módulo.
- **Costo por timbre:** el cobro es por timbre consumido; en un esquema agregador con cientos de cargos al mes por cliente, es la línea de gasto principal. Requiere modelar pricing antes de escalar.
- **Complejidad fiscal del arrendamiento:** retenciones (PF→PM), renta variable, PPD con parcialidades. Errores de mapeo generan rechazos del SAT.
- **Responsabilidad del saldo:** al llevar nosotros el saldo de la PPD, un error en la cadena de saldos invalida complementos. Requiere validación cuidadosa antes de timbrar.

## 6 Alternatives

- **Autofactura (portal del inquilino):** el inquilino captura su RFC en un portal con marca del cliente. Menos integración, más fricción, no aprovecha que ya tenemos el dato. Descartada como modelo principal.
- **Construir timbrado propio (ser PAC):** inviable — requiere certificación ante el SAT, infraestructura y mantenimiento regulatorio. El PAC es la opción correcta.
- **Otro PAC (Facturapi, gigstack):** evaluados. Fiscalapi se elige para prototipos por SDK multi-lenguaje (incluye Python para Django), complementos nativos desde JSON, multi-RFC y almacenamiento 5 años. La abstracción propia mantiene la puerta abierta a cambiar.

## 7 Potential Impact and Dependencies

**Sistemas y equipos afectados:**

- **Módulo Cobranza:** es el origen de los disparadores. El evento Registrar Pago debe capturar forma de pago real + referencia (hoy solo captura monto y fecha).
- **ContractsAI / OCR (Dante):** se reutiliza el motor para procesar las CSF. No es infraestructura nueva.
- **Contract 360:** nueva sub-sección "Datos de facturación" bajo Cobranza, y las facturas emitidas visibles ligadas al contrato.
- **Ajustes:** nueva tab "Facturación" para el onboarding del emisor multi-razón social.

**Gobernanza y seguridad:**

- **RBAC:** se requieren permisos nuevos por cada acción sensible (excluir cargo, condonar, cancelar, emitir REP, emitir nota de crédito). *Solo se mencionan en este RFC; no se crean aún.* Conecta con SAAS-1365 (RBAC granular).
- **Audit log:** debe registrarse quién realizó cada acción (excluir, editar uso de CFDI, cancelar, emitir). Se integra como parte del activity log.
- **CSD:** dato sensible; se almacena cifrado en el PAC, Colossu nunca lo expone ni lo descarga.

**Cumplimiento (revisar con Legal/Tatiana):** CFDI 4.0, manejo de CSD, conservación de comprobantes.

## 8 Unresolved questions

Preguntas abiertas para due diligence con el PAC (llamada pendiente):

- ¿Fiscalapi expone un endpoint de consulta de saldo/parcialidades de una PPD para reconciliar nuestra cadena contra la suya antes de timbrar?
- Política de reintento ante error de timbrado: ¿automático con backoff o manual? ¿Qué rate limit en cobranza masiva de fin de mes?
- Soporte exacto del complemento de pago de arrendamiento bajo el esquema multi-organización.
- Pricing a escala multi-tenant: ¿hay tier para plataformas/agregadores? ¿Podemos marginar timbres?
- Ambiente de pruebas que no consuma timbres (para QA).
- Tiempo y rate limit de la API de recuperación de documentos.

## 9 Conclusion

Es el momento correcto porque ya tenemos el activo difícil de replicar: el dato de cargos y pagos en Cobranza. El conector de facturación lo convierte en un cierre de ciclo que refuerza la indispensabilidad de Colossu, con un esfuerzo acotado (no construimos timbrado, conectamos eventos existentes a un PAC). Los prototipos del ciclo completo ya existen y validan el flujo de punta a punta; este RFC define el "qué" para que el equipo defina el "cómo".

---

## Anexo: Prototipos de referencia

El ciclo completo está prototipado (JSX). Cada uno corresponde a una etapa del flujo:

1. **Ajustes › Facturación (emisor multi-razón social):** onboarding de CSF + CSD del propietario.
2. **Contract 360 › Datos de facturación (inquilino):** CSF del inquilino + configuración de facturación.
3. **Prefacturación:** tabla maestra de cargos (1 cargo = 1 CFDI), edición, exclusión, validación.
4. **Facturas emitidas (hub de postfactura):** descarga XML/PDF, envío, emisión de REP, cancelación/sustitución, nota de crédito — todo accionable desde la fila.
5. **Modal Registrar Pago:** captura del pago real que prepara el REP.
