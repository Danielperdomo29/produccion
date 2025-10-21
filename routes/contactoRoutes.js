// backend/routes/contactoRoutes.js
const express = require("express");
const router = express.Router();
const { enviarMensaje } = require("../controllers/contactoController");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const { handleValidation } = require("../middlewares/validate");
const { sanitizeBody } = require("../middlewares/sanitize");

const contactoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 3,
  message: { error: "Has enviado demasiados mensajes. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/enviar",
  contactoLimiter,
  [
    body("nombre").trim().notEmpty().withMessage("Nombre requerido").isLength({ max: 100 }),
    body("correo").trim().isEmail().withMessage("Correo inválido").isLength({ max: 100 }).normalizeEmail(),
    body("mensaje").trim().notEmpty().withMessage("Mensaje requerido").isLength({ max: 1000 }),
    handleValidation,
  ],
  sanitizeBody(["nombre", "correo", "mensaje"]),
  enviarMensaje
);

module.exports = router;
