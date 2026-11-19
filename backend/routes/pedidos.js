const express = require("express");
const router = express.Router();
const { crearPedido, obtenerPedidoPorToken, consultarPedido } = require("../controllers/pedidosController");

router.post("/", crearPedido);
router.get("/seguimiento/:token", obtenerPedidoPorToken);
router.post("/consultar", consultarPedido);

module.exports = router;
