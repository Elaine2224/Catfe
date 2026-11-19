function Navbar() {
  return (
    <nav>
      <div className="nav-container">
        <a href="#" className="logo">Catfé</a>
        <ul className="nav-links">
          <li><a href="#menu">Menú</a></li>
          <li><a href="#books">Libros</a></li>
          <li><a href="#cats">Gatos</a></li>
          <li><a href="#galeria">Galería</a></li>
          <li><a href="#club">Club de Lectura</a></li>
          <li><a href="#reservations">Reservas</a></li>
          <li><a href="#donations">Donaciones</a></li>
          <li><a href="#contacto">Contacto</a></li>
          <li><a href="#reservations" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem" }}>Reservar</a></li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
