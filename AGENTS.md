# AGENTS.md — Savia Up Frontend

## Alcance

Estas instrucciones aplican a todo el repositorio `saviaup.frontend`. Este proyecto es el cliente web de Savia Up, una plataforma SaaS multi-tenant para restaurantes y gastrobares.

La fase implementada cubre:

- autenticación y persistencia de sesión;
- registro y recuperación de acceso;
- selección y creación de organizaciones (tenants);
- internacionalización español/inglés;
- infraestructura JWT, PWA, IndexedDB y SignalR;
- un placeholder autenticado para los futuros módulos operativos.

No inventar todavía módulos de ventas, inventario, caja, recetas, compras, reportes o permisos si el requerimiento no los incluye expresamente.

## Estado técnico y versiones

- Angular `21.2`, componentes standalone y Router con lazy loading.
- TypeScript `5.9` en modo estricto.
- Signals para estado reactivo local/global y RxJS para operaciones asíncronas.
- Reactive Forms tipados.
- Tailwind CSS `4` cargado globalmente y SCSS encapsulado por componente.
- Angular Service Worker para PWA.
- Vitest mediante el builder de pruebas de Angular.
- ESLint, angular-eslint y Prettier.
- `@microsoft/signalr` e `idb` preparados para funciones futuras.
- Node.js `22+` y npm `10+`.

No bajar versiones ni sustituir el stack sin una petición explícita.

## Comandos obligatorios

Instalación y desarrollo:

```bash
npm install
npm start
```

La aplicación se sirve en `http://localhost:4200` y espera la API local en `http://localhost:5000`.

Validación completa antes de entregar o crear un commit:

```bash
npm run format:check
npm run lint
npm test -- --watch=false
npm run build
```

Comandos auxiliares:

```bash
npm run format
npm run test:watch
npm run watch
```

No editar manualmente `package-lock.json`. Actualizarlo únicamente mediante npm cuando cambien dependencias.

## Estructura del repositorio

```text
public/
├── logo/                    # PNG oficiales en 72–512 px
└── manifest.webmanifest     # metadatos e iconos PWA
src/
├── app/
│   ├── core/
│   │   ├── auth/            # sesión, almacenamiento y refresh JWT
│   │   ├── config/          # environment token y endpoints
│   │   ├── guards/          # auth, guest, entry y tenant
│   │   ├── interceptors/    # Authorization, tenant y retry de 401
│   │   ├── models/          # modelos globales
│   │   └── tenant/          # contexto tenant activo
│   ├── features/
│   │   ├── auth/            # login, registro y recuperación
│   │   ├── tenant/          # selección y creación de organización
│   │   └── app/             # placeholder privado
│   ├── layouts/             # auth, tenant y app shells
│   └── shared/
│       ├── api/             # ApiClient común
│       ├── components/      # logo, botones, alertas e idioma
│       ├── http/            # modelo y normalización de errores
│       ├── i18n/            # traducciones remotas/mock/locales
│       ├── models/          # estados de petición
│       ├── offline/         # IndexedDB lazy
│       ├── pipes/           # TranslatePipe
│       ├── realtime/        # fábrica SignalR
│       └── utils/           # validadores de formularios
├── environments/            # configuración pública por entorno
├── index.html
├── main.ts
└── styles.css               # tokens y primitivas globales
```

Configuración principal:

- `angular.json`: build, assets, límites de bundle, tests y lint.
- `ngsw-config.json`: estrategia de caché PWA.
- `eslint.config.js`: reglas de lint.
- `.prettierrc`: formato del repositorio.
- `.postcssrc.json`: Tailwind/PostCSS.
- `tsconfig*.json`: TypeScript estricto para aplicación y pruebas.

## Flujo arquitectónico obligatorio

Mantener este flujo:

```text
Component → Store/Facade (Signals) → Repository token → HTTP o Mock adapter
```

Reglas:

- Los componentes no deben inyectar `HttpClient` directamente.
- Los componentes no deben leer `environment` directamente.
- Los componentes no deben decidir si se usa backend real o mock.
- Las implementaciones HTTP y mock deben cumplir la misma abstracción de repositorio.
- Los DTO de transporte se adaptan a modelos de UI en `data-access`.
- `ApiClientService` es la puerta HTTP compartida para llamadas comunes.
- Los endpoints viven centralizados en `core/config/api-endpoints.ts`.
- Las rutas de feature deben seguir cargándose de forma lazy.
- El estado global nuevo debe tener propietario claro; no crear servicios globales genéricos.

La selección de adaptadores se hace en `app.config.ts` mediante `useMockApi` y tokens de inyección.

## Convenciones Angular y TypeScript

