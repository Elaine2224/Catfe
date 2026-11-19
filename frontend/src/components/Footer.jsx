// El newsletter todavía es solo visual
function Footer() {
  return (
    <footer id="contact">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h3 style={{ color: "var(--cream)", marginBottom: "1rem" }}>Catfé</h3>
            <p style={{ color: "rgba(243, 233, 220, 0.7)", fontSize: "0.9rem" }}>
              Un santuario donde el café, los libros y los gatos crean una experiencia única.
            </p>
          </div>
          <div className="footer-links">
            <h4>Visítanos</h4>
            <ul>
              <li>Dirección: 123 Calle Gato</li>
              <li>Tel: +123 456 7890</li>
              <li>Email: hola@catfe.com</li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Enlaces</h4>
            <ul>
              <li><a href="#menu">Menú</a></li>
              <li><a href="#cats">Adoptar</a></li>
              <li><a href="#reservations">Reservar</a></li>
            </ul>
          </div>
          <div className="footer-links newsletter">
            <h4>Newsletter</h4>
            <input type="email" placeholder="Tu email" />
            <button className="btn btn-primary" style={{ width: "100%", padding: "0.5rem" }}>Suscribirse</button>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} Catfé. Diseñado con amor para los amantes de los gatos y los libros.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
