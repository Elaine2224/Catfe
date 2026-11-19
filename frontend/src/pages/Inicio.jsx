import { useState, useEffect } from "react";
import { obtenerProductos, obtenerGatos, obtenerGaleria } from "../api";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Historia from "../components/Historia";
import Productos from "../components/Productos";
import FormularioPedido from "../components/FormularioPedido";
import Gatos from "../components/Gatos";
import Galeria from "../components/Galeria";
import ClubLectura from "../components/ClubLectura";
import Donaciones from "../components/Donaciones";
import Reservas from "../components/Reservas";
import Faq from "../components/Faq";
import Contacto from "../components/Contacto";
import Footer from "../components/Footer";
import Alerta from "../components/Alerta";

// Página principal: pide los datos a la API y se los pasa a cada sección
function Inicio() {
  const [productos, setProductos] = useState([]);
  const [gatos, setGatos] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [pedidoElegido, setPedidoElegido] = useState({ producto: "", tipo: "compra" });

  async function cargarGatos() {
    try {
      setGatos(await obtenerGatos());
    } catch (error) {
      setErrorCarga({ tipo: "error", texto: error.message });
    }
  }

  // Se ejecuta una sola vez, cuando la página aparece
  useEffect(() => {
    async function cargarDatos() {
      try {
        setProductos(await obtenerProductos());
        setGatos(await obtenerGatos());
        setTrabajos(await obtenerGaleria());
      } catch (error) {
        setErrorCarga({ tipo: "error", texto: error.message });
      }
    }
    cargarDatos();
  }, []);

  // Botones "Pedir" y "Apartar": rellenan el formulario y bajan hasta él
  function elegirProducto(idProducto, tipo) {
    setPedidoElegido({ producto: idProducto, tipo });
    document.getElementById("pedido").scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <Navbar />
      <Hero />
      <Alerta mensaje={errorCarga} />
      <Historia />
      <Productos
        id="menu"
        titulo="Nuestro Menú"
        subtitulo="Hecho con amor y ingredientes orgánicos"
        productos={productos.filter((p) => p.categoria === "menu")}
        alElegir={elegirProducto}
      />
      <Productos
        id="books"
        titulo="Librería Catfé"
        subtitulo="Encuentra tu próxima aventura"
        productos={productos.filter((p) => p.categoria === "libro")}
        alElegir={elegirProducto}
        conFondo
      />
      <FormularioPedido productos={productos} elegido={pedidoElegido} />
      <Gatos gatos={gatos} recargarGatos={cargarGatos} />
      <Galeria trabajos={trabajos} />
      <ClubLectura />
      <Donaciones />
      <Reservas />
      <Faq />
      <Contacto />
      <Footer />
    </>
  );
}

export default Inicio;
