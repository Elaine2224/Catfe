import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { obtenerSesion, cerrarSesion, obtenerPedidosCaja, accionPedidoCaja } from "../api";
import Alerta from "../components/Alerta";
import CodigoQR from "../components/CodigoQR";

const dinero = (numero) => "$" + Number(numero).toFixed(2);
const fechaHora = (fecha) => new Date(fecha).toLocaleString("es-EC");

const FILTROS = [
  ["todos", "Todos"],
  ["porVerificar", "Por verificar"],
  ["listos", "Listos para retiro"],
  ["entregados", "Entregados"],
  ["cancelados", "Cancelados"],
];

function cumpleFiltro(pedido, filtro) {
  if (filtro === "porVerificar") return pedido.estadoPago === "Pendiente de verificación";
  if (filtro === "listos") return pedido.estadoRetiro === "Listo para retiro";
  if (filtro === "entregados") return pedido.estadoRetiro === "Entregado";
  if (filtro === "cancelados") return pedido.estadoRetiro === "Cancelado";
  return true;
}

// Color de la etiqueta según el estado
const claseEstado = (estado) => {
  if (["Pagado", "Listo para retiro", "Entregado"].includes(estado)) return "tag available";
  if (["Rechazado", "Cancelado"].includes(estado)) return "tag reserved";
  return "tag";
};

