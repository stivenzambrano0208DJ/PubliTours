"use strict";

// Esquema base de PubliTours (equivale a lo que antes creaba sequelize.sync()).
// En bases ya existentes se registra como aplicado sin ejecutarse (ver README).
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, DECIMAL, DATE, DATEONLY, BOOLEAN, ENUM, NOW } = Sequelize;
    const id = { type: INTEGER, primaryKey: true, autoIncrement: true };
    const fk = (tabla) => ({ type: INTEGER, allowNull: false, references: { model: tabla, key: "id" }, onDelete: "CASCADE" });

    await queryInterface.createTable("usuarios", {
      id,
      nombre: { type: STRING(120), allowNull: false },
      correo: { type: STRING(150), allowNull: false, unique: true },
      password_hash: { type: STRING(255), allowNull: false },
      rol: { type: ENUM("turista", "prestador", "administrador"), allowNull: false, defaultValue: "turista" },
      fecha_registro: { type: DATE, allowNull: false, defaultValue: NOW },
    });

    await queryInterface.createTable("prestadores", {
      id,
      usuario_id: { ...fk("usuarios"), unique: true },
      nombre_negocio: { type: STRING(150), allowNull: false },
      categoria: { type: STRING(60), allowNull: false },
      municipio: { type: STRING(80), allowNull: false },
      descripcion: { type: TEXT },
      telefono: { type: STRING(20) },
      estado_verificacion: { type: ENUM("pendiente", "aprobado", "rechazado"), allowNull: false, defaultValue: "pendiente" },
    });

    await queryInterface.createTable("sitios_turisticos", {
      id,
      prestador_id: { type: INTEGER, references: { model: "prestadores", key: "id" }, onDelete: "SET NULL" },
      nombre: { type: STRING(150), allowNull: false },
      categoria: { type: STRING(60), allowNull: false },
      municipio: { type: STRING(80), allowNull: false },
      precio: { type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      horario: { type: STRING(100) },
      descripcion: { type: TEXT },
      tipo_viaje: { type: STRING(150) },
      imagen_url: { type: STRING(255) },
      latitud: { type: DECIMAL(10, 7) },
      longitud: { type: DECIMAL(10, 7) },
      estado: { type: ENUM("activo", "inactivo"), allowNull: false, defaultValue: "activo" },
    });

    await queryInterface.createTable("imagenes_sitio", {
      id,
      sitio_id: fk("sitios_turisticos"),
      imagen_url: { type: STRING(255), allowNull: false },
      orden: { type: INTEGER, allowNull: false, defaultValue: 0 },
    });

    await queryInterface.createTable("itinerarios", {
      id,
      turista_id: fk("usuarios"),
      fecha_creacion: { type: DATE, allowNull: false, defaultValue: NOW },
      presupuesto: { type: DECIMAL(10, 2), allowNull: false },
      dias: { type: INTEGER, allowNull: false },
      preferencias: { type: TEXT },
    });

    await queryInterface.createTable("itinerario_items", {
      id,
      itinerario_id: fk("itinerarios"),
      sitio_id: fk("sitios_turisticos"),
      dia: { type: INTEGER, allowNull: false },
      orden: { type: INTEGER, allowNull: false },
      score: { type: DECIMAL(5, 2), allowNull: false },
      justificacion: { type: TEXT },
    });

    await queryInterface.createTable("reservas", {
      id,
      turista_id: fk("usuarios"),
      sitio_id: fk("sitios_turisticos"),
      prestador_id: fk("prestadores"),
      fecha_solicitud: { type: DATE, allowNull: false, defaultValue: NOW },
      fecha_servicio: { type: DATEONLY, allowNull: false },
      estado: { type: ENUM("pendiente", "confirmada", "rechazada"), allowNull: false, defaultValue: "pendiente" },
    });

    await queryInterface.createTable("notificaciones", {
      id,
      usuario_id: fk("usuarios"),
      tipo: { type: STRING(50), allowNull: false },
      mensaje: { type: TEXT, allowNull: false },
      leido: { type: BOOLEAN, allowNull: false, defaultValue: false },
      fecha: { type: DATE, allowNull: false, defaultValue: NOW },
    });

    await queryInterface.createTable("password_resets", {
      id,
      usuario_id: fk("usuarios"),
      token_hash: { type: STRING(255), allowNull: false },
      expira: { type: DATE, allowNull: false },
      usado: { type: BOOLEAN, allowNull: false, defaultValue: false },
      fecha_creacion: { type: DATE, allowNull: false, defaultValue: NOW },
    });
  },

  async down(queryInterface) {
    for (const t of ["password_resets", "notificaciones", "reservas", "itinerario_items", "itinerarios",
      "imagenes_sitio", "sitios_turisticos", "prestadores", "usuarios"]) {
      await queryInterface.dropTable(t);
    }
  },
};
