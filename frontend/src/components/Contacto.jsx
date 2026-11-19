import { useState } from "react";
import { enviarFormulario } from "../api";
import Alerta from "./Alerta";

const datosVacios = { nombre: "", correo: "", mensaje: "" };

function Contacto() {
  const [datos, setDatos] = useState(datosVacios);
  const [mensaje, setMensaje] = useState(null);

  function actualizarCampo(evento) {
    setDatos({ ...datos, [evento.target.name]: evento.target.value });
  }

  async function enviar(evento) {
    evento.preventDefault();
    try {
      const respuesta = await enviarFormulario("/mensajes", datos);
      setMensaje({ tipo: "exito", texto: respuesta.mensaje });
      setDatos(datosVacios);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  return (
    <section id="contacto" style={{ backgroundColor: "var(--beige)" }}>
      <div className="container">
        <h2 className="section-title">Contáctanos</h2>
        <p className="section-subtitle">Escríbenos, te responderemos pronto</p>
        <div className="caja-formulario">
          <form onSubmit={enviar}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contacto-nombre">Nombre</label>
                <input type="text" id="contacto-nombre" name="nombre" placeholder="Tu nombre" value={datos.nombre} onChange={actualizarCampo} required />
              </div>
              <div className="form-group">
                <label htmlFor="contacto-correo">Correo Electrónico</label>
                <input type="email" id="contacto-correo" name="correo" placeholder="tucorreo@ejemplo.com" value={datos.correo} onChange={actualizarCampo} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="contacto-mensaje">Mensaje</label>
              <textarea id="contacto-mensaje" name="mensaje" rows="4" placeholder="¿En qué podemos ayudarte?" value={datos.mensaje} onChange={actualizarCampo} required></textarea>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}>Enviar Mensaje</button>
          </form>
        </div>
        <Alerta mensaje={mensaje} />
      </div>
    </section>
  );
}

export default Contacto;
