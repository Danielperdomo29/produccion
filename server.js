// server.js (FORTIFIED) — reemplaza el existente en tu repo
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
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const { body } = require("express-validator");
const xss = require("xss");

// middlewares locales
const { handleValidation } = require("./middlewares/validate");
const { sanitizeBody } = require("./middlewares/sanitize");
const { ensureAuth } = require("./middlewares/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://danielper29.alwaysdata.net";
const isProd = process.env.NODE_ENV === "production";

// --- validate critical environment variables ---
const required = ["MONGO_URI", "SESSION_SECRET", "FRONTEND_URL"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error("❌ Variables de entorno faltantes:", missing);
  process.exit(1);
}

// === alwaysdata: trust proxy ===
app.set("trust proxy", 1);

// === rate-limit (defensa en capas) ===
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos de autenticación. Espere 15 min." },
  standardHeaders: true,
  legacyHeaders: false
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Límite de solicitudes excedido" },
  standardHeaders: true,
  legacyHeaders: false
});

// === helmet + CSP (estricto) ===
app.use(helmet({
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
        "https://apis.google.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://www.google.com/recaptcha/", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      connectSrc: ["'self'", FRONTEND_URL, "https://accounts.google.com", "https://www.googleapis.com", "wss:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
}));

// === additional security headers ===
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), interest-cohort=()");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Only send HSTS in production (because AlwaysData terminates TLS)
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

// === other middlewares ===
app.use(hpp());
app.use(cookieParser());
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use(cors({
  origin: Array.isArray(process.env.FRONTEND_URL) ? process.env.FRONTEND_URL : FRONTEND_URL,
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"]
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// === session in MongoStore ===
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: "sessions",
  ttl: 14 * 24 * 60 * 60
});

app.use(session({
  name: "session_id", // hide default name
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: isProd,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// === passport ===
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// === mongoose connect ===
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => {
    console.error("❌ Error de conexión MongoDB:", err);
    process.exit(1);
  });

// === XSS sanitize middleware (global) ===
const xssSanitize = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const k of Object.keys(req.body)) {
      if (typeof req.body[k] === "string") {
        req.body[k] = xss(req.body[k], { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ["script"] });
      }
    }
  }
  next();
};
app.use(xssSanitize);

// === routes (existing in repo) ===
const authRoutes = require("./routes/authRoutes");
const comentariosRoutes = require("./routes/comentariosRoutes");
const contactoRoutes = require("./routes/contactoRoutes");
const contactoController = require("./controllers/contactoController");

app.use("/api/auth", authRoutes);
app.use("/api/comentarios", comentariosRoutes);
app.use("/api/contacto", contactoRoutes);

// === contacto route with express-validator + sanitization ===
app.post("/enviar-correo",
  [
    body("nombre").trim().isLength({ min: 1, max: 100 }).withMessage("Nombre requerido (<=100)"),
    body("correo").trim().isEmail().withMessage("Email inválido").normalizeEmail(),
    body("mensaje").trim().isLength({ min: 1, max: 1000 }).withMessage("Mensaje requerido (<=1000)"),
    sanitizeBody(["nombre", "correo", "mensaje"])
  ],
  handleValidation,
  contactoController.enviarMensaje
);

// === protected example route ===
app.get("/api/perfil", ensureAuth, (req, res) => {
  res.json({ user: req.user, message: "Acceso autorizado a perfil" });
});

// === static files ===
app.use(express.static(path.join(__dirname, "public"), { maxAge: '1d' }));

// === health check ===
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// === catch all ===
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === global error handler ===
app.use((err, req, res, next) => {
  console.error("🚨 Error:", {
    message: err.message,
    url: req.originalUrl,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  res.status(err.status || 500).json({ ok: false, error: isProd ? "Error interno del servidor" : err.message });
});

// === process events ===
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));
process.on("unhandledRejection", (reason, p) => console.error("Unhandled Rejection:", reason));

// === start server ===
app.listen(PORT, () => {
  console.log(`Servidor fortificado en puerto ${PORT} - ${FRONTEND_URL}`);
});
