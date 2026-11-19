const beneficios = [
  { titulo: "Reuniones Mensuales", texto: "Nos reunimos el último viernes de cada mes para debatir el libro seleccionado mientras disfrutamos de un café especial." },
  { titulo: "Descuentos Exclusivos", texto: "Los miembros del club reciben un 20% de descuento en todos los libros del mes y bebidas de café." },
  { titulo: "Eventos con Autores", texto: "Trimestralmente organizamos charlas y firmas de libros con autores locales e independientes." },
];

function ClubLectura() {
  return (
    <section id="club" style={{ backgroundColor: "var(--beige)" }}>
      <div className="container">
        <h2 className="section-title">Club de Lectura</h2>
        <p className="section-subtitle">Únete a nuestra comunidad</p>
        <div className="timeline">
          {beneficios.map((beneficio) => (
            <div className="timeline-item" key={beneficio.titulo}>
              <h4>{beneficio.titulo}</h4>
              <p>{beneficio.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ClubLectura;