// Panel del cajero. Solo se llega aquí con sesión de cajero (ver RutaProtegida).
function Caja() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null);   // id del pedido con el detalle desplegado
  const [ocupado, setOcupado] = useState(null);   // id del pedido que se está procesando
  const [mensaje, setMensaje] = useState(null);

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  // Si la sesión venció (error 401), volvemos al login
  function manejarError(error) {
    if (error.estado === 401) {
      cerrarSesion();
      navigate("/login", { state: { aviso: "Tu sesión venció. Inicia sesión de nuevo." } });
    } else {
      setMensaje({ tipo: "error", texto: error.message });
    }
  }

  async function cargar() {
    try {
      setPedidos(await obtenerPedidosCaja());
    } catch (error) {
      manejarError(error);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Ejecuta una acción sobre el pedido (con confirmación) y actualiza esa fila con la respuesta
  async function ejecutar(pedido, accion, pregunta, textoExito) {
    if (!window.confirm(pregunta)) return;
    setOcupado(pedido._id);
    try {
      const actualizado = await accionPedidoCaja(pedido._id, accion);
      setPedidos((lista) => lista.map((p) => (p._id === actualizado._id ? actualizado : p)));
      setMensaje({ tipo: "exito", texto: `${textoExito} (${pedido.codigo})` });
    } catch (error) {
      manejarError(error); // Por ejemplo: "No hay stock suficiente de ..."
    } finally {
      setOcupado(null);
    }
  }

  const textoBusqueda = busqueda.trim().toLowerCase();
  const visibles = pedidos.filter(
    (p) =>
      cumpleFiltro(p, filtro) &&
      (textoBusqueda === "" || p.codigo.toLowerCase().includes(textoBusqueda) || p.nombreCliente.toLowerCase().includes(textoBusqueda))
  );
  const porVerificar = pedidos.filter((p) => cumpleFiltro(p, "porVerificar")).length;
  const listos = pedidos.filter((p) => cumpleFiltro(p, "listos")).length;

  return (
    <div className="admin-pagina">
      <div className="admin-cabecera">
        <h1>Caja de Catfé</h1>
        <div className="admin-cabecera-botones">
          <span style={{ color: "var(--cream)", alignSelf: "center" }}>Cajero: {sesion ? sesion.usuario : ""}</span>
          <button className="btn btn-outline" onClick={cargar}>Actualizar</button>
          <Link to="/" className="btn btn-outline">Ver sitio</Link>
          <button className="btn btn-outline" onClick={salir}>Cerrar sesión</button>
        </div>
      </div>

      <div className="admin-contenido">
        <div className="admin-pestanas">
          {FILTROS.map(([clave, titulo]) => (
            <button key={clave} className={filtro === clave ? "btn btn-primary" : "btn btn-outline"} onClick={() => setFiltro(clave)}>
              {titulo}
              {clave === "porVerificar" ? ` (${porVerificar})` : ""}
              {clave === "listos" ? ` (${listos})` : ""}
            </button>
          ))}
        </div>

        <div className="caja-buscador">
          <input type="search" aria-label="Buscar pedido" placeholder="Buscar por código o nombre del cliente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        <Alerta mensaje={mensaje} />

        {visibles.length === 0 ? (
          <p style={{ marginTop: "1.5rem" }}>No hay pedidos para mostrar.</p>
        ) : (
          <div className="tabla-contenedor" style={{ marginTop: "1.5rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Retiro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((pedido) => {
                  const desplegado = abierto === pedido._id;
                  const pendiente = pedido.estadoPago === "Pendiente de verificación";
                  const listo = pedido.estadoPago === "Pagado" && pedido.estadoRetiro === "Listo para retiro";
                  return (
                    <PedidoFilas key={pedido._id} desplegado={desplegado}
                      fila={
                        <tr className={desplegado ? "fila-abierta" : ""}>
                          <td>{fechaHora(pedido.createdAt)}</td>
                          <td><strong>{pedido.codigo}</strong></td>
                          <td>{pedido.nombreCliente}</td>
                          <td>{dinero(pedido.total)}</td>
                          <td><span className={claseEstado(pedido.estadoPago)}>{pedido.estadoPago}</span></td>
                          <td><span className={claseEstado(pedido.estadoRetiro)}>{pedido.estadoRetiro}</span></td>
                          <td>
                            <button className="btn btn-outline" style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }} onClick={() => setAbierto(desplegado ? null : pedido._id)}>
                              {desplegado ? "Ocultar" : "Ver detalle"}
                            </button>
                          </td>
                        </tr>
                      }
                      detalle={
                        <tr className="fila-detalle">
                          <td colSpan={7}>
                            <div className="caja-detalle">
                              <div>
                                <h4>Productos</h4>
                                <ul>
                                  {pedido.items.map((item) => (
                                    <li key={item.producto}>{item.cantidad} × {item.nombreProducto} — {dinero(item.subtotal)}</li>
                                  ))}
                                </ul>
                                <p><strong>Total: {dinero(pedido.total)}</strong></p>
                              </div>

                              <div>
                                <h4>Cliente y pago</h4>
                                <p>{pedido.nombreCliente}<br />{pedido.correo}</p>
                                <p>Referencia de transferencia:<br /><strong className="codigo-grande">{pedido.referenciaTransferencia}</strong></p>
                                {pendiente && <p className="nota-caja">Comprueba en el banco que el dinero llegó antes de confirmar. Una captura de pantalla no es prueba suficiente.</p>}
                                <p className="nota-caja">
                                  Pedido: {fechaHora(pedido.createdAt)}
                                  {pedido.fechaPago ? <><br />Pago confirmado: {fechaHora(pedido.fechaPago)}</> : null}
                                  {pedido.fechaEntrega ? <><br />Entregado: {fechaHora(pedido.fechaEntrega)}</> : null}
                                </p>
                              </div>

                              <div>
                                <h4>Acciones</h4>
                                {pendiente && (
                                  <div className="caja-acciones">
                                    <button className="btn btn-primary" disabled={ocupado === pedido._id}
                                      onClick={() => ejecutar(pedido, "confirmar-pago", `¿Confirmas que ya llegaron ${dinero(pedido.total)} a la cuenta con la referencia ${pedido.referenciaTransferencia}? Se descontará el stock.`, "Pago confirmado")}>
                                      Confirmar pago
                                    </button>
                                    <button className="btn btn-outline" disabled={ocupado === pedido._id}
                                      onClick={() => ejecutar(pedido, "rechazar-pago", `¿Rechazar el pago del pedido ${pedido.codigo}? El pedido se cancelará.`, "Pago rechazado")}>
                                      Rechazar pago
                                    </button>
                                  </div>
                                )}
                                {listo && (
                                  <div className="caja-acciones">
                                    <button className="btn btn-primary" disabled={ocupado === pedido._id}
                                      onClick={() => ejecutar(pedido, "entregar", `¿Confirmas que entregaste el pedido ${pedido.codigo} a ${pedido.nombreCliente}?`, "Pedido entregado")}>
                                      Marcar como entregado
                                    </button>
                                    <button className="btn btn-outline" disabled={ocupado === pedido._id}
                                      onClick={() => ejecutar(pedido, "cancelar", `¿Cancelar el pedido ${pedido.codigo}? Se devolverá el stock. Si el cliente ya pagó, el reembolso se hace fuera del sistema.`, "Pedido cancelado")}>
                                      Cancelar pedido
                                    </button>
                                  </div>
                                )}
                                {!pendiente && !listo && <p className="nota-caja">Este pedido ya no tiene acciones disponibles.</p>}
                              </div>

                              <div className="qr-caja">
                                <h4>Código de retiro</h4>
                                {listo ? (
                                  <>
                                    <CodigoQR texto={pedido.codigo} tamano={180} />
                                    <p className="codigo-grande">{pedido.codigo}</p>
                                  </>
                                ) : (
                                  <p className="nota-caja">
                                    {pendiente ? "El QR se mostrará cuando confirmes el pago." : "Este pedido ya no se puede retirar."}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Una fila de la tabla y, debajo, su detalle (solo cuando está desplegado)
function PedidoFilas({ fila, detalle, desplegado }) {
  return (
    <>
      {fila}
      {desplegado ? detalle : null}
    </>
  );
}

export default Caja;
