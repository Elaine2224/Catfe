// Estas estadísticas son texto fijo (no vienen de la base de datos)
const estadisticas = [
  { numero: "120+", etiqueta: "Rescatados" },
  { numero: "85", etiqueta: "Adopciones" },
  { numero: "2k+", etiqueta: "Libros" },
  { numero: "15k", etiqueta: "Cafés" },
];

function Historia() {
  return (
    <section id="about" className="container">
      <div className="about-grid">
        <div>
          <h2 className="section-title" style={{ textAlign: "left" }}>Nuestra Historia</h2>
          <p style={{ marginBottom: "1rem" }}>
            Catfé nació de la idea de combinar la tranquilidad de una cafetería de barrio, la magia de una librería de segunda mano y el amor por los animales. Nuestros gatos rescatados viven en un ambiente seguro y lleno de amor mientras esperan encontrar una familia para siempre.
          </p>
          <p>
            Aquí, puedes disfrutar de un café de especialidad, sumergirte en una novela y acompañar a nuestros amigos felinos. Cada compra y cada donación ayuda directamente a nuestro programa de rescate y adopción.
          </p>
          <div className="stats">
            {estadisticas.map((dato) => (
              <div key={dato.etiqueta}>
                <div className="stat-number">{dato.numero}</div>
                <div className="stat-label">{dato.etiqueta}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="about-image"></div>
      </div>
    </section>
  );
}

export default Historia;
