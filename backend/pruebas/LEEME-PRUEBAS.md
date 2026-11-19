# Cómo ejecutar las pruebas de forma segura

Las pruebas **nunca** usan tu `.env` ni tu base principal `catfe`. Trabajan en una base aparte,
`catfe_pruebas`, y si la configuración apunta a cualquier otra base, se detienen antes de conectarse.

## 1. Configurar (una sola vez)

1. En la carpeta `backend`, copia `.env.pruebas.example` como `.env.pruebas`.
2. Abre `.env.pruebas` y pon tu usuario, contraseña y cluster de Atlas en `MONGODB_URI`.
   Es el mismo enlace de tu `.env`, pero con **`/catfe_pruebas`** antes del `?`:

   ```
   MONGODB_URI=mongodb+srv://TU_USUARIO:TU_CONTRASENA@TU_CLUSTER.mongodb.net/catfe_pruebas?retryWrites=true&w=majority
   ```
3. Atlas crea la base `catfe_pruebas` sola, cuando se escribe por primera vez en ella.
   Tu usuario de base de datos debe poder escribir en ella: con el permiso habitual
   «Read and write to any database» no tienes que hacer nada más.
4. Carga los datos de ejemplo en la base de pruebas (solo la primera vez):

   ```
   npm run seed:pruebas
   ```
   Debe decir `(base: catfe_pruebas)`. Revisa que no diga `catfe` a secas.

Requiere Node 20.6 o más reciente (tú ya lo tienes, porque Vite lo exige).

## 2. Ejecutar

No necesitas encender el backend: las pruebas arrancan su propio servidor (puerto 5055).
Puedes tener tu `npm run dev` abierto al mismo tiempo, sin problema.

| Comando | Qué hace |
|---|---|
| `npm run probar` | Todas las pruebas: compra, caja, login y permisos, concurrencia, adopciones, productos, inventario y dashboard |
| `npm run probar:fallo` | Provoca un error a propósito a mitad del proceso y comprueba que todo se restaura |
| `npm run probar:corte` | Corta la limpieza a la mitad y comprueba que repetirla no devuelve el stock dos veces |
| `npm run probar:transacciones` | Comprueba que tu Atlas admite transacciones |
| `npm run probar:limpiar -- ID` | Limpia los restos de una ejecución que se cortó de golpe |

Cada ejecución termina con «0 fallidas» si todo está bien.

## 3. Qué protege tus datos

- **Base separada:** solo corre si el nombre de la base termina en `_pruebas`.
- **Servidor propio:** la prueba y el servidor comparten proceso y base, así que no hay forma
  de que escriban en la base principal por error.
- **Gato de prueba propio:** las adopciones se prueban con un gato creado por la ejecución. Ningún gato real cambia.
- **Identificador único:** todo lo que crea una ejecución lleva su identificador aleatorio
  (por ejemplo `PRUEBA a3f09c1b2e`) y la limpieza borra solo eso.
- **Limpieza idempotente:** devolver el stock y marcar el pedido como devuelto ocurren en
  una transacción. Repetir la limpieza nunca devuelve el stock dos veces.
- **Verificación final:** al terminar se compara el stock y los gatos con una foto tomada al empezar.

## 4. Si una ejecución se corta de golpe

(Corte de luz, cerrar la terminal, `kill -9`.) No queda nada «a medias» en el sistema, pero pueden
quedar datos de prueba. La siguiente vez que ejecutes `npm run probar`, te avisará con el comando exacto:

```
npm run probar:limpiar -- a3f09c1b2e
```

Es seguro repetirlo. Cada ejecución imprime su identificador al empezar.
