import { createContext, useContext, useState, useEffect } from "react";

// El carrito vive en un "Context" de React: así lo pueden usar el menú, la barra de navegación
// y la página /carrito sin pasarse datos de un componente a otro.
// También se guarda en localStorage para que no se pierda al recargar la página.
const CLAVE_CARRITO = "catfe_carrito";
const MAXIMO_POR_PRODUCTO = 20;

const CarritoContext = createContext(null);

function leerCarrito() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || "[]");
    if (!Array.isArray(lista)) return [];
    // Solo se conservan líneas válidas: { producto: "id", cantidad: 1..20 }
    return lista.filter((i) => i && typeof i.producto === "string" && Number.isInteger(i.cantidad) && i.cantidad > 0);
  } catch (error) {
    return [];
  }
}

export function CarritoProvider({ children }) {
  const [items, setItems] = useState(leerCarrito); // [{ producto: idProducto, cantidad }]

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
    } catch (error) {
      /* si el navegador no deja guardar, el carrito sigue funcionando en memoria */
    }
  }, [items]);

  // Suma 1 unidad. "maximo" es el tope (el stock o 20, lo que sea menor)
  function agregar(idProducto, maximo = MAXIMO_POR_PRODUCTO) {
    setItems((actual) => {
      const existente = actual.find((i) => i.producto === idProducto);
      if (!existente) return [...actual, { producto: idProducto, cantidad: 1 }];
      return actual.map((i) => (i.producto === idProducto ? { ...i, cantidad: Math.min(i.cantidad + 1, maximo) } : i));
    });
  }

  // Cambia la cantidad de un producto. Con 0 (o menos) se quita del carrito.
  function cambiarCantidad(idProducto, cantidad) {
    setItems((actual) => actual.map((i) => (i.producto === idProducto ? { ...i, cantidad } : i)).filter((i) => i.cantidad > 0));
  }

  const quitar = (idProducto) => setItems((actual) => actual.filter((i) => i.producto !== idProducto));
  const vaciar = () => setItems([]);
  const totalUnidades = items.reduce((suma, i) => suma + i.cantidad, 0);

  return (
    <CarritoContext.Provider value={{ items, agregar, cambiarCantidad, quitar, vaciar, totalUnidades }}>
      {children}
    </CarritoContext.Provider>
  );
}

export const useCarrito = () => useContext(CarritoContext);
