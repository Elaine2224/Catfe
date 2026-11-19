import { useState, useEffect } from "react";
import { obtenerListaAdmin, cambiarEstadoAdmin } from "../api";
import Alerta from "./Alerta";

// Muestra una tabla con los datos de una sección del panel y deja cambiar el estado.
// "seccion" indica qué ruta consultar, qué columnas mostrar y qué estados existen.
function TablaAdmin({ seccion, alExpirarSesion }) {
  const [filas, setFilas] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  // Si la sesión venció (error 401), volvemos al login
  function manejarError(error) {
    if (error.estado === 401) {
      alExpirarSesion();
    } else {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  useEffect(() => {
    async function cargarFilas() {
      try {
        setFilas(await obtenerListaAdmin(seccion.rutaListar));
      } catch (error) {
        manejarError(error);
      }
    }
    cargarFilas();
  }, []);

  async function cambiarEstado(id, nuevoEstado) {
    try {
      const actualizada = await cambiarEstadoAdmin(seccion.rutaCambiar, id, nuevoEstado);
      setFilas(filas.map((fila) => (fila._id === id ? actualizada : fila)));
      setMensaje(null);
    } catch (error) {
      manejarError(error);
    }
  }

  return (
    <div>
      <Alerta mensaje={mensaje} />
      {filas.length === 0 ? (
        <p style={{ marginTop: "1rem" }}>Todavía no hay registros.</p>
      ) : (
        <div className="tabla-contenedor" style={{ marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                {seccion.columnas.map(([titulo]) => <th key={titulo}>{titulo}</th>)}
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila._id}>
                  {seccion.columnas.map(([titulo, obtenerValor]) => <td key={titulo}>{obtenerValor(fila)}</td>)}
                  <td>
                    <select value={fila.estado} onChange={(e) => cambiarEstado(fila._id, e.target.value)}>
                      {seccion.estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TablaAdmin;
