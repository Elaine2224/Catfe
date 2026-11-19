import { useState, useEffect } from "react";
import QRCode from "qrcode";

// Dibuja un código QR con el texto indicado (aquí, el código de retiro del pedido).
// Se genera como imagen SVG en el navegador: no se guarda nada en el servidor.
function CodigoQR({ texto, tamano = 200 }) {
  const [imagen, setImagen] = useState("");

  useEffect(() => {
    let vigente = true;
    QRCode.toString(texto, { type: "svg", margin: 1, width: tamano })
      .then((svg) => {
        if (vigente) setImagen("data:image/svg+xml;utf8," + encodeURIComponent(svg));
      })
      .catch(() => {
        if (vigente) setImagen("");
      });
    return () => {
      vigente = false;
    };
  }, [texto, tamano]);

  if (!imagen) return null;
  return <img className="codigo-qr" src={imagen} alt={`Código QR del pedido ${texto}`} width={tamano} height={tamano} />;
}

export default CodigoQR;
