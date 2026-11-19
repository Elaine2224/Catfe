// Protecciones compartidas por los scripts de prueba.
// Objetivo: que las pruebas NUNCA puedan escribir en tu base de datos principal.

// Saca el nombre de la base de datos del enlace de conexión.
// Ejemplo: mongodb+srv://usuario:clave@cluster0.xxxx.mongodb.net/catfe_pruebas?retryWrites=true  ->  "catfe_pruebas"
function nombreDeLaBase(uri) {
  const coincidencia = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri || "");
  if (!coincidencia) return "";
  try {
    return decodeURIComponent(coincidencia[1]);
  } catch (error) {
    return coincidencia[1];
  }
}

// Revisa, ANTES de conectarse a nada, que:
//  1. estén todas las variables necesarias (vienen del archivo .env.pruebas), y
//  2. la base de datos se llame "algo_pruebas" (por ejemplo catfe_pruebas).
// Si algo falla, lanza un error y el script se detiene sin tocar ninguna base.
function verificarBasePruebas(variablesNecesarias) {
  const faltan = variablesNecesarias.filter((nombre) => !process.env[nombre]);
  if (faltan.length > 0) {
    throw new Error(
      `Faltan estas variables: ${faltan.join(", ")}.\n` +
        `   Las pruebas leen SOLO el archivo .env.pruebas (no tu .env). ¿Ya lo creaste?\n` +
        `   Copia .env.pruebas.example como .env.pruebas y complétalo.`
    );
  }

  const base = nombreDeLaBase(process.env.MONGODB_URI);
  if (!/_pruebas$/.test(base)) {
    throw new Error(
      `Por seguridad, las pruebas solo funcionan con una base de datos cuyo nombre termine en "_pruebas" (por ejemplo catfe_pruebas).\n` +
        `   Tu MONGODB_URI apunta a la base "${base || "test (no indicaste ninguna)"}". No se tocó nada.`
    );
  }
  return base;
}

module.exports = { nombreDeLaBase, verificarBasePruebas };
