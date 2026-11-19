import { Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio";
import Admin from "./pages/Admin";

// Dos "páginas": la tienda (/) y el panel del administrador (/admin)
function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