- Crear componentes standalone.
- Usar `ChangeDetectionStrategy.OnPush`.
- Preferir `inject()`, `input()`, `output()`, `signal()`, `computed()` y `effect()` cuando corresponda.
- Usar el control flow moderno `@if`, `@for` y `@switch`; no introducir `*ngIf` o `*ngFor` en código nuevo.
- Mantener formularios reactivos tipados y validadores reutilizables.
- Evitar `any`, conversiones inseguras y suscripciones sin ciclo de vida definido.
- No ocultar errores con `catch` vacío ni devolver datos falsos desde adaptadores reales.
- Mantener modelos y contratos inmutables con propiedades `readonly` cuando sea práctico.
- Nombrar archivos y símbolos según las convenciones Angular existentes.
- Mantener templates, estilos y lógica separados cuando el componente no sea deliberadamente pequeño.
- Usar aliases o abstracciones solamente si reducen acoplamiento real; evitar capas ceremoniales.

## Rutas y control de acceso

| Ruta               | Acceso               | Layout | Propósito                   |
| ------------------ | -------------------- | ------ | --------------------------- |
| `/login`           | Invitado             | Auth   | Inicio de sesión            |
| `/register`        | Invitado             | Auth   | Creación de cuenta          |
| `/forgot-password` | Invitado             | Auth   | Recuperación neutral        |
| `/select-tenant`   | Autenticado          | Tenant | Seleccionar organización    |
| `/create-tenant`   | Autenticado          | Tenant | Crear organización          |
| `/app`             | Autenticado + tenant | App    | Entrada privada/placeholder |

- `GuestGuard` impide que una sesión activa vuelva al flujo de invitado.
- `AuthGuard` exige sesión válida.
- `TenantGuard` exige tenant activo antes de entrar a `/app`.
- `EntryGuard` resuelve el destino inicial según sesión y tenant.
- Los guards solo controlan navegación; la autorización efectiva siempre pertenece al backend.

Al añadir rutas privadas, declarar los guards de manera explícita y conservar lazy loading.

## Autenticación y seguridad

La sesión contiene usuario, access token, refresh token y contexto derivado. `AuthStoreService` es el propietario del estado de autenticación.

`TokenStorage` encapsula `localStorage` y `sessionStorage`:

- `rememberMe=true` permite persistencia duradera;
- sin `rememberMe`, la sesión permanece en `sessionStorage`;
- nunca almacenar contraseñas, secretos, permisos confiables ni datos sensibles adicionales;
- no acceder a Web Storage fuera de la abstracción existente.

El interceptor HTTP debe conservar este comportamiento:

1. adjuntar `Authorization: Bearer <token>` cuando aplique;
2. adjuntar `X-Tenant-Id` cuando exista tenant activo;
3. coordinar un único refresh para respuestas `401` concurrentes;
4. reintentar la petición original con el access token nuevo;
5. evitar refresh recursivo mediante `HttpContextToken`;
6. limpiar sesión y tenant si el refresh falla.

No registrar tokens en consola, errores, telemetría o snapshots de pruebas.

La recuperación de contraseña debe mantener una respuesta neutral para no revelar si un correo está registrado.

## Multi-tenancy

`TenantContextService` conserva únicamente los datos mínimos de la organización activa. No asumir:

- un único tenant por usuario;
- que un tenant equivale siempre a un restaurante;
- roles o permisos fijos;
- módulos disponibles por nombre hardcodeado.

Seleccionar o crear tenant debe recibir del backend un nuevo par de tokens contextualizados. Persistir esos tokens antes de navegar a `/app`. El backend valida la relación entre `X-Tenant-Id`, el usuario y los claims del JWT.

## Contrato HTTP

Endpoints centralizados actualmente:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/users/me`
- `GET /api/tenants`
- `POST /api/tenants`
- `POST /api/tenants/{tenantId}/select`
- `GET /api/i18n/{language}`

Formato de error esperado:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje seguro",
    "details": {}
  }
}
```

`HttpErrorMapper` mantiene compatibilidad con errores HTTP simples. No mostrar al usuario detalles internos, stack traces, SQL ni mensajes de infraestructura.

## Environments y mocks

`src/environments/environment.ts`:

- `production: false`
- `useMockApi: false`
- API local: `http://localhost:5000`
- SignalR local: `http://localhost:5000/hubs`

`environment.production.ts` usa `https://api.saviaup.com` y desactiva mocks.

Para desarrollo aislado se puede activar temporalmente `useMockApi`, pero no entregar producción con mocks habilitados. Los environments solo contienen configuración pública; nunca agregar credenciales o secretos.

Datos mock existentes:

- usuario: `admin@saviaup.local`;
- contraseña de desarrollo: `Savia123*`;
- tenants: `Secret Garden` y `Savia Demo`.

Mantener estos datos limitados a los repositorios mock.

## Internacionalización

- Idiomas actuales: español (`es`) e inglés (`en`).
- `LocalizationService` conserva el idioma como Signal y persiste la preferencia.
- Los templates consumen claves mediante `TranslatePipe`.
- Las traducciones remotas se combinan sobre `LOCAL_TRANSLATIONS` como fallback.
- No hardcodear nuevo texto visible si puede ser una clave traducible.
- Al añadir una clave, agregar español e inglés en el mismo cambio.
- No importar diccionarios directamente desde un componente.

