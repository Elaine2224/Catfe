const express = require("express");
const router = express.Router();
const { crearMensaje } = require("../controllers/mensajesController");

router.post("/", crearMensaje);

module.exports = router;
