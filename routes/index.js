// backend/routes/index.js
const express = require('express');
const router = express.Router();
// Importar rutas
const authRoutes = require('./authRoutes');
const comentariosRoutes = require('./comentariosRoutes');
const contactoRoutes = require('./contactoRoutes');
// Usar rutas
router.use('/auth', authRoutes);
router.use('/comentarios', comentariosRoutes);
router.use('/contacto', contactoRoutes);
module.exports = router;