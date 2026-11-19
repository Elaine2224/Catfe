const express = require("express");
const router = express.Router();
const { obtenerGaleria } = require("../controllers/galeriaController");

router.get("/", obtenerGaleria);

module.exports = router;
