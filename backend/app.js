import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import stationRouters from './src/routes/stationRouters.js';
import sensorRoutes from './src/routes/sensorRoutes.js';
import readingRoutes from './src/routes/readingRoutes.js';

dotenv.config();
const app = express();

// Configurar CORS para permitir peticiones desde el frontend
app.use(cors({
    origin: 'http://localhost:3001', // Puerto donde corre React
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Rutas API
app.use('/api', stationRouters);
app.use('/api', sensorRoutes);
app.use('/api', readingRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bienvenido a la API de Gestión de Estaciones IoT',
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT} 🐾`));