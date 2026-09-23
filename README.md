# Savia Up Web

Frontend de **Savia Up**, una plataforma SaaS multi-tenant para restaurantes y gastrobares. Esta fase cubre autenticación, recuperación de acceso, selección o creación de organización, navegación contextual, categorías, productos con recetas y control de costos, existencias e inventario operativo, gestión de órdenes y comandas, control de turnos de caja, salas y mesas interactivas en tiempo real, facturación con comprobantes térmicos, estadísticas analíticas y administración de gastos y proveedores.

> Control de versiones: no se crean commits ni se hace push salvo solicitud explícita del usuario en el mensaje actual.

## Stack

- Angular 21.2 con componentes standalone, Signals y Router.
- TypeScript 5.9 en modo strict.
- Reactive Forms tipados y RxJS para flujos asíncronos.
- Tailwind CSS 4 con estilos SCSS por componente.
- PWA con Angular Service Worker.
- ESLint, Prettier y Vitest.
- `@microsoft/signalr` e `idb` preparados para fases posteriores.

## Requisitos y ejecución

- Node.js 22 o superior.
- npm 10 o superior.

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200`.

El menú digital público es una segunda aplicación del mismo workspace. Se ejecuta en
`http://localhost:4201/{slug}` con `npm run start:menu` (también acepta `/m/{slug}` por
compatibilidad); consulta únicamente los endpoints públicos y no carga autenticación, sesión ni
navegación administrativa. Consulta [MENU_FRONTEND.md](MENU_FRONTEND.md) para su arquitectura y
despliegue.

Comandos adicionales:

```bash
npm run build          # build de producción
npm run build:menu     # build independiente del menú público
npm test -- --watch=false
npm run test:menu -- --watch=false
npm run test:watch
npm run lint
npm run format:check
```

## Modo de desarrollo

`src/environments/environment.ts` usa `useMockApi: false` y se conecta al backend local en `http://localhost:5000`. Inicia PostgreSQL y la API antes de ejecutar `npm start`.

Para trabajar sin backend, cambia temporalmente `useMockApi` a `true`. El usuario demo existe únicamente en `MockAuthRepository`:

```text
Email: admin@saviaup.local
Password: Savia123*
```

Los tenants mock son **Secret Garden** y **Savia Demo**. `apiUrl` y `signalRUrl` permanecen centralizadas en el environment.

El build de producción reemplaza automáticamente el environment por `environment.production.ts`, donde el mock está desactivado. Los environments contienen URLs públicas de configuración, nunca secretos.

## Rutas

| Ruta                                       | Acceso                         | Propósito                             |
| ------------------------------------------ | ------------------------------ | ------------------------------------- |
| `/login`                                   | Invitado                       | Inicio de sesión                      |
| `/register`                                | Invitado                       | Registro de usuario                   |
| `/forgot-password`                         | Invitado                       | Solicitud neutral de recuperación     |
| `/select-tenant`                           | Autenticado                    | Selección de organización             |
| `/create-tenant`                           | Autenticado                    | Creación de organización              |
| `/app`                                     | Autenticado + tenant           | Inicio y estado vacío del workspace   |
| `/app/sell/tables`                         | `tables.read`                  | Operación de mesas en tiempo real     |
| `/app/orders`                              | `orders.read`                  | Control y búsqueda de comandas        |
| `/app/cash-registers`                      | `cash-registers.read`          | Control de turnos y arqueos de caja   |
| `/app/products`                            | `products.read`                | Catálogo de productos y recetas       |
| `/app/categories`                          | Autenticado + tenant           | Administración de categorías          |
| `/app/inventory`                           | Autenticado + tenant           | Entrada al inventario                 |
| `/app/inventory/stock`                     | `inventory.stock.read`         | Existencias y alertas de mínimo       |
| `/app/inventory/ingredients`               | `inventory.ingredients.read`   | Ingredientes de cocina y almacén      |
| `/app/inventory/movements`                 | `inventory.movements.read`     | Movimientos inmutables                |
| `/app/inventory/complements/units`         | `inventory.complements.read`   | Unidades de medida                    |
| `/app/expenses`                            | `expenses.read`                | Gestión y registro de gastos          |
| `/app/suppliers`                           | `expenses.read`                | Directorio de proveedores             |
| `/app/statistics`                          | `reports.read` / `orders.read` | Dashboard de estadísticas y ventas    |
| `/app/billing`                             | `billing.read`                 | Gestión y reimpresión de comprobantes |
| `/app/settings`                            | `settings.*.read`              | Configuración de la organización      |
| `/app/configuration/tables/manage`         | `tables.manage`                | Distribución visual de salas y mesas  |
| `/app/configuration/cash-registers/manage` | `cash-registers.manage`        | Configuración de cajas registradoras  |
| `/app/{módulo}`                            | Autenticado + tenant           | Módulo habilitado conocido            |
| `/app/modules/:code`                       | Autenticado + tenant           | Fallback seguro para código nuevo     |

