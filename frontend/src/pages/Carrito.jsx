import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { obtenerProductos, enviarFormulario, guardarPedidoLocal } from "../api";
import { useCarrito } from "../context/CarritoContext";
import { datosPago } from "../config/datosPago";
import Navbar from "../components/Navbar";
import Alerta from "../components/Alerta";

const dinero = (numero) => "$" + Number(numero).toFixed(2);

// Carrito, datos del cliente y datos de la transferencia, todo en la misma pantalla.
// El pedido se crea cuando el cliente indica que YA hizo la transferencia y escribe su referencia.
function Carrito() {
  const navigate = useNavigate();
  const { items, cambiarCantidad, quitar, vaciar } = useCarrito();
  const [catalogo, setCatalogo] = useState(null); // null = todavía cargando
  const [datos, setDatos] = useState({ nombreCliente: "", correo: "", referenciaTransferencia: "" });
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function cargarCatalogo() {
    try {
      setCatalogo(await obtenerProductos());
    } catch (error) {
      setCatalogo([]);
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  useEffect(() => {
    cargarCatalogo();
  }, []);

  // Une cada línea del carrito con los datos ACTUALES del producto (precio y stock)
  const lineas = items.map((item) => {
    const producto = catalogo ? catalogo.find((p) => p._id === item.producto) : null;
    let problema = null;
    if (catalogo) {
      if (!producto || producto.categoria === "libro") problema = "Este producto ya no está disponible";
      else if (producto.stock < 1) problema = "Agotado";
      else if (item.cantidad > producto.stock) problema = `Solo quedan ${producto.stock}`;
    }
    return {
      id: item.producto,
      cantidad: item.cantidad,
      producto,
      problema,
      maximo: producto ? Math.min(20, producto.stock) : 20,
      subtotal: producto ? producto.precio * item.cantidad : 0,
    };
  });
  const total = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);
  const hayProblemas = lineas.some((linea) => linea.problema);

  function actualizarCampo(evento) {
    setDatos({ ...datos, [evento.target.name]: evento.target.value });
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (hayProblemas) {
      setMensaje({ tipo: "error", texto: "Quita o ajusta los productos con problemas antes de enviar tu pedido." });
      return;
    }
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await enviarFormulario("/pedidos", {
        ...datos,
        items: items.map((i) => ({ producto: i.producto, cantidad: i.cantidad })),
      });
      guardarPedidoLocal({ codigo: respuesta.codigo, token: respuesta.tokenSeguimiento, fecha: new Date().toISOString() });
      vaciar();
      navigate(`/pedido/${respuesta.tokenSeguimiento}`, { state: { nuevo: true, referencia: datos.referenciaTransferencia } });
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
      cargarCatalogo(); // Por si el stock cambió
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Navbar />
      <section className="container pagina-interna">
        <h2 className="section-title">Tu carrito</h2>

        {items.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "1.5rem" }}>Tu carrito está vacío.</p>
            <a href="/#menu" className="btn btn-primary">Ver el menú</a>
          </div>
        ) : (
          <>
            <div className="carrito-lineas">
              {lineas.map((linea) => (
                <div className="carrito-linea" key={linea.id}>
                  <div className="carrito-nombre">
                    <strong>{linea.producto ? linea.producto.nombre : "Producto no disponible"}</strong>
                    {linea.producto && <span>{dinero(linea.producto.precio)} c/u</span>}
                    {linea.problema && <span className="carrito-problema">⚠️ {linea.problema}</span>}
                  </div>
                  <div className="carrito-cantidad">
                    <button className="btn btn-outline" aria-label={`Quitar una unidad de ${linea.producto ? linea.producto.nombre : "producto"}`}
                      onClick={() => cambiarCantidad(linea.id, linea.cantidad - 1)}>−</button>
                    <span aria-label="Cantidad">{linea.cantidad}</span>
                    <button className="btn btn-outline" aria-label={`Agregar una unidad de ${linea.producto ? linea.producto.nombre : "producto"}`}
                      disabled={linea.cantidad >= linea.maximo} onClick={() => cambiarCantidad(linea.id, linea.cantidad + 1)}>+</button>
                  </div>
                  <div className="carrito-subtotal">{linea.producto ? dinero(linea.subtotal) : "—"}</div>
                  <button className="btn btn-outline" onClick={() => quitar(linea.id)}>Quitar</button>
                </div>
              ))}
            </div>
            <p className="carrito-total">Total: <strong>{dinero(total)}</strong></p>
            <p className="nota-stock" style={{ textAlign: "right" }}>El total final lo calcula el servidor al enviar el pedido.</p>

            <form onSubmit={enviar} className="caja-formulario">
              <h3>Tus datos y el pago</h3>

              <div className="datos-pago">
                <p className="datos-pago-aviso">{datosPago.aviso}</p>
                <p>Transfiere <strong>{dinero(total)}</strong> a esta cuenta:</p>
                <ul>
                  <li>Banco: {datosPago.banco}</li>
                  <li>Tipo de cuenta: {datosPago.tipoCuenta}</li>
                  <li>Número: {datosPago.numeroCuenta}</li>
                  <li>Titular: {datosPago.titular}</li>
                </ul>
                <p className="nota-stock">Cuando hayas transferido, escribe abajo la referencia (número de comprobante) que te dio tu banco.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="carrito-nombre">Nombre Completo</label>
                  <input type="text" id="carrito-nombre" name="nombreCliente" value={datos.nombreCliente} onChange={actualizarCampo} required />
                </div>
                <div className="form-group">
                  <label htmlFor="carrito-correo">Correo Electrónico</label>
                  <input type="email" id="carrito-correo" name="correo" value={datos.correo} onChange={actualizarCampo} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="carrito-referencia">Referencia de la transferencia</label>
                <input type="text" id="carrito-referencia" name="referenciaTransferencia" placeholder="Ejemplo: 123456789" value={datos.referenciaTransferencia} onChange={actualizarCampo} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }} disabled={enviando}>
                {enviando ? "Enviando..." : "Ya hice la transferencia"}
              </button>
            </form>
          </>
        )}
        <Alerta mensaje={mensaje} />
      </section>
    </>
  );
}

export default Carrito;
