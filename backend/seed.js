// Carga los datos iniciales en MongoDB. Se ejecuta con: npm run seed
// NO borra nada: cada colección solo se llena si está vacía,
// y los usuarios solo se crean si todavía no existen.
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Producto = require("./models/Producto");
const Gato = require("./models/Gato");
const Galeria = require("./models/Galeria");
const Admin = require("./models/Admin");
const Pedido = require("./models/Pedido");

const imagen = (codigo) => `https://images.unsplash.com/${codigo}?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;

const productos = [
  // ----- Bebidas calientes -----
  { nombre: "Latte Gatuno", descripcion: "Espresso suave con leche vaporizada y arte latte especial.", precio: 4.5, categoria: "bebidas-calientes", etiqueta: "Favorito", stock: 20, imagen: imagen("photo-1561882468-9110e03e0f78") },
  { nombre: "Cappuccino Bigotes", descripcion: "Clásico cappuccino con una capa extra de espuma.", precio: 4, categoria: "bebidas-calientes", stock: 20, imagen: imagen("photo-1572442388796-11668a67e53d") },
  { nombre: "Matcha Cat", descripcion: "Té verde matcha premium con leche de avena.", precio: 5, categoria: "bebidas-calientes", etiqueta: "Vegano", stock: 20, imagen: imagen("photo-1512036666432-2181c1f26420") },
  { nombre: "Café Americano", descripcion: "Espresso largo con agua caliente, intenso y sin azúcar.", precio: 2.5, categoria: "bebidas-calientes", stock: 20 },
  { nombre: "Chocolate Caliente", descripcion: "Chocolate cremoso con leche, ideal para días fríos.", precio: 3.5, categoria: "bebidas-calientes", stock: 20 },
  // ----- Bebidas frías -----
  // OJO: las imágenes que faltan se agregarán después (se verá un fondo alternativo)
  { nombre: "Café Frío", descripcion: "Café infusionado en frío durante 12 horas, suave y refrescante.", precio: 3.5, categoria: "bebidas-frias", stock: 20, imagen: imagen("photo-1568790309276-16462ea4161d") },
  { nombre: "Limonada de Hierbabuena", descripcion: "Limonada natural con hojas de hierbabuena fresca.", precio: 3, categoria: "bebidas-frias", stock: 20 },
  { nombre: "Frappé de Caramelo", descripcion: "Café frappé con salsa de caramelo y crema batida.", precio: 4.5, categoria: "bebidas-frias", stock: 20 },
  // ----- Postres -----
  { nombre: "Cat Cookies", descripcion: "Galletas de mantequilla con forma de pata.", precio: 3.5, categoria: "postres", stock: 20, imagen: imagen("photo-1551024601-bec78aea704b") },
  // Stock de demostración: pocas existencias (3) y agotado (0), para ver los avisos de inventario
  { nombre: "Brownie de Chocolate", descripcion: "Brownie húmedo con trozos de chocolate.", precio: 2, categoria: "postres", stock: 3 },
  { nombre: "Cheesecake de Frutos Rojos", descripcion: "Cheesecake cremoso con salsa de frutos rojos.", precio: 4, categoria: "postres", stock: 20 },
  { nombre: "Rollo de Canela", descripcion: "Rollo de canela recién horneado con glaseado de vainilla.", precio: 3, categoria: "postres", stock: 0 },
  // ----- Libros (catálogo para leer en el local: sin precio ni stock) -----
  { nombre: "El Viaje del Tiempo", descripcion: "Ciencia Ficción - Una historia sobre paradojas.", categoria: "libro", imagen: imagen("photo-1544947950-fa07a98d237f") },
  { nombre: "Susurros del Bosque", descripcion: "Fantasía - Magia antigua y criaturas míticas.", categoria: "libro", imagen: imagen("photo-1543002588-bfa74002ed7e") },
  { nombre: "Cartas a Luna", descripcion: "Romance - Una historia de amor epistolar.", categoria: "libro", imagen: imagen("photo-1531901599143-df5010ab9438") },
];

const gatos = [
  { nombre: "Mishi", edad: "2 años", descripcion: "Jugadora y curiosa. Le encanta esconderse entre los libros.", estado: "Disponible", imagen: imagen("photo-1514888286974-6c03e2ca1dba") },
  { nombre: "Tomas", edad: "4 años", descripcion: "Tranquilo y cariñoso. El perfecto compañero para leer.", estado: "Reservado", imagen: imagen("photo-1518791841217-8f162f1e1131") },
  { nombre: "Luna", edad: "1 año", descripcion: "Tímida al principio, pero muy dulce una vez que confía.", estado: "Disponible", imagen: imagen("photo-1574158622682-e40e69881006") },
];

// OJO: la galería es de ejemplo, luego la cambiamos por tus trabajos reales
const galeria = [
  { titulo: "Rincón de lectura", descripcion: "Un espacio tranquilo para leer con un café en la mano.", imagen: imagen("photo-1544947950-fa07a98d237f") },
  { titulo: "Adopciones felices", descripcion: "Gatos rescatados que encontraron una familia.", imagen: imagen("photo-1514888286974-6c03e2ca1dba") },
  { titulo: "Arte latte", descripcion: "Cada taza es una pequeña obra de arte.", imagen: imagen("photo-1561882468-9110e03e0f78") },
  { titulo: "Club de lectura", descripcion: "Encuentros mensuales para conversar sobre libros.", imagen: imagen("photo-1543002588-bfa74002ed7e") },
];

// Inserta los datos solo si la colección está vacía (así nunca se pierde lo que ya existe)
async function cargarSiEstaVacia(Modelo, datos, nombre) {
  const cantidad = await Modelo.countDocuments();
  if (cantidad > 0) {
    console.log(`↪  ${nombre}: ya hay ${cantidad} registros, no se modifica`);
    return;
  }
  await Modelo.insertMany(datos);
  console.log(`✅ ${nombre}: ${datos.length} registros cargados`);
}

// Crea un usuario (administrador o cajero) solo si no existe
async function crearUsuarioSiNoExiste(usuario, contrasena, rol) {
  if (!usuario || !contrasena) {
    console.log(`⚠️  Falta el usuario o la contraseña del ${rol} en el .env, no se creó`);
    return;
  }
  const existe = await Admin.findOne({ usuario });
  if (existe) {
    console.log(`↪  Usuario "${usuario}" (${rol}): ya existe, no se modifica`);
    return;
  }
  // La contraseña se encripta antes de guardarla
  const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);
  await Admin.create({ usuario, contrasena: contrasenaEncriptada, rol });
  console.log(`✅ Usuario "${usuario}" creado con rol ${rol}`);
}

// Pedidos creados con la versión anterior no tienen "referenciaActiva". Se les completa
// (solo a los que siguen activos) para que el índice único también los proteja. No borra nada.
async function completarReferenciasActivas() {
  try {
    await Pedido.init(); // Crea el índice único si todavía no existe
    const resultado = await Pedido.updateMany(
      { referenciaActiva: { $exists: false }, estadoRetiro: { $ne: "Cancelado" } },
      [{ $set: { referenciaActiva: "$referenciaTransferencia" } }],
      { updatePipeline: true }
    );
    if (resultado.modifiedCount > 0) {
      console.log(`✅ Pedidos anteriores actualizados con referenciaActiva: ${resultado.modifiedCount}`);
    }
  } catch (error) {
    console.log("⚠️  No se pudo completar referenciaActiva en pedidos anteriores:", error.message);
  }
}

async function cargarDatos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Conectado a MongoDB (base: ${mongoose.connection.name})`);

    await cargarSiEstaVacia(Producto, productos, "Productos");
    await cargarSiEstaVacia(Gato, gatos, "Gatos");
    await cargarSiEstaVacia(Galeria, galeria, "Galería");

    await completarReferenciasActivas();

    await crearUsuarioSiNoExiste(process.env.ADMIN_USUARIO, process.env.ADMIN_PASSWORD, "admin");
    await crearUsuarioSiNoExiste(process.env.CAJERO_USUARIO, process.env.CAJERO_PASSWORD, "cajero");
  } catch (error) {
    console.error("❌ Error al cargar los datos:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

cargarDatos();
