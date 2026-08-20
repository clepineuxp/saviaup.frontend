# Savia Up Web

Frontend de **Savia Up**, una plataforma SaaS multi-tenant para restaurantes y gastrobares. Esta primera fase cubre autenticación, recuperación de acceso y selección o creación de organización; no incluye todavía los módulos operativos.

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

Comandos adicionales:

```bash
npm run build          # build de producción
npm test -- --watch=false
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

| Ruta               | Acceso               | Propósito                           |
| ------------------ | -------------------- | ----------------------------------- |
| `/login`           | Invitado             | Inicio de sesión                    |
| `/register`        | Invitado             | Registro de usuario                 |
| `/forgot-password` | Invitado             | Solicitud neutral de recuperación   |
| `/select-tenant`   | Autenticado          | Selección de organización           |
| `/create-tenant`   | Autenticado          | Creación de organización            |
| `/app`             | Autenticado + tenant | Placeholder de la futura aplicación |

Todas las pantallas de feature se cargan de forma lazy.

## Arquitectura

```text
src/app/
├── core/
│   ├── auth/          # sesión, tokens, refresh coordinator
│   ├── config/        # environment token y endpoints centralizados
│   ├── guards/        # auth, guest y tenant
│   ├── interceptors/  # Authorization, X-Tenant-Id y retry 401
│   ├── models/
│   └── tenant/        # contexto tenant global
├── features/
│   ├── auth/          # login, register, recovery, adapters y contratos
│   ├── tenant/        # selección, creación, adapters y store
│   └── app/           # placeholder de la zona privada
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
3. ante un `401`, usa `AuthRefreshCoordinator`;
4. comparte una sola petición de refresh entre solicitudes concurrentes;
5. reintenta la petición original con el token nuevo;
6. limpia sesión y tenant si el refresh falla.

El endpoint de refresh usa un `HttpContextToken` para evitar recursión. `AuthGuard`, `GuestGuard` y `TenantGuard` controlan la navegación, pero la autorización real siempre debe validarse en backend.

## Multi-tenant

`TenantContext` conserva únicamente `id` y `name` de la organización activa. Un usuario puede recibir cualquier cantidad de tenants desde el BFF; la UI no presupone roles, permisos, módulos ni la relación “un usuario = un restaurante”.

`TenantRepository` tiene implementaciones HTTP y mock intercambiables. Crear o seleccionar una organización recibe un nuevo par de tokens contextualizados; el store los persiste antes de entrar a `/app`. El encabezado tenant queda centralizado en el interceptor y el backend valida que coincida con el claim del JWT.

## Internacionalización

`LocalizationService` expone el idioma como Signal y persiste la preferencia. Los componentes usan claves mediante `TranslatePipe` y nunca importan JSON o diccionarios.

`TranslationRepository` permite obtener traducciones desde `GET /api/i18n/{language}`. Español e inglés tienen un fallback local mínimo para desarrollo y resiliencia; una respuesta remota se combina sobre ese fallback.

## PWA y capacidades futuras

El manifest, iconos, `ngsw-config.json` y registro de Service Worker están configurados. El Service Worker solo se habilita en builds de producción y requiere HTTPS (excepto localhost) para instalación.

`OfflineDatabaseService` abre IndexedDB bajo demanda y no almacena estado arbitrario. `RealtimeService` construye conexiones SignalR, pero no inicia ninguna hasta que una feature futura lo solicite.

## Endpoints preparados

Todos viven en `core/config/api-endpoints.ts`:

- `POST /api/auth/login`, `/register`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`
- `GET /api/users/me`
- `GET/POST /api/tenants`
- `POST /api/tenants/{tenantId}/select`
- `GET /api/i18n/{language}`

Los DTO están separados de los modelos de UI y se adaptan en la capa data-access.

## Diseño y responsive

La identidad visual usa tokens CSS centralizados, superficies cálidas y verde savia. Los controles tienen áreas táctiles, foco visible, labels semánticos, mensajes asociados y soporte para `prefers-reduced-motion`.

El isotipo oficial se sirve desde `public/logo/` mediante `BrandLogoComponent`, favicon, Apple Touch Icon y manifest PWA. La sombra del logo se aplica con `drop-shadow` para respetar la transparencia del PNG. No se generan logos mediante CSS o scripts.

El archivo de Figma “Savia Up · Web App” fue creado como espacio de diseño, pero el frontend sigue siendo la fuente vigente de la implementación visual hasta que exista una librería de componentes y variables aprobada en Figma. Los cambios de identidad deben concentrarse en tokens y componentes compartidos.

## Contrato integrado con el backend

- Login y registro entregan una sesión y `requiresTenantSelection`; un login con último tenant válido navega directamente a `/app`.
- Refresh rota el secreto y el frontend reemplaza ambos tokens.
- Crear o seleccionar tenant devuelve `tenant` y `tokens`; nunca se continúa con el JWT sin contexto anterior.
- Los errores usan `{ success: false, error: { code, message, details? } }` y el mapper conserva compatibilidad con errores HTTP simples.
- Los permisos efectivos se reciben para representación de UI, pero la autorización real se resuelve siempre en el backend y no depende de claims de permisos.
