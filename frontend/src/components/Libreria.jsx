import ImagenTarjeta from "./ImagenTarjeta";

// Los libros no se compran ni se apartan: se leen en el local, incluidos con la reserva de mesa
function Libreria({ libros }) {
  return (
    <section id="books">
      <div className="container">
        <h2 className="section-title">Librería Catfé</h2>
        <p className="section-subtitle">Encuentra tu próxima aventura</p>
        <p className="aviso-libros">
          📖 Todos los libros están disponibles para leer durante tu visita al local. Van incluidos con tu reserva de mesa.{" "}
          <a href="#reservations">Reservar una mesa</a>
        </p>
        <div className="cards-grid">
          {libros.map((libro) => (
            <div className="card" key={libro._id}>
              <ImagenTarjeta src={libro.imagen} alt={libro.nombre} icono="📖" />
              <div className="card-content">
                <h3 className="card-title">{libro.nombre}</h3>
                <p className="card-desc">{libro.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Libreria;
