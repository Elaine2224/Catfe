const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");
const verificarRol = require("../middleware/verificarRol");
const caja = require("../controllers/cajaController");

// Todas las rutas de caja exigen token Y rol de cajero
router.use(verificarToken, verificarRol("cajero"));

router.get("/pedidos", caja.listarPedidos);
router.put("/pedidos/:id/confirmar-pago", caja.confirmarPago);
router.put("/pedidos/:id/rechazar-pago", caja.rechazarPago);
router.put("/pedidos/:id/entregar", caja.entregarPedido);
router.put("/pedidos/:id/cancelar", caja.cancelarPedido);

module.exports = router;
