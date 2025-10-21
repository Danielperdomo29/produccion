// backend/routes/comentariosRoutes.js
const express = require("express");
const router = express.Router();
const comentariosController = require("../controllers/comentariosController");
const { body } = require("express-validator");
const { handleValidation } = require("../middlewares/validate");
const { sanitizeBody } = require("../middlewares/sanitize");
const { ensureAuth } = require("../middlewares/authMiddleware");

// GET libre
router.get("/", comentariosController.obtenerComentarios);

// POST con auth + validación + sanitización
router.post(
  "/",
  ensureAuth,
  [
    body("contenido")
      .trim()
      .notEmpty()
      .withMessage("Contenido requerido")
      .isLength({ max: 500 }),
    handleValidation
  ],
  sanitizeBody(["contenido"]),
  comentariosController.crearComentario
);

module.exports = router;
