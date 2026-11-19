// Todas las llamadas al backend están aquí.
// "/api" llega al servidor de Express gracias al proxy de vite.config.js

const CLAVE_TOKEN = "catfe_token";

// Función base: hace la petición y convierte los errores en mensajes claros
async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch("/api" + ruta, opciones);
  } catch (error) {
    throw new Error("No se pudo conectar con el servidor. ¿Está encendido el backend?");
  }

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || "Ocurrió un error");
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

// ----- Parte del administrador -----
export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN);
export const cerrarSesionAdmin = () => localStorage.removeItem(CLAVE_TOKEN);

export async function iniciarSesionAdmin(usuario, contrasena) {
  const datos = await enviarFormulario("/admin/login", { usuario, contrasena });
  localStorage.setItem(CLAVE_TOKEN, datos.token);
}

// Peticiones que necesitan el token del administrador
function pedirConToken(ruta, opciones = {}) {
  return pedir(ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + obtenerToken() },
  });
}

export const obtenerListaAdmin = (ruta) => pedirConToken(ruta);

export function cambiarEstadoAdmin(ruta, id, estado) {
  return pedirConToken(`${ruta}/${id}`, { method: "PUT", body: JSON.stringify({ estado }) });
}
