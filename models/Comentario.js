const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  usuario: {
    id: String,
    nombre: String,
    correo: String,
    avatar: String
  },
  contenido: {
    type: String,
    required: true,
    maxlength: 1000
  },
  aprobado: {
    type: Boolean,
    default: false
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comentario', comentarioSchema);