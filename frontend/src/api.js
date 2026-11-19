// Todas las llamadas al backend están aquí.
// "/api" llega al servidor de Express gracias al proxy de vite.config.js

const CLAVE_SESION = "catfe_sesion";

// Función base: hace la petición y convierte los errores en mensajes claros
async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch("/api" + ruta, opciones);
  } catch (error) {
    throw new Error("No se pudo conectar con el servidor. ¿Está encendido el backend?");
  }

  // Si el servidor no respondió nada (o algo que no es JSON), "datos" queda vacío en vez de fallar
  let datos = {};
  try {
    datos = await respuesta.json();
  } catch (error) {
    datos = {};
  }

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || "El servidor no respondió. Revisa que el backend esté encendido y conectado a MongoDB.");
    error.estado = respuesta.status; // Sirve para detectar el 401 (sesión vencida)
    throw error;
  }

  return datos;
}

// ----- Parte pública -----
export const obtenerProductos = () => pedir("/productos");
export const obtenerGatos = () => pedir("/gatos");
export const obtenerGaleria = () => pedir("/galeria");

// Envía datos a la API (pedidos, reservas, adopciones, mensajes)
export function enviarFormulario(ruta, datos) {
  return pedir(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

// ----- Seguimiento de pedidos (cliente) -----
export const obtenerPedidoPorToken = (token) => pedir("/pedidos/seguimiento/" + encodeURIComponent(token));
export const consultarPedido = (codigo, correo) => enviarFormulario("/pedidos/consultar", { codigo, correo });

// Los pedidos hechos desde este navegador se recuerdan (código y enlace privado)
const CLAVE_PEDIDOS = "catfe_pedidos";

export function leerPedidosLocales() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS) || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch (error) {
    return [];
  }
}

export function guardarPedidoLocal(pedido) {
  try {
    const lista = [pedido, ...leerPedidosLocales().filter((p) => p.token !== pedido.token)].slice(0, 20);
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(lista));
  } catch (error) {
    /* si no se puede guardar, el cliente igual tiene el enlace en la barra de direcciones */
  }
}

// ----- Sesión (administrador y cajero) -----
// Se guarda { token, usuario, rol } en el navegador.
// Ojo: esto solo sirve para mostrar la pantalla que corresponde. Los permisos reales
// los verifica el backend con el token en cada petición.
export function obtenerSesion() {
  try {
    const texto = localStorage.getItem(CLAVE_SESION);
    return texto ? JSON.parse(texto) : null;
  } catch (error) {
    return null;
  }
}

export const cerrarSesion = () => localStorage.removeItem(CLAVE_SESION);

// A qué panel va cada rol después de iniciar sesión
export const rutaDelPanel = (rol) => (rol === "cajero" ? "/caja" : "/admin");

export async function iniciarSesion(usuario, contrasena) {
  const datos = await enviarFormulario("/auth/login", { usuario, contrasena });
  const sesion = { token: datos.token, usuario: datos.usuario, rol: datos.rol };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

// Peticiones que necesitan el token
function pedirConToken(ruta, opciones = {}) {
  const sesion = obtenerSesion();
  return pedir(ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sesion ? sesion.token : "") },
  });
}

// ----- Administrador -----
export const obtenerListaAdmin = (ruta) => pedirConToken(ruta);

export function cambiarEstadoAdmin(ruta, id, estado) {
  return pedirConToken(`${ruta}/${id}`, { method: "PUT", body: JSON.stringify({ estado }) });
}

// Cualquier petición del administrador (crear, editar o eliminar productos, cambiar stock...)
export function peticionAdmin(metodo, ruta, cuerpo) {
  return pedirConToken(ruta, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
}

// ----- Cajero -----
export const obtenerPedidosCaja = () => pedirConToken("/caja/pedidos");

// accion: "confirmar-pago", "rechazar-pago", "entregar" o "cancelar"
export function accionPedidoCaja(id, accion) {
  return pedirConToken(`/caja/pedidos/${id}/${accion}`, { method: "PUT" });
}
