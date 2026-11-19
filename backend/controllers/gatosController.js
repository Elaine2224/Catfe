const Gato = require("../models/Gato");

// GET /api/gatos
async function obtenerGatos(req, res, next) {
  try {
    const gatos = await Gato.find();
    res.json(gatos);
  } catch (error) {
    next(error);
  }
}

module.exports = { obtenerGatos };
