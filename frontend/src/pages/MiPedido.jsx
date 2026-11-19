import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { obtenerPedidoPorToken, consultarPedido, leerPedidosLocales } from "../api";
import Navbar from "../components/Navbar";
import Alerta from "../components/Alerta";
import CodigoQR from "../components/CodigoQR";

const dinero = (numero) => "$" + Number(numero).toFixed(2);
const fechaHora = (fecha) => new Date(fecha).toLocaleString("es-EC");

// Qué le explicamos al cliente según el estado de su pedido
function explicacion(pedido) {
  if (pedido.puedeRetirar) return "¡Pago confirmado! Presenta este código QR (o el código) en Catfé para retirar tu pedido.";
  if (pedido.estadoRetiro === "Entregado") return "Tu pedido ya fue entregado. ¡Gracias por visitarnos!";
  if (pedido.estadoPago === "Rechazado") return "No pudimos verificar tu transferencia y el pedido fue cancelado. Si crees que es un error, escríbenos desde la sección Contacto.";
  if (pedido.estadoRetiro === "Cancelado") return "Tu pedido fue cancelado. Escríbenos desde la sección Contacto si necesitas el reembolso.";
  return "Estamos verificando tu transferencia. Cuando el cajero confirme el pago, aquí aparecerá tu código QR para retirar el pedido.";
}

const claseEstado = (estado) => {
  if (["Pagado", "Listo para retiro", "Entregado"].includes(estado)) return "tag available";
  if (["Rechazado", "Cancelado"].includes(estado)) return "tag reserved";
  return "tag";
};

// Página de seguimiento. Con enlace privado (/pedido/:token) muestra el pedido;
// sin token (/pedido) permite buscarlo con el código y el correo.
function MiPedido() {
  const { token } = useParams();
  const ubicacion = useLocation();
  const esNuevo = Boolean(ubicacion.state && ubicacion.state.nuevo);

  const [pedido, setPedido] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(Boolean(token));
  const [busqueda, setBusqueda] = useState({ codigo: "", correo: "" });

  async function cargar() {
    setCargando(true);
    try {
      setPedido(await obtenerPedidoPorToken(token));
      setMensaje(null);
    } catch (error) {
      setPedido(null);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setPedido(null);
    setMensaje(null);
    if (token) cargar();
  }, [token]);

  async function buscar(evento) {
    evento.preventDefault();
    try {
      setPedido(await consultarPedido(busqueda.codigo, busqueda.correo));
      setMensaje(null);
    } catch (error) {
      setPedido(null);
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  const pedidosGuardados = leerPedidosLocales();

  return (
    <>
      <Navbar />
      <section className="container pagina-interna">
        <h2 className="section-title">Mi pedido</h2>

        {esNuevo && pedido && (
          <Alerta mensaje={{ tipo: "exito", texto: "¡Pedido registrado! Guarda el enlace de esta página: es tu enlace privado para ver el estado de tu pedido." }} />
        )}

        {!token && (
          <>
            <p className="section-subtitle">Consulta el estado de tu compra</p>
            <form onSubmit={buscar} className="caja-formulario">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="buscar-codigo">Código del pedido</label>
                  <input type="text" id="buscar-codigo" placeholder="CAT-XXXXX" value={busqueda.codigo} onChange={(e) => setBusqueda({ ...busqueda, codigo: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="buscar-correo">Correo con el que compraste</label>
                  <input type="email" id="buscar-correo" value={busqueda.correo} onChange={(e) => setBusqueda({ ...busqueda, correo: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Buscar mi pedido</button>
            </form>

            {pedidosGuardados.length > 0 && (
              <div className="pedidos-guardados">
                <h3>Pedidos hechos desde este navegador</h3>
                <ul>
                  {pedidosGuardados.map((p) => (
                    <li key={p.token}><Link to={`/pedido/${p.token}`}>{p.codigo}</Link> · {fechaHora(p.fecha)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {cargando && <p style={{ textAlign: "center" }}>Cargando tu pedido...</p>}
        <Alerta mensaje={mensaje} />

        {pedido && (
          <div className="detalle-pedido">
            <div className="detalle-pedido-cabecera">
              <div>
                <p className="nota-stock">Código del pedido</p>
                <p className="codigo-grande">{pedido.codigo}</p>
                <p className="nota-stock">{fechaHora(pedido.fecha)}</p>
              </div>
              <div className="detalle-pedido-estados">
                <span className={claseEstado(pedido.estadoPago)}>Pago: {pedido.estadoPago}</span>
                <span className={claseEstado(pedido.estadoRetiro)}>Retiro: {pedido.estadoRetiro}</span>
              </div>
            </div>

            <ul className="detalle-pedido-items">
              {pedido.items.map((item) => (
                <li key={item.nombreProducto}>{item.cantidad} × {item.nombreProducto} — {dinero(item.subtotal)}</li>
              ))}
            </ul>
            <p><strong>Total: {dinero(pedido.total)}</strong></p>

            <p className="explicacion-pedido">{explicacion(pedido)}</p>

            {pedido.puedeRetirar && (
              <div className="qr-caja">
                <CodigoQR texto={pedido.codigo} tamano={220} />
                <p className="codigo-grande">{pedido.codigo}</p>
              </div>
            )}

            {token && (
              <>
                <button className="btn btn-outline" onClick={cargar} disabled={cargando}>Actualizar estado</button>
                <p className="nota-stock" style={{ marginTop: "1rem" }}>
                  Tu enlace privado (guárdalo): <span className="enlace-privado">{window.location.href}</span>
                </p>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default MiPedido;
