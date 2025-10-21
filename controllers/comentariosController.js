// controllers/comentariosController.js
// Moderación avanzada con string-similarity, normalización (leet/homoglyphs/tildes/espacios),
// detección XSS y flujo: publish / pending review / reject.
// No cambia la estructura de la DB (no campos nuevos).

const { verificarCaptcha } = require("../utils/captcha");
const Comentario = require("../models/Comentario");
const stringSimilarity = require("string-similarity");
const palabrasProhibidas = require("../config/palabrasProhibidas.json");

// Umbrales (ajustables)
const FUZZY_REJECT_THRESHOLD = 0.92; // >= -> rechazo automático
const FUZZY_REVIEW_THRESHOLD = 0.82; // >= && < REJECT -> pendiente de revisión

// Mapas
const leetMap = {
  "0": "o", "1": "i", "2": "r", "3": "e", "4": "a", "5": "s", "6": "g", "7": "t",
  "8": "b", "9": "g", "@": "a", "$": "s", "+": "t", "!": "i", "|": "i", "¡": "i"
};

const homoglyphs = {
  "á":"a","à":"a","ä":"a","â":"a","ã":"a","å":"a","ā":"a",
  "é":"e","è":"e","ë":"e","ê":"e","ē":"e",
  "í":"i","ì":"i","î":"i","ï":"i","ī":"i",
  "ó":"o","ò":"o","ô":"o","ö":"o","õ":"o","ø":"o","ō":"o",
  "ú":"u","ù":"u","û":"u","ü":"u","ū":"u",
  "ñ":"ñ","ç":"c","ß":"ss","æ":"ae","œ":"oe",
  "ḧ":"h","ő":"o","ẅ":"w"
};

const zeroWidthRegex = /[\u200B-\u200D\uFEFF]/g;
const homoglyphRegex = new RegExp(Object.keys(homoglyphs).join("|"), "g");

// Utilities
function removeZeroWidth(s){ return s.replace(zeroWidthRegex, ""); }
function replaceHomoglyphs(s){ return s.replace(homoglyphRegex, m => homoglyphs[m] || m); }
function desleet(s){ return s.split("").map(ch => leetMap[ch] || ch).join(""); }
function collapseRepeatedChars(s){ return s.replace(/(.)\1{2,}/g, "$1$1"); } // keep double allowed

