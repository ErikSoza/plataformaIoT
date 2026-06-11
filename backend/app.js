import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import stationRouters from './src/routes/stationRouters.js';
import readingRoutes from './src/routes/readingRoutes.js';
import deviceRoutes from './src/routes/deviceRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import prediccionRoutes from './src/routes/prediccionRoutes.js';
import zonaRoutes from './src/routes/zonaRoutes.js';
import alertaRoutes from './src/routes/alertaRoutes.js';

dotenv.config();
const app = express();

// Configurar CORS para permitir peticiones desde el frontend y a través de Nginx
app.use(cors({
    // Permite que el proxy pase las peticiones, o en local
    origin: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));

app.use(express.json());

// Rutas API
app.get('/api', (req, res) => {
    res.json({
        message: 'Bienvenido a la API de Gestión de Estaciones IoT (Ruta API)',
        status: 'online',
        timestamp: new Date().toISOString()
    });
});
app.use('/api', stationRouters);
app.use('/api', readingRoutes);
app.use('/api', deviceRoutes);
app.use('/api/auth', userRoutes);
app.use('/api', prediccionRoutes);
app.use('/api', zonaRoutes);
app.use('/api', alertaRoutes);

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