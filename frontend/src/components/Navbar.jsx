import { Link } from "react-router-dom";
import { useCarrito } from "../context/CarritoContext";

// Los enlaces usan "/#seccion" para que funcionen también desde /carrito y /pedido
function Navbar() {
  const { totalUnidades } = useCarrito();

  return (
    <nav>
      <div className="nav-container">
        <a href="/" className="logo">Catfé</a>
        <ul className="nav-links">
          <li><a href="/#menu">Menú</a></li>
          <li><a href="/#books">Libros</a></li>
          <li><a href="/#cats">Gatos</a></li>
          <li><a href="/#galeria">Galería</a></li>
          <li><a href="/#club">Club de Lectura</a></li>
          <li><a href="/#reservations">Reservas</a></li>
          <li><a href="/#donations">Donaciones</a></li>
          <li><a href="/#contacto">Contacto</a></li>
          <li><Link to="/pedido">Mi pedido</Link></li>
          <li><a href="/#reservations" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem" }}>Reservar</a></li>
        </ul>
        {/* El carrito está fuera de la lista para que se vea siempre */}
        <Link to="/carrito" className="nav-carrito" aria-label={`Carrito, ${totalUnidades} productos`}>
          🛒 <span className="nav-carrito-cantidad">{totalUnidades}</span>
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
