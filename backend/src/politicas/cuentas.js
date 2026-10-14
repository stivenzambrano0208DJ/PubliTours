const { esAdministrador, exigir } = require("./comun");

// Cuentas: las de administrador no se eliminan desde la aplicación ni las suspende otra persona.
const puedeEliminarCuenta = (usuario) => !esAdministrador(usuario);
const exigirEliminarCuenta = (usuario) =>
  exigir(puedeEliminarCuenta(usuario), 400, "Las cuentas de administrador no se eliminan desde la aplicación.");

const puedeSuspenderCuenta = (objetivo) => !esAdministrador(objetivo);
const exigirSuspenderCuenta = (objetivo) => exigir(puedeSuspenderCuenta(objetivo), 400, "No se puede suspender una cuenta de administrador.");

module.exports = { puedeEliminarCuenta, exigirEliminarCuenta, puedeSuspenderCuenta, exigirSuspenderCuenta };
