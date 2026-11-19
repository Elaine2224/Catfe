const preguntas = [
  { pregunta: "¿Necesito reserva para visitar a los gatos?", respuesta: "No es obligatorio, pero recomendamos reservar en los fines de semana para asegurar tu lugar, ya que suele llenarse rápido." },
  { pregunta: "¿Puedo traer a mis propios gatos?", respuesta: "Por la seguridad y salud de nuestros gatos rescatados, no permitimos el ingreso de mascotas externas." },
  { pregunta: "¿Cómo funciona el proceso de adopción?", respuesta: "Debes llenar un formulario en el local. Luego de una entrevista breve, pagas una cuota de adopción que cubre vacunas y esterilización." },
];

function Faq() {
  return (
    <section id="faq" className="container">
      <h2 className="section-title">Preguntas Frecuentes</h2>
      <p className="section-subtitle">Resolvemos tus dudas</p>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {preguntas.map((item) => (
          <details className="faq-item" key={item.pregunta}>
            <summary>{item.pregunta}</summary>
            <div className="faq-answer">{item.respuesta}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default Faq;
