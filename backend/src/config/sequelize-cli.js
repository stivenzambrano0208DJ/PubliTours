require("dotenv").config();

// Configuración para sequelize-cli (npm run migrate). Lee las mismas variables que la app.
const config = {
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

module.exports = { development: config, test: config, production: config };
