const express = require("express");
const router = express.Router();
const verificarToken = require("../middleware/verificarToken");
const verificarRol = require("../middleware/verificarRol");
const admin = require("../controllers/adminController");
const dashboard = require("../controllers/dashboardController");
const productos = require("../controllers/productosAdminController");

// Todo lo de este archivo exige token Y rol de administrador (el login está en /api/auth/login)
router.use(verificarToken, verificarRol("admin"));

router.get("/dashboard", dashboard.obtenerDashboard);

router.get("/productos", productos.listarProductos);
router.post("/productos", productos.crearProducto);
router.put("/productos/:id", productos.actualizarProducto);
router.delete("/productos/:id", productos.eliminarProducto);
router.get("/inventario", productos.obtenerInventario);
router.put("/productos/:id/stock", productos.actualizarStock);

router.get("/reservas", admin.obtenerReservas);
router.put("/reservas/:id", admin.cambiarEstadoReserva);

router.get("/adopciones", admin.obtenerSolicitudes);
router.put("/adopciones/:id", admin.cambiarEstadoSolicitud);

router.get("/mensajes", admin.obtenerMensajes);
router.put("/mensajes/:id", admin.cambiarEstadoMensaje);

router.put("/gatos/:id", admin.cambiarEstadoGato);

module.exports = router;