En la aplicación administrativa, `/m/:slug` es únicamente un puente para los enlaces históricos:
redirige a `{MENU_FRONTEND_URL}/{slug}`. El renderizado público pertenece exclusivamente a
`saviaup.frontend-menu`.

Todas las pantallas de feature se cargan de forma lazy.

## Arquitectura

```text
src/app/
├── core/
│   ├── auth/          # sesión, tokens, refresh coordinator
│   ├── config/        # environment token y endpoints centralizados
│   ├── context/       # perfil y módulos del tenant activo
│   ├── guards/        # auth, guest y tenant
│   ├── interceptors/  # Authorization, X-Tenant-Id y retry 401
│   ├── models/
│   └── tenant/        # contexto tenant global
├── features/
│   ├── auth/          # login, register, recovery, adapters y contratos
│   ├── tenant/        # selección, creación, adapters y store
│   ├── categories/    # lista, formulario, repositorio HTTP y store por tenant
│   ├── products/      # catálogo paginado, filtros y formulario reactivo
│   ├── inventory/     # existencias, ingredientes, movimientos y complementos
│   └── app/           # navegación y vistas de módulos
├── layouts/           # auth, tenant y app layouts
├── shared/
│   ├── api/           # ApiClient; única puerta común a HttpClient
│   ├── components/    # logo, botones, alertas e idioma
│   ├── http/          # normalización global de errores
│   ├── i18n/          # repositorios remoto/mock + fallback local
│   ├── offline/       # apertura lazy de IndexedDB
│   ├── realtime/      # fábrica SignalR sin conexiones automáticas
│   └── utils/         # validadores reutilizables
└── environments/
```

El flujo de datos es:

```text
Component → Store/Facade (Signals) → Repository token → HTTP o Mock adapter
```

Los componentes no conocen `HttpClient`, el environment ni la selección del adaptador.

## Autenticación JWT

`TokenStorage` encapsula por completo `localStorage` y `sessionStorage`. `rememberMe` decide la persistencia, y nunca se almacenan contraseñas.

El interceptor:

1. adjunta `Authorization: Bearer …` cuando corresponde;
2. adjunta `X-Tenant-Id` si existe un tenant activo;
3. adjunta el idioma vigente en `Accept-Language`;
4. ante un `401`, usa `AuthRefreshCoordinator`;
5. comparte una sola petición de refresh entre solicitudes concurrentes;
6. reintenta la petición original con el token nuevo;
7. limpia sesión y tenant si el refresh falla.

El endpoint de refresh usa un `HttpContextToken` para evitar recursión. `AuthGuard`, `GuestGuard` y `TenantGuard` controlan la navegación, pero la autorización real siempre debe validarse en backend.

## Multi-tenant

`TenantContext` conserva únicamente `id` y `name` de la organización activa. Un usuario puede recibir cualquier cantidad de tenants desde el BFF; la UI no presupone roles, permisos, módulos ni la relación “un usuario = un restaurante”.