// Normalización fuerte para matching
function normalizeForMatch(text) {
  if (!text) return "";
  let t = String(text).toLowerCase();
  t = removeZeroWidth(t);
  t = replaceHomoglyphs(t);
  t = t.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // quita acentos
  // quitar corchetes/paren que se usan para ocultar letras, pero conservar el contenido interno
  t = t.replace(/[\[\]\(\)\{\}]/g, "");
  // compactar espacios y luego eliminarlos para detectar "m a r i c o" o "m   a"
  t = t.replace(/\s+/g, " ").replace(/ /g, "");
  // quitar separadores típicos
  t = t.replace(/[\.\-_,\/\\:;'"`·•*~°^]/g, "");
  // desleet
  t = desleet(t);
  // quitar todo menos a-z0-9ñ
  t = t.replace(/[^a-z0-9ñ]/g, "");
  // reducir repeticiones exageradas
  t = collapseRepeatedChars(t);
  return t;
}

// Función de escape HTML (guardar la versión segura)
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Detección básica XSS
function containsXSS(text) {
  if (!text) return false;
  const xssRegex = /<script\b|<\/script>|onerror\s*=|onload\s*=|javascript:|data:text\/html|<iframe\b/i;
  return xssRegex.test(text);
}

// Detección avanzada: exact + fuzzy sliding window
function detectarOfensaAvanzada(texto, listaProhibidas, fuzzyThreshold = FUZZY_REVIEW_THRESHOLD) {
  const normal = normalizeForMatch(texto);
  if (!normal) return null;

  for (const palabra of listaProhibidas) {
    const pNorm = normalizeForMatch(palabra);
    if (!pNorm) continue;

    // exact include
    if (normal.includes(pNorm)) {
      return { match: palabra, tipo: "exact", score: 1, detected: pNorm };
    }

    // fuzzy sliding window (tamaño mínimo 3)
    const len = Math.max(3, pNorm.length);
    for (let i = 0; i + len <= normal.length; i++) {
      const window = normal.substr(i, len);
      const score = stringSimilarity.compareTwoStrings(window, pNorm);
      if (score >= fuzzyThreshold) {
        return { match: palabra, tipo: "fuzzy", score, detected: window };
      }
    }

    // comparación global como backup
    const wholeScore = stringSimilarity.compareTwoStrings(normal, pNorm);
    if (wholeScore >= fuzzyThreshold) {
      return { match: palabra, tipo: "fuzzy-whole", score: wholeScore, detected: normal };
    }
  }

  return null;
}

// --- Controlador crearComentario ---
exports.crearComentario = async (req, res) => {
  try {
    const { contenido, captcha } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: "Debes iniciar sesión para comentar", loginUrl: "/api/auth/google" });
    }

    if (!contenido || typeof contenido !== "string" || !contenido.trim()) {
      return res.status(400).json({ error: "El contenido es obligatorio" });
    }

    // Verificar captcha
    const captchaValido = await verificarCaptcha(captcha);
    if (!captchaValido) return res.status(400).json({ error: "⚠️ Verificación reCAPTCHA fallida." });

    // Detectar XSS -> rechazar
    if (containsXSS(contenido)) {
      return res.status(400).json({ error: "🚫 Contenido no permitido (posible XSS)." });
    }

    // Detectar ofensas
    const deteccion = detectarOfensaAvanzada(contenido, palabrasProhibidas);

    if (deteccion) {
      // exact match => rechazo
      if (deteccion.tipo === "exact") {
        console.warn("Comentario rechazado (exact):", { user: req.user.id, match: deteccion.match });
        return res.status(400).json({ error: "🚫 Tu comentario contiene lenguaje no permitido." });
      }

      // fuzzy alto => rechazo
      if (deteccion.score >= FUZZY_REJECT_THRESHOLD) {
        console.warn("Comentario rechazado (fuzzy high):", { user: req.user.id, match: deteccion.match, score: deteccion.score });
        return res.status(400).json({ error: "🚫 Tu comentario contiene lenguaje no permitido (variación detectada)." });
      }

      // fuzzy medio => pendiente de revisión (aprobado: false)
      if (deteccion.score >= FUZZY_REVIEW_THRESHOLD) {
        const sanitized = escapeHtml(contenido.trim()).slice(0, 1000);
        const nuevoComentario = new Comentario({
          usuario: {
            id: req.user.id,
            nombre: req.user.nombre,
            correo: req.user.correo,
            avatar: req.user.avatar
          },
          contenido: sanitized,
          aprobado: false,
          fecha: new Date()
        });

        await nuevoComentario.save();

        console.info("Comentario guardado pendiente de revisión:", { user: req.user.id, match: deteccion.match, score: deteccion.score });
        return res.status(202).json({
          mensaje: "✅ Tu comentario fue recibido y está pendiente de revisión por el equipo.",
          review: true
        });
      }
    }

    // Si no detectó nada -> publicar
    const sanitized = escapeHtml(contenido.trim()).slice(0, 1000);
    const nuevoComentario = new Comentario({
      usuario: {
        id: req.user.id,
        nombre: req.user.nombre,
        correo: req.user.correo,
        avatar: req.user.avatar
      },
      contenido: sanitized,
      aprobado: true,
      fecha: new Date()
    });

    await nuevoComentario.save();

    return res.status(200).json({ mensaje: "✅ Comentario publicado con éxito" });

  } catch (error) {
    console.error("Error al guardar comentario:", error);
    return res.status(500).json({ error: "Error al guardar comentario" });
  }
};

// --- obtenerComentarios ---
exports.obtenerComentarios = async (req, res) => {
  try {
    const comentarios = await Comentario.find({ aprobado: true })
      .sort({ fecha: -1 })
      .limit(50)
      .lean();

    return res.json(comentarios);
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    return res.status(500).json({ error: "Error al obtener comentarios" });
  }
};
