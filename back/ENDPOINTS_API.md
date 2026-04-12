# API Endpoints - Sistema de Transporte Universitario

## 🔓 Autenticación (Sin Protección)

### **POST /auth/login**
Iniciar sesión y obtener token JWT

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@universidad.edu",
    "password": "admin123456"
  }'
```

**Respuesta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@universidad.edu",
    "fullName": "Administrador Sistema",
    "role": "ADMIN"
  }
}
```

---

## 🔐 Autenticación (Requiere JWT Token)

### **POST /auth/profile**
Obtener perfil del usuario autenticado

```bash
curl -X POST http://localhost:3001/auth/profile \
  -H "Authorization: Bearer <token>"
```

---

## 👥 Usuarios (Requiere JWT Token)

### **POST /users** (⭐ Requiere ADMIN)
Crear nuevo usuario

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "nuevo@universidad.edu",
    "fullName": "Nombre del Usuario",
    "password": "password123456",
    "role": "OPERADOR"
  }'
```

### **GET /users**
Listar todos los usuarios

```bash
curl http://localhost:3001/users \
  -H "Authorization: Bearer <token>"
```

Query Parameters:
- `includeInactive=true` - Incluir usuarios inactivos

### **GET /users/:id**
Obtener usuario específico

```bash
curl http://localhost:3001/users/1 \
  -H "Authorization: Bearer <token>"
```

### **PATCH /users/:id**
Actualizar usuario

```bash
curl -X PATCH http://localhost:3001/users/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "fullName": "Nuevo Nombre",
    "role": "ADMIN"
  }'
```

### **DELETE /users/:id** (⭐ Requiere ADMIN)
Eliminar usuario (soft delete)

```bash
curl -X DELETE http://localhost:3001/users/1 \
  -H "Authorization: Bearer <token>"
```

---

## 🤖 Dispositivos

### **GET /devices**
Listar todos los dispositivos

```bash
curl http://localhost:3001/devices
```

Query Parameters:
- `includeInactive=true` - Incluir dispositivos inactivos

### **GET /devices/:id**
Obtener dispositivo específico

```bash
curl http://localhost:3001/devices/1
```

### **POST /devices**
Crear dispositivo

```bash
curl -X POST http://localhost:3001/devices \
  -H "Content-Type: application/json" \
  -d '{
    "code": "RB-103",
    "name": "Robot Courier C",
    "type": "ROBOT",
    "status": "AVAILABLE",
    "batteryLevel": 95,
    "lastKnownLocation": "Hangar Principal"
  }'
```

### **PATCH /devices/:id**
Actualizar dispositivo

```bash
curl -X PATCH http://localhost:3001/devices/1 \
  -H "Content-Type: application/json" \
  -d '{
    "batteryLevel": 80,
    "status": "MAINTENANCE"
  }'
```

### **DELETE /devices/:id**
Eliminar dispositivo (soft delete)

```bash
curl -X DELETE http://localhost:3001/devices/1
```

---

## 📅 Reservas (Con generación automática de QR y Email)

### **GET /reservations**
Listar todas las reservas

```bash
curl http://localhost:3001/reservations
```

### **GET /reservations/:id**
Obtener reserva específica

```bash
curl http://localhost:3001/reservations/1
```

### **POST /reservations** ⭐ (Genera QR y envía email automáticamente)
Crear reserva

```bash
curl -X POST http://localhost:3001/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Evento Deportivo",
    "serviceType": "Cobertura video",
    "requestedBy": "Bienestar Universitario",
    "startAt": "2026-04-18T14:00:00Z",
    "endAt": "2026-04-18T17:00:00Z",
    "notes": "Tomar planos generales del evento",
    "deviceId": 3,
    "operatorId": 1
  }'
```

**Respuesta incluirá:**
```json
{
  "id": 2,
  "title": "Evento Deportivo",
  "serviceType": "Cobertura video",
  "status": "REQUESTED",
  "qrCode": "iVBORw0KGgoAAAANSUhEUgAAAyQAAAMkCAYAAAA...",
  "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhE...",
  "emailSent": true,
  "createdAt": "2026-04-11T21:58:42.000Z"
}
```

### **PATCH /reservations/:id**
Actualizar reserva

```bash
curl -X PATCH http://localhost:3001/reservations/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "notes": "Aprobado por administración"
  }'
```

### **DELETE /reservations/:id**
Cancelar reserva

```bash
curl -X DELETE http://localhost:3001/reservations/1
```

---

## 📋 Bitácora de Servicios

### **GET /service-logs**
Listar todas las bitácoras

```bash
curl http://localhost:3001/service-logs
```

### **GET /service-logs/:id**
Obtener bitácora específica con telemetría y videos

```bash
curl http://localhost:3001/service-logs/1
```

### **POST /service-logs**
Crear entrada de bitácora

```bash
curl -X POST http://localhost:3001/service-logs \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2026-04-18T14:00:00Z",
    "endTime": "2026-04-18T14:30:00Z",
    "origin": "Bloque Administrativo",
    "destination": "Biblioteca Central",
    "serviceStatus": "COMPLETED",
    "deviceId": 1,
    "operatorId": 1,
    "reservationId": 1,
    "notes": "Entrega completada exitosamente"
  }'
```

### **PATCH /service-logs/:id**
Actualizar bitácora

```bash
curl -X PATCH http://localhost:3001/service-logs/1 \
  -H "Content-Type: application/json" \
  -d '{
    "serviceStatus": "COMPLETED",
    "sensorSummary": "Sensores funcionando normalmente"
  }'
```

### **DELETE /service-logs/:id**
Eliminar bitácora (soft delete)

```bash
curl -X DELETE http://localhost:3001/service-logs/1
```

---

## 🏥 Salud de la Aplicación

### **GET /**
Verificar estatus de la aplicación

```bash
curl http://localhost:3001/
```

**Respuesta:**
```json
{
  "message": "Sistema de Transporte Universitario v1.0"
}
```

---

## 🔑 Credenciales de Prueba

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@universidad.edu | admin123456 | ADMIN |
| operador@universidad.edu | operador123456 | OPERADOR |

---

## 📊 Enums

### DeviceType
- `ROBOT`
- `DRONE`

### DeviceStatus
- `AVAILABLE`
- `RESERVED`
- `IN_SERVICE`
- `MAINTENANCE`
- `OFFLINE`

### ReservationStatus
- `REQUESTED`
- `APPROVED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### ServiceStatus
- `IN_PROGRESS`
- `COMPLETED`
- `ABORTED`

### OperatorRole
- `ADMIN`
- `TECHNICIAN`
- `SUPERVISOR`

### UserRole
- `ADMIN`
- `OPERADOR`

---

## ⚙️ Variables de Entorno Importantes

```bash
# Base de Datos
DATABASE_URL="postgresql://user_pos:pos_password_2026@localhost:5433/pos_db?schema=public"

# Servidor
PORT=3001

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Email (SMTP)
SMTP_URL=smtp://localhost:1025
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña
SMTP_FROM=sistema@transporte.local
```

---

## 📚 Recursos

- Backend: [http://localhost:3001](http://localhost:3001)
- Base de Datos: PostgreSQL en puerto 5433
- Documentación de Autenticación: Ver `GUIA_AUTENTICACION.md`
- Documentación de Base de Datos: Ver `GUIABASEDEDATOS.md`
