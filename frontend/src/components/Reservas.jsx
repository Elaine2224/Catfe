import { useState } from "react";
import { enviarFormulario } from "../api";
import Alerta from "./Alerta";

const datosVacios = { nombre: "", correo: "", fecha: "", hora: "", personas: 1, mensaje: "" };

function Reservas() {
  const [datos, setDatos] = useState(datosVacios);
  const [mensaje, setMensaje] = useState(null);

  // Fecha de hoy (año-mes-día) para que el calendario no deje elegir días pasados
  const hoy = new Date().toLocaleDateString("en-CA");

  function actualizarCampo(evento) {
    setDatos({ ...datos, [evento.target.name]: evento.target.value });
  }

  async function enviar(evento) {
    evento.preventDefault();
    try {
      const respuesta = await enviarFormulario("/reservas", datos);
      setMensaje({ tipo: "exito", texto: respuesta.mensaje });
      setDatos(datosVacios);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  return (
    <section id="reservations">
      <div className="container">
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2 className="section-title">Reserva tu Mesa</h2>
          <p className="section-subtitle" style={{ color: "var(--sage)" }}>Asegura tu rincón favorito</p>
          <p className="aviso-reserva">📖 Tu reserva incluye leer los libros de nuestra librería durante tu visita.</p>
          <form onSubmit={enviar}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reserva-nombre">Nombre Completo</label>
                <input type="text" id="reserva-nombre" name="nombre" placeholder="Tu nombre" value={datos.nombre} onChange={actualizarCampo} required />
              </div>
              <div className="form-group">
                <label htmlFor="reserva-correo">Correo Electrónico</label>
                <input type="email" id="reserva-correo" name="correo" placeholder="tucorreo@ejemplo.com" value={datos.correo} onChange={actualizarCampo} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reserva-fecha">Fecha</label>
                <input type="date" id="reserva-fecha" name="fecha" min={hoy} value={datos.fecha} onChange={actualizarCampo} required />
              </div>
              <div className="form-group">
                <label htmlFor="reserva-hora">Hora</label>
                <input type="time" id="reserva-hora" name="hora" value={datos.hora} onChange={actualizarCampo} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reserva-personas">Número de Personas</label>
              <select id="reserva-personas" name="personas" value={datos.personas} onChange={actualizarCampo}>
                <option value="1">1 Persona</option>
                <option value="2">2 Personas</option>
                <option value="3">3 Personas</option>
                <option value="4">4+ Personas</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reserva-mensaje">Mensaje Especial</label>
              <textarea id="reserva-mensaje" name="mensaje" rows="4" placeholder="¿Alguna solicitud especial?" value={datos.mensaje} onChange={actualizarCampo}></textarea>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}>Confirmar Reserva</button>
          </form>
          <Alerta mensaje={mensaje} />
        </div>
      </div>
    </section>
  );
}

export default Reservas;
