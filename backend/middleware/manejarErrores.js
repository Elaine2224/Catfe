// Recibe cualquier error que ocurra en los controladores (por next(error))
// y responde con un mensaje claro en lugar de dejar caer el servidor.
function manejarErrores(error, req, res, next) {
  // Errores de validación de Mongoose (campo vacío, correo inválido, etc.)
  if (error.name === "ValidationError") {
    const mensajes = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ mensaje: mensajes.join(". "), errores: mensajes });
  }

  // El id enviado no tiene formato de MongoDB
  if (error.name === "CastError") {
    return res.status(400).json({ mensaje: "El identificador enviado no es válido" });
  }

  // MongoDB local sin réplica: las transacciones solo funcionan en Atlas o con un conjunto de réplicas
  const sinReplica =
    error.message &&
    (error.message.includes("Transaction numbers are only allowed") || error.message.includes("does not support retryable writes"));
  if (sinReplica) {
    return res.status(500).json({ mensaje: "Tu MongoDB no admite transacciones (es un servidor sin réplica). Usa MongoDB Atlas o un conjunto de réplicas." });
  }

  // Dato repetido en un campo único (por ejemplo, un código que ya existe)
  if (error.code === 11000) {
    return res.status(409).json({ mensaje: "Ese dato ya existe" });
  }

  console.error(error);
  res.status(500).json({ mensaje: "Ocurrió un error en el servidor" });
}

module.exports = manejarErrores;
