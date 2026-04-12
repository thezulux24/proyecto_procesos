# Guía de Autenticación y QR - Sistema de Transporte Universitario

## 📋 Descripción

Este documento explica cómo funciona el sistema de autenticación JWT y la generación de códigos QR en el backend del Sistema Centralizado de Transporte Universitario.

## 🔐 Autenticación JWT

### Flujo de Autenticación

1. **Login**: El usuario envía sus credenciales (email y contraseña)
2. **Validación**: El sistema verifica las credenciales contra la tabla `User`
3. **Token JWT**: Si es válido, se genera un token JWT que expira en 24 horas
4. **Acceso**: El token se incluye en el header `Authorization: Bearer <token>` para acceder a rutas protegidas

### Tabla de Usuarios (`User`)

```typescript
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  fullName     String
  passwordHash String   // Hasheada con bcrypt
  role         UserRole @default(OPERADOR) // ADMIN | OPERADOR
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Roles de Usuario

- **ADMIN**: Acceso total del sistema, puede crear/eliminar usuarios
- **OPERADOR**: Acceso limitado, puede vistar reservas y servicios

## 📝 Endpoints de Autenticación

### 1. **POST /auth/login**
Login con credenciales para obtener token JWT

**Request:**
```json
{
  "email": "admin@universidad.edu",
  "password": "admin123456"
}
```

**Response:**
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

### 2. **POST /auth/profile**
Obtener perfil del usuario autenticado (requiere token JWT)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "email": "admin@universidad.edu",
  "fullName": "Administrador Sistema",
  "role": "ADMIN",
  "active": true,
  "createdAt": "2026-04-11T21:38:59.000Z",
  "updatedAt": "2026-04-11T21:38:59.000Z"
}
```

## 👥 Endpoints de Usuarios

### 1. **POST /users** (Requiere ADMIN)
Crear nuevo usuario

**Request:**
```json
{
  "email": "nuevo@universidad.edu",
  "fullName": "Nombre del Operador",
  "password": "contraseña123456",
  "role": "OPERADOR"
}
```

### 2. **GET /users** (Requiere JWT)
Listar todos los usuarios

**Query Parameters:**
- `includeInactive=true` - Incluir usuarios inactivos

### 3. **GET /users/:id** (Requiere JWT)
Obtener usuario específico por ID

### 4. **PATCH /users/:id** (Requiere JWT)
Actualizar usuario

**Request:**
```json
{
  "fullName": "Nuevo Nombre",
  "role": "ADMIN"
}
```

### 5. **DELETE /users/:id** (Requiere ADMIN)
Eliminar usuario (soft delete - marca como inactivo)

## 🔒 Protección de Rutas

Las rutas están protegidas con guards de JWT:

- **JwtAuthGuard**: Verifica que exista un token JWT válido
- **RolesGuard**: Verifica que el usuario tenga el rol requerido

Ejemplo en código:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Post()
async create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

## 📱 Generación de Códigos QR

### Flujo de QR

1. **Creación de Reserva**: Al crear una reserva, se genera automáticamente un código QR
2. **Datos del QR**: Contiene ID de reserva, dispositivo, fecha y timestamp
3. **Formato**: Se genera en formato PNG y como data URL (para email)
4. **Almacenamiento**: Se guarda en campos `qrCode` y `qrDataUrl` de la tabla `Reservation`

### Campos de Reserva para QR

```typescript
model Reservation {
  // ... otros campos
  qrCode      String?   // Buffer en base64
  qrDataUrl   String?   // Data URL para email
  emailSent   Boolean   @default(false)
}
```

### Endpoint de Creación de Reserva

**POST /reservations**

**Request:**
```json
{
  "title": "Evento Deportivo",
  "serviceType": "Cobertura video",
  "requestedBy": "Bienestar",
  "startAt": "2026-04-18T14:00:00Z",
  "endAt": "2026-04-18T17:00:00Z",
  "notes": "Tomar planos generales",
  "deviceId": 1,
  "operatorId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Evento Deportivo",
  "qrCode": "iVBORw0KGgoAAAANSUhEUgAAAyQAAAMkCAYAAAA...",
  "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhE...",
  "emailSent": true,
  "status": "REQUESTED",
  // ... otros campos
}
```

