import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { iniciarSesion, obtenerSesion, rutaDelPanel } from "../api";
import Alerta from "../components/Alerta";

// Un solo login para el administrador y el cajero: según su rol, va a /admin o a /caja
function Login() {
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState(
    ubicacion.state && ubicacion.state.aviso ? { tipo: "error", texto: ubicacion.state.aviso } : null
  );

  // Si ya hay una sesión abierta, se va directo a su panel
  const sesionActual = obtenerSesion();
  if (sesionActual) {
    return <Navigate to={rutaDelPanel(sesionActual.rol)} replace />;
  }

  async function entrar(evento) {
    evento.preventDefault();
    try {
      const sesion = await iniciarSesion(usuario, contrasena);
      navigate(rutaDelPanel(sesion.rol), { replace: true });
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  return (
    <div className="admin-pagina">
      <div className="admin-login">
        <h2 className="section-title">Iniciar sesión</h2>
        <p className="section-subtitle">Acceso para el personal de Catfé</p>
        <div className="caja-formulario">
          <form onSubmit={entrar}>
            <div className="form-group">
              <label htmlFor="login-usuario">Usuario</label>
              <input type="text" id="login-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
            </div>
            <div className="form-group">
              <label htmlFor="login-contrasena">Contraseña</label>
              <input type="password" id="login-contrasena" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Entrar</button>
          </form>
        </div>
        <Alerta mensaje={mensaje} />
        <p style={{ textAlign: "center", marginTop: "1.5rem" }}><Link to="/">← Volver al sitio</Link></p>
      </div>
    </div>
  );
}

export default Login;
