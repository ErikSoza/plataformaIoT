import express from 'express';
import dotenv from 'dotenv';
import stationRouters from './routes/stationRouters.js';

dotenv.config();
const app = express();
app.use(express.json());

// Rutas API
app.use('/api', stationRouters);

// Ruta base
app.get('/', (req, res) => {
    res.send('Bienvenido a la API de Gestión de Estaciones IoT');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));