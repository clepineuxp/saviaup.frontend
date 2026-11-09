# Walkthrough — Savia Up Frontend

## Control de versiones

No crear commits ni hacer push bajo ninguna circunstancia, salvo que el usuario lo solicite explícitamente en el mensaje actual.

## Product combos

El formulario de `/app/products` muestra la pestaña **Composición** cuando el tipo es `COMBO`. Allí se crean grupos de selección única, múltiple o fija; los fijos incluyen uno o más productos sin pedir elección durante la venta. Los seleccionables usan un toggle horizontal de obligatoriedad y pueden definir límites. Los productos normales conservan sus pestañas de variaciones y receta.

En `/app/sell/tables`, seleccionar un combo abre el configurador de grupos. Los productos fijos aparecen marcados como incluidos; el botón de agregar permanece deshabilitado hasta cumplir los grupos seleccionables y el total incorpora todos los ajustes. En Observaciones se presenta la composición completa y un campo separado para la nota adicional. La petición envía únicamente ids/cantidades seleccionables y la respuesta contiene el snapshot y las observaciones reconstruidas por backend.

Las pruebas de formulario están en `product-form.component.spec.ts`; el contrato se adapta en `product.model.ts`, `product.contracts.ts` y `product.adapter.ts`.

## Selector de proveedores en gastos

Al crear o editar un gasto, el proveedor se selecciona mediante un combobox con búsqueda por nombre legal o nombre comercial. Cada resultado presenta `nombre | nombre comercial`, conserva la opción de registrar el gasto sin proveedor y admite navegación por teclado.

El pie del listado de `/app/expenses` permite cambiar el tamaño de página entre 10, 25, 50 y 100 registros. Cada cambio regresa a la página 1 y solicita nuevamente la información al backend con el `pageSize` elegido.

Antes de crear un gasto se abre una confirmación compacta con nombre, valor, fecha, medio de pago, proveedor, origen de caja y descripción. El usuario puede volver al formulario o confirmar el envío. Al editar un gasto existente, el formulario consulta la política `expenses.lockFinancialFieldsAfterCreation`: con el bloqueo activo deshabilita valor, fecha y origen de caja y no los envía; con el bloqueo desactivado permite editarlos y los incluye en el payload.

La pestaña de negocio muestra un toggle SaviaUp para esta política. Consultarla forma parte del flujo normal de gastos, pero modificarla requiere `settings.expense-financial-fields.manage`; sin ese permiso el control permanece visible y deshabilitado.

## Total de turnos de caja

El historial de `/app/cash-registers` incluye una columna **Inicial** y consume `totalInCashAmount` para **Total en Caja**. La cifra proviene del backend y representa recaudo de ventas + fondo inicial - gastos; el mismo valor se usa en el resumen del detalle/cierre.

## Módulo de Reportes

La sección de `/app/reports` permite configurar, generar y descargar informes en formato Excel (`.xlsx`) de forma asíncrona:

- **Selector de tipo de informe**: tarjetas visuales para _Estadísticas_, _Gastos_, _Ventas / Pedidos_, _Ventas y Gastos_ y _Cajas_.
- **Filtros de fecha y agrupación por períodos**:
  - Selector de rango (`Desde` y `Hasta`) con botones de acceso rápido (_Hoy_, _Esta semana_, _Este mes_, _Mes anterior_).
  - Selector segmentado de agrupación: _Sin agrupar_ (`NONE`), _Por semanas_ (`WEEKLY`) y _Por meses_ (`MONTHLY`).
  - Previsualización dinámica de los períodos incluidos en el rango seleccionado (e.g. `Semana 1 (01/01 - 07/01)`, `Enero 2026 (01/01 - 31/01)`), calculada de forma reactiva con `computed` Signals.
- **Opciones dinámicas según tipo**:
  - _Estadísticas_: selección de secciones opcionales (productos más vendidos, mesas, meseros y categorías).
  - _Gastos_: control segmentado para incluir todos los gastos, solo salidas de caja o sin salidas de caja.
  - _Ventas_: selector de nivel de detalle por comandas o por productos.
  - _Ventas y Gastos_: agrupación de ventas y detalle de gastos con responsable y fecha/hora.
  - _Cajas_: detalle completo de turnos y discriminación por medios de pago.
- **Polling y descarga automática**: `ReportStoreService` envía `POST /api/reports`, muestra banner de generación en segundo plano y realiza polling cada 1.5s hasta estado `COMPLETED` o `FAILED`. Al finalizar exitosamente, dispara de inmediato la descarga del archivo `.xlsx`.
- **Historial de reportes**: tabla con solicitudes previas, etiquetas de configuración, estado en tiempo real (`En cola`, `Generando…`, `Completado`, `Fallido`), tamaño de archivo y botón directo de descarga.
- **Arquitectura y pruebas**: implementado bajo el patrón Repository con `HttpReportRepository` y `MockReportRepository`, store reactivo con Signals y pruebas unitarias en `report-store.service.spec.ts`, `http-report.repository.spec.ts` y `reports-page.component.spec.ts`.