`TenantRepository` tiene implementaciones HTTP y mock intercambiables. Crear o seleccionar una organización recibe un nuevo par de tokens contextualizados; el store los persiste antes de cargar el perfil y los módulos, y solo después entra a `/app`. El encabezado tenant queda centralizado en el interceptor y el backend valida que coincida con el claim del JWT.

## Contexto autenticado y navegación

Con tenant activo, `AuthenticatedContextStore` solicita en paralelo la información del usuario y las secciones disponibles. Publica el estado combinado cuando ambas respuestas terminan, evita mostrar datos del tenant anterior y expone estados de carga, error/reintento, éxito y vacío. El cambio de idioma vuelve a solicitar la navegación con el valor actual de `Accept-Language`.

El layout muestra nombre completo, organización y rol. Las secciones y sus elementos se ordenan por `order`. Una sección con `isGrouped: false` muestra su acceso directamente; una sección con `isGrouped: true` muestra inicialmente solo el nombre localizado del backend y abre sus módulos/opciones en un popover compacto. El popover se contrae al volver a activar la sección, elegir un acceso, hacer clic fuera o presionar `Escape`. El frontend no calcula permisos, no cambia `isGrouped` y solo mantiene esta relación estable:

En pantallas móviles, todos los accesos permanecen en una única fila desplazable. Las flechas laterales aparecen únicamente si existe overflow y combinan gradiente y sombra para mostrar la continuidad del contenido bajo los bordes.

En escritorio, la barra lateral permanece fija debajo del encabezado durante el desplazamiento del contenido. Si los accesos exceden la altura visible, el rail habilita scroll vertical propio y mantiene los popovers agrupados dentro del viewport.

| Código       | Ruta               | Icono        |
| ------------ | ------------------ | ------------ |
| `orders`     | `/app/orders`      | `orders`     |
| `tables`     | `/app/sell/tables` | `tables`     |
| `inventory`  | `/app/inventory`   | `inventory`  |
| `products`   | `/app/products`    | `products`   |
| `categories` | `/app/categories`  | `categories` |
| `kitchen`    | `/app/kitchen`     | `kitchen`    |
| `reports`    | `/app/reports`     | `reports`    |
| `billing`    | `/app/billing`     | `billing`    |
| `settings`   | `/app/settings`    | `settings`   |

Las opciones futuras se resuelven por `option.code` y, si no existe una configuración específica, por `moduleCode`. Un código nuevo usa `/app/modules/:code`, el icono genérico `module` y una advertencia solo en desarrollo. Una respuesta `sections: []` es válida y muestra literalmente `emptyStateMessage`; un `403 TENANT_REQUIRED` devuelve al selector de organización.

## Internacionalización

`LocalizationService` expone el idioma como Signal y persiste la preferencia. Los componentes usan claves mediante `TranslatePipe` y nunca importan JSON o diccionarios.

`TranslationRepository` permite obtener traducciones desde `GET /api/i18n/{language}`. Español e inglés tienen un fallback local mínimo para desarrollo y resiliencia; una respuesta remota se combina sobre ese fallback.

## PWA y capacidades futuras

El manifest, iconos, `ngsw-config.json` y registro de Service Worker están configurados. El Service Worker solo se habilita en builds de producción y requiere HTTPS (excepto localhost) para instalación.

La detección de actualizaciones se inicia con la aplicación, incluso en login y selección de
organización. Después de que Angular se estabiliza, consulta inmediatamente y cada 60 segundos
mientras la página esté visible y conectada. También consulta al recuperar foco, visibilidad o
conexión, sin ejecutar consultas simultáneas. El aviso aparece cuando Angular termina de descargar
y validar la nueva versión (`VERSION_READY`); nunca se recarga una orden en curso automáticamente.
"Actualizar ahora" recarga la página completa para mantener consistentes el shell y los chunks.
"Ignorar" oculta esa versión durante la sesión de la pestaña; otra versión puede volver a avisar.
Los fallos se identifican en consola con códigos `[PWA]`; los detalles del worker pueden consultarse
en `/ngsw/state` desde el navegador afectado.

### Configuración pública de Kubernetes en tiempo de ejecución

