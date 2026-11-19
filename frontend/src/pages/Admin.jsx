import { useState } from "react";
import { Link } from "react-router-dom";
import { iniciarSesionAdmin, obtenerToken, cerrarSesionAdmin } from "../api";
import TablaAdmin from "../components/TablaAdmin";
import Alerta from "../components/Alerta";

const fechaHora = (fecha) => new Date(fecha).toLocaleString("es-EC");

// Cada pestaña del panel: qué ruta consulta, qué columnas muestra y qué estados permite
const secciones = {
  pedidos: {
    titulo: "Pedidos",
    rutaListar: "/admin/pedidos",
    rutaCambiar: "/admin/pedidos",
    estados: ["Pendiente", "Confirmado", "Entregado", "Cancelado"],
    columnas: [
      ["Fecha", (p) => fechaHora(p.createdAt)],
      ["Tipo", (p) => p.tipo],
      ["Producto", (p) => p.nombreProducto],
      ["Cant.", (p) => p.cantidad],
      ["Total", (p) => "$" + p.total.toFixed(2)],
      ["Cliente", (p) => p.nombreCliente],
      ["Correo", (p) => p.correo],
      ["Nota", (p) => p.nota],
    ],
  },
  reservas: {
    titulo: "Reservas de mesa",
    rutaListar: "/admin/reservas",
    rutaCambiar: "/admin/reservas",
    estados: ["Pendiente", "Confirmada", "Cancelada"],
    columnas: [
      // timeZone UTC: la fecha se guardó a medianoche UTC y así no se corre un día
      ["Fecha", (r) => new Date(r.fecha).toLocaleDateString("es-EC", { timeZone: "UTC" })],
      ["Hora", (r) => r.hora],
      ["Personas", (r) => r.personas],
      ["Nombre", (r) => r.nombre],
      ["Correo", (r) => r.correo],
      ["Mensaje", (r) => r.mensaje],
    ],
  },
  adopciones: {
    titulo: "Adopciones",
    rutaListar: "/admin/adopciones",
    rutaCambiar: "/admin/adopciones",
    estados: ["Pendiente", "Aprobada", "Rechazada"],
    columnas: [
      ["Fecha", (s) => fechaHora(s.createdAt)],
      ["Gato", (s) => s.nombreGato],
      ["Nombre", (s) => s.nombre],
      ["Correo", (s) => s.correo],
      ["Teléfono", (s) => s.telefono],
      ["Mensaje", (s) => s.mensaje],
    ],
  },
  gatos: {
    titulo: "Gatos",
    rutaListar: "/gatos", // La lista de gatos es pública, pero cambiar su estado exige token
    rutaCambiar: "/admin/gatos",
    estados: ["Disponible", "Reservado", "Adoptado"],
    columnas: [
      ["Nombre", (g) => g.nombre],
      ["Edad", (g) => g.edad],
      ["Descripción", (g) => g.descripcion],
    ],
  },
  mensajes: {
    titulo: "Mensajes",
    rutaListar: "/admin/mensajes",
    rutaCambiar: "/admin/mensajes",
    estados: ["Nuevo", "Leído"],
    columnas: [
      ["Fecha", (m) => fechaHora(m.createdAt)],
      ["Nombre", (m) => m.nombre],
      ["Correo", (m) => m.correo],
      ["Mensaje", (m) => m.mensaje],
    ],
  },
};

function Admin() {
  const [sesionIniciada, setSesionIniciada] = useState(Boolean(obtenerToken()));
  const [pestana, setPestana] = useState("pedidos");
  const [datosLogin, setDatosLogin] = useState({ usuario: "", contrasena: "" });
  const [mensaje, setMensaje] = useState(null);

  async function iniciarSesion(evento) {
    evento.preventDefault();
    try {
      await iniciarSesionAdmin(datosLogin.usuario, datosLogin.contrasena);
      setSesionIniciada(true);
      setMensaje(null);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  function cerrarSesion() {
    cerrarSesionAdmin();
    setSesionIniciada(false);
    setDatosLogin({ usuario: "", contrasena: "" });
  }

  // Si no hay sesión, se muestra el formulario de login
  if (!sesionIniciada) {
    return (
      <div className="admin-pagina">
        <div className="admin-login">
          <h2 className="section-title">Panel de Administración</h2>
          <div className="caja-formulario">
            <form onSubmit={iniciarSesion}>
              <div className="form-group">
                <label htmlFor="admin-usuario">Usuario</label>
                <input type="text" id="admin-usuario" value={datosLogin.usuario} onChange={(e) => setDatosLogin({ ...datosLogin, usuario: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="admin-contrasena">Contraseña</label>
                <input type="password" id="admin-contrasena" value={datosLogin.contrasena} onChange={(e) => setDatosLogin({ ...datosLogin, contrasena: e.target.value })} required />
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

  return (
    <div className="admin-pagina">
      <div className="admin-cabecera">
        <h1>Panel de Catfé</h1>
        <div className="admin-cabecera-botones">
          <Link to="/" className="btn btn-outline">Ver sitio</Link>
          <button className="btn btn-outline" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>
      <div className="admin-contenido">
        <div className="admin-pestanas">
          {Object.entries(secciones).map(([clave, seccion]) => (
            <button key={clave} className={pestana === clave ? "btn btn-primary" : "btn btn-outline"} onClick={() => setPestana(clave)}>
              {seccion.titulo}
            </button>
          ))}
        </div>
        {/* key={pestana} hace que la tabla se recargue al cambiar de pestaña */}
        <TablaAdmin key={pestana} seccion={secciones[pestana]} alExpirarSesion={cerrarSesion} />
      </div>
    </div>
  );
}

export default Admin;
