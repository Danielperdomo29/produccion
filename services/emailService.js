const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.CORREO,
    pass: process.env.CLAVE
  }
});

exports.enviarCorreoContacto = async (nombre, correo, mensaje) => {
  return transporter.sendMail({
    from: process.env.CORREO,
    to: process.env.CORREO,
    replyTo: correo,
    subject: `Nuevo mensaje de ${nombre}`,
    text: `De: ${nombre} <${correo}>\n\n${mensaje}`
  });
};