## Diseño visual y responsive

Los tokens globales viven en `src/styles.css`. Reutilizar las variables existentes antes de introducir valores arbitrarios:

- verdes `--color-savia-50` a `--color-savia-900`;
- acento `--color-lime-200`;
- texto `--color-ink`, `--color-muted`, `--color-subtle`;
- fondos `--color-canvas`, `--color-surface`;
- bordes `--color-border`, `--color-border-strong`;
- sombra `--shadow-card`.

Fuente prevista: `Inter`, con fallbacks `Aptos`, `Segoe UI` y fuentes del sistema.

Breakpoints usados por la interfaz actual:

- `430px`: ajustes móviles amplios;
- `768px`: tablet y grids de dos columnas;
- `1024px`: layout de autenticación dividido;
- `1440px`: proporciones de escritorio amplio.

Mantener:

- foco visible mediante `:focus-visible`;
- labels asociados a controles;
- estados disabled/loading/error/success;
- áreas táctiles suficientes;
- contraste legible;
- soporte de `prefers-reduced-motion`;
- layouts funcionales desde `320px`.

No convertir componentes repetibles en bloques únicos de CSS o HTML. Reutilizar `BrandLogoComponent`, `UiButtonComponent`, `UiAlertComponent` y `LanguageSelectorComponent`.

## Identidad y logos

La única fuente vigente del isotipo son los archivos de `public/logo/`:

- `Logo-72.png`
- `Logo-96.png`
- `Logo-128.png`
- `Logo-144.png`
- `Logo-152.png`
- `Logo-192.png`
- `Logo-384.png`
- `Logo-512.png`

Reglas obligatorias:

- No reconstruir el isotipo con CSS, canvas, PowerShell ni scripts generadores.
- No volver a usar `public/icons/`, `favicon.ico` o `favicon.png`; son assets legacy ignorados.
- La UI debe renderizar el logo mediante `BrandLogoComponent` y su `srcset`.
- El favicon, Apple Touch Icon y manifest deben apuntar a `public/logo/`.
- Mantener la sombra como `filter: drop-shadow(...)` sobre el PNG para respetar su canal alfa.
- Si se reemplaza el logo, conservar los ocho tamaños o actualizar a la vez componente, `index.html`, manifest y `ngsw-config.json`.
- No declarar estos PNG como `maskable` mientras el arte no tenga una zona segura validada para máscaras PWA.

## PWA, offline y tiempo real

- El Service Worker se habilita únicamente fuera de dev mode.
- El registro usa `registerWhenStable:30000`.
- `ngsw-config.json` precarga el shell y los logos esenciales; el resto de imágenes usa el grupo lazy.
- Cambios en rutas de assets deben reflejarse en manifest y configuración del Service Worker.
- Validar la PWA mediante un build de producción; `ng serve` no reproduce completamente su caché.

`OfflineDatabaseService` abre IndexedDB bajo demanda. No almacenar arbitrariamente respuestas, tokens o estado sensible.

`RealtimeService` crea conexiones SignalR, pero ninguna feature debe conectarse automáticamente al arrancar la aplicación. Iniciar y detener conexiones dentro del ciclo de vida del módulo que las necesita.

## Pruebas

Las pruebas actuales cubren:

- store y limpieza de autenticación;
- guards de navegación;
- interceptor JWT/tenant/refresh;
- login;
- selección de tenant.

Al modificar lógica observable, agregar o actualizar pruebas cerca del archivo afectado (`*.spec.ts`). Como mínimo probar:

- camino exitoso;
- validación o error relevante;
- navegación/estado resultante;
- ausencia de efectos duplicados en flujos concurrentes cuando aplique.

No aprobar cambios con pruebas, lint o build fallando. No borrar pruebas para hacer pasar la suite.

## Checklist para nuevas features

1. Definir el modelo de UI y los DTO por separado.
2. Añadir endpoint centralizado si existe llamada nueva.
3. Crear token/interfaz de repositorio cuando se requiera intercambiar HTTP y mock.
4. Implementar adaptador HTTP y, solo si es útil, adaptador mock.
5. Crear store/facade con Signals para el estado de la feature.
6. Crear componentes standalone OnPush y formularios tipados.
7. Añadir traducciones `es` y `en`.
8. Añadir ruta lazy y guards correspondientes.
9. Cubrir comportamiento crítico con pruebas.
10. Validar responsive, teclado, foco, estados y errores.
11. Ejecutar formato, lint, pruebas y build.

## Disciplina de cambios

- Preservar cambios existentes del usuario y evitar reescrituras no relacionadas.
- Mantener commits acotados y descriptivos.
- No hacer push, publicar ni desplegar salvo petición explícita.
- No incluir `node_modules`, `dist`, `.angular/cache`, cobertura o screenshots temporales.
- Revisar `git diff --cached` antes de confirmar.
- Documentar en `README.md` los cambios que afecten instalación, arquitectura, rutas, contratos o flujos de desarrollo.