La misma imagen sirve para todos los ambientes. Al iniciar el contenedor,
`docker-entrypoint.d/40-env-config.sh` genera `/usr/share/nginx/html/env-config.js` usando únicamente
`API_URL`, `SIGNALR_URL` y `MENU_FRONTEND_URL` del entorno del proceso. Kubernetes puede suministrarlas mediante
`env`, `envFrom`, `configMapKeyRef` o `secretKeyRef`; no es necesario reconstruir la imagen.
Por ejemplo, dentro del contenedor del Deployment (ajustar nombres y claves a los manifiestos existentes):

```yaml
env:
  - name: API_URL
    valueFrom:
      configMapKeyRef:
        name: frontend-config
        key: API_URL
  - name: SIGNALR_URL
    valueFrom:
      secretKeyRef:
        name: frontend-public-endpoints
        key: SIGNALR_URL
  - name: MENU_FRONTEND_URL
    valueFrom:
      configMapKeyRef:
        name: frontend-config
        key: MENU_FRONTEND_URL
```

Las tres variables son **URLs públicas visibles en el navegador**, aunque su origen sea un Secret.
Nunca mapear contraseñas, claves JWT, credenciales de base de datos u otros secretos del servidor
a estas variables. El generador no exporta otras variables del contenedor y no registra sus valores.
Usa `jq` para serializar JSON y reemplaza el archivo de forma atómica, sin interpolar valores sin
escapar dentro de JavaScript.

`index.html` carga este archivo antes de Angular mediante `/env-config.js?ngsw-bypass=true`.
Se excluye expresamente de `ngsw-config.json` y se sirve con `Cache-Control: no-store`: la
configuración pertenece al pod, no al hash del build. Los endpoints inyectados tienen prioridad
sobre los valores de respaldo del environment; si `SIGNALR_URL` está vacío, se deriva de `API_URL`.
Para despliegues Kubernetes, definir `API_URL` explícitamente; los valores vacíos conservan los
valores de respaldo existentes. Si se cambia un ConfigMap o Secret consumido como variable de
entorno, se debe reiniciar el pod y recargar el cliente para obtener la nueva configuración.
Una modificación de configuración sin un nuevo build no genera por sí sola un aviso de nueva
versión de Angular ni cambia los endpoints de una sesión que ya esté abierta.

Nginx sirve `ngsw.json` y los scripts del worker sin caché persistente, y reserva `immutable` para
bundles JS/CSS cuyo nombre contiene el hash del build. Los archivos estáticos ausentes devuelven
404, en lugar del HTML de la SPA. Si un CDN tiene una copia antigua de `ngsw-worker.js`, invalidarla
al desplegar este cambio para que reciba las nuevas cabeceras; no configurar reglas de CDN que
ignoren `no-store` para el manifiesto, el worker o `env-config.js`.

La primera actualización desde un cliente antiguo conserva su intervalo anterior hasta recargar;
la comprobación cada minuto comienza una vez cargado este build. El tiempo de descarga y las
restricciones de suspensión del navegador pueden añadir demora. Durante un rollout, todos los
recursos de un manifiesto deben estar disponibles de forma consistente; usar imágenes identificadas
por SHA/digest y comprobar que el manifiesto y sus chunks no se sirvan desde builds distintos.

`OfflineDatabaseService` abre IndexedDB bajo demanda. La operación de mesas guarda allí una única instantánea versionada del catálogo de venta para el tenant activo (categorías, productos, variaciones y salas/mesas), junto con la última sincronización; cambiar de organización o cerrar sesión elimina esa instantánea. `RealtimeService` construye las conexiones SignalR únicamente cuando una feature las necesita.

## Endpoints preparados

Todos viven en `core/config/api-endpoints.ts`:

