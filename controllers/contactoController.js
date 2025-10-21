const validator = require("validator");
const Mensaje = require("../models/Mensaje");
const emailService = require("../services/emailService");

exports.enviarMensaje = async (req, res) => {
  let { nombre, correo, mensaje } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!nombre || !correo || !mensaje) return res.status(400).json({ error: "Todos los campos son obligatorios." });
  if (!validator.isEmail(correo)) return res.status(400).json({ error: "Correo inválido." });

  nombre = validator.escape(nombre.trim());
  correo = validator.normalizeEmail(correo);
  mensaje = validator.escape(mensaje.trim());

  try {
    const nuevoMensaje = new Mensaje({ nombre, email: correo, mensaje, ip });
    await nuevoMensaje.save();

    // Enviar email (emailService debe implementar replyTo)
    await emailService.enviarCorreoContacto(nombre, correo, mensaje);

    return res.status(200).json({ mensaje: "✅ Mensaje enviado y guardado correctamente." });
  } catch (err) {
    console.error("❌ Error al procesar:", err);
    return res.status(500).json({ error: "No se pudo procesar tu mensaje." });
  }
};
