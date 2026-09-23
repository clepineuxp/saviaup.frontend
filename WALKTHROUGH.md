# Walkthrough — Savia Up Frontend

## Control de versiones

No crear commits ni hacer push bajo ninguna circunstancia, salvo que el usuario lo solicite explícitamente en el mensaje actual.

## Product combos

El formulario de `/app/products` muestra la pestaña **Composición** cuando el tipo es `COMBO`. Allí se crean grupos de selección única, múltiple o fija; los fijos incluyen uno o más productos sin pedir elección durante la venta. Los seleccionables usan un toggle horizontal de obligatoriedad y pueden definir límites. Los productos normales conservan sus pestañas de variaciones y receta.

En `/app/sell/tables`, seleccionar un combo abre el configurador de grupos. Los productos fijos aparecen marcados como incluidos; el botón de agregar permanece deshabilitado hasta cumplir los grupos seleccionables y el total incorpora todos los ajustes. En Observaciones se presenta la composición completa y un campo separado para la nota adicional. La petición envía únicamente ids/cantidades seleccionables y la respuesta contiene el snapshot y las observaciones reconstruidas por backend.

Las pruebas de formulario están en `product-form.component.spec.ts`; el contrato se adapta en `product.model.ts`, `product.contracts.ts` y `product.adapter.ts`.
