import { Routes, Route, useLocation } from "react-router-dom";
import { CarritoProvider } from "./context/CarritoContext";
import Inicio from "./pages/Inicio";
import Carrito from "./pages/Carrito";
import MiPedido from "./pages/MiPedido";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Caja from "./pages/Caja";
import RutaProtegida from "./components/RutaProtegida";
import ErrorBoundary from "./components/ErrorBoundary";

// Tienda (/), carrito y seguimiento de pedidos para los clientes,
// y el login del personal (/login) con los dos paneles protegidos por rol.
function App() {
  const ubicacion = useLocation();
  return (
    <CarritoProvider>
      {/* key: al cambiar de página, el mensaje de error desaparece */}
      <ErrorBoundary key={ubicacion.pathname}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/pedido/:token?" element={<MiPedido />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<RutaProtegida rol="admin"><Admin /></RutaProtegida>} />
        <Route path="/caja" element={<RutaProtegida rol="cajero"><Caja /></RutaProtegida>} />
      </Routes>
      </ErrorBoundary>
    </CarritoProvider>
  );
}

export default App;
