import { useState, useEffect } from "react";
import { enviarFormulario } from "../api";
import Alerta from "./Alerta";

const datosVacios = { cantidad: 1, nombreCliente: "", correo: "", nota: "" };

// "elegido" trae el producto y el tipo (compra o apartado) del botón que se presionó
function FormularioPedido({ productos, elegido }) {
  const [producto, setProducto] = useState("");
  const [tipo, setTipo] = useState("compra");
  const [datos, setDatos] = useState(datosVacios);
  const [mensaje, setMensaje] = useState(null);

  // Cada vez que se presiona "Pedir" o "Apartar", se rellena el formulario
  useEffect(() => {
    setProducto(elegido.producto);
    setTipo(elegido.tipo);
    setMensaje(null);
  }, [elegido]);

  function actualizarCampo(evento) {
    setDatos({ ...datos, [evento.target.name]: evento.target.value });
  }

  async function enviar(evento) {
    evento.preventDefault(); // Evita que la página se recargue
    try {
      const respuesta = await enviarFormulario("/pedidos", { producto, tipo, ...datos });
      setMensaje({ tipo: "exito", texto: respuesta.mensaje });
      setDatos(datosVacios);
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  return (
    <section id="pedido" className="container">
      <h2 className="section-title">Haz tu Pedido</h2>
      <p className="section-subtitle">Compra o aparta tus favoritos</p>
      <div className="caja-formulario">
        <form onSubmit={enviar}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pedido-producto">Producto</label>
              <select id="pedido-producto" value={producto} onChange={(e) => setProducto(e.target.value)} required>
                <option value="">Elige un producto</option>
                {(productos || []).map((p) => (
  <option key={p._id} value={p._id}>
    {p.nombre} - ${Number(p.precio ?? 0).toFixed(2)}
  </option>
              ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="pedido-tipo">¿Qué quieres hacer?</label>
              <select id="pedido-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="compra">Comprarlo</option>
                <option value="apartado">Apartarlo</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pedido-nombre">Nombre Completo</label>
              <input type="text" id="pedido-nombre" name="nombreCliente" placeholder="Tu nombre" value={datos.nombreCliente} onChange={actualizarCampo} required />
            </div>
            <div className="form-group">
              <label htmlFor="pedido-correo">Correo Electrónico</label>
              <input type="email" id="pedido-correo" name="correo" placeholder="tucorreo@ejemplo.com" value={datos.correo} onChange={actualizarCampo} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="pedido-cantidad">Cantidad</label>
            <input type="number" id="pedido-cantidad" name="cantidad" min="1" max="20" value={datos.cantidad} onChange={actualizarCampo} required />
          </div>
          <div className="form-group">
            <label htmlFor="pedido-nota">Nota (opcional)</label>
            <textarea id="pedido-nota" name="nota" rows="3" placeholder="¿Algo que debamos saber?" value={datos.nota} onChange={actualizarCampo}></textarea>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}>
            {tipo === "compra" ? "Enviar Pedido" : "Apartar Producto"}
          </button>
        </form>
      </div>
      <Alerta mensaje={mensaje} />
    </section>
  );
}

export default FormularioPedido;
