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

Antes de crear un gasto se abre una confirmación compacta con nombre, valor, fecha, medio de pago, proveedor, origen de caja y descripción. El usuario puede volver al formulario o confirmar el envío. Al editar un gasto existente, valor, fecha y origen de caja aparecen bloqueados y el payload contiene únicamente los campos editables.

## Total de turnos de caja

El historial de `/app/cash-registers` incluye una columna **Inicial** y consume `totalInCashAmount` para **Total en Caja**. La cifra proviene del backend y representa recaudo de ventas + fondo inicial - gastos; el mismo valor se usa en el resumen del detalle/cierre.
