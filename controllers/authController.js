// Controlador para obtener información del usuario actual
exports.getCurrentUser = (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  res.json(req.user);
};

// Controlador para logout
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.redirect(process.env.FRONTEND_URL);
  });
};