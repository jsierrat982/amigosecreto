/**
 * SaludVital - Lógica Frontend Dinámica
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initServiceFilters();
  initHealthTipGenerator();
  initAppointmentForm();
});

/* ==========================================================================
   1. Menú Responsive Interactiva con Accesibilidad
   ========================================================================== */
const initNavigation = () => {
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  if (!navToggle || !mainNav) return;

  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', !isExpanded);
    mainNav.classList.toggle('is-active');
  });
};

/* ==========================================================================
   2. Filtrado Dinámico de Especialidades
   ========================================================================== */
const initServiceFilters = () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover clase activa previa
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      // Activar botón pulsado
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filterValue = btn.getAttribute('data-filter');

      // Filtrar tarjetero
      cards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'todos' || filterValue === category) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
};

/* ==========================================================================
   3. Consumo Asíncrono de Consejos de Salud (Simulación de API)
   ========================================================================== */
const healthTips = [
  "Bebe al menos 2 litros de agua al día para mantener tus órganos hidratados.",
  "Realiza al menos 30 minutos de actividad física moderada diariamente.",
  "Duerme entre 7 y 8 horas continuas para favorecer la recuperación celular.",
  "Prioriza alimentos frescos, vegetales y frutas en tu dieta diaria.",
  "Haz pausas activas cada 45 minutos si trabajas frente a un computador."
];

const fetchRandomTip = async () => {
  // Simulación de retraso de red (Promesa)
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = Math.floor(Math.random() * healthTips.length);
      resolve(healthTips[index]);
    }, 400);
  });
};

const initHealthTipGenerator = () => {
  const tipText = document.getElementById('tipText');
  const btnNewTip = document.getElementById('btnNewTip');

  const updateTip = async () => {
    try {
      tipText.textContent = "Obteniendo recomendación...";
      const tip = await fetchRandomTip();
      tipText.textContent = `"${tip}"`;
    } catch (error) {
      tipText.textContent = "No se pudo cargar el consejo en este momento.";
      console.error("Error al obtener el consejo:", error);
    }
  };

  btnNewTip.addEventListener('click', updateTip);
  updateTip(); // Cargar uno al iniciar
};

/* ==========================================================================
   4. Manejo y Validación de Formulario de Citas
   ========================================================================== */
const initAppointmentForm = () => {
  const form = document.getElementById('appointmentForm');
  const feedback = document.getElementById('formFeedback');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const especialidad = document.getElementById('especialidad').value;

    // Validación básica Frontend
    if (!nombre || !email || !especialidad) {
      feedback.style.color = 'var(--color-accent)';
      feedback.textContent = 'Por favor, completa todos los campos requeridos.';
      return;
    }

    // Simular envío exitoso
    feedback.style.color = 'var(--color-primary-dark)';
    feedback.textContent = `¡Gracias ${nombre}! Tu solicitud para ${especialidad} ha sido registrada.`;
    
    form.reset();
  });
};
