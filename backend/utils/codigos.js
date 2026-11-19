const crypto = require("crypto");

// Letras y números sin los que se confunden fácil (0, O, 1, I)
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Código corto para retirar el pedido. Ejemplo: CAT-7K3F9
function generarCodigo() {
  let texto = "";
  for (let i = 0; i < 5; i++) {
    texto += CARACTERES[crypto.randomInt(CARACTERES.length)];
  }
  return "CAT-" + texto;
}

// Texto largo y secreto para el enlace privado de seguimiento (32 caracteres)
function generarToken() {
  return crypto.randomBytes(16).toString("hex");
}

module.exports = { generarCodigo, generarToken };
