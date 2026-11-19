// Sección solo visual: los botones "Donar" todavía no hacen nada
const planes = [
  { nombre: "Amigo Felino", precio: "$10/mes", texto: "Proporciona comida y arena para un gato durante una semana.", progreso: 60, destacado: false },
  { nombre: "Protector", precio: "$25/mes", texto: "Cubre gastos veterinarios básicos y vacunas.", progreso: 80, destacado: true },
  { nombre: "Héroe Gatuno", precio: "$50/mes", texto: "Ayuda a costar cirugías y tratamientos de emergencia.", progreso: 40, destacado: false },
];

function Donaciones() {
  return (
    <section id="donations" className="container">
      <h2 className="section-title">Apoya a Nuestros Gatos</h2>
      <p className="section-subtitle">Tu ayuda hace la diferencia</p>
      <div className="donation-cards">
        {planes.map((plan) => (
          <div className={plan.destacado ? "donation-card featured" : "donation-card"} key={plan.nombre}>
            <h3>{plan.nombre}</h3>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", color: "var(--coffee)", margin: "1rem 0" }}>{plan.precio}</p>
            <p>{plan.texto}</p>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${plan.progreso}%` }}></div></div>
            <button className={plan.destacado ? "btn btn-primary" : "btn btn-outline"} style={{ width: "100%", marginTop: "1rem" }}>Donar</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Donaciones;
