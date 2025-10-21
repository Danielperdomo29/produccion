const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
  nombre: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 100 },
  mensaje: { type: String, required: true, maxlength: 1000 },
  ip: { type: String },
  fecha: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Mensaje', mensajeSchema);