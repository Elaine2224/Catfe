// Muestra un mensaje de éxito o de error: { tipo: "exito" | "error", texto: "..." }
function Alerta({ mensaje }) {
  if (!mensaje) return null;
  return <p className={`alerta ${mensaje.tipo}`}>{mensaje.texto}</p>;
}

export default Alerta;
