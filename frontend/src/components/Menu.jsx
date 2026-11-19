import { useState } from "react";
import { useCarrito } from "../context/CarritoContext";
import ImagenTarjeta from "./ImagenTarjeta";

const FILTROS = [
  ["todos", "Todos"],
  ["bebidas-calientes", "Bebidas calientes"],
  ["bebidas-frias", "Bebidas frías"],
  ["postres", "Postres"],
];

const ICONOS = { "bebidas-calientes": "☕", "bebidas-frias": "🧊", postres: "🍰" };

function Menu({ productos }) {
  const { items, agregar } = useCarrito();
  const [filtro, setFiltro] = useState("todos");

  const delMenu = productos.filter((p) => p.categoria !== "libro");
  const visibles = delMenu.filter((p) => filtro === "todos" || p.categoria === filtro);

  return (
    <section id="menu" className="container">
      <h2 className="section-title">Nuestro Menú</h2>
      <p className="section-subtitle">Hecho con amor y ingredientes orgánicos</p>

      <div className="filtros-menu">
        {FILTROS.map(([clave, titulo]) => (
          <button key={clave} className={filtro === clave ? "btn btn-primary" : "btn btn-outline"} onClick={() => setFiltro(clave)}>
            {titulo}
          </button>
        ))}
      </div>

      <div className="cards-grid">
        {visibles.map((producto) => {
          const enCarrito = (items.find((i) => i.producto === producto._id) || {}).cantidad || 0;
          const maximo = Math.min(20, producto.stock);
          const agotado = producto.stock < 1;
          const limite = !agotado && enCarrito >= maximo;

          return (
            <div className="card" key={producto._id}>
              <ImagenTarjeta src={producto.imagen} alt={producto.nombre} icono={ICONOS[producto.categoria] || "☕"} />
              <div className="card-content">
                <h3 className="card-title">{producto.nombre}</h3>
                <p className="card-desc">{producto.descripcion}</p>
                <div className="card-footer">
                  <span className="price">{Number.isFinite(producto.precio) ? `$${producto.precio.toFixed(2)}` : ""}</span>
                  {agotado ? <span className="tag agotado">Agotado</span> : producto.etiqueta && <span className="tag">{producto.etiqueta}</span>}
                </div>
                {!agotado && producto.stock <= 5 && <p className="nota-stock">Quedan solo {producto.stock}</p>}
                <div className="botones-producto">
                  <button className="btn btn-primary" disabled={agotado || limite} onClick={() => agregar(producto._id, maximo)}>
                    {agotado ? "Agotado" : limite ? "Máximo en tu carrito" : "Agregar al carrito"}
                  </button>
                </div>
                {enCarrito > 0 && <p className="nota-stock">En tu carrito: {enCarrito}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {visibles.length === 0 && <p style={{ textAlign: "center", marginTop: "2rem" }}>No hay productos en esta categoría.</p>}
    </section>
  );
}

export default Menu;
