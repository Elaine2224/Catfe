require("dotenv").config(); // Lee el archivo .env
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const manejarErrores = require("./middleware/manejarErrores");
const Pedido = require("./models/Pedido");

const app = express();

app.use(cors());         // Permite que React (otro puerto) llame a esta API
app.use(express.json()); // Permite leer los datos JSON que envía React

// Rutas de la API
app.use("/api/productos", require("./routes/productos"));
app.use("/api/gatos", require("./routes/gatos"));
app.use("/api/galeria", require("./routes/galeria"));
app.use("/api/pedidos", require("./routes/pedidos"));
app.use("/api/reservas", require("./routes/reservas"));
app.use("/api/adopciones", require("./routes/adopciones"));
app.use("/api/mensajes", require("./routes/mensajes"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/caja", require("./routes/caja"));

// Ruta que no existe
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

// Siempre va al final: atrapa los errores de todos los controladores
app.use(manejarErrores);

// Conectamos a MongoDB y, si sale bien, encendemos el servidor
const puerto = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ Conectado a MongoDB");
    await Pedido.init(); // Asegura que el índice único de referenciaActiva exista antes de recibir pedidos
    app.listen(puerto, () => console.log(`✅ Servidor en http://localhost:${puerto}`));
  })
  .catch((error) => {
    console.error("❌ No se pudo conectar a MongoDB:", error.message);
    console.error("   Revisa que MongoDB esté encendido y que MONGODB_URI en .env sea correcto.");
  });
