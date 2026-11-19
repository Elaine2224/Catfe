import { useState, useEffect } from "react";

// Foto de una tarjeta. Si no hay foto, o el enlace falla, se muestra un fondo con un icono.
function ImagenTarjeta({ src, alt, icono }) {
  const [fallo, setFallo] = useState(!src);

  useEffect(() => {
    setFallo(!src);
  }, [src]);

  return (
    <div className="card-img">
      {fallo ? (
        <div className="sin-imagen" role="img" aria-label={`${alt} (sin foto)`}>{icono}</div>
      ) : (
        <img src={src} alt={alt} loading="lazy" onError={() => setFallo(true)} />
      )}
    </div>
  );
}

export default ImagenTarjeta;
