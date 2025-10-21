// backend/middlewares/sanitize.js
exports.sanitizeBody = (fields) => {
  return (req, res, next) => {
    try {
      fields.forEach((field) => {
        if (req.body[field]) {
          // eliminamos caracteres peligrosos como <, >, $, { }
          req.body[field] = req.body[field]
            .replace(/[<>$]/g, "")
            .trim();
        }
      });
      next();
    } catch (err) {
      console.error("Error en sanitizeBody:", err);
      res.status(400).json({ error: "Error procesando la entrada" });
    }
  };
};
