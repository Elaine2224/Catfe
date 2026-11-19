const Galeria = require("../models/Galeria");

// GET /api/galeria
async function obtenerGaleria(req, res, next) {
  try {
    const trabajos = await Galeria.find();
    res.json(trabajos);
  } catch (error) {
    next(error);
  }
}

module.exports = { obtenerGaleria };
