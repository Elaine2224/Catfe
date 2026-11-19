// Comprueba que TU MongoDB admite transacciones (Atlas sí; un MongoDB local sin réplica, no).
// Uso: npm run probar:transacciones
//
// Lee SOLO el archivo .env.pruebas y exige una base "*_pruebas" (por ejemplo catfe_pruebas).
// Crea una colección temporal con nombre aleatorio (_prueba_tx_xxxx), hace las pruebas
// y la elimina al terminar. No toca ninguna colección del proyecto.
const { verificarBasePruebas } = require("./seguridad");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const crypto = require("crypto");
const mongoose = require("mongoose");

let falladas = 0;
function comprobar(descripcion, condicion, detalle = "") {
  if (!condicion) falladas++;
  console.log(condicion ? "  ✅" : "  ❌", descripcion, condicion ? "" : detalle);
}

async function main() {
  verificarBasePruebas(["MONGODB_URI"]); // Se detiene antes de conectarse si la base no es "*_pruebas"
  await mongoose.connect(process.env.MONGODB_URI);
  const nombre = `_prueba_tx_${crypto.randomBytes(4).toString("hex")}`;
  console.log(`Base de datos: ${mongoose.connection.name} | colección temporal: ${nombre}`);

  try {
    // 1. ¿Es un conjunto de réplicas? (las transacciones lo necesitan)
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    comprobar(`MongoDB es un conjunto de réplicas${info.setName ? ` ("${info.setName}")` : ""}`, Boolean(info.setName), "→ un servidor independiente no admite transacciones");
    if (!info.setName) return;

    await mongoose.connection.createCollection(nombre);
    const coleccion = mongoose.connection.collection(nombre);
    await coleccion.insertOne({ _id: "contador", valor: 10 });
    const leer = async () => (await coleccion.findOne({ _id: "contador" })).valor;

    // 2. Una transacción que falla a la mitad debe deshacerse completa
    try {
      await mongoose.connection.transaction(async (session) => {
        await coleccion.updateOne({ _id: "contador" }, { $inc: { valor: 100 } }, { session });
        throw new Error("fallo a propósito");
      });
    } catch (error) {
      if (error.message !== "fallo a propósito") throw error;
    }
    comprobar("Una transacción con error se deshace (el valor sigue en 10)", (await leer()) === 10, `(valor: ${await leer()})`);

    // 3. Una transacción correcta se guarda
    await mongoose.connection.transaction(async (session) => {
      await coleccion.updateOne({ _id: "contador" }, { $inc: { valor: 5 } }, { session });
    });
    comprobar("Una transacción correcta se guarda (10 + 5 = 15)", (await leer()) === 15, `(valor: ${await leer()})`);

    // 4. Varias transacciones al mismo tiempo sobre el mismo dato (conflictos que se reintentan solos)
    await Promise.all(
      Array.from({ length: 5 }, () =>
        mongoose.connection.transaction(async (session) => {
          await coleccion.updateOne({ _id: "contador" }, { $inc: { valor: 1 } }, { session });
        })
      )
    );
    comprobar("5 transacciones simultáneas suman bien (15 + 5 = 20)", (await leer()) === 20, `(valor: ${await leer()})`);
  } finally {
    try { await mongoose.connection.dropCollection(nombre); } catch (error) { /* si no llegó a crearse, no pasa nada */ }
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    console.log(falladas === 0 ? "\n✅ Tu MongoDB admite transacciones: la caja funcionará correctamente." : "\n❌ Hay problemas con las transacciones (revisa los mensajes de arriba).");
    process.exit(falladas === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n⛔ No se pudo probar:", error.message);
    process.exit(1);
  });