- `POST /api/auth/login`, `/register`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`
- `GET /api/users/me`
- `GET /api/users/me/info`
- `GET /api/modules/available` con `Accept-Language`
- `GET/POST /api/tenants`
- `POST /api/tenants/{tenantId}/select`
- `GET /api/i18n/{language}`
- `GET /api/categories?includeInactive=true`
- `POST /api/categories`
- `PUT /api/categories/{categoryId}`
- `PATCH /api/categories/{categoryId}/status`
- `DELETE /api/categories/{categoryId}`
- `GET /api/products?page=1&pageSize=20&search=&categoryId=&type=&includeInactive=false`
- `POST /api/products`
- `PUT /api/products/{productId}`
- `PATCH /api/products/{productId}/status`
- `DELETE /api/products/{productId}`
- `GET /api/tables/sales-catalog/version`
- `GET /api/tables/sales-catalog/sync`
- `GET /api/inventory`
- `GET/POST /api/inventory/ingredients`
- `PUT/DELETE /api/inventory/ingredients/{ingredientId}`
- `PATCH /api/inventory/ingredients/{ingredientId}/status`
- `GET/POST /api/inventory/movements`
- `GET/POST /api/inventory/complements/units`
- `PUT/DELETE /api/inventory/complements/units/{unitId}`
- `PATCH /api/inventory/complements/units/{unitId}/status`
- `GET /api/expenses`
- `GET /api/suppliers`
- `GET /api/billing/receipts`
- `GET /api/statistics`

Los DTO están separados de los modelos de UI y se adaptan en la capa data-access.

## Administración de categorías

La ruta `/app/categories` usa el código dinámico `categories` dentro de la navegación contextual. `categories.read` habilita el listado y `categories.manage` habilita creación, edición, deshabilitación/reactivación y eliminación; la UI nunca deriva permisos desde el rol y el backend siempre vuelve a validarlos.

El listado administrativo envía `includeInactive=true` y mantiene búsqueda por nombre y filtros locales. Crear y editar usan formularios tipados con nombre obligatorio (120), descripción opcional (1000) e indicador booleano de inventario.

El formulario integra `ImageSelectorComponent` para cargar, previsualizar y comprimir imágenes directamente a formato Base64 con almacenamiento optimizado en backend. La eliminación solo actualiza el store después de recibir el `204` y siempre muestra una confirmación explícita.

## Gestión de productos y recetas

`/app/products` exige `products.read`. El listado usa paginación del servidor, búsqueda por nombre, filtros por categoría y tipo (`NORMAL`/`COMBO`), e inclusión opcional de inactivos. `products.manage` habilita crear, editar, activar/desactivar y eliminar con confirmación explícita.

El formulario soporta:

- Datos básicos: nombre, categoría, tipo, precio de venta, tiempo de preparación y descripción.
- Selector interactivo de imagen (`ImageSelectorComponent`) con soporte drag & drop y compresión en base64.
- **Editor de recetas (`ProductRecipeItem`)**:
  - Búsqueda y vinculación interactiva de ingredientes desde el inventario del tenant o insumos personalizados.
  - Asignación de cantidad por porción y notas opcionales.
  - Cálculo automático en tiempo real del costo estimado de la receta, costo unitario por ingrediente y proyección del margen de ganancia porcentual contra el precio de venta.
  - Indicadores visuales y badges en las tarjetas y listado de productos para identificar platos con receta vinculada.
- Al cobrar órdenes en mesas, el backend deduce automáticamente las cantidades correspondientes del inventario de ingredientes según la receta.
- **Constructor de combos** para productos `COMBO`:
  - grupos de selección única o múltiple, obligatorios u opcionales, y grupos fijos que incluyen todos sus productos sin intervención;
  - límites mínimo/máximo por grupo;
  - opciones basadas en productos normales activos, cantidad de unidades incluidas y ajuste de precio positivo, negativo o neutro;
  - validación de al menos un grupo con un producto antes de guardar.

`isInventoryTracked` reacciona a la categoría elegida: se habilita solo para categorías inventariables y se deshabilita, limpia y envía como `false` para cualquier otra. El backend repite la regla para no confiar en el cliente. `ProductStore` mantiene página, filtros, permisos y categorías aislados por tenant y refresca la consulta vigente después de cada mutación exitosa.

## Inventario operativo

`/app/inventory` expone cuatro apartados lazy e independientes: existencias, ingredientes, movimientos y complementos. Cada apartado se muestra únicamente con su permiso `*.read` exacto y las acciones aparecen solo con su `*.manage`; no se infiere acceso por rol ni se asume que gestión implique lectura. Ingredientes requiere además `categories.read` e `inventory.complements.read` para cargar sus selectores.

Todos los listados usan paginación real del servidor con `{ items, page, pageSize, totalCount, totalPages }`. Los filtros vuelven a la página 1 y las mutaciones refrescan la página vigente. Crear un movimiento actualiza tanto el historial como las existencias; los movimientos no se editan ni se eliminan. El formulario de ingrediente solo admite existencia inicial al crear y muestra la existencia actual como lectura durante la edición.

Complementos tiene un registro extensible por tipo y actualmente implementa Unidades. Los conflictos `INGREDIENT_IN_USE` y `MEASUREMENT_UNIT_IN_USE` permiten deshabilitar en lugar de eliminar; `MEASUREMENT_UNIT_ALREADY_EXISTS` e `INVENTORY_INSUFFICIENT_STOCK` muestran mensajes específicos sin perder los datos del formulario.

## Diseño y responsive

La identidad visual usa tokens CSS centralizados, superficies cálidas y verde savia. Los controles tienen áreas táctiles, foco visible, labels semánticos, mensajes asociados y soporte para `prefers-reduced-motion`.

El isotipo oficial se sirve desde `public/logo/` mediante `BrandLogoComponent`, favicon, Apple Touch Icon y manifest PWA. La sombra del logo se aplica con `drop-shadow` para respetar la transparencia del PNG. No se generan logos mediante CSS o scripts.

El archivo de Figma “Savia Up · Web App” fue creado como espacio de diseño, pero el frontend sigue siendo la fuente vigente de la implementación visual hasta que exista una librería de componentes y variables aprobada en Figma. Los cambios de identidad deben concentrarse en tokens y componentes compartidos.

## Contrato integrado con el backend

- Login y registro entregan una sesión y `requiresTenantSelection`; un login con último tenant válido navega directamente a `/app`.
- Refresh rota el secreto y el frontend reemplaza ambos tokens.
- Crear o seleccionar tenant devuelve `tenant` y `tokens`; nunca se continúa con el JWT sin contexto anterior.
- El perfil contextual tiene `{ firstName, lastName, organization, role }`.
- La navegación tiene `{ sections, emptyStateMessage }`; cada sección contiene `order`, `isGrouped`, módulos ordenables y opciones futuras con `moduleCode`.
- Perfil y navegación se cargan en paralelo después de persistir los tokens y antes de navegar a `/app`.
- Los errores usan `{ success: false, error: { code, message, details? } }` y el mapper conserva compatibilidad con errores HTTP simples.
- Los permisos efectivos se reciben para representación de UI, pero la autorización real se resuelve siempre en el backend y no depende de claims de permisos.

## Gestión y operación de mesas

- `/app/sell/tables` consulta por REST el snapshot operativo de las mesas, pero categorías y productos se leen desde el catálogo local de IndexedDB. Cada entrada compara la versión local con `/api/tables/sales-catalog/version`; solo descarga `/api/tables/sales-catalog/sync` cuando difieren. La primera sincronización bloquea la interacción con un modal de progreso y reduce las imágenes de guía a WebP (máximo 360 px) antes de persistirlas.
- `OnTableSalesDataInvalidated` solicita una nueva comprobación de versión tras cambios de categorías, productos, variaciones, salas o configuración de mesas. Las invalidaciones recibidas mientras otra validación está en curso se agrupan y se procesan al terminar, evitando descargas duplicadas.
- El área útil se concentra en la sala seleccionada. El encabezado de la sala permite cambiarla y alternar entre plano e iconos; sus KPIs son compactos y la barra lateral de escritorio puede ocultarse y recuperarse durante la operación.
- **Rediseño de métricas con toggle Día / Turno**: el encabezado agrupa las ventas (Día/Turno) y egresos (Día/Turno) en una sola métrica dinámica conmutada por botón, muestra las mesas disponibles en formato "X de Y" y enlaza con los totales de turnos de caja en tiempo real.
- `/app/configuration/tables/manage` administra salas y mesas, reordena salas y edita capacidad, flags, estado y forma (`SQUARE`, `ROUND`, `RECTANGLE_HORIZONTAL`, `RECTANGLE_VERTICAL`). La posición se define arrastrando la misma tarjeta y con las mismas dimensiones que usa la operación (`100×100`, `150×100` o `100×150`); doble clic abre la edición y el modal permite eliminar con confirmación. El estado se comunica por color y su etiqueta aparece solo con `hover`/foco.
- `TableRealtimeClient` conecta únicamente durante el ciclo de vida de la feature, envía el JWT vigente y aplica reconexión automática para `OnTableStatusChanged` y `OnTableOrderUpdated`.
- El bloqueo de caja abierta se deriva del backend y deshabilita todas las acciones de `tables.operate` sin ocultar el estado actual.
- Los productos `COMBO` abren un configurador dentro del flujo de venta. La UI muestra los productos fijos, exige las selecciones obligatorias, limita cantidades múltiples, recalcula el precio visible y envía `comboSelections` solo para grupos seleccionables. La pestaña de observaciones resume productos fijos/seleccionados y separa la nota adicional; el backend vuelve a construir el texto definitivo antes de guardar.

## Continuidad de sesión en la PWA

La sesión se conserva hasta el vencimiento del refresh token informado por la API, aunque el access token haya vencido. Las sesiones guardadas antes de incorporar `refreshTokenExpiresAt` se validan contra el endpoint de refresh. La API sigue siendo la autoridad para revocación y expiración; cada renovación persiste el nuevo par de tokens y sus fechas.

`AuthRefreshCoordinator` comparte una sola renovación entre las peticiones HTTP, la reconexión SignalR y los eventos de reactivación de la app. Renueva cuando al access token le queda un minuto o menos. `AuthSessionLifecycle` comprueba al recuperar visibilidad, foco, conexión o página restaurada, y cada 30 segundos mientras la app está visible y en línea. Los temporizadores arrancan después de la estabilización de Angular para no retrasar el Service Worker.

Los fallos de red, límites de peticiones y errores de servidor conservan las credenciales para reintentar. Una respuesta 401 del refresh o su expiración conocida limpia la sesión. Una respuesta tardía no puede restaurar una sesión cerrada ni sobrescribir una sesión nueva. No se recarga la página para renovar tokens.

Se conserva la opción **Recordarme**: activada usa almacenamiento persistente; desactivada usa el almacenamiento de la sesión del navegador. Para recuperar la sesión incluso después de cerrar por completo la PWA o de que el sistema descarte su instancia, se debe activar esta opción al ingresar. La renovación funciona al volver a la app; no requiere que el sistema operativo permita ejecutar JavaScript en segundo plano.

## Módulos operativos adicionales

- **Gastos y proveedores (`/app/expenses`, `/app/suppliers`)**: control integral de egresos operativos, categorías de gasto, proveedores y vinculación directa con el turno de caja abierto. El formulario incluye búsqueda de proveedores, confirmación previa con resumen y bloqueo de valor, fecha y origen de caja durante la edición. El listado permite elegir entre 10, 25, 50 o 100 registros por página.
- **Historial de caja (`/app/cash-registers`)**: muestra el fondo inicial de cada turno y presenta el total en caja calculado por el backend como recaudo de ventas + inicial - gastos.
- **Facturación (`/app/billing`)**: consulta y filtro por fecha de comprobantes de pago emitidos, con modal de vista previa e impresión de tirilla térmica de 80mm.
- **Estadísticas (`/app/statistics`)**: panel interactivo desarrollado con Chart.js para visualización de ventas del período, gráfico comparativo agrupado Ventas vs Gastos, métodos de pago más usados, productos top y recaudación.
