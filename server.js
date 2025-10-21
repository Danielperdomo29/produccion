require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const MongoStore = require("connect-mongo");

const app = express();
const PORT = process.env.PORT || 3000;

// === Helmet base ===
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://www.google.com/recaptcha/",
          "https://www.gstatic.com/recaptcha/",
          "https://www.youtube.com", // necesario para embeds
        ],
        styleSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "'unsafe-inline'", // ⚠️ elimina si puedes
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://d33wubrfki0l68.cloudfront.net",
          "https://lh3.googleusercontent.com",
          "https://img.youtube.com",
          "https://i.ytimg.com",
          "/Imagenes/favicon",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        frameSrc: [
          "'self'",
          "https://www.google.com/recaptcha/",
          "https://recaptcha.google.com/",
          "https://www.youtube.com/",
          "https://www.youtube-nocookie.com/",
          "https://www.youtube.com/embed/",
        ],
        childSrc: [
          "'self'",
          "https://www.youtube.com/",
          "https://www.youtube-nocookie.com/",
          "https://www.youtube.com/embed/",
        ],
        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://cdn.jsdelivr.net",
        ],
        manifestSrc: ["'self'"],
      },
    },
  })
);

// === Extra headers de seguridad ===
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "fullscreen=(self), geolocation=(), camera=(), microphone=(), interest-cohort=()"
  );
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  next();
});

// === Rate limit global para /api ===
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// === CORS ===
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://localhost:3000",
    credentials: true,
  })
);

// === Parsers ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === Session ===
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: "sessions",
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecreto",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// === Passport ===
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// === Conexión a Mongo ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error de conexión:", err));

// === Rutas ===
const authRoutes = require("./routes/authRoutes");
const comentariosRoutes = require("./routes/comentariosRoutes");
const contactoRoutes = require("./routes/contactoRoutes");
const contactoController = require("./controllers/contactoController");

app.use("/api/auth", authRoutes);
app.use("/api/comentarios", comentariosRoutes);
app.use("/api/contacto", contactoRoutes);

// Alias para compatibilidad con frontend estático
app.post("/enviar-correo", contactoController.enviarMensaje);

// === Estáticos ===
app.use(express.static(path.join(__dirname, "public")));

// Catch-all GET -> index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === Manejo de errores global ===
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ ok: false, error: err.message || "Server error" });
});

// === Servidor en AlwaysData ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
