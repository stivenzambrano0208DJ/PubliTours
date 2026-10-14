"use strict";

// Mensajería entre turistas y negocios. Aditiva: crea tablas nuevas y no toca ninguna existente.
//  - conversaciones: una por pareja (turista, negocio); guarda hasta qué mensaje leyó cada lado.
//  - mensajes: texto y/o fotos; pueden llevar el servicio, paquete o reserva sobre el que se pregunta.
//  - mensaje_imagenes: fotos de un mensaje. Se guardan en una carpeta PRIVADA (no en /uploads públicos).
//  - reportes_mensaje: lo que una persona reporta para que lo revise la administración.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("conversaciones", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      turista_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      prestador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "prestadores", key: "id" }, onDelete: "CASCADE" },
      creada_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      ultimo_mensaje_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      turista_leido_hasta: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, // id del último mensaje que leyó la turista
      prestador_leido_hasta: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, // ídem el negocio
    });
    await queryInterface.addIndex("conversaciones", ["turista_id", "prestador_id"], { unique: true, name: "uq_conversaciones_pareja" });
    await queryInterface.addIndex("conversaciones", ["turista_id", "ultimo_mensaje_en"], { name: "idx_conversaciones_turista" });
    await queryInterface.addIndex("conversaciones", ["prestador_id", "ultimo_mensaje_en"], { name: "idx_conversaciones_prestador" });

    await queryInterface.createTable("mensajes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      conversacion_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "conversaciones", key: "id" }, onDelete: "CASCADE" },
      autor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      texto: { type: Sequelize.TEXT, allowNull: true }, // puede ser solo fotos
      sitio_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "sitios_turisticos", key: "id" }, onDelete: "SET NULL" },
      paquete_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "paquetes", key: "id" }, onDelete: "SET NULL" },
      reserva_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "reservas", key: "id" }, onDelete: "SET NULL" },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      retirado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, // la administración lo retiró: nadie lo ve
    });
    await queryInterface.addIndex("mensajes", ["conversacion_id", "id"], { name: "idx_mensajes_conversacion" });
    await queryInterface.addIndex("mensajes", ["autor_id", "creado_en"], { name: "idx_mensajes_autor" }); // tope de mensajes por hora

    await queryInterface.createTable("mensaje_imagenes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "mensajes", key: "id" }, onDelete: "CASCADE" },
      archivo: { type: Sequelize.STRING(120), allowNull: false }, // solo el nombre; vive en public/uploads/privado/mensajes
      tipo: { type: Sequelize.STRING(30), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
    await queryInterface.addIndex("mensaje_imagenes", ["mensaje_id"], { name: "idx_mensaje_imagenes_mensaje" });

    await queryInterface.createTable("reportes_mensaje", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "mensajes", key: "id" }, onDelete: "CASCADE" },
      reportado_por: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" }, onDelete: "CASCADE" },
      motivo: { type: Sequelize.STRING(30), allowNull: false },
      detalle: { type: Sequelize.STRING(300), allowNull: true },
      estado: { type: Sequelize.STRING(12), allowNull: false, defaultValue: "pendiente" }, // pendiente | descartado | retirado
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      revisado_por: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      revisado_en: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex("reportes_mensaje", ["mensaje_id", "reportado_por"], { unique: true, name: "uq_reportes_mensaje_persona" });
    await queryInterface.addIndex("reportes_mensaje", ["estado", "creado_en"], { name: "idx_reportes_mensaje_estado" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reportes_mensaje");
    await queryInterface.dropTable("mensaje_imagenes");
    await queryInterface.dropTable("mensajes");
    await queryInterface.dropTable("conversaciones");
  },
};
