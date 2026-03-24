# Lógica de Inventario - Flujo de Movimientos

**Última actualización:** 2026-03-12  
**Estado:** Activo

---

## Resumen Ejecutivo

El sistema de inventario funciona con una **lógica de acumuladores + cálculo dinámico**:
- `entrada` = Total acumulado de ingresos históricos
- `egresos` = Total acumulado de egresos históricos
- `stock` = **Calculado**: `entrada - egresos` (no se almacena)
- `total` = Equivalente a `stock` (se calcula cuando se necesita mostrar)

---

## Campos de la tabla `inventario_insumos`

| Campo | Tipo | Significado | Mutable | Notas |
|-------|------|-------------|--------|-------|
| `id` | INTEGER PK | Identificador único | ✗ | Auto-increment |
| `insumo` | TEXT | Nombre del producto | ✓ | Ej: "Aire comprimido" |
| `presentacion` | TEXT | Formato de venta | ✓ | Ej: "Botella" |
| `tamano_presentacion` | TEXT | Tamaño | ✓ | Ej: "10L" |
| `requerir_2026` | INTEGER | Stock mínimo requerido | ✓ | Solo referencia, NO afectado por movimientos |
| `entrada` | INTEGER | Total ingresos acumulados | ✓ | Se modify con ENTRADA/AJUSTE |
| `egresos` | INTEGER | Total egresos acumulados | ✓ | Se modifica con SALIDA/AJUSTE |
| `enero...diciembre` | INTEGER | Desglose de egresos por mes | ✓ | Optional breakdown |
| `stock` | INTEGER | **DEPRECATED** | ✗ | **No se usa más** - usar computed |
| `total` | INTEGER | **DEPRECATED** | ✗ | **No se usa más** - usar computed |
| `created_at` | TEXT | Timestamp creación | ✗ | Fecha/hora |
| `updated_at` | TEXT | Timestamp última actualización | ✗ | Auto-updated |

---

## Fórmulas de Cálculo (Frontend)

```javascript
stock = entrada - egresos
total = entrada - egresos  // Equivalente a stock
```

**Ejemplo:**
```
entrada = 50
egresos = 15
stock = 50 - 15 = 35
```

---

## Tipos de Movimientos

### 1. ENTRADA (Ingreso)
**Cuándo:** Recepción de nuevos insumos

| Antes | Acción | Después |
|-------|--------|---------|
| entrada: 10 | +5 unidades | entrada: **15** ✓ |
| egresos: 3 | - | egresos: 3 |
| stock: 7 | Recalcula | stock: **12** ✓ |

**Backend:**
```javascript
entrada = entrada + cantidad
```

---

### 2. SALIDA (Egreso)
**Cuándo:** Consumo o distribución de insumos

| Antes | Acción | Después |
|-------|--------|---------|
| entrada: 15 | - | entrada: 15 |
| egresos: 3 | -5 unidades | egresos: **8** ✓ |
| stock: 12 | Recalcula | stock: **7** ✓ |
| [mes]: 0 | Mes=marzo | [marzo]: **5** ✓ |

**Backend:**
```javascript
egresos = egresos + cantidad
[mes] = [mes] + cantidad  // Si hay mes especificado
```

---

### 3. CORRECCION_ENTRADA
**Cuándo:** Ajuste a ingresos anteriores incorrectos

**Ejemplo:** "Aire comprimido registró 53 ingreso en prueba, debe ser 0"

| Antes | Acción | Después |
|-------|--------|---------|
| entrada: 53 | Corrección: -53 | entrada: **0** ✓ |
| egresos: 0 | - | egresos: 0 |
| stock: 53 | Recalcula | stock: **0** ✓ |

**Backend:**
```javascript
// cantidad ya viene NEGATIVA del frontend (-53)
entrada = entrada + cantidad  // 53 + (-53) = 0
```

---

### 4. CORRECCION_SALIDA
**Cuándo:** Ajuste a egresos anteriores incorrectos

| Antes | Acción | Después |
|-------|--------|---------|
| entrada: 50 | - | entrada: 50 |
| egresos: 20 | Corrección: -5 | egresos: **15** ✓ |
| stock: 30 | Recalcula | stock: **35** ✓ |

**Backend:**
```javascript
// cantidad ya viene NEGATIVA del frontend (-5)
egresos = egresos + cantidad  // 20 + (-5) = 15
[mes] = [mes] + cantidad  // Si hay mes
```

