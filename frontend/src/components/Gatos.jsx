import { useState } from "react";
import { enviarFormulario } from "../api";
import Alerta from "./Alerta";
import ImagenTarjeta from "./ImagenTarjeta";

const datosVacios = { nombre: "", correo: "", telefono: "", mensaje: "" };

// "recargarGatos" vuelve a pedir los gatos a la API para ver el estado actualizado
function Gatos({ gatos, recargarGatos }) {
  const [gatoElegido, setGatoElegido] = useState(null);
  const [datos, setDatos] = useState(datosVacios);
  const [mensaje, setMensaje] = useState(null);

  function elegirGato(gato) {
    setGatoElegido(gato);
    setMensaje(null);
  }

  function actualizarCampo(evento) {
    setDatos({ ...datos, [evento.target.name]: evento.target.value });
  }

  async function enviar(evento) {
    evento.preventDefault();
    try {
      const respuesta = await enviarFormulario("/adopciones", { gato: gatoElegido._id, ...datos });
      setMensaje({ tipo: "exito", texto: respuesta.mensaje });
      setGatoElegido(null);
      setDatos(datosVacios);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
    recargarGatos(); // Si el gato quedó "Reservado", la tarjeta se actualiza
  }

  return (
    <section id="cats" className="container">
      <h2 className="section-title">Nuestros Residentes</h2>
      <p className="section-subtitle">Esperando una familia para siempre</p>
      <div className="cards-grid">
        {gatos.map((gato) => {
          const disponible = gato.estado === "Disponible";
          return (
            <div className="card cat-card" key={gato._id}>
              <ImagenTarjeta src={gato.imagen} alt={gato.nombre} icono="🐱" />
              <div className="card-content">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h3 className="card-title">{gato.nombre}</h3>
                  <span className={`tag ${disponible ? "available" : "reserved"}`}>{gato.estado}</span>
                </div>
                <p className="card-desc">{gato.edad}. {gato.descripcion}</p>
                {disponible ? (
                  <button className="btn btn-primary" onClick={() => elegirGato(gato)}>Adoptar a {gato.nombre}</button>
                ) : (
                  <button className="btn btn-outline" style={{ borderColor: "var(--brown)", color: "var(--brown)" }} disabled>
                    No disponible
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Alerta mensaje={mensaje} />

      {gatoElegido && (
        <div className="caja-formulario">
          <h3>Solicitud de adopción para {gatoElegido.nombre}</h3>
          <form onSubmit={enviar}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="adopcion-nombre">Nombre Completo</label>
                <input type="text" id="adopcion-nombre" name="nombre" placeholder="Tu nombre" value={datos.nombre} onChange={actualizarCampo} required />
              </div>
              <div className="form-group">
                <label htmlFor="adopcion-correo">Correo Electrónico</label>
                <input type="email" id="adopcion-correo" name="correo" placeholder="tucorreo@ejemplo.com" value={datos.correo} onChange={actualizarCampo} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="adopcion-telefono">Teléfono</label>
              <input type="tel" id="adopcion-telefono" name="telefono" placeholder="0991234567" value={datos.telefono} onChange={actualizarCampo} required />
            </div>
            <div className="form-group">
              <label htmlFor="adopcion-mensaje">¿Por qué quieres adoptarlo?</label>
              <textarea id="adopcion-mensaje" name="mensaje" rows="3" value={datos.mensaje} onChange={actualizarCampo}></textarea>
            </div>
            <div className="form-row">
              <button type="submit" className="btn btn-primary" style={{ padding: "0.8rem" }}>Enviar Solicitud</button>
              <button type="button" className="btn btn-outline" style={{ padding: "0.8rem", borderColor: "var(--cream)", color: "var(--cream)" }} onClick={() => setGatoElegido(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default Gatos;
