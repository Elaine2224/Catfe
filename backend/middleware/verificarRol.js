// Se usa después de verificarToken. Solo deja pasar al rol indicado.
// Ejemplo: router.use(verificarToken, verificarRol("cajero"))
function verificarRol(rolPermitido) {
  return function (req, res, next) {
    if (!req.admin || req.admin.rol !== rolPermitido) {
      return res.status(403).json({ mensaje: "No tienes permiso para esta acción" });
    }
    next();
  };
}

module.exports = verificarRol;
