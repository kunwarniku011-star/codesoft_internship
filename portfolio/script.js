document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  const links = document.querySelectorAll('.nav-link');

  // Mobile menu
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  links.forEach((l) => l.addEventListener('click', () => setMenu(false)));

  // Header shadow on scroll
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active nav link
  const sections = document.querySelectorAll('main section[id]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));

  // Reveal animations + skill bars
  const reveal = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('show');
      const fill = e.target.querySelector('.fill');
      if (fill) {
        const level = +fill.dataset.level, pct = e.target.querySelector('.pct');
        fill.style.width = level + '%';
        let n = 0;
        const t = setInterval(() => { n += 2; if (n >= level) { n = level; clearInterval(t); } pct.textContent = n + '%'; }, 20);
      }
      obs.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

  // Contact form validation
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  const rules = {
    name: (v) => (v.length < 2 ? 'Please enter your name (min 2 characters).' : ''),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.'),
    message: (v) => (v.length < 10 ? 'Message must be at least 10 characters.' : '')
  };
  const check = (field) => {
    const input = form.elements[field];
    const msg = rules[field](input.value.trim());
    document.getElementById(field + 'Error').textContent = msg;
    input.closest('.field').classList.toggle('invalid', !!msg);
    return !msg;
  };
  Object.keys(rules).forEach((f) => form.elements[f].addEventListener('input', () => check(f)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    success.textContent = '';
    const valid = Object.keys(rules).map(check).every(Boolean);
    if (!valid) return;
    // Replace with a real backend or service (e.g. Formspree) to send the message.
    success.textContent = 'Thanks! Your message has been sent.';
    form.reset();
  });

  document.getElementById('year').textContent = new Date().getFullYear();
});
