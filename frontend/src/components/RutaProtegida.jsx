import { Navigate } from "react-router-dom";
import { obtenerSesion, rutaDelPanel } from "../api";

// Deja entrar solo a quien tiene sesión Y el rol correcto:
//  - sin sesión          -> /login
//  - con otro rol        -> a su propio panel (el cajero no entra a /admin, ni el admin a /caja)
// Ojo: esto solo evita mostrar pantallas que no le corresponden. La seguridad real está en el backend.
function RutaProtegida({ rol, children }) {
  const sesion = obtenerSesion();

  if (!sesion) return <Navigate to="/login" replace />;
  if (sesion.rol !== rol) return <Navigate to={rutaDelPanel(sesion.rol)} replace />;

  return children;
}

export default RutaProtegida;
