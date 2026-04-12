const { PrismaClient, DeviceType, DeviceStatus, OperatorRole, ReservationStatus, ServiceStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  // Create system roles
  const adminRole = await prisma.role.upsert({
    where: { nombre: 'ADMIN' },
    update: {},
    create: {
      nombre: 'ADMIN',
      descripcion: 'Administrador del sistema',
      active: true,
    },
  });

  const operadorRole = await prisma.role.upsert({
    where: { nombre: 'OPERADOR' },
    update: {},
    create: {
      nombre: 'OPERADOR',
      descripcion: 'Operador de servicios',
      active: true,
    },
  });

  // Create Users for Authentication
  const adminPassword = await hashPassword('admin123456');
  const operadorPassword = await hashPassword('operador123456');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@universidad.edu' },
    update: { roleId: adminRole.id },
    create: {
      email: 'admin@universidad.edu',
      fullName: 'Administrador Sistema',
      passwordHash: adminPassword,
      roleId: adminRole.id,
      active: true,
    },
  });

  const operadorUser = await prisma.user.upsert({
    where: { email: 'operador@universidad.edu' },
    update: { roleId: operadorRole.id },
    create: {
      email: 'operador@universidad.edu',
      fullName: 'Operador Sistema',
      passwordHash: operadorPassword,
      roleId: operadorRole.id,
      active: true,
    },
  });

  // Create Operators
  const admin = await prisma.operator.upsert({
    where: { email: 'admin.transport@universidad.edu' },
    update: {},
    create: {
      fullName: 'Laura Martinez',
      email: 'admin.transport@universidad.edu',
      role: OperatorRole.ADMIN,
    },
  });

  const technician = await prisma.operator.upsert({
    where: { email: 'tecnico.robotica@universidad.edu' },
    update: {},
    create: {
      fullName: 'Carlos Rojas',
      email: 'tecnico.robotica@universidad.edu',
      role: OperatorRole.TECHNICIAN,
    },
  });

  const robotA = await prisma.device.upsert({
    where: { code: 'RB-101' },
    update: {},
    create: {
      code: 'RB-101',
      name: 'Robot Courier A',
      type: DeviceType.ROBOT,
      status: DeviceStatus.AVAILABLE,
      batteryLevel: 87,
      lastKnownLocation: 'Bloque Administrativo',
    },
  });

  const robotB = await prisma.device.upsert({
    where: { code: 'RB-102' },
    update: {},
    create: {
      code: 'RB-102',
      name: 'Robot Courier B',
      type: DeviceType.ROBOT,
      status: DeviceStatus.RESERVED,
      batteryLevel: 76,
      lastKnownLocation: 'Biblioteca Central',
    },
  });

  const droneA = await prisma.device.upsert({
    where: { code: 'DR-201' },
    update: {},
    create: {
      code: 'DR-201',
      name: 'Drone Vision A',
      type: DeviceType.DRONE,
      status: DeviceStatus.AVAILABLE,
      batteryLevel: 92,
      lastKnownLocation: 'Hangar Norte',
    },
  });

  const reservation = await prisma.reservation.create({
    data: {
      object: 'Cobertura torneo interfacultades',
      deviceType: 'DRON',
      requestedBy: 'Coordinacion Bienestar',
      startAt: new Date('2026-04-18T14:00:00.000Z'),
      endAt: new Date('2026-04-18T17:00:00.000Z'),
      status: ReservationStatus.ACCEPTED,
      email: 'bienestar@universidad.edu',
      deviceId: droneA.id,
      operatorId: admin.id,
    },
  });

  const serviceLog = await prisma.serviceLog.create({
    data: {
      startTime: new Date('2026-04-10T16:10:00.000Z'),
      endTime: new Date('2026-04-10T16:25:00.000Z'),
      origin: 'Cafeteria principal',
      destination: 'Rectoria',
      serviceStatus: ServiceStatus.COMPLETED,
      sensorSummary: 'Todos los sensores operativos',
      orderStatus: 'Pedido entregado',
      notes: 'Entrega de refrigerios administrativos',
      deviceId: robotA.id,
      operatorId: technician.id,
      reservationId: reservation.id,
    },
  });

  await prisma.telemetrySample.createMany({
    data: [
      {
        deviceId: robotA.id,
        serviceLogId: serviceLog.id,
        batteryLevel: 86,
        latitude: -6.260145,
        longitude: -75.577321,
        sensorStatus: 'OK',
        payloadStatus: 'Carga estable',
      },
      {
        deviceId: robotA.id,
        serviceLogId: serviceLog.id,
        batteryLevel: 82,
        latitude: -6.25982,
        longitude: -75.5769,
        sensorStatus: 'OK',
        payloadStatus: 'Entrega en curso',
      },
    ],
  });

  await prisma.videoRecord.create({
    data: {
      cloudProvider: 'AWS S3',
      cloudUrl: 'https://s3.amazonaws.com/universidad-transport/videos/service-log-1.mp4',
      startedAt: new Date('2026-04-10T16:09:00.000Z'),
      endedAt: new Date('2026-04-10T16:26:00.000Z'),
      deviceId: robotA.id,
      serviceLogId: serviceLog.id,
    },
  });

  console.log('=== Seed completado ===');
  console.log('Usuarios de autenticación creados:');
  console.log(`  - Admin: ${adminUser.email} / password: admin123456`);
  console.log(`  - Operador: ${operadorUser.email} / password: operador123456`);
  console.log('Operadores, dispositivos y bitacora también creados.');

  void robotB;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
