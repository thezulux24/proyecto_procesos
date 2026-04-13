# Sistema Centralizado de Transporte Universitario

Este proyecto implementa un sistema centralizado para gestionar el uso de robots y drones dentro de una universidad.

## Contexto

La universidad cuenta con dispositivos (robots y drones) para servicios internos como:

- Transporte de documentos y pedidos de cafeteria.
- Grabacion de encuentros artisticos y deportivos.

El objetivo del sistema es eliminar la dependencia de operacion manual por persona y permitir administracion centralizada de inventario, reservas, bitacoras y monitoreo.

## Stack Tecnologico

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Next.js (App Router)
- Infraestructura local: Docker Compose

## Modelo de Datos

Diagrama general:

![Logo](front/public/mermaid-diagram.png)

## Requisitos

- Docker Desktop en ejecucion
- Node.js 18+
- npm 9+
- Puerto 5433 disponible para la base de datos de este proyecto

## Variables de Entorno (.env)

Antes de ejecutar `db:setup` y levantar el backend, crea el archivo `back/.env` con el siguiente contenido.

```powershell
DATABASE_URL="postgresql://user_pos:pos_password_2026@localhost:5433/pos_db?schema=public"
PORT=3001
```

## Instalacion Rapida

1. Levantar base de datos

```powershell
docker compose up -d
```

2. Instalar dependencias

```powershell
cd back
npm install
cd ../front
npm install
```

3. Configurar variables de entorno del backend

```powershell
cd ../back
copy .env.example .env
```

4. Configurar base de datos y datos iniciales

```powershell
npm run db:setup
```

5. Levantar backend

```powershell
npm run start:dev
```

6. Levantar frontend (otra terminal)

```powershell
cd ../front
npm run dev
```

7. Para consultar la base de datos

```powershell
cd ../back
npx prisma studio
```

## Comandos Utiles (Backend)

```powershell
# Generar cliente Prisma
npm run prisma:generate

# Crear/aplicar migraciones
npm run prisma:migrate

# Cargar seed
npm run prisma:seed

# Flujo completo DB (generate + migrate + seed)
npm run db:setup
```

## Nota de Soft Delete

El sistema evita eliminaciones fisicas en operaciones de dominio. En su lugar:

- Se marca `active = false`
- Los listados filtran por `active = true` por defecto
