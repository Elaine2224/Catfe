// Prueba automática de la compra, la caja, la concurrencia y las adopciones.
//
// IMPORTANTE: corre SOLO sobre una base de datos de pruebas (por ejemplo "catfe_pruebas"),
// configurada en el archivo .env.pruebas. Nunca usa tu .env ni tu base principal.
// Arranca su propio servidor (puerto 5055), así que NO necesitas encender el backend.
//
// Uso (ver pruebas/LEEME-PRUEBAS.md):
//   npm run seed:pruebas      -> una sola vez: llena la base de pruebas
//   npm run probar            -> todas las pruebas
//   npm run probar:fallo      -> provoca un error a propósito a mitad del proceso
//   npm run probar:corte      -> corta la limpieza a la mitad y comprueba que repetirla es seguro
//   npm run probar:limpiar -- ID   -> limpia los restos de una ejecución que se cortó de golpe
//
// SEGURIDAD DE LOS DATOS:
// - La base debe llamarse "algo_pruebas"; si no, el script se detiene antes de conectarse.
// - Cada ejecución crea un identificador ÚNICO y aleatorio, que va en el nombre y el correo de
//   los pedidos y solicitudes, y en el nombre y la descripción de su propio gato de prueba.
// - Las pruebas de adopción usan ese gato de prueba: ningún gato real se modifica jamás.
// - La limpieza borra SOLO lo que coincide con ese identificador y es IDEMPOTENTE: devolver el
//   stock y marcar "stockDescontado = false" ocurren en una transacción, así que repetirla
//   (por ejemplo después de un corte a la mitad) no devuelve el stock dos veces.
// - La limpieza está en un "finally": se ejecuta aunque una prueba falle o presiones Ctrl+C.
// - Si el proceso muere de golpe, no queda nada "a medias": los restos llevan el identificador
//   y la próxima ejecución te avisa cómo limpiarlos.
const crypto = require("crypto");
const net = require("net");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const { nombreDeLaBase, verificarBasePruebas } = require("./seguridad");
const Pedido = require("../models/Pedido");
const Producto = require("../models/Producto");
const SolicitudAdopcion = require("../models/SolicitudAdopcion");
const Gato = require("../models/Gato");

const PUERTO_PRUEBAS = Number(process.env.PUERTO_PRUEBAS) || 5055;
const BASE = `http://localhost:${PUERTO_PRUEBAS}/api`;
const VARIABLES = ["MONGODB_URI", "JWT_SECRET", "ADMIN_USUARIO", "ADMIN_PASSWORD", "CAJERO_USUARIO", "CAJERO_PASSWORD"];

const SIMULAR_FALLO = process.argv.includes("--simular-fallo");
const SIMULAR_CORTE = process.argv.includes("--simular-corte-limpieza");
// Acepta "--limpiar ID" (como con npm run probar:limpiar -- ID) y también "--limpiar=ID"
const POSICION_LIMPIAR = process.argv.indexOf("--limpiar");
const ARGUMENTO_LIMPIAR = process.argv.find((a) => a.startsWith("--limpiar="));
const ID_A_LIMPIAR = ARGUMENTO_LIMPIAR
  ? ARGUMENTO_LIMPIAR.split("=")[1]
  : POSICION_LIMPIAR !== -1
    ? process.argv[POSICION_LIMPIAR + 1] || "sin-identificador"
    : null;

// ----- Identificador único de ESTA ejecución -----
// (en el modo --limpiar se usa el identificador que indiques, de exactamente 10 letras/números)
const ID = ID_A_LIMPIAR || crypto.randomBytes(5).toString("hex"); // Ejemplo: "a3f09c1b2e"
const MARCA = `PRUEBA ${ID}`;
const CORREO = `prueba-${ID}@catfe.test`;
const DESCRIPCION_GATO = `Gato creado por la prueba automática ${ID}`;
const PREFIJO_REFERENCIA = "T" + ID.toUpperCase();
const FILTRO_PEDIDOS = { nombreCliente: MARCA, correo: CORREO };
const FILTRO_SOLICITUDES = { nombre: MARCA, correo: CORREO };
const FILTRO_GATOS = { nombre: MARCA, descripcion: DESCRIPCION_GATO };
const DESCRIPCION_PRODUCTO = `Producto creado por la prueba automática ${ID}`;
const FILTRO_PRODUCTOS = { nombre: new RegExp(`^PRUEBA ${ID}`), descripcion: DESCRIPCION_PRODUCTO };

let correctas = 0;
let falladas = 0;
let interrumpido = false;   // Se pone en true con Ctrl+C: la prueba se detiene y se limpia
let instantanea = null;     // Foto inicial: { stock: {idProducto: ...}, gatos: {idGato: ...} }

function comprobar(descripcion, condicion, detalle = "") {
  if (condicion) {
    correctas++;
    console.log("  ✅", descripcion);
  } else {
    falladas++;
    console.log("  ❌", descripcion, detalle);
  }
}

