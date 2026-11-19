const express = require("express");
const router = express.Router();
const { obtenerGatos } = require("../controllers/gatosController");

router.get("/", obtenerGatos);

module.exports = router;
