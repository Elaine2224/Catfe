// Crea un pedido de ejemplo, como si lo hiciera un cliente desde el sitio, para que puedas
// ver y probar el panel de /caja ANTES de tener el formulario de compra (Etapa 4).
//
// Uso (con tu backend encendido con npm run dev):   npm run pedido:ejemplo
//       con otro nombre de cliente:                  npm run pedido:ejemplo -- "Ana López"
//
// OJO: este script escribe en la base de datos del backend que esté encendido (normalmente la
// tuya, "catfe"). El pedido queda "Pendiente de verificación" y NO descuenta stock hasta que
// lo confirmes en la caja. Si no lo quieres, recházalo desde /caja.
require("dotenv").config();

const BASE = `http://localhost:${process.env.PORT || 5000}/api`;

async function main() {
  const productos = await (await fetch(BASE + "/productos")).json();
  const disponibles = productos.filter((p) => p.categoria !== "libro" && p.stock >= 2);
  if (disponibles.length < 2) {
    throw new Error("No hay al menos 2 productos del menú con stock. ¿Ejecutaste npm run seed?");
  }

  const referencia = "DEMO" + String(Date.now()).slice(-8);
  const respuesta = await fetch(BASE + "/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombreCliente: process.argv[2] || "Cliente de ejemplo",
      correo: "ejemplo@catfe.test",
      referenciaTransferencia: referencia,
      items: [
        { producto: disponibles[0]._id, cantidad: 2 },
        { producto: disponibles[1]._id, cantidad: 1 },
      ],
    }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo crear el pedido");

  console.log("✅ Pedido de ejemplo creado");
  console.log(`   Código: ${datos.codigo} | Total: $${datos.total.toFixed(2)} | Referencia: ${referencia}`);
  console.log("   Ahora entra a /caja con el usuario cajero y verás el pedido por verificar.");
}

main().catch((error) => {
  console.error("⛔", error.message, "\n   ¿Está encendido el backend (npm run dev)?");
  process.exit(1);
});
