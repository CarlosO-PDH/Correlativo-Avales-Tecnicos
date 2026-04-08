# Problemas Reportados - Correlativo Avales Técnicos

Registro de issues encontrados durante desarrollo y producción. Formato: `[ID] | ESTADO | SEVERIDAD | DESCRIPCION | FECHA_REPORTE | SOLUCION`

---

## Estados
- **ABIERTO**: Issue activo, sin solución
- **EN_PROGRESO**: Se está trabajando en la solución
- **RESUELTO**: Ya fue solucionado
- **CERRADO**: Verificado/no aplica

## Severidades
- **🔴 CRÍTICO**: El sistema no funciona
- **🟠 ALTO**: Feature importante no funciona
- **🟡 MEDIO**: Interferencia parcial con funcionalidad
- **🟢 BAJO**: Cosméticos, mejoras

---

## Problemas v1.0.0

(Sin reportes en baseline)

---

## Problemas v2.0

### [1] - ABIERTO - 🔴 CRÍTICO - JWT Middleware no intercepta requests
- **Fecha Reporte**: [Por asignar en Fase 1]
- **Descripción**: Middleware de JWT no está validando tokens en endpoints protegidos
- **Componentes**: backend/src/auth.js, avales-routes
- **Solución**: [Por definir]

### [2] - ABIERTO - 🟠 ALTO - DuckDNS no se actualiza en VM Oracle
- **Fecha Reporte**: [Por asignar en Fase 2]
- **Descripción**: IP dinámica de Oracle no se sincroniza con DuckDNS token
- **Componentes**: caddy/Caddyfile, Oracle VM
- **Solución**: [Por definir]

---

## Plantilla para Nuevos Problemas

```
### [ID] - ESTADO - SEVERIDAD - TITULO
- **Fecha Reporte**: [YYYY-MM-DD]
- **Descripción**: [Qué pasó y cuándo]
- **Pasos para reproducir**: 
  1. ...
  2. ...
- **Comportamiento esperado**: [Qué debería pasar]
- **Comportamiento actual**: [Qué pasó]
- **Componentes afectados**: [files/modules]
- **Ambiente**: [dev/staging/prod]
- **Solución**: [Si ya se conoce] / [Por investigar]
- **Responsable**: [Quién lo resuelve]
```

---

## Estadísticas

| Estado | v1.0.0 | v2.0 |
|--------|--------|------|
| ABIERTO | 0 | 2 |
| EN_PROGRESO | 0 | 0 |
| RESUELTO | 0 | 0 |
| CERRADO | 0 | 0 |
| **TOTAL** | **0** | **2** |
