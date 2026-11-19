const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");
const verificarRol = require("../middleware/verificarRol");
const admin = require("../controllers/adminController");

// Esta es la única ruta que no pide token (sirve para administrador y cajero)
router.post("/login", admin.iniciarSesion);

// Todo lo que está debajo exige token Y rol de administrador
router.use(verificarToken, verificarRol("admin"));

router.get("/reservas", admin.obtenerReservas);
router.put("/reservas/:id", admin.cambiarEstadoReserva);

router.get("/adopciones", admin.obtenerSolicitudes);
router.put("/adopciones/:id", admin.cambiarEstadoSolicitud);

router.get("/mensajes", admin.obtenerMensajes);
router.put("/mensajes/:id", admin.cambiarEstadoMensaje);

router.put("/gatos/:id", admin.cambiarEstadoGato);

module.exports = router;