---

### 5. AJUSTE_MANUAL
**Cuándo:** Ajuste sin tipo específico (suma o resta decidida por usuario)

**Operación: Suma**
```
Entrada: 10 + 3 = 13
```

**Operación: Resta**
```
Entrada: 10 - 3 = 7
```

---

## Flujo de Datos

```
Usuario regista movimiento
    ↓
[Frontend] Valida y envía {tipo, cantidad, responsable, detalle}
    ↓
[Backend] Endpoint PATCH /api/inventario/:id/[operacion]
    ↓
[Backend] Transacción:
    1. Obtiene insumo actual
    2. Modifica entrada O egresos (nunca ambos)
    3. Inserta en inventario_movimientos (auditoría)
    4. Retorna insumo actualizado
    ↓
[Frontend] Recibe JSON con entrada/egresos actualizado
    ↓
[Frontend] Calcula stock = entrada - egresos
    ↓
[UI] Muestra stock, entrada, egresos, total
```

---

## Impacto en Campos Mostrados

### Stock Actual (antes era campo `stock`)
**Ahora es:** `entrada - egresos` (computed, nunca se almacena)

### Total (antes era campo `total`)
**Ahora es:** Equivalente a `stock` (para compatibilidad)

### Requerimiento Anual
Mostrado pero **no modificado** por movimientos (es solo referencia)

---

## Auditoria

Cada movimiento se registra en `inventario_movimientos`:

```sql
INSERT INTO inventario_movimientos (
    inventario_id,
    tipo,              -- ENTRADA, SALIDA, CORRECCION_ENTRADA, etc
    cantidad,          -- Puede ser negativo (para correcciones)
    mes,               -- Solo para SALIDA/CORRECCION_SALIDA
    detalle,           -- Por qué se realizó
    responsable,       -- Quién lo hizo
    created_at         -- Cuándo
)
```

---

## Validaciones

| Validación | Regla | Motivo |
|-----------|-------|--------|
| Cantidad no cero | `cantidad !== 0` | No tiene sentido registrar 0 |
| Cantidad es entero | `Number.isInteger(cantidad)` | Unidades discretas |
| Responsable obligatorio | `responsable.trim().length > 0` | Trazabilidad |
| Tipo válido | Conjunto conocido | Clasificación correcta |
| Mes válido (SALIDA) | En lista 12 meses | Solo si es egreso |

---

## Notas Importantes

1. **Nunca almacenar `stock` o `total`** - Se calculan en tiempo real
2. **Las correcciones envían cantidad NEGATIVA** - Automáticamente del frontend
3. **Los campos `mes` son opcionales** - Solo para egresos con desglose
4. **Transacciones ACID** - Garantizan consistencia
5. **Auditoría completa** - Todos los movimientos quedan registrados

---

## Casos de Uso Documentados

### Caso 1: Aire Comprimido (Corrección de ingreso)
**Situación:** Se registró 53 unidades como prueba, debe ser 0

**Acción:**
- Tipo: CORRECCION_ENTRADA
- Cantidad: 53 (se envía como -53 al backend)
- Resultado: entrada pasa de 53 → 0

**Impacto:**
```
Antes:  entrada=53, egresos=0, stock=53
Después: entrada=0, egresos=0, stock=0 ✓
```

### Caso 2: Alcohol Isopropanol (Suma manual)
**Situación:** Necesito agregar 3 unidades por hallazgo

**Acción:**
- Tipo: AJUSTE_MANUAL
- Operación: Suma
- Cantidad: 3
- Resultado: entrada +3

**Impacto:**
```
Antes:  entrada=10, egresos=5, stock=5
Después: entrada=13, egresos=5, stock=8 ✓
```

### Caso 3: Alcohol Isopropanol (Resta manual)
**Situación:** Quiero revertir esas 3 unidades

**Acción:**
- Tipo: AJUSTE_MANUAL
- Operación: Resta
- Cantidad: 3
- Resultado: entrada -3

**Impacto:**
```
Antes:  entrada=13, egresos=5, stock=8
Después: entrada=10, egresos=5, stock=5 ✓
```

---

## Próximas Mejoras

- [ ] Validar that `entrada - egresos` nunca sea negativo (alerta)
- [ ] Dashboard de alertas por stock bajo
- [ ] Reporte de movimientos por período
- [ ] Exportación a Excel con desglose por mes
- [ ] Histórico de cambios en requerimiento_anual
