# Torneo Videojuegos — Backend

API REST (y WebSockets en desarrollo) para el **sistema de gestión de torneos de videojuegos**: organizadores crean torneos, jugadores se inscriben y registran resultados, espectadores consultan brackets públicos. Este servicio usa **Node.js**, **Express**, **TypeScript**, **Prisma** y **PostgreSQL**.

## Requisitos previos

| Herramienta   | Versión recomendada |
|---------------|---------------------|
| Node.js       | **20 LTS** o **22** (evitar mezclar con versiones muy antiguas) |
| PostgreSQL    | **15+** (local o Docker) |
| npm           | Incluido con Node |

Comprobar versiones:

```bash
node -v
npm -v
psql --version
```

## Configuración

1. Clonar el repositorio y entrar en esta carpeta (`Torneo Videojuegos Back`).
2. Copiar variables de entorno:

   ```bash
   cp .env.example .env
   ```

3. Editar `.env`: sobre todo `DATABASE_URL`, secretos JWT y `FRONTEND_URL`.

## Instalación y base de datos (Prisma)

```bash
npm install
```

Generar el cliente Prisma (obligatorio tras cambios en `prisma/schema.prisma`):

```bash
npx prisma generate
```

Aplicar migraciones y dejar el esquema al día:

```bash
npx prisma migrate dev
```

Cargar datos iniciales (roles, tipos de juego, formatos, configuración, usuarios demo):

```bash
npm run prisma:seed
# o: npx prisma db seed
```

Inspeccionar tablas y datos en el navegador:

```bash
npx prisma studio
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Deberías ver mensajes similares a: conexión a la base de datos correcta y servidor escuchando en el puerto configurado (`PORT`, por defecto **3000**).

### Comprobación rápida del API

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada: `{"status":"ok","message":"Server is running"}`.

### Autenticación (JWT + refresh)

Variables en `.env`: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Body `nombre`, `email`, `contrasena`, **`idRol`** (rol global elegido; ver `GET /api/catalogos/roles-registro`) |
| `POST` | `/api/auth/login` | Login → `accessToken`, `refreshToken`, usuario sin contraseña |
| `POST` | `/api/auth/refresh` | Body `{ "refreshToken" }` → nuevo `accessToken` |
| `GET` | `/api/auth/me` | Header `Authorization: Bearer <accessToken>` → perfil actual |
| `GET` | `/api/catalogos/roles-registro` | Roles disponibles en el formulario de registro (público) |

Ejemplos:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jugador.demo@local.test","contrasena":"Password123!"}'

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

**Middlewares** (para las siguientes fases de rutas):

- `authMiddleware`: valida el access token y rellena `req.auth` (`userId`, `email`, `globalRoles`).
- `requireGlobalRoles('organizador', ...)`: exige un rol **global** (`USUARIO_ROL.id_torneo` NULL).
- `requireTorneoOrganizerAccess('id')`: permite gestionar un torneo si es organizador global, organizador asignado a ese torneo o `id_organizador` del torneo.

## Estructura de carpetas (`src/`)

Alineada con `PROMPT_CURSOR.md` del monorepo:

```
src/
├── app.ts                 # Express + HTTP server + Socket.io attach
├── config/
│   ├── database.ts        # Pool pg + PrismaClient (adapter Prisma 7)
│   └── socket.ts          # Inicialización Socket.io
├── controllers/           # Manejo HTTP (delegará en servicios)
├── services/              # Lógica de negocio y acceso a datos
├── routes/                # Routers por dominio, montados bajo /api
├── middlewares/           # auth JWT, roles global / por torneo
├── validators/            # Esquemas Zod
└── types/                 # Tipos compartidos
```

**Estado actual:** autenticación JWT, **torneos**, **equipos/jugadores**, **enfrentamientos/resultados** (incl. bracket público y validación dual con emisión Socket.io al validar). Pendientes: notificaciones, historial y generación automática de brackets.

## Scripts npm útiles

| Script            | Descripción                    |
|-------------------|--------------------------------|
| `npm run dev`     | Servidor con recarga (nodemon + tsx) |
| `npm run build`   | Compila TypeScript a `dist/`   |
| `npm run start`   | Ejecuta `node dist/src/app.js` |
| `npm run prisma:generate` | `prisma generate`        |
| `npm run prisma:migrate`  | `prisma migrate dev`     |
| `npm run prisma:seed`     | Ejecuta `prisma/seed.ts` |
| `npm run prisma:studio` | Abre Prisma Studio       |

### Torneos, equipos y enfrentamientos (REST)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/torneos` | No | Lista torneos (`?estado=` opcional) |
| `POST` | `/api/torneos` | Sí, rol global **organizador** | Crear torneo (fecha inicio no en el pasado) |
| `GET` | `/api/torneos/:id` | No | Detalle + equipos activos |
| `PUT` | `/api/torneos/:id` | Sí, organizador del torneo | Actualizar (no si está finalizado/cancelado) |
| `DELETE` | `/api/torneos/:id` | Sí, organizador del torneo | Eliminar |
| `GET` | `/api/torneos/:id/bracket` | No | Bracket JSON o `null` si aún no existe |
| `POST` | `/api/torneos/:id/equipos` | Sí | Inscribir equipo (capitán = usuario); cupo y estado `inscripciones_abiertas` |
| `POST` | `/api/torneos/:id/enfrentamientos` | Sí, organizador del torneo | Crear partida (equipos opcionales; deben pertenecer al torneo) |
| `POST` | `/api/equipos/:id/jugadores` | Sí | Agregar jugador (organizador o capitán) |
| `DELETE` | `/api/equipos/:equipoId/jugadores/:jugadorId` | Sí | Quitar jugador |
| `PUT` | `/api/jugadores/:id` | Sí | Actualizar jugador (él mismo o organizador) |
| `POST` | `/api/enfrentamientos/:id/resultado` | Sí | Registrar/actualizar resultado (jugador de un equipo); pasa a `esperando_validacion` |
| `PUT` | `/api/resultados/:id/validar` | Sí | Validar (organizador del torneo o jugador del equipo rival) |

## Rutas base montadas (prefijo `/api`)

| Prefijo            | Archivo de rutas        |
|--------------------|-------------------------|
| `/api/health`      | `routes/index.ts`       |
| `/api/auth`        | `auth.routes.ts`        |
| `/api/torneos`     | `torneo.routes.ts`      |
| `/api/equipos`     | `equipo.routes.ts`      |
| `/api/jugadores`   | `jugador.routes.ts`     |
| `/api/enfrentamientos` | `enfrentamiento.routes.ts` |
| `/api/resultados`  | `resultado.routes.ts`   |
| `/api/notificaciones` | `notificacion.routes.ts` |
| `/api/usuarios`    | `usuario.routes.ts`     |

## Solución de problemas

- **`EADDRINUSE` (puerto 3000 ocupado):** otro proceso usa el mismo puerto. Cambie `PORT` en `.env`, cierre el otro servidor o ejecute `lsof -i :3000` (Linux) para identificarlo.
- **`DATABASE_URL` con caracteres especiales en la contraseña:** codifíquelos en la URL (p. ej. `!` → `%21`, `@` → `%40`, espacio → `%20`).
- **`npx tsc` en el backend:** el proyecto compila con `verbatimModuleSyntax` desactivado por compatibilidad con `commonjs`; el flujo recomendado en desarrollo es `npm run dev` (tsx).

## Documentación adicional del proyecto

En la raíz del monorepo: `PROMPT_CURSOR.md` (requisitos funcionales y orden de implementación) y `schema_torneos(1).sql` (referencia del modelo de datos).
