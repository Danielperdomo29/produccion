// backend/models/Usuario.js

const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  nombre: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  foto: String
});

module.exports = mongoose.model('Usuario', usuarioSchema);
