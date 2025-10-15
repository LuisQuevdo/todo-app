// Importaciones requeridas
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// Configuración de la aplicación Express
const app = express();
const port = 3000;

// Middleware
// Habilitamos CORS para que el frontend pueda comunicarse sin problemas
app.use(cors()); 
// Habilita la lectura de JSON en el cuerpo de las peticiones (POST/PUT)
app.use(express.json()); 

// --- 1. CONFIGURACIÓN DE LA BASE DE DATOS (PG) ---

// Las credenciales se leen de las variables de entorno inyectadas por Docker Compose
// Usamos el nombre del servicio 'db' como HOST, ya que están en la misma red Docker.
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

/**
 * Función para asegurar que la tabla 'tasks' exista al iniciar el backend.
 * (Cumple con el Hint del Laboratorio).
 */
async function initializeDatabase() {
  try {
    // Intentamos conectar y luego liberamos el cliente
    const client = await pool.connect();

    // Consulta SQL para crear la tabla si no existe (IF NOT EXISTS)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createTableQuery);
    client.release();
    console.log('Base de datos y tabla "tasks" verificadas y listas.');
  } catch (err) {
    // Si la conexión falla (ej. la DB aún no está lista), mostramos el error
    console.error('Error al inicializar la base de datos (reintentando...):', err.stack);
    // En producción, se usaría un bucle de reintento. Aquí Docker Compose maneja la dependencia.
  }
}

// Iniciar la conexión a la DB y la creación de la tabla
initializeDatabase();

// --- 2. ENDPOINTS DE LA API (CRUD) ---

// [GET /tasks] Obtener todas las tareas
app.get('/tasks', async (req, res) => {
  try {
    // Consulta para obtener todas las tareas, ordenadas por fecha de creación
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error GET /tasks:', err.stack);
    res.status(500).send('Error al obtener tareas.');
  }
});

// [POST /tasks] Crear una nueva tarea
app.post('/tasks', async (req, res) => {
  const { title } = req.body;

  // Validación de input
  if (!title || typeof title !== 'string') {
    return res.status(400).send({ error: 'El campo "title" es requerido y debe ser una cadena de texto.' });
  }

  try {
    // Consulta parametrizada para prevenir inyección SQL ($1)
    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, completed, created_at',
      [title]
    );
    // Retorna el objeto recién creado
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error POST /tasks:', err.stack);
    res.status(500).send('Error al crear tarea.');
  }
});

// [PUT /tasks/:id] Actualizar el estado de una tarea (completed)
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  // Validación de input
  if (typeof completed !== 'boolean') {
    return res.status(400).send({ error: 'El campo "completed" es requerido y debe ser booleano.' });
  }

  try {
    const result = await pool.query(
      'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at',
      [completed, id]
    );

    // Manejo de tarea no encontrada
    if (result.rowCount === 0) {
      return res.status(404).send({ error: `Tarea con ID ${id} no encontrada.` });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error PUT /tasks/:id:', err.stack);
    res.status(500).send('Error al actualizar tarea.');
  }
});

// [DELETE /tasks/:id] Eliminar una tarea
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // Manejo de tarea no encontrada
    if (result.rowCount === 0) {
      return res.status(404).send({ error: `Tarea con ID ${id} no encontrada.` });
    }

    // 204 No Content: éxito sin cuerpo de respuesta
    res.status(204).send(); 
  } catch (err) {
    console.error('Error DELETE /tasks/:id:', err.stack);
    res.status(500).send('Error al eliminar tarea.');
  }
});

// Iniciar servidor Express
app.listen(port, () => {
  console.log(` Backend API escuchando en el puerto ${port}`);
});
