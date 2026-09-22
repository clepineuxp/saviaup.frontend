# Frontend público de menú digital

El workspace contiene dos aplicaciones Angular con ciclos de compilación y despliegue independientes:

- `savia-up-web`: aplicación administrativa autenticada.
- `saviaup.frontend-menu`: aplicación pública y liviana para `https://menu.saviaup.com/m/{slug}` y `https://menu.saviaup.com/{slug}`.

## Límites de seguridad

`saviaup.frontend-menu` tiene su propio `main.ts`, configuración, router, environments e `index.html`. Su configuración registra únicamente Router, `HttpClient` y el environment público. No importa ni registra almacenamiento de tokens, repositorios de autenticación, contexto de organización, refresh coordinators, guards, interceptores o navegación administrativa.

La única consulta de negocio pública es:

```text
GET /api/public/menu/{slug}
```

El backend expone este endpoint con `AllowAnonymous`. Un `401`, `403`, `404` o error de red se muestra como “Menú no disponible”; la aplicación nunca redirige a login ni intenta renovar una sesión.

El componente visual del menú y sus contratos se reutilizan como código compartido del workspace. El cliente público está separado en `PublicDigitalMenuService`; las operaciones administrativas permanecen en `DigitalMenuService` y no forman parte del bundle público.

## Desarrollo local

```bash
npm install
npm run start:menu
```

El menú queda disponible en `http://localhost:4201/m/{slug}` y `http://localhost:4201/{slug}`; usa `http://localhost:5000` por defecto. `public/env-config.js` puede definir `window.__env.apiUrl` en tiempo de ejecución.

La aplicación administrativa recibe `MENU_FRONTEND_URL` en tiempo de ejecución para generar y copiar enlaces del dominio público sin hardcodearlos en componentes o servicios de negocio.

Comandos independientes:

```bash
npm run build:menu
npm run test:menu -- --watch=false
npm run lint:menu
```

La salida de producción es `dist/saviaup.frontend-menu/browser`. Esta aplicación no instala Service Worker ni manifiesto PWA.

## Docker y CI/CD

El `Dockerfile` único recibe dos argumentos para evitar duplicar la configuración de Nginx:

```bash
docker build \
  --build-arg ANGULAR_PROJECT=saviaup.frontend-menu \
  --build-arg DIST_PROJECT=saviaup.frontend-menu \
  -t saviaup-frontend-menu .
```

La imagen administrativa mantiene el valor por defecto `savia-up-web`. GitHub Actions construye y publica ambas imágenes:

- `ghcr.io/clepineuxp/saviaup-frontend`
- `ghcr.io/clepineuxp/saviaup-frontend-menu`

## Kubernetes e ingress

Los manifiestos viven en el repositorio `saviaup.environments`, dentro de `dev|qa|prod/frontend-menu`. Cada ambiente tiene `Deployment`, `Service`, `ConfigMap` y `Secret` independientes:

| Ambiente | Host público           | API                   |
| -------- | ---------------------- | --------------------- |
| dev      | `dev-menu.saviaup.com` | `dev-api.saviaup.com` |
| qa       | `qa-menu.saviaup.com`  | `qa-api.saviaup.com`  |
| prod     | `menu.saviaup.com`     | `api.saviaup.com`     |

Los `ConfigMap` del backend de cada ambiente incluyen el host público correspondiente en `Cors__AllowedOrigins`; estos cambios deben aplicarse junto con los manifiestos antes de exponer el dominio.

Nginx usa fallback SPA (`try_files ... /index.html`), por lo que abrir o recargar directamente `/m/{slug}` o `/{slug}` funciona. Las rutas antiguas `/m/{slug}` del host administrativo reciben un redirect HTTP `308` al host público equivalente, preservando `path` y `query string` para mantener vigentes los QR existentes.

El Service Worker de la aplicación administrativa excluye `/m` y `/m/**` de su fallback de navegación. Así, incluso un cliente con la PWA administrativa instalada deja que el request alcance el ingress y reciba el redirect al dominio público. La aplicación de menú no registra Service Worker, por lo que sus despliegues no comparten caché con administración.

El dominio público enruta exclusivamente al servicio `frontend-menu`. Como el bundle no contiene `/login`, `/app` ni rutas administrativas, esos paths muestran la pantalla pública de recurso no encontrado.

## DNS y TLS

Antes del despliegue, los hosts `dev-menu`, `qa-menu` y `menu` deben resolver al ingress controller y estar incluidos en el certificado referenciado por `saviaup-tls`. Los manifiestos declaran los hosts TLS, pero no crean registros DNS ni emiten certificados.
