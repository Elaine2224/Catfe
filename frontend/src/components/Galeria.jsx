import ImagenTarjeta from "./ImagenTarjeta";

function Galeria({ trabajos }) {
  return (
    <section id="galeria" style={{ backgroundColor: "var(--beige)" }}>
      <div className="container">
        <h2 className="section-title">Nuestros Trabajos</h2>
        <p className="section-subtitle">Lo que hacemos en Catfé</p>
        <div className="cards-grid">
          {trabajos.map((trabajo) => (
            <div className="card" key={trabajo._id}>
              <ImagenTarjeta src={trabajo.imagen} alt={trabajo.titulo} icono="🎨" />
              <div className="card-content">
                <h3 className="card-title">{trabajo.titulo}</h3>
                <p className="card-desc">{trabajo.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Galeria;
