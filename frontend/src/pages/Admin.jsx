import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { obtenerSesion, cerrarSesion } from "../api";
import TablaAdmin from "../components/TablaAdmin";

const fechaHora = (fecha) => new Date(fecha).toLocaleString("es-EC");

// Cada pestaña del panel: qué ruta consulta, qué columnas muestra y qué estados permite.
// (El dashboard, los productos y el inventario se agregan en la Etapa 5.)
const secciones = {
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
    rutaListar: "/gatos", // La lista de gatos es pública, pero cambiar su estado exige token de administrador
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

// Panel del administrador. Solo se llega aquí con sesión de administrador (ver RutaProtegida).
function Admin() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();
  const [pestana, setPestana] = useState("reservas");

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  function sesionVencida() {
    cerrarSesion();
    navigate("/login", { state: { aviso: "Tu sesión venció. Inicia sesión de nuevo." } });
  }

  return (
    <div className="admin-pagina">
      <div className="admin-cabecera">
        <h1>Panel de Catfé</h1>
        <div className="admin-cabecera-botones">
          <span style={{ color: "var(--cream)", alignSelf: "center" }}>Administrador: {sesion ? sesion.usuario : ""}</span>
          <Link to="/" className="btn btn-outline">Ver sitio</Link>
          <button className="btn btn-outline" onClick={salir}>Cerrar sesión</button>
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
        <TablaAdmin key={pestana} seccion={secciones[pestana]} alExpirarSesion={sesionVencida} />
      </div>
    </div>
  );
}

export default Admin;