// Hace una petición a la API y devuelve { estado, datos }
async function llamar(metodo, ruta, cuerpo, token) {
  // Tras un Ctrl+C no se inicia ninguna petición nueva (las que ya iban en camino terminan solas)
  if (interrumpido) throw new Error("Prueba interrumpida con Ctrl+C");
  const respuesta = await fetch(BASE + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = {};
  try { datos = await respuesta.json(); } catch (error) { datos = {}; }
  return { estado: respuesta.status, datos };
}

let contador = 0;
const referenciaNueva = () => `${PREFIJO_REFERENCIA}${String(contador++).padStart(4, "0")}`;

function crearPedido(items, extra = {}) {
  return llamar("POST", "/pedidos", {
    nombreCliente: MARCA,
    correo: CORREO.toUpperCase(), // con mayúsculas a propósito: el backend lo guarda en minúsculas
    referenciaTransferencia: referenciaNueva(),
    items,
    ...extra,
  });
}

const exitosas = (resultados) => resultados.filter((r) => r.estado === 200).length;

// El gato de prueba: así las pruebas de adopción nunca tocan un gato real
const crearGatoDePrueba = () => Gato.create({ ...FILTRO_GATOS, edad: "prueba", estado: "Disponible" });

// ---------------------------------------------------------------------------
// Servidor propio de las pruebas
// ---------------------------------------------------------------------------
function puertoLibre(puerto) {
  return new Promise((resolve) => {
    const servidor = net.createServer();
    servidor.once("error", () => resolve(false));
    servidor.once("listening", () => servidor.close(() => resolve(true)));
    servidor.listen(puerto);
  });
}

// Arranca el backend EN ESTE MISMO PROCESO, con la base de .env.pruebas.
// Al ser el mismo proceso, la prueba y el servidor siempre usan la misma base,
// y si el proceso muere, el servidor muere con él (no quedan servidores abiertos).
async function arrancarServidorDePrueba() {
  if (!(await puertoLibre(PUERTO_PRUEBAS))) {
    throw new Error(`El puerto ${PUERTO_PRUEBAS} está ocupado (¿una prueba anterior sigue abierta?). Ciérrala, o agrega PUERTO_PRUEBAS=5056 en .env.pruebas.`);
  }
  process.env.PORT = String(PUERTO_PRUEBAS);
  require("../server"); // Arranca Express (su propio dotenv no pisa las variables de .env.pruebas)

  for (let intento = 0; intento < 200; intento++) {
    try {
      if ((await fetch(BASE + "/gatos")).ok) return;
    } catch (error) { /* todavía no arranca */ }
    await new Promise((resolver) => setTimeout(resolver, 300));
  }
  throw new Error("El servidor de pruebas no arrancó en 60 segundos. Revisa los mensajes de arriba (¿MONGODB_URI correcto? ¿Atlas permite tu IP?).");
}

// ---------------------------------------------------------------------------
// Foto inicial, limpieza y verificación
// ---------------------------------------------------------------------------
async function tomarInstantanea() {
  const productos = await Producto.find({ categoria: { $ne: "libro" } });
  const gatos = await Gato.find({ nombre: { $not: /^PRUEBA [0-9a-f]{10}$/ } }); // solo gatos reales
  return {
    stock: Object.fromEntries(productos.map((p) => [String(p._id), { nombre: p.nombre, stock: p.stock }])),
    gatos: Object.fromEntries(gatos.map((g) => [String(g._id), { nombre: g.nombre, estado: g.estado }])),
  };
}

// Devuelve el stock de UN pedido y lo marca como devuelto, todo en la misma transacción:
// o ocurren las dos cosas, o ninguna. Si el pedido ya estaba marcado (stockDescontado = false),
// no hace nada. Por eso repetir la limpieza es seguro.
async function devolverStockDelPedido(idPedido) {
  return mongoose.connection.transaction(async (session) => {
    const pedido = await Pedido.findOneAndUpdate(
      { _id: idPedido, stockDescontado: true },
      { stockDescontado: false },
      { returnDocument: "before", session }
    );
    if (!pedido) return false; // Ya estaba devuelto (otra limpieza lo hizo antes)
    for (const item of pedido.items) {
      await Producto.updateOne({ _id: item.producto }, { $inc: { stock: item.cantidad } }, { session });
    }
    return true;
  });
}

// "simularCorte" existe solo para npm run probar:corte: corta la limpieza justo después de
// devolver el stock y antes de borrar, para comprobar que repetirla no devuelve el stock otra vez.
async function limpiar({ simularCorte = false } = {}) {
  console.log("\n▶ Limpieza: devolver el stock y borrar solo los datos de ESTA ejecución");

  // 1. Devolver el stock, pedido por pedido, de forma atómica e idempotente
  const pendientes = await Pedido.find({ ...FILTRO_PEDIDOS, stockDescontado: true }, { _id: 1 });
  let devueltos = 0;
  for (const { _id } of pendientes) {
    if (await devolverStockDelPedido(_id)) devueltos++;
  }

  if (simularCorte) throw new Error("Corte simulado en la limpieza");

  // 2. Borrar lo que lleva el identificador de esta ejecución (el gato de prueba incluido)
  const pedidos = await Pedido.deleteMany(FILTRO_PEDIDOS);
  const solicitudes = await SolicitudAdopcion.deleteMany(FILTRO_SOLICITUDES);
  const gatos = await Gato.deleteMany(FILTRO_GATOS);
  const productos = await Producto.deleteMany(FILTRO_PRODUCTOS); // después de los pedidos que los usaban

  console.log(`  🧹 id ${ID}: ${pedidos.deletedCount} pedidos, ${solicitudes.deletedCount} solicitudes, ${gatos.deletedCount} gato(s) y ${productos.deletedCount} producto(s) de prueba borrados; stock devuelto en ${devueltos} pedido(s)`);
}

async function verificarRestauracion() {
  console.log("\n▶ Verificación final: ¿quedó todo exactamente como estaba?");
  const ahora = await tomarInstantanea();

  const diferenciasStock = Object.entries(instantanea.stock)
    .filter(([id, original]) => !ahora.stock[id] || ahora.stock[id].stock !== original.stock)
    .map(([id, original]) => `${original.nombre}: era ${original.stock}, ahora ${ahora.stock[id] ? ahora.stock[id].stock : "no existe"}`);
  const diferenciasGatos = Object.entries(instantanea.gatos)
    .filter(([id, original]) => !ahora.gatos[id] || ahora.gatos[id].estado !== original.estado)
    .map(([id, original]) => `${original.nombre}: era ${original.estado}, ahora ${ahora.gatos[id] ? ahora.gatos[id].estado : "no existe"}`);

  comprobar("El stock de TODOS los productos es el original", diferenciasStock.length === 0, "→ " + diferenciasStock.join("; "));
  comprobar("El estado de TODOS los gatos reales es el original", diferenciasGatos.length === 0, "→ " + diferenciasGatos.join("; "));
  comprobar("No quedó ningún pedido de prueba", (await Pedido.countDocuments(FILTRO_PEDIDOS)) === 0);
  comprobar("No quedó ninguna solicitud de adopción de prueba", (await SolicitudAdopcion.countDocuments(FILTRO_SOLICITUDES)) === 0);
  comprobar("No quedó ningún gato de prueba", (await Gato.countDocuments(FILTRO_GATOS)) === 0);
  comprobar("No quedó ningún producto de prueba", (await Producto.countDocuments(FILTRO_PRODUCTOS)) === 0);
}

// Avisa (sin borrar nada) si hay restos de una ejecución anterior que se cortó de golpe
async function avisarRestosAnteriores() {
  const ids = new Set();
  const idDe = (texto, patron) => {
    const coincidencia = patron.exec(texto || "");
    return coincidencia ? coincidencia[1] : null;
  };

  for (const p of await Pedido.find({ nombreCliente: /^PRUEBA [0-9a-f]{10}$/ }, { nombreCliente: 1, correo: 1 })) {
    const id = idDe(p.nombreCliente, /^PRUEBA ([0-9a-f]{10})$/);
    if (id && p.correo === `prueba-${id}@catfe.test`) ids.add(id);
  }
  for (const s of await SolicitudAdopcion.find({ nombre: /^PRUEBA [0-9a-f]{10}$/ }, { nombre: 1, correo: 1 })) {
    const id = idDe(s.nombre, /^PRUEBA ([0-9a-f]{10})$/);
    if (id && s.correo === `prueba-${id}@catfe.test`) ids.add(id);
  }
  for (const g of await Gato.find({ nombre: /^PRUEBA [0-9a-f]{10}$/ }, { nombre: 1, descripcion: 1 })) {
    const id = idDe(g.nombre, /^PRUEBA ([0-9a-f]{10})$/);
    if (id && g.descripcion === `Gato creado por la prueba automática ${id}`) ids.add(id);
  }
  for (const p of await Producto.find({ nombre: /^PRUEBA [0-9a-f]{10}/ }, { nombre: 1, descripcion: 1 })) {
    const id = idDe(p.nombre, /^PRUEBA ([0-9a-f]{10})/);
    if (id && p.descripcion === `Producto creado por la prueba automática ${id}`) ids.add(id);
  }
  ids.delete(ID);

  if (ids.size > 0) {
    console.log("\n⚠️  Hay restos de ejecuciones anteriores que se cortaron de golpe (no se borró nada):");
    for (const id of ids) console.log(`     npm run probar:limpiar -- ${id}`);
    console.log("   Ejecuta ese comando para cada uno. Es seguro repetirlo.");
  }
}

// ---------------------------------------------------------------------------
// Preparación
// ---------------------------------------------------------------------------
async function prepararContexto() {
  console.log("\n▶ Preparación: iniciar sesión y leer el catálogo");
  const loginAdmin = await llamar("POST", "/auth/login", { usuario: process.env.ADMIN_USUARIO, contrasena: process.env.ADMIN_PASSWORD });
  const loginCajero = await llamar("POST", "/auth/login", { usuario: process.env.CAJERO_USUARIO, contrasena: process.env.CAJERO_PASSWORD });
  comprobar("El administrador inicia sesión con rol admin", loginAdmin.estado === 200 && loginAdmin.datos.rol === "admin", JSON.stringify(loginAdmin.datos));
  comprobar("El cajero inicia sesión con rol cajero", loginCajero.estado === 200 && loginCajero.datos.rol === "cajero", JSON.stringify(loginCajero.datos));
  if (loginAdmin.estado !== 200 || loginCajero.estado !== 200) {
    throw new Error("No se pudo iniciar sesión. ¿Ejecutaste npm run seed:pruebas (una sola vez) con este mismo .env.pruebas?");
  }

  const catalogo = (await llamar("GET", "/productos")).datos;
  const porNombre = (nombre) => catalogo.find((p) => p.nombre === nombre);
  const contexto = {
    tokenAdmin: loginAdmin.datos.token,
    tokenCajero: loginCajero.datos.token,
    catalogo,
    latte: porNombre("Latte Gatuno"),
    capuchino: porNombre("Cappuccino Bigotes"),
    brownie: porNombre("Brownie de Chocolate"),
    rollo: porNombre("Rollo de Canela"),
    libro: catalogo.find((p) => p.categoria === "libro"),
  };
  if (!contexto.latte || !contexto.capuchino || !contexto.brownie || !contexto.rollo || !contexto.libro) {
    throw new Error("Faltan los productos de ejemplo. Ejecuta npm run seed:pruebas (la base de pruebas debe estar recién creada).");
  }
  return contexto;
}

const stockActual = async (producto) => (await llamar("GET", "/productos")).datos.find((p) => p._id === producto._id).stock;

async function pedidoDeCaja(codigo, token) {
  return (await llamar("GET", "/caja/pedidos", null, token)).datos.find((p) => p.codigo === codigo);
}

// ---------------------------------------------------------------------------
// Simulacro de fallo (npm run probar:fallo)
// ---------------------------------------------------------------------------
async function simulacroDeFallo(contexto) {
  const { tokenCajero, latte } = contexto;
  console.log("\n▶ Simulacro: se deja el sistema 'a medias' y luego se provoca un error a propósito");

  const antes = await stockActual(latte);
  const pedido = await crearPedido([{ producto: latte._id, cantidad: 2 }]);
  const registro = await pedidoDeCaja(pedido.datos.codigo, tokenCajero);
  const confirmado = await llamar("PUT", `/caja/pedidos/${registro._id}/confirmar-pago`, null, tokenCajero);
  comprobar("Se confirmó un pago (el stock del Latte bajó en 2)", confirmado.estado === 200 && (await stockActual(latte)) === antes - 2);

  const gato = await crearGatoDePrueba();
  const solicitud = await llamar("POST", "/adopciones", { gato: gato._id, nombre: MARCA, correo: CORREO, telefono: "0990000000" });
  const estadoGato = (await llamar("GET", "/gatos")).datos.find((g) => g._id === String(gato._id)).estado;
  comprobar("Se reservó al gato de prueba (quedó Reservado)", solicitud.estado === 201 && estadoGato === "Reservado");

  console.log("  💥 Provocando el error ahora...");
  throw new Error("Fallo simulado a mitad del proceso");
}

// ---------------------------------------------------------------------------
// Simulacro de corte en la limpieza (npm run probar:corte)
// ---------------------------------------------------------------------------
async function simulacroDeCorteEnLimpieza(contexto) {
  const { tokenCajero, latte } = contexto;
  console.log("\n▶ Simulacro: la limpieza se corta a mitad de camino y se repite");

  const antes = await stockActual(latte);
  const pedido = await crearPedido([{ producto: latte._id, cantidad: 2 }]);
  const registro = await pedidoDeCaja(pedido.datos.codigo, tokenCajero);
  const confirmado = await llamar("PUT", `/caja/pedidos/${registro._id}/confirmar-pago`, null, tokenCajero);
  comprobar("Pago confirmado: el stock del Latte bajó en 2", confirmado.estado === 200 && (await stockActual(latte)) === antes - 2);

  // 1.ª limpieza: se corta justo DESPUÉS de devolver el stock y ANTES de borrar el pedido
  let cortada = false;
  try {
    await limpiar({ simularCorte: true });
  } catch (error) {
    cortada = error.message.startsWith("Corte simulado");
  }
  comprobar("La limpieza se cortó a propósito después de devolver el stock", cortada);
  comprobar("El stock ya volvió al original", (await stockActual(latte)) === antes);
  const resto = await Pedido.findOne({ codigo: pedido.datos.codigo });
  comprobar("El pedido sigue existiendo, pero marcado como 'stock devuelto'", Boolean(resto) && resto.stockDescontado === false);

  // 2.ª limpieza (completa): NO debe devolver el stock otra vez
  await limpiar();
  comprobar("La 2.ª limpieza NO devolvió el stock de nuevo", (await stockActual(latte)) === antes, `(stock: ${await stockActual(latte)}, original: ${antes})`);
  comprobar("Y ahora sí borró el pedido", (await Pedido.countDocuments(FILTRO_PEDIDOS)) === 0);

  // 3.ª y 4.ª limpieza al mismo tiempo, con un pedido pagado nuevo
  const pedido2 = await crearPedido([{ producto: latte._id, cantidad: 3 }]);
  const registro2 = await pedidoDeCaja(pedido2.datos.codigo, tokenCajero);
  await llamar("PUT", `/caja/pedidos/${registro2._id}/confirmar-pago`, null, tokenCajero);
  comprobar("Segundo pedido pagado: el stock bajó en 3", (await stockActual(latte)) === antes - 3);
  await Promise.all([limpiar(), limpiar(), limpiar()]);
  comprobar("3 limpiezas simultáneas devolvieron el stock UNA sola vez", (await stockActual(latte)) === antes, `(stock: ${await stockActual(latte)}, original: ${antes})`);
}

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------
async function ejecutarPruebas(contexto) {
  const { tokenAdmin, tokenCajero, catalogo, latte, capuchino, brownie, rollo, libro } = contexto;

  // ---------- 1. Catálogo ----------
  console.log("\n▶ 1. Catálogo");
  comprobar("Hay productos de menú y libros", catalogo.filter((p) => p.categoria !== "libro").length >= 12 && catalogo.filter((p) => p.categoria === "libro").length >= 3);
  comprobar("Los libros no tienen precio", catalogo.filter((p) => p.categoria === "libro").every((p) => p.precio === undefined || p.precio === null));

  // ---------- 2. Crear pedidos ----------
  console.log("\n▶ 2. Crear pedido (el backend calcula los precios)");
  const pedidoOk = await crearPedido([
    { producto: latte._id, cantidad: 2, precio: 0.01 }, // el "precio" falso se ignora
    { producto: capuchino._id, cantidad: 1 },
  ]);
  const totalEsperado = Math.round((latte.precio * 2 + capuchino.precio) * 100) / 100;
  comprobar("Pedido válido: se crea (201)", pedidoOk.estado === 201, JSON.stringify(pedidoOk.datos));
  comprobar(`El total es $${totalEsperado} (ignora el precio falso)`, pedidoOk.datos.total === totalEsperado, "total recibido: " + pedidoOk.datos.total);
  comprobar("Recibe un código tipo CAT-XXXXX", /^CAT-[A-Z2-9]{5}$/.test(pedidoOk.datos.codigo || ""), pedidoOk.datos.codigo);

  const repetidos = await crearPedido([{ producto: latte._id, cantidad: 1 }, { producto: latte._id, cantidad: 1 }]);
  const seguimientoRepetidos = await llamar("GET", "/pedidos/seguimiento/" + repetidos.datos.tokenSeguimiento);
  comprobar("Un producto repetido se suma en una sola línea", seguimientoRepetidos.datos.items?.length === 1 && seguimientoRepetidos.datos.items[0].cantidad === 2);

  // ---------- 3. Validaciones ----------
  console.log("\n▶ 3. Validaciones (todas deben rechazarse con 400)");
  const rechazos = [
    ["Carrito vacío", crearPedido([])],
    ["Cantidad 0", crearPedido([{ producto: latte._id, cantidad: 0 }])],
    ["Cantidad decimal", crearPedido([{ producto: latte._id, cantidad: 1.5 }])],
    ["Más de 20 unidades", crearPedido([{ producto: latte._id, cantidad: 21 }])],
    ["Correo inválido", crearPedido([{ producto: latte._id, cantidad: 1 }], { correo: "correo-malo" })],
    ["Referencia muy corta", crearPedido([{ producto: latte._id, cantidad: 1 }], { referenciaTransferencia: "AB" })],
    ["Sin nombre", crearPedido([{ producto: latte._id, cantidad: 1 }], { nombreCliente: "" })],
    ["Comprar un libro", crearPedido([{ producto: libro._id, cantidad: 1 }])],
    ["Producto agotado", crearPedido([{ producto: rollo._id, cantidad: 1 }])],
    ["Más unidades que el stock", crearPedido([{ producto: brownie._id, cantidad: brownie.stock + 1 }])],
    ["Producto con id inválido", crearPedido([{ producto: "abc", cantidad: 1 }])],
  ];
  for (const [nombre, promesa] of rechazos) {
    const r = await promesa;
    comprobar(nombre, r.estado === 400, `(estado ${r.estado}: ${r.datos.mensaje})`);
  }
  const refRepetida = referenciaNueva();
  const primero = await crearPedido([{ producto: latte._id, cantidad: 1 }], { referenciaTransferencia: refRepetida });
  const segundo = await crearPedido([{ producto: latte._id, cantidad: 1 }], { referenciaTransferencia: refRepetida });
  comprobar("Una referencia repetida se rechaza", primero.estado === 201 && segundo.estado === 400, `(${segundo.estado})`);

  // ---------- 4. Seguimiento ----------
  console.log("\n▶ 4. Seguimiento del cliente");
  const seguimiento = await llamar("GET", "/pedidos/seguimiento/" + pedidoOk.datos.tokenSeguimiento);
  comprobar("El enlace privado muestra el pedido", seguimiento.estado === 200 && seguimiento.datos.codigo === pedidoOk.datos.codigo);
  comprobar("Aún no se puede retirar (sin QR)", seguimiento.datos.puedeRetirar === false);
  comprobar("No expone el correo del cliente", !JSON.stringify(seguimiento.datos).toLowerCase().includes(CORREO));
  comprobar("Un token falso devuelve 404", (await llamar("GET", "/pedidos/seguimiento/" + "0".repeat(32))).estado === 404);
  const consulta = await llamar("POST", "/pedidos/consultar", { codigo: pedidoOk.datos.codigo.toLowerCase(), correo: CORREO.toUpperCase() });
  comprobar("Consulta por código + correo funciona (sin importar mayúsculas)", consulta.estado === 200);
  comprobar("Con un correo equivocado devuelve 404", (await llamar("POST", "/pedidos/consultar", { codigo: pedidoOk.datos.codigo, correo: "otro@correo.com" })).estado === 404);

  // ---------- 5. Permisos ----------
  console.log("\n▶ 5. Permisos por rol");
  comprobar("Caja sin token: 401", (await llamar("GET", "/caja/pedidos")).estado === 401);
  comprobar("Caja con token de administrador: 403", (await llamar("GET", "/caja/pedidos", null, tokenAdmin)).estado === 403);
  comprobar("Admin con token de cajero: 403", (await llamar("GET", "/admin/reservas", null, tokenCajero)).estado === 403);
  comprobar("Admin con token de administrador: 200", (await llamar("GET", "/admin/reservas", null, tokenAdmin)).estado === 200);
  comprobar("Caja con token de cajero: 200", (await llamar("GET", "/caja/pedidos", null, tokenCajero)).estado === 200);

  console.log("\n▶ 5b. Autenticación");
  const malLogin = await llamar("POST", "/auth/login", { usuario: process.env.ADMIN_USUARIO, contrasena: "incorrecta" });
  comprobar("Contraseña incorrecta: 401", malLogin.estado === 401 && !malLogin.datos.token);
  const otroLogin = await llamar("POST", "/auth/login", { usuario: "no-existe", contrasena: "x" });
  comprobar("Usuario inexistente: 401 con el mismo mensaje (no revela qué falló)", otroLogin.estado === 401 && otroLogin.datos.mensaje === malLogin.datos.mensaje);
  comprobar("Login sin datos: 401", (await llamar("POST", "/auth/login", {})).estado === 401);
  comprobar("Login con objetos en vez de texto: 401", (await llamar("POST", "/auth/login", { usuario: { $ne: "" }, contrasena: { $ne: "" } })).estado === 401);
  comprobar("Un token alterado: 401", (await llamar("GET", "/caja/pedidos", null, tokenCajero.slice(0, -3) + "abc")).estado === 401);
  comprobar("La ruta antigua /admin/login ya no inicia sesión", !(await llamar("POST", "/admin/login", { usuario: process.env.ADMIN_USUARIO, contrasena: process.env.ADMIN_PASSWORD })).datos.token);
  comprobar("El cajero no ve los tokens privados de seguimiento", !JSON.stringify((await llamar("GET", "/caja/pedidos", null, tokenCajero)).datos).includes("tokenSeguimiento"));

  // ---------- 6. Confirmar pago y entregar ----------
  console.log("\n▶ 6. Confirmar pago, retiro y entrega");
  const pedido1 = await crearPedido([{ producto: latte._id, cantidad: 1 }]);
  const id1 = (await pedidoDeCaja(pedido1.datos.codigo, tokenCajero))._id;
  const stockAntes = await stockActual(latte);

  const confirmado = await llamar("PUT", `/caja/pedidos/${id1}/confirmar-pago`, null, tokenCajero);
  comprobar("El cajero confirma el pago", confirmado.estado === 200 && confirmado.datos.estadoPago === "Pagado" && confirmado.datos.estadoRetiro === "Listo para retiro", JSON.stringify(confirmado.datos));
  comprobar("El stock bajó en 1", (await stockActual(latte)) === stockAntes - 1);
  comprobar("Confirmar dos veces se rechaza", (await llamar("PUT", `/caja/pedidos/${id1}/confirmar-pago`, null, tokenCajero)).estado === 400);
  comprobar("Y el stock no vuelve a bajar", (await stockActual(latte)) === stockAntes - 1);
  const seguimientoPagado = await llamar("GET", "/pedidos/seguimiento/" + pedido1.datos.tokenSeguimiento);
  comprobar("Ahora el cliente ve que puede retirar (aparece el QR)", seguimientoPagado.datos.puedeRetirar === true);

  const entregado = await llamar("PUT", `/caja/pedidos/${id1}/entregar`, null, tokenCajero);
  comprobar("El cajero entrega el pedido", entregado.estado === 200 && entregado.datos.estadoRetiro === "Entregado");
  comprobar("No se puede entregar dos veces", (await llamar("PUT", `/caja/pedidos/${id1}/entregar`, null, tokenCajero)).estado === 400);
  comprobar("No se puede cancelar un pedido ya entregado", (await llamar("PUT", `/caja/pedidos/${id1}/cancelar`, null, tokenCajero)).estado === 400);
  const idSinPago = (await pedidoDeCaja(pedidoOk.datos.codigo, tokenCajero))._id;
  comprobar("No se puede entregar un pedido sin pago", (await llamar("PUT", `/caja/pedidos/${idSinPago}/entregar`, null, tokenCajero)).estado === 400);

  // ---------- 7. Stock insuficiente, cancelar y rechazar ----------
  console.log("\n▶ 7. Stock insuficiente, cancelación y rechazo");
  const stockBrownie = await stockActual(brownie);
  if (stockBrownie < 1) {
    console.log("  ⚠️  El Brownie no tiene stock; se omite esta parte");
  } else {
    // Dos pedidos que por separado alcanzan, pero juntos no
    const cantidad = Math.ceil((stockBrownie + 1) / 2);
    const pedidoA = await crearPedido([{ producto: brownie._id, cantidad }]);
    const pedidoB = await crearPedido([{ producto: brownie._id, cantidad }]);
    const idA = (await pedidoDeCaja(pedidoA.datos.codigo, tokenCajero))._id;
    const idB = (await pedidoDeCaja(pedidoB.datos.codigo, tokenCajero))._id;

    comprobar(`Se crean dos pedidos de ${cantidad} brownies (stock ${stockBrownie})`, pedidoA.estado === 201 && pedidoB.estado === 201);
    comprobar("El primer pago se confirma", (await llamar("PUT", `/caja/pedidos/${idA}/confirmar-pago`, null, tokenCajero)).estado === 200);
    const restante = await stockActual(brownie);
    comprobar("El stock bajó lo esperado", restante === stockBrownie - cantidad, `(stock ${restante})`);
    const sinStock = await llamar("PUT", `/caja/pedidos/${idB}/confirmar-pago`, null, tokenCajero);
    comprobar("El segundo pago NO se puede confirmar (no alcanza el stock)", sinStock.estado === 400, `(${sinStock.estado})`);
    comprobar("El stock no quedó negativo ni cambió", (await stockActual(brownie)) === restante);
    comprobar("El pedido B sigue pendiente de verificación", (await pedidoDeCaja(pedidoB.datos.codigo, tokenCajero)).estadoPago === "Pendiente de verificación");

    const cancelado = await llamar("PUT", `/caja/pedidos/${idA}/cancelar`, null, tokenCajero);
    comprobar("Cancelar el pedido pagado funciona", cancelado.estado === 200 && cancelado.datos.estadoRetiro === "Cancelado");
    comprobar("El stock se devolvió", (await stockActual(brownie)) === stockBrownie);
    comprobar("Cancelar otra vez se rechaza", (await llamar("PUT", `/caja/pedidos/${idA}/cancelar`, null, tokenCajero)).estado === 400);
    comprobar("La devolución no se duplicó", (await stockActual(brownie)) === stockBrownie);

    const rechazado = await llamar("PUT", `/caja/pedidos/${idB}/rechazar-pago`, null, tokenCajero);
    comprobar("Rechazar el pago pendiente funciona", rechazado.estado === 200 && rechazado.datos.estadoPago === "Rechazado" && rechazado.datos.estadoRetiro === "Cancelado");
    comprobar("Un pago rechazado no se puede confirmar después", (await llamar("PUT", `/caja/pedidos/${idB}/confirmar-pago`, null, tokenCajero)).estado === 400);
    comprobar("El stock sigue igual", (await stockActual(brownie)) === stockBrownie);
  }

  // ---------- 8. Todo o nada (transacción) ----------
  console.log("\n▶ 8. Todo o nada: si falla a mitad de la confirmación, no queda nada a medias");
  const stockBrownie2 = await stockActual(brownie);
  if (stockBrownie2 < 1) {
    console.log("  ⚠️  El Brownie no tiene stock; se omite esta parte");
  } else {
    // El pedido B lleva primero un Latte y luego los brownies. Si los brownies no alcanzan,
    // el descuento del Latte (que ya se había hecho) también debe deshacerse.
    const A = await crearPedido([{ producto: brownie._id, cantidad: stockBrownie2 }]);
    const B = await crearPedido([{ producto: latte._id, cantidad: 1 }, { producto: brownie._id, cantidad: stockBrownie2 }]);
    const idA = (await pedidoDeCaja(A.datos.codigo, tokenCajero))._id;
    const idB = (await pedidoDeCaja(B.datos.codigo, tokenCajero))._id;

    comprobar("A se confirma y deja el Brownie en 0", (await llamar("PUT", `/caja/pedidos/${idA}/confirmar-pago`, null, tokenCajero)).estado === 200 && (await stockActual(brownie)) === 0);
    const latteAntes = await stockActual(latte);
    const fallido = await llamar("PUT", `/caja/pedidos/${idB}/confirmar-pago`, null, tokenCajero);
    comprobar("B falla en el último producto (400)", fallido.estado === 400, `(${fallido.estado})`);
    comprobar("El Latte NO quedó descontado (se deshizo)", (await stockActual(latte)) === latteAntes, `(antes ${latteAntes}, ahora ${await stockActual(latte)})`);
    const registroB = await pedidoDeCaja(B.datos.codigo, tokenCajero);
    comprobar("B sigue 'Pendiente de verificación' y sin stock descontado", registroB.estadoPago === "Pendiente de verificación" && registroB.stockDescontado === false);
    await llamar("PUT", `/caja/pedidos/${idA}/cancelar`, null, tokenCajero);
    comprobar("Al cancelar A, el Brownie vuelve a su stock", (await stockActual(brownie)) === stockBrownie2);
  }

  // ---------- 9. Concurrencia ----------
  console.log("\n▶ 9. Concurrencia (varias peticiones al mismo tiempo)");

  // 9.1 Varias confirmaciones simultáneas del MISMO pedido
  {
    const p = await crearPedido([{ producto: latte._id, cantidad: 1 }]);
    const id = (await pedidoDeCaja(p.datos.codigo, tokenCajero))._id;
    const antes = await stockActual(latte);
    const resultados = await Promise.all(Array.from({ length: 5 }, () => llamar("PUT", `/caja/pedidos/${id}/confirmar-pago`, null, tokenCajero)));
    comprobar("5 confirmaciones simultáneas del mismo pedido: solo 1 tiene éxito", exitosas(resultados) === 1, `(exitosas: ${exitosas(resultados)})`);
    comprobar("Las demás responden 400", resultados.filter((r) => r.estado !== 200).every((r) => r.estado === 400));
    comprobar("El stock bajó UNA sola vez", (await stockActual(latte)) === antes - 1);
  }

  // 9.2 y 9.3 Varios pedidos compitiendo por las últimas unidades, y cancelaciones simultáneas
  {
    const s = await stockActual(brownie);
    if (s < 1 || s > 10) {
      console.log(`  ⚠️  Stock del Brownie = ${s}; esta prueba necesita entre 1 y 10. Se omite.`);
    } else {
      const total = s + 2;
      const codigos = [];
      for (let i = 0; i < total; i++) {
        codigos.push((await crearPedido([{ producto: brownie._id, cantidad: 1 }])).datos.codigo);
      }
      const lista = (await llamar("GET", "/caja/pedidos", null, tokenCajero)).datos;
      const ids = codigos.map((codigo) => lista.find((p) => p.codigo === codigo)._id);

      const resultados = await Promise.all(ids.map((id) => llamar("PUT", `/caja/pedidos/${id}/confirmar-pago`, null, tokenCajero)));
      comprobar(`${total} pedidos de 1 brownie compiten por ${s} unidades: exactamente ${s} se confirman`, exitosas(resultados) === s, `(exitosas: ${exitosas(resultados)})`);
      comprobar("Los demás se rechazan por falta de stock (400)", resultados.filter((r) => r.estado !== 200).every((r) => r.estado === 400 && /stock/i.test(r.datos.mensaje || "")));
      comprobar("El stock llegó a 0 y nunca quedó negativo", (await stockActual(brownie)) === 0);

      // Cancelaciones simultáneas del mismo pedido pagado
      const idGanador = ids[resultados.findIndex((r) => r.estado === 200)];
      const cancelaciones = await Promise.all(Array.from({ length: 4 }, () => llamar("PUT", `/caja/pedidos/${idGanador}/cancelar`, null, tokenCajero)));
      comprobar("4 cancelaciones simultáneas del mismo pedido: solo 1 tiene éxito", exitosas(cancelaciones) === 1, `(exitosas: ${exitosas(cancelaciones)})`);
      comprobar("El stock se devolvió UNA sola vez (quedó en 1)", (await stockActual(brownie)) === 1);

      // Se cancelan los demás ganadores para dejar el stock como estaba
      for (let i = 0; i < ids.length; i++) {
        if (resultados[i].estado === 200 && ids[i] !== idGanador) {
          await llamar("PUT", `/caja/pedidos/${ids[i]}/cancelar`, null, tokenCajero);
        }
      }
      comprobar("Al cancelar los demás, el stock vuelve al original", (await stockActual(brownie)) === s);
    }
  }

  // 9.4 Confirmar y rechazar el MISMO pedido a la vez (4 rondas)
  {
    let todasConsistentes = true;
    let detalle = "";
    for (let ronda = 1; ronda <= 4; ronda++) {
      const p = await crearPedido([{ producto: latte._id, cantidad: 1 }]);
      const id = (await pedidoDeCaja(p.datos.codigo, tokenCajero))._id;
      const antes = await stockActual(latte);
      const [confirmar, rechazar] = await Promise.all([
        llamar("PUT", `/caja/pedidos/${id}/confirmar-pago`, null, tokenCajero),
        llamar("PUT", `/caja/pedidos/${id}/rechazar-pago`, null, tokenCajero),
      ]);
      const final = await pedidoDeCaja(p.datos.codigo, tokenCajero);
      const stockDespues = await stockActual(latte);
      const unSoloGanador = [confirmar, rechazar].filter((r) => r.estado === 200).length === 1;
      const consistente =
        unSoloGanador &&
        ((final.estadoPago === "Pagado" && final.stockDescontado === true && stockDespues === antes - 1) ||
          (final.estadoPago === "Rechazado" && final.stockDescontado === false && stockDespues === antes));
      if (!consistente) {
        todasConsistentes = false;
        detalle = `(ronda ${ronda}: confirmar ${confirmar.estado}, rechazar ${rechazar.estado}, estado ${final.estadoPago}, stock ${antes} → ${stockDespues})`;
      }
    }
    comprobar("Confirmar y rechazar a la vez (4 rondas): siempre gana uno solo y el stock es coherente", todasConsistentes, detalle);
  }

  // 9.5 Misma referencia en varios pedidos simultáneos
  {
    const referencia = referenciaNueva();
    const resultados = await Promise.all(
      Array.from({ length: 6 }, () => crearPedido([{ producto: latte._id, cantidad: 1 }], { referenciaTransferencia: referencia }))
    );
    const creados = resultados.filter((r) => r.estado === 201).length;
    comprobar("6 pedidos simultáneos con la misma referencia: solo 1 se crea", creados === 1, `(creados: ${creados})`);
    comprobar("Los demás responden 400 con mensaje de referencia repetida", resultados.filter((r) => r.estado !== 201).every((r) => r.estado === 400 && /referencia/i.test(r.datos.mensaje || "")));
    comprobar("En la base de datos hay un solo pedido con esa referencia", (await Pedido.countDocuments({ referenciaTransferencia: referencia })) === 1);
  }

  // 9.6 Entregar varias veces a la vez
  {
    const p = await crearPedido([{ producto: latte._id, cantidad: 1 }]);
    const id = (await pedidoDeCaja(p.datos.codigo, tokenCajero))._id;
    await llamar("PUT", `/caja/pedidos/${id}/confirmar-pago`, null, tokenCajero);
    const resultados = await Promise.all(Array.from({ length: 4 }, () => llamar("PUT", `/caja/pedidos/${id}/entregar`, null, tokenCajero)));
    comprobar("4 entregas simultáneas del mismo pedido: solo 1 tiene éxito", exitosas(resultados) === 1, `(exitosas: ${exitosas(resultados)})`);
  }

  // 9.7 La referencia de un pedido rechazado queda libre
  {
    const referencia = referenciaNueva();
    const p = await crearPedido([{ producto: latte._id, cantidad: 1 }], { referenciaTransferencia: referencia });
    const id = (await pedidoDeCaja(p.datos.codigo, tokenCajero))._id;
    await llamar("PUT", `/caja/pedidos/${id}/rechazar-pago`, null, tokenCajero);
    const otra = await crearPedido([{ producto: latte._id, cantidad: 1 }], { referenciaTransferencia: referencia });
    comprobar("La referencia de un pedido rechazado se puede volver a usar", otra.estado === 201, `(${otra.estado}: ${otra.datos.mensaje})`);
  }

  // ---------- 10. Adopciones (con un gato de prueba propio) ----------
  console.log("\n▶ 10. Reglas de adopción (con un gato de prueba creado por esta ejecución)");
  const gato = await crearGatoDePrueba(); // Se borra en la limpieza; ningún gato real se toca
  const estadoGato = async () => (await llamar("GET", "/gatos")).datos.find((g) => g._id === String(gato._id)).estado;
  const solicitar = () => llamar("POST", "/adopciones", { gato: gato._id, nombre: MARCA, correo: CORREO, telefono: "0990000000" });
  const cambiar = (id, estado) => llamar("PUT", `/admin/adopciones/${id}`, { estado }, tokenAdmin);

  const A = await solicitar();
  comprobar("Solicitud A: el gato pasa a Reservado", A.estado === 201 && (await estadoGato()) === "Reservado");
  comprobar("Otra solicitud mientras está Reservado se rechaza", (await solicitar()).estado === 400);

  // El administrador lo devuelve a mano a Disponible y llega otra solicitud
  await llamar("PUT", `/admin/gatos/${gato._id}`, { estado: "Disponible" }, tokenAdmin);
  const B = await solicitar();
  comprobar("Solicitud B: el gato vuelve a Reservado", B.estado === 201 && (await estadoGato()) === "Reservado");

  await cambiar(A.datos.solicitud._id, "Rechazada");
  comprobar("Rechazar A con B pendiente: el gato SIGUE Reservado", (await estadoGato()) === "Reservado");
  await cambiar(B.datos.solicitud._id, "Rechazada");
  comprobar("Rechazar B (ya no hay más): el gato vuelve a Disponible", (await estadoGato()) === "Disponible");

  const C = await solicitar();
  await cambiar(C.datos.solicitud._id, "Aprobada");
  comprobar("Aprobar C: el gato pasa a Adoptado", (await estadoGato()) === "Adoptado");
  await cambiar(C.datos.solicitud._id, "Rechazada");
  comprobar("Rechazar C estando Adoptado: NO vuelve a Disponible", (await estadoGato()) === "Adoptado");
  comprobar("Un estado inventado se rechaza", (await cambiar(C.datos.solicitud._id, "Inventado")).estado === 400);

  // ---------- 11. Administrador: productos, inventario y dashboard ----------
  console.log("\n▶ 11. Administrador: permisos, productos, inventario y dashboard");
  { // (bloque propio: sus variables no se mezclan con las de otras secciones)
  const dash = async () => (await llamar("GET", "/admin/dashboard", null, tokenAdmin)).datos;
  const crearProductoPrueba = (extra) =>
    llamar("POST", "/admin/productos", { descripcion: DESCRIPCION_PRODUCTO, categoria: "postres", imagen: "https://example.com/foto.jpg", ...extra }, tokenAdmin);
  const casi = (a, b) => Math.abs(a - b) < 0.005;
  const IDFALSO = "000000000000000000000000"; // (un id válido que no existe, para probar permisos sin riesgo)

  comprobar("Dashboard sin token: 401", (await llamar("GET", "/admin/dashboard")).estado === 401);
  comprobar("El cajero no ve el dashboard (403)", (await llamar("GET", "/admin/dashboard", null, tokenCajero)).estado === 403);
  comprobar("El cajero no puede crear productos (403)", (await llamar("POST", "/admin/productos", { nombre: "x", precio: 1, categoria: "postres" }, tokenCajero)).estado === 403);
  comprobar("El cajero no puede editar productos (403)", (await llamar("PUT", `/admin/productos/${IDFALSO}`, { precio: 1 }, tokenCajero)).estado === 403);
  comprobar("El cajero no puede cambiar el stock (403)", (await llamar("PUT", `/admin/productos/${IDFALSO}/stock`, { stock: 1 }, tokenCajero)).estado === 403);
  comprobar("El cajero no puede eliminar productos (403)", (await llamar("DELETE", `/admin/productos/${IDFALSO}`, null, tokenCajero)).estado === 403);
  comprobar("El cajero no ve el inventario (403)", (await llamar("GET", "/admin/inventario", null, tokenCajero)).estado === 403);

  const invalidos = [
    ["Sin nombre", crearProductoPrueba({ nombre: "", precio: 2 })],
    ["Precio negativo", crearProductoPrueba({ nombre: `${MARCA} v`, precio: -1 })],
    ["Precio que no es número", crearProductoPrueba({ nombre: `${MARCA} v`, precio: "abc" })],
    ["Producto de menú sin precio", crearProductoPrueba({ nombre: `${MARCA} v` })],
    ["Stock decimal", crearProductoPrueba({ nombre: `${MARCA} v`, precio: 2, stock: 1.5 })],
    ["Stock negativo", crearProductoPrueba({ nombre: `${MARCA} v`, precio: 2, stock: -3 })],
    ["Categoría inválida", crearProductoPrueba({ nombre: `${MARCA} v`, precio: 2, categoria: "pizzas" })],
    ["Imagen que no es un enlace http(s)", crearProductoPrueba({ nombre: `${MARCA} v`, precio: 2, imagen: "foto.jpg" })],
  ];
  for (const [nombre, promesa] of invalidos) {
    const r = await promesa;
    comprobar(`Crear producto: ${nombre} se rechaza (400)`, r.estado === 400, `(estado ${r.estado}: ${r.datos.mensaje})`);
  }

  const dashAntes = await dash();
  const prodA = await crearProductoPrueba({ nombre: `${MARCA} A`, precio: 2.5, stock: 20 });
  const prodB = await crearProductoPrueba({ nombre: `${MARCA} B`, precio: 3, stock: 3, categoria: "bebidas-frias" });
  const prodC = await crearProductoPrueba({ nombre: `${MARCA} C`, precio: 4, stock: 0 });
  comprobar("Crear 3 productos de prueba (201)", [prodA, prodB, prodC].every((r) => r.estado === 201), JSON.stringify([prodA.datos, prodB.datos, prodC.datos]));
  const idA = prodA.datos._id;
  const idB = prodB.datos._id;
  const idC = prodC.datos._id;

  const libroPrueba = await llamar("POST", "/admin/productos", { nombre: `${MARCA} Libro`, descripcion: DESCRIPCION_PRODUCTO, categoria: "libro", precio: 99, stock: 50 }, tokenAdmin);
  comprobar("Un libro se guarda sin precio y con stock 0", libroPrueba.estado === 201 && libroPrueba.datos.precio === undefined && libroPrueba.datos.stock === 0, JSON.stringify(libroPrueba.datos));
  const listaAdmin = (await llamar("GET", "/admin/productos", null, tokenAdmin)).datos;
  comprobar("La lista de productos del administrador incluye menú y libros", listaAdmin.some((p) => p._id === idA) && listaAdmin.some((p) => p._id === libroPrueba.datos._id));

  // Inventario y avisos
  const inv = (await llamar("GET", "/admin/inventario", null, tokenAdmin)).datos;
  const nivelDe = (id) => (inv.find((p) => p._id === id) || {}).nivel;
  comprobar("Inventario: A disponible (20), B pocas (3), C agotado (0)", nivelDe(idA) === "disponible" && nivelDe(idB) === "pocas" && nivelDe(idC) === "agotado", JSON.stringify([nivelDe(idA), nivelDe(idB), nivelDe(idC)]));
  comprobar("Los libros no aparecen en el inventario", !inv.some((p) => p._id === libroPrueba.datos._id));
  const dash1 = await dash();
  comprobar("El dashboard suma 1 agotado y 1 con pocas existencias", dash1.inventario.agotados === dashAntes.inventario.agotados + 1 && dash1.inventario.pocasExistencias === dashAntes.inventario.pocasExistencias + 1);

  // Ventas: pendiente, pagado, entregado
  const ped1 = await crearPedido([{ producto: idA, cantidad: 4 }, { producto: idB, cantidad: 1 }]); // 4 x 2.50 + 1 x 3 = 13
  comprobar("Pedido con productos de prueba: total $13", ped1.estado === 201 && casi(ped1.datos.total, 13), JSON.stringify(ped1.datos));
  const dash2 = await dash();
  comprobar("Un pedido pendiente NO cuenta como venta", casi(dash2.totalVendido, dashAntes.totalVendido) && dash2.pedidosPagados === dashAntes.pedidosPagados);
  comprobar("Pero sí suma 1 a 'pendientes de verificación'", dash2.pendientesVerificacion === dashAntes.pendientesVerificacion + 1);

  const id1 = (await pedidoDeCaja(ped1.datos.codigo, tokenCajero))._id;
  await llamar("PUT", `/caja/pedidos/${id1}/confirmar-pago`, null, tokenCajero);
  const dash3 = await dash();
  comprobar("Al confirmar el pago: +$13 y +1 pedido pagado", casi(dash3.totalVendido, dashAntes.totalVendido + 13) && dash3.pedidosPagados === dashAntes.pedidosPagados + 1, JSON.stringify([dash3.totalVendido, dashAntes.totalVendido]));
  comprobar("Y los pendientes vuelven al valor inicial", dash3.pendientesVerificacion === dashAntes.pendientesVerificacion);
  const filaA = dash3.ventasPorProducto.find((p) => p.nombre === `${MARCA} A`);
  const filaB = dash3.ventasPorProducto.find((p) => p.nombre === `${MARCA} B`);
  comprobar("Ventas por producto: A = 4 unidades y $10; B = 1 unidad y $3", Boolean(filaA && filaB) && filaA.unidades === 4 && casi(filaA.total, 10) && filaB.unidades === 1 && casi(filaB.total, 3), JSON.stringify([filaA, filaB]));
  comprobar("Producto más vendido: coincide con el de más unidades", Boolean(dash3.productoMasVendido) && dash3.productoMasVendido.unidades === Math.max(...dash3.ventasPorProducto.map((p) => p.unidades)));
  const inv2 = (await llamar("GET", "/admin/inventario", null, tokenAdmin)).datos;
  comprobar("El stock bajó al confirmar (A = 16, B = 2 con pocas existencias)", inv2.find((p) => p._id === idA).stock === 16 && inv2.find((p) => p._id === idB).stock === 2 && inv2.find((p) => p._id === idB).nivel === "pocas");

  await llamar("PUT", `/caja/pedidos/${id1}/entregar`, null, tokenCajero);
  const dash4 = await dash();
  comprobar("Entregar no cuenta la venta dos veces", casi(dash4.totalVendido, dashAntes.totalVendido + 13) && dash4.pedidosPagados === dashAntes.pedidosPagados + 1);

  // Cancelado y rechazado no suman
  const ped2 = await crearPedido([{ producto: idA, cantidad: 2 }]); // $5
  const id2 = (await pedidoDeCaja(ped2.datos.codigo, tokenCajero))._id;
  await llamar("PUT", `/caja/pedidos/${id2}/confirmar-pago`, null, tokenCajero);
  comprobar("Un segundo pedido pagado suma $5", casi((await dash()).totalVendido, dashAntes.totalVendido + 18));
  await llamar("PUT", `/caja/pedidos/${id2}/cancelar`, null, tokenCajero);
  const dash5 = await dash();
  comprobar("Un pedido cancelado deja de contar como venta", casi(dash5.totalVendido, dashAntes.totalVendido + 13) && dash5.pedidosPagados === dashAntes.pedidosPagados + 1);
  const ped3 = await crearPedido([{ producto: idA, cantidad: 1 }]);
  const id3 = (await pedidoDeCaja(ped3.datos.codigo, tokenCajero))._id;
  await llamar("PUT", `/caja/pedidos/${id3}/rechazar-pago`, null, tokenCajero);
  comprobar("Un pago rechazado no cuenta como venta", casi((await dash()).totalVendido, dashAntes.totalVendido + 13));

  // Editar un producto
  comprobar("Editar con un precio negativo se rechaza (400)", (await llamar("PUT", `/admin/productos/${idA}`, { precio: -5 }, tokenAdmin)).estado === 400);
  comprobar("Editar un producto que no existe: 404", (await llamar("PUT", `/admin/productos/${IDFALSO}`, { precio: 5 }, tokenAdmin)).estado === 404);
  const editado = await llamar("PUT", `/admin/productos/${idA}`, { precio: 9, etiqueta: "Nuevo", nombre: `${MARCA} A` }, tokenAdmin);
  comprobar("Cambiar el precio y la etiqueta funciona", editado.estado === 200 && editado.datos.precio === 9 && editado.datos.etiqueta === "Nuevo", JSON.stringify(editado.datos));
  const reg1 = await pedidoDeCaja(ped1.datos.codigo, tokenCajero);
  comprobar("El pedido anterior conserva el precio original ($2,50)", reg1.items.find((i) => i.nombreProducto === `${MARCA} A`).precioUnitario === 2.5);
  const pedNuevo = await crearPedido([{ producto: idA, cantidad: 1 }]);
  comprobar("Un pedido nuevo usa el precio nuevo ($9)", pedNuevo.estado === 201 && casi(pedNuevo.datos.total, 9), JSON.stringify(pedNuevo.datos));

  // Cambiar el stock
  const conStock = await llamar("PUT", `/admin/productos/${idB}/stock`, { stock: 12 }, tokenAdmin);
  comprobar("Cambiar el stock de B a 12: queda disponible", conStock.estado === 200 && conStock.datos.stock === 12 && conStock.datos.nivel === "disponible", JSON.stringify(conStock.datos));
  for (const [nombre, valor] of [["negativo", -1], ["decimal", 2.5], ["texto", "abc"], ["vacío", ""], ["nulo", null]]) {
    comprobar(`Stock ${nombre} se rechaza (400)`, (await llamar("PUT", `/admin/productos/${idB}/stock`, { stock: valor }, tokenAdmin)).estado === 400);
  }
  comprobar("Un libro no tiene inventario (400)", (await llamar("PUT", `/admin/productos/${libroPrueba.datos._id}/stock`, { stock: 5 }, tokenAdmin)).estado === 400);
  comprobar("Stock de un producto que no existe: 404", (await llamar("PUT", `/admin/productos/${IDFALSO}/stock`, { stock: 5 }, tokenAdmin)).estado === 404);

  // Eliminar productos
  const bloqueado = await llamar("DELETE", `/admin/productos/${idA}`, null, tokenAdmin);
  comprobar("No se puede eliminar un producto que está en pedidos sin terminar (400)", bloqueado.estado === 400, `(${bloqueado.estado}: ${bloqueado.datos.mensaje})`);
  const idNuevo = (await pedidoDeCaja(pedNuevo.datos.codigo, tokenCajero))._id;
  await llamar("PUT", `/caja/pedidos/${idNuevo}/rechazar-pago`, null, tokenCajero);
  const eliminado = await llamar("DELETE", `/admin/productos/${idA}`, null, tokenAdmin);
  comprobar("Sin pedidos sin terminar, se puede eliminar", eliminado.estado === 200, `(${eliminado.estado}: ${eliminado.datos.mensaje})`);
  comprobar("Las ventas de un producto eliminado siguen en el dashboard", (await dash()).ventasPorProducto.some((p) => p.nombre === `${MARCA} A`));
  comprobar("Eliminar otra vez: 404", (await llamar("DELETE", `/admin/productos/${idA}`, null, tokenAdmin)).estado === 404);
  comprobar("Eliminar el libro de prueba funciona", (await llamar("DELETE", `/admin/productos/${libroPrueba.datos._id}`, null, tokenAdmin)).estado === 200);
  }
}

// ---------------------------------------------------------------------------
// Programa principal
// ---------------------------------------------------------------------------
// Ctrl+C: NO se sale de golpe. Se detienen las pruebas, se espera a que terminen las peticiones
// que ya estaban en camino y recién entonces se limpia (por el mismo "finally" de siempre).
// Si se presiona Ctrl+C otra vez, se sale de inmediato.
process.on("SIGINT", () => {
  if (interrumpido) {
    console.log(`\n⛔ Segundo Ctrl+C: salida inmediata. Puede haber datos de prueba sin limpiar (identificador ${ID}).`);
    process.exit(130);
  }
  interrumpido = true;
  console.log("\n⛔ Ctrl+C: se detienen las pruebas y se limpia antes de salir (espera unos segundos)...");
});

async function soloLimpiar() {
  if (!/^[0-9a-f]{10}$/.test(ID)) {
    throw new Error("El identificador debe tener exactamente 10 caracteres (0-9 y a-f). Ejemplo: npm run probar:limpiar -- a3f09c1b2e");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Base de datos: ${mongoose.connection.name} | Limpiando SOLO los datos del identificador ${ID}`);
  await limpiar();
  await mongoose.disconnect();
  return true;
}

async function main() {
  // 1. Protecciones: variables completas y base de datos "*_pruebas" (antes de conectarse a nada)
  const nombreBase = verificarBasePruebas(ID_A_LIMPIAR ? ["MONGODB_URI"] : VARIABLES);
  if (ID_A_LIMPIAR) return soloLimpiar();

  // 2. Servidor propio, en este mismo proceso, con la base de .env.pruebas
  await arrancarServidorDePrueba();
  await mongoose.connection.asPromise();
  if (mongoose.connection.name !== nombreBase) {
    throw new Error(`La conexión quedó en la base "${mongoose.connection.name}" y no en "${nombreBase}". No se tocó nada.`);
  }
  console.log(`Base de datos: ${mongoose.connection.name} | Servidor de pruebas en el puerto ${PUERTO_PRUEBAS} | Identificador de esta ejecución: ${ID}`);
  console.log(SIMULAR_FALLO ? "Modo: SIMULACRO DE FALLO" : SIMULAR_CORTE ? "Modo: SIMULACRO DE CORTE EN LA LIMPIEZA" : "Modo: pruebas completas");

  await avisarRestosAnteriores();
  instantanea = await tomarInstantanea();

  try {
    const contexto = await prepararContexto();
    if (SIMULAR_FALLO) await simulacroDeFallo(contexto);
    else if (SIMULAR_CORTE) await simulacroDeCorteEnLimpieza(contexto);
    else await ejecutarPruebas(contexto);
  } catch (error) {
    if (SIMULAR_FALLO && error.message.startsWith("Fallo simulado")) {
      console.log("  (el error fue provocado a propósito; ahora debe limpiarse igual)");
    } else if (interrumpido) {
      console.log("\n  ⛔ Pruebas interrumpidas por el usuario");
    } else {
      falladas++;
      console.log("\n  ❌ Las pruebas se detuvieron por un error:", error.message);
    }
  } finally {
    await limpiar(); // Siempre se ejecuta, haya habido error o no. Es seguro repetirla.
  }

  await verificarRestauracion();
  console.log(`\nResultado: ${correctas} correctas, ${falladas} fallidas`);
  return falladas === 0 && !interrumpido;
}

main()
  .then((todoBien) => process.exit(todoBien ? 0 : interrumpido ? 130 : 1))
  .catch((error) => {
    console.error("\n⛔ No se pudo ejecutar la prueba:", error.message);
    process.exit(1);
  });