## 📧 Envío de Email con QR

### Servicio de Email

El sistema envía automáticamente un email de confirmación cuando se crea una reserva:

**Destinatario**: Email del operador
**Asunto**: "Confirmación de Reserva - [Nombre del Dispositivo]"
**Contenido**: 
- Detalles de la reserva
- Código QR embebido como imagen
- Instrucciones para el usuario

### Configuración de Email

Variables de entorno (en `.env`):
```bash
SMTP_URL=smtp://localhost:1025  # Para desarrollo (smtp4dev)
SMTP_HOST=smtp.gmail.com        # Para producción
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña
SMTP_FROM=sistema@transporte.local
```

### Para Desarrollo

Se recomienda usar [smtp4dev](https://github.com/rnwood/smtp4dev) o [Ethereal Email](https://ethereal.email):

```bash
# Instalar smtp4dev
npm install --save-dev smtp4dev

# O usar en Docker
docker run -p 1080:80 -p 1025:25 rnwood/smtp4dev
```

## 🔑 Credenciales de Prueba

Tras ejecutar `npm run prisma:seed`:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@universidad.edu | admin123456 | ADMIN |
| operador@universidad.edu | operador123456 | OPERADOR |

## 🧪 Ejemplo de Flujo Completo

### 1. Login como Admin

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@universidad.edu",
    "password": "admin123456"
  }'
```

Respuesta:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

### 2. Crear Nuevo Usuario

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "nuevo.usuario@universidad.edu",
    "fullName": "Juan Pérez",
    "password": "password123456",
    "role": "OPERADOR"
  }'
```

### 3. Crear Reserva (se genera QR automáticamente)

```bash
curl -X POST http://localhost:3001/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prueba QR",
    "serviceType": "Test",
    "requestedBy": "Sistema",
    "startAt": "2026-04-15T10:00:00Z",
    "endAt": "2026-04-15T12:00:00Z",
    "deviceId": 1,
    "operatorId": 1
  }'
```

Respuesta incluirá:
- `qrCode`: Buffer en base64
- `qrDataUrl`: Data URL para incrustar en email
- `emailSent`: true si el email se envió correctamente

## ⚙️ Configuración Avanzada

### JWT Secret

Cambiar en producción (en `.env.production`):
```bash
JWT_SECRET=tu-secreto-muy-seguro-y-largo
```

### Tiempo de Expiración del Token

Actualmente: **24 horas**

Para cambiar, modifica `back/src/auth/auth.module.ts`:
```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: { expiresIn: '48h' }, // Cambiar aquí
})
```

### Bcrypt Salt Rounds

Actualmente: **10**

Para cambiar la seguridad de hashing, modifica en servicios:
```typescript
const salt = await bcrypt.genSalt(12); // Mayor número = más seguro pero más lento
```

## 🐛 Troubleshooting

### Error: "Invalid credentials"
- Verificar email y contraseña
- Asegurar que el usuario existe y `active = true`

### Error: "Insufficient permissions"
- El usuario no tiene el rol requerido
- Solo ADMIN puede crear/eliminar usuarios

### Email no se envía
- Verificar variables SMTP en `.env`
- Asegurar que smtp4dev está corriendo en desarrollo
- Revisar logs del servidor

### QR no se genera
- Verificar que `qrcode` está instalado: `npm ls qrcode`
- Revisar los datos de la reserva (especialmente dispositivo)

## 📚 Recursos

- [NestJS JWT](https://docs.nestjs.com/techniques/authentication#jwt-functionality)
- [Passport JWT Strategy](http://www.passportjs.org/packages/passport-jwt/)
- [QRCode Library](https://github.com/davidshimjs/qrcodejs)
- [Nodemailer Documentation](https://nodemailer.com/)
