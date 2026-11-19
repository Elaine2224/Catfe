const express = require("express");
const router = express.Router();
const { crearSolicitudAdopcion } = require("../controllers/adopcionesController");

router.post("/", crearSolicitudAdopcion);

module.exports = router;
