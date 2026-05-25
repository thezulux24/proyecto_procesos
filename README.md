# Sistema Centralizado de Transporte Universitario

Este proyecto implementa un sistema centralizado para gestionar el uso de robots y drones dentro de una universidad. Actualmente, estos dispositivos son operados manualmente, lo que limita la atención de múltiples solicitudes al mismo tiempo. Por ello, se propone desarrollar un software que automatice la configuración y gestión de los dispositivos, mejorando la eficiencia del servicio.

## Requisitos

- Node.js 18+ y npm 9+.
- Docker Desktop activo.
- Puertos libres: 5433 (PostgreSQL), 3000 (frontend), 3001 (backend), 1025 y 8025 (Mailpit).

## Guía de ejecución

1. Levanta la base de datos:

```powershell
docker compose up -d
```

2. En el archivo `back/.env`, se debe establecer como mínimo la siguiente configuración para garantizar la correcta ejecución del proyecto:

```env
DATABASE_URL="postgresql://user_pos:pos_password_2026@localhost:5433/pos_db?schema=public"
PORT=3001
DEMO_AUTOPILOT=true
SMTP_URL=smtp://localhost:1025
SMTP_FROM=sistema@transporte.local
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev-secret
```

La variable `DEMO_AUTOPILOT` controla la ejecución automática de la simulación del sistema.
- Si su valor es `true`, la simulación se ejecutará automáticamente.
- Si su valor es `false`, la simulación permanecerá deshabilitada.

3. Instalar dependencias:

```powershell
cd back
npm install
```

```powershell
cd ../front
npm install
```

4. Preparar Prisma y la base de datos:

```powershell
cd ../back
npm run db:setup
```

5. Iniciar el backend:

```powershell
cd back
npm run start:dev
```

6. En otra terminal, iniciar el frontend:

```powershell
cd ../front
npm run dev
```

7. Abrir el panel en siguiente puerto:

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

## Correo en Docker

Para revisar los correos locales, se hace uso de Mailpit con Docker. 

```powershell
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit:latest
```

En caso que se indique que el nombre del contenedor ya existe, ejecutar el siguiente comando:

```powershell
docker rm -f mailpit
```
Una vez validado, volver a ejecutar el comando para levantar el contenedor.

El correo se encuentra en el siguiente puerto:

- SMTP en `localhost:1025`
- Interfaz web en `http://localhost:8025`

## Base de datos

Para visualizar la base de datos se hace uso del siguiente comando:

```powershell
cd back
npx prisma studio
```
