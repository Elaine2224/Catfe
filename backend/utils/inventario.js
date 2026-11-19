// Niveles de existencias (los mismos que verá el administrador en las etiquetas):
//   0 -> agotado | 1 a 5 -> pocas existencias | más de 5 -> disponible
const LIMITE_POCAS_EXISTENCIAS = 5;

function nivelDeStock(stock) {
  if (stock <= 0) return "agotado";
  if (stock <= LIMITE_POCAS_EXISTENCIAS) return "pocas";
  return "disponible";
}

module.exports = { LIMITE_POCAS_EXISTENCIAS, nivelDeStock };
