# Sistema Centralizado de Transporte Universitario

Guía práctica para ejecutar el proyecto completo: base de datos, backend, frontend, simulación automática, videos demo y correo con Mailpit en Docker.

## Requisitos

- Node.js 18 o superior.
- npm 9 o superior.
- Docker Desktop activo.
- Puerto `5433` libre para PostgreSQL.
- Puerto `3000` libre para el frontend.
- Puerto `3001` libre para el backend.
- Puerto `1025` libre para Mailpit.
- Puerto `8025` libre para la interfaz de Mailpit.

## Paso a paso

1. Levanta la base de datos:

```powershell
docker compose up -d
```

2. En `back/.env`, deja esta configuración mínima para ejecutar todo:

```env
DATABASE_URL="postgresql://user_pos:pos_password_2026@localhost:5433/pos_db?schema=public"
PORT=3001
DEMO_AUTOPILOT=true
SMTP_URL=smtp://localhost:1025
SMTP_FROM=sistema@transporte.local
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev-secret
```

3. Instala dependencias:

```powershell
cd back
npm install
cd ../front
npm install
```

4. Prepara Prisma y la base de datos:

```powershell
cd ../back
npm run db:setup
```

5. Inicia el backend:

```powershell
npm run start:dev
```

6. En otra terminal, inicia el frontend:

```powershell
cd ../front
npm run dev
```

7. Abre el panel en:

```text
http://localhost:3000
```

## Simulación automática

La simulación queda activa con `DEMO_AUTOPILOT=true` en `back/.env`.

Con eso el backend:

- Genera actividad demo automáticamente.
- Registra telemetría.
- Actualiza batería y estado de dispositivos.
- Cierra servicios automáticamente.
- Crea grabaciones de video para servicios completados.

Las vistas nuevas quedan en:

- `/resumen`
- `/grabaciones`
- `/resumen/video/:videoId`

## Correo en Docker

Para revisar los correos locales, levanta Mailpit con Docker:

```powershell
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 mailpit/mailpit:latest
```

Eso deja:

- SMTP en `localhost:1025`
- Interfaz web en `http://localhost:8025`


## Datos de prueba

Credenciales creadas por el seed:

- Admin: `admin@universidad.edu` / `admin123456`
- Operador: `operador@universidad.edu` / `operador123456`

## Si quieres reiniciar todo

```powershell
cd back
npm run db:setup
npm run start:dev
```

En otra terminal:

```powershell
cd front
npm run dev
```
