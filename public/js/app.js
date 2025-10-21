const API_URL = "https://danielper29.alwaysdata.net";


// Inicializa animaciones AOS
AOS.init();
document.addEventListener('DOMContentLoaded', async function() {
  // Elementos del DOM
  const btnLogin = document.getElementById('btn-login-google');
  const btnLogout = document.getElementById('btn-logout');
  const btnEnviarComentario = document.getElementById('btn-enviar-comentario');
  const comentariosContainer = document.getElementById('comentarios-container');
  const usuarioInfo = document.getElementById('usuario-info');
  const usuarioAvatar = document.getElementById('usuario-avatar');
  const usuarioNombre = document.getElementById('usuario-nombre');
  const comentarioTexto = document.getElementById('comentario-texto');

    // Definir la URL base del backend
  console.log("Frontend cargado con AOS y servidor listo.");
  window.addEventListener("load", () => {
  document.body.style.overflowY = "hidden";
  });
  
  // ====== MATRIX BACKGROUND ======
  const canvas = document.getElementById("matrix-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const letters = "01";
    const fontSize = 16;
    let columns = Math.floor(window.innerWidth / fontSize);
    let drops = Array(columns).fill(1);

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array(columns).fill(1);
    }

    function drawMatrix() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0F0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    }

    resizeCanvas();
    setInterval(drawMatrix, 33);
    window.addEventListener("resize", resizeCanvas);
  }


  // ====== FORMULARIO DE CONTACTO ======
  const form = document.getElementById("contactForm");
  const alertBox = document.getElementById("formAlert");

  if (form && alertBox) {
    const submitBtn = form.querySelector("button");

    function mostrarAlerta(mensaje, tipo = "success") {
      alertBox.innerHTML = ""; // Limpiar alertas anteriores

      const div = document.createElement("div");
      div.className = `alert alert-${tipo}`;
      div.textContent = mensaje;

      alertBox.appendChild(div);

      setTimeout(() => div.remove(), 5000); // Ocultar tras 5s
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = form.nombre.value.trim();
      const correo = form.correo.value.trim();
      const mensaje = form.mensaje.value.trim();

      if (!nombre || !correo || !mensaje) {
        return mostrarAlerta("Todos los campos son obligatorios.", "danger");
      }

      submitBtn.disabled = true;

      try {
        // ====== FORMULARIO DE CONTACTO ======
        const res = await fetch(`${API_URL}/enviar-correo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, correo, mensaje })
        });

        const data = await res.json();

        if (res.ok) {
          mostrarAlerta(data.mensaje, "success");
          form.reset();
        } else {
          mostrarAlerta(data.error || "Error al enviar el mensaje.", "danger");
        }

      } catch (error) {
        console.error("Error de red:", error);
        mostrarAlerta("No se pudo conectar al servidor.", "danger");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Verificar estado de autenticación
  async function verificarAutenticacion() {
    try {
      // ====== VERIFICAR AUTENTICACIÓN ======
      const response = await fetch(`${API_URL}/api/auth/current`);
      if (!response.ok) throw new Error('No autenticado');
      
      const usuario = await response.json();
      
      // Mostrar información del usuario
      usuarioAvatar.src = usuario.avatar || 'https://i.imgur.com/8Km9tLL.jpg';
      usuarioNombre.textContent = usuario.nombre;
      // Mostrar usuario conectado
      usuarioInfo.classList.remove('d-none');
      btnLogin.classList.add('d-none');
      btnLogout.classList.remove('d-none');
      
      return usuario;
    } catch (error) {
      // Ocultar elementos de usuario autenticado
      // Ocultar usuario (no conectado)
      usuarioInfo.classList.add('d-none');
      btnLogin.classList.remove('d-none');
      btnLogout.classList.add('d-none');
      return null;
    }
  }

  // Cargar comentarios
async function cargarComentarios() {
  try {
    const response = await fetch(`${API_URL}/api/comentarios`);
    const comentarios = await response.json();

    comentariosContainer.innerHTML = ""; // limpiar primero

    comentarios.forEach(comentario => {
      const card = document.createElement("div");
      card.className = "card mb-3";

      const cardBody = document.createElement("div");
      cardBody.className = "card-body";

      const header = document.createElement("div");
      header.className = "d-flex align-items-center mb-2";

      

      const img = document.createElement("img");
      img.src = comentario.usuario.avatar || "https://i.imgur.com/8Km9tLL.jpg";
      img.alt = comentario.usuario.nombre;
      img.className = "rounded-circle me-2";
      img.width = 40;

      const info = document.createElement("div");
      const nombre = document.createElement("h6");
      nombre.className = "mb-0";
      nombre.textContent = comentario.usuario.nombre; 

      const fecha = document.createElement("small");
      fecha.className = "text-muted";
      fecha.textContent = new Date(comentario.fecha).toLocaleString();

      info.appendChild(nombre);
      info.appendChild(fecha);

      header.appendChild(img);
      header.appendChild(info);

      const texto = document.createElement("p");
      texto.className = "card-text";
      texto.textContent = comentario.contenido; 

      cardBody.appendChild(header);
      cardBody.appendChild(texto);
      card.appendChild(cardBody);
      comentariosContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error al cargar comentarios:", error);
    const alerta = document.createElement("div");
    alerta.className = "alert alert-warning";
    alerta.textContent = "Error al cargar los comentarios. Por favor recarga la página.";

    comentariosContainer.appendChild(alerta);
  }
}


  // Manejar envío de comentarios
// ====== MANEJAR ENVÍO DE COMENTARIOS ======
async function enviarComentario() {
  const contenido = comentarioTexto.value.trim();

  if (!contenido) {
    alert("⚠️ Por favor escribe un comentario");
    return;
  }

  // Obtener el token del captcha
  const captchaToken = grecaptcha.getResponse();
  if (!captchaToken) {
    alert("⚠️ Por favor confirma que no eres un robot");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido, captcha: captchaToken })
    });

    const resultado = await response.json();

    if (response.status === 401) {
      if (confirm("Debes iniciar sesión para comentar. ¿Deseas iniciar sesión ahora?")) {
        window.location.href = "/api/auth/google";
      }
      return;
    }

    if (!response.ok) {
      throw new Error(resultado.error || "Error al enviar comentario");
    }

    alert(resultado.mensaje);
    comentarioTexto.value = "";
    await cargarComentarios();
  } catch (error) {
    console.error("❌ Error:", error);
    alert(error.message || "Ocurrió un error al enviar el comentario");
  }
  grecaptcha.reset(); 
}


  // Event Listeners
  btnLogin.addEventListener('click', () => {
    window.location.href = '/api/auth/google';
  });

  btnLogout.addEventListener('click', async () => {
    // ====== CERRAR SESIÓN ======
    try {
      await fetch(`${API_URL}/api/auth/logout`);
      window.location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });

  btnEnviarComentario.addEventListener('click', enviarComentario);

  // Permitir enviar comentario con Enter
  comentarioTexto.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarComentario();
    }
  });

  // Inicializar
  verificarAutenticacion();
  cargarComentarios();

  // Inicializar animaciones AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true
    });
  }

  // ====== HERO SLIDER ======
const slider = document.querySelector(".hero-slider");
const titleEl = document.getElementById("hero-title");
const subtitleEl = document.getElementById("hero-subtitle");
const prevBtn = document.querySelector(".hero-control.prev");
const nextBtn = document.querySelector(".hero-control.next");
const indicatorsContainer = document.querySelector(".hero-indicators");
let typingInterval = null; 
let slides = [];
let current = 0;
let interval;

async function initHero() {
  try {
    const res = await fetch("data/imagenes.json");
    const data = await res.json();
    slides = data.slides || [];

    if (!slides.length) {
      console.warn("No hay slides en imagenes.json");
      return;
    }

    // Crear slides e indicadores
    slides.forEach((slide, i) => {
      const div = document.createElement("div");
      div.className = "hero-slide";
      div.style.backgroundImage = `url(${slide.image})`;
      if (i === 0) div.classList.add("active");
      slider.appendChild(div);

      const dot = document.createElement("button");
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", () => {
        current = i;
        showSlide(current);
        resetAutoplay();
      });
      indicatorsContainer.appendChild(dot);
    });

    
    showSlide(0);
    startAutoplay();
  } catch (err) {
    console.error("Error cargando data/imagenes.json", err);
  }
}


function showSlide(index) {
  const slidesEl = document.querySelectorAll(".hero-slide");
  const dots = indicatorsContainer.querySelectorAll("button");

  slidesEl.forEach((s, i) => s.classList.toggle("active", i === index));
  dots.forEach((d, i) => d.classList.toggle("active", i === index));

  const { title, subtitle } = slides[index];

  // detener cualquier escritura anterior
  if (typingInterval) clearInterval(typingInterval);

  // reset textos
  titleEl.textContent = "";
  subtitleEl.textContent = "";
  subtitleEl.classList.remove("show");

  // escribir título
  typeWriter(title, () => {
    subtitleEl.textContent = subtitle;
    setTimeout(() => subtitleEl.classList.add("show"), 300);
  });
}

function typeWriter(text, cb) {
  let i = 0;
  titleEl.textContent = "";

  typingInterval = setInterval(() => {
    if (i < text.length) {
      titleEl.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(typingInterval);
      typingInterval = null;
      if (cb) cb();
    }
  }, 70);
}

function changeSlide(step) {
  current = (current + step + slides.length) % slides.length;
  showSlide(current);
  resetAutoplay();
}

function startAutoplay() {
  interval = setInterval(() => changeSlide(1), 6000);
}
function stopAutoplay() { clearInterval(interval); }
function resetAutoplay() { stopAutoplay(); startAutoplay(); }

prevBtn.addEventListener("click", () => changeSlide(-1));
nextBtn.addEventListener("click", () => changeSlide(1));

slider.addEventListener("mouseenter", stopAutoplay);
slider.addEventListener("mouseleave", startAutoplay);
slider.addEventListener("touchstart", stopAutoplay,{ passive: true });
slider.addEventListener("touchend", startAutoplay,{ passive: true });

// Inicializar hero
initHero();


function animateHeroContent() {
  const elements = document.querySelectorAll(
    "#nombre-completo, #descripcion-profesion, .hero-dinamico, .btn-animado"
  );
  elements.forEach((el, i) => {
    setTimeout(() => el.classList.add("show"), i * 300); // animación en cascada
  });
}

// Ocultar el contenido hasta que cargue
document.body.classList.add("loading");

window.addEventListener("load", () => {
  const loader = document.getElementById("loader");

  // Fade out loader
  loader.classList.add("fade-out");

  // Después de la animación, mostrar el contenido
  setTimeout(() => {
    document.body.classList.remove("loading");
    document.body.classList.add("loaded");

    // Aquí disparas tus animaciones personalizadas
    animateHeroContent(); 
  }, 800); // mismo tiempo que el transition en CSS
});

});




