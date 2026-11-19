import { Component } from "react";

// Si algo falla al dibujar una página, en lugar de dejarla en blanco se muestra este mensaje.
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Error al dibujar la página:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="container pagina-interna" style={{ textAlign: "center" }}>
        <h2 className="section-title">Algo salió mal</h2>
        <p style={{ marginBottom: "1.5rem" }}>Esta página tuvo un problema. Puedes volver al inicio o intentar de nuevo.</p>
        <a href="/" className="btn btn-primary" style={{ marginRight: "0.8rem" }}>Volver al inicio</a>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>Recargar la página</button>
      </div>
    );
  }
}

export default ErrorBoundary;
