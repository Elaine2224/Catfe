
function Productos({
  id,
  titulo,
  subtitulo,
  productos = [],
  alElegir,
  conFondo = false
}) {
  const contenido = (
    <>
      <h2 className="section-title">{titulo}</h2>
      <p className="section-subtitle">{subtitulo}</p>

      <div className="cards-grid">
        {productos.map((producto) => (
          <div className="card" key={producto._id}>
            <div
              className="card-img"
              style={{
                backgroundImage: `url('${producto.imagen || ""}')`
              }}
            ></div>

            <div className="card-content">
              <h3 className="card-title">{producto.nombre}</h3>
              <p className="card-desc">{producto.descripcion}</p>

              <div className="card-footer">
                {producto.precio != null && (
                  <span className="price">
                    ${Number(producto.precio).toFixed(2)}
                  </span>
                )}

                {producto.etiqueta && (
                  <span className="tag">{producto.etiqueta}</span>
                )}
              </div>

              {!conFondo && alElegir && (
                <div className="botones-producto">
                  <button
                    className="btn btn-primary"
                    onClick={() => alElegir(producto._id, "compra")}
                  >
                    Agregar al carrito
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (conFondo) {
    return (
      <section id={id}>
        <div className="container">{contenido}</div>
      </section>
    );
  }

  return (
    <section id={id} className="container">
      {contenido}
    </section>
  );
}

export default Productos;
