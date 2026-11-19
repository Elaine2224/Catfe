function Hero() {
  return (
    <header className="hero">
      <h1>Bienvenido a Catfé</h1>
      <p>Cada taza cuenta una historia. Cada ronroneo encuentra un hogar.</p>
      <div className="hero-buttons">
        <a href="#reservations" className="btn btn-primary">Reservar Mesa</a>
        <a href="#menu" className="btn btn-outline">Explorar Menú</a>
      </div>
    </header>
  );
}

export default Hero;
