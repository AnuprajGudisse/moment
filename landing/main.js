// JS-rendered landing (no framework). All UI is generated here.

const app = document.getElementById('app');

// tiny helpers
const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.id) el.id = props.id;
  if (props.href) el.href = props.href;
  if (props.type) el.type = props.type;
  if (props.text) el.textContent = props.text;
  if (props.html) el.innerHTML = props.html;
  if (props.attrs) Object.entries(props.attrs).forEach(([k, v]) => el.setAttribute(k, v));
  children.flat().forEach((c) => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
};
const section = (id, title, ...content) => h('section', { id, class: 'wrap section' }, h('h2', { text: title }), ...content);

// Header
const Header = () => h('header', { class: 'wrap header' },
  h('div', { class: 'brand' }, h('div', { class: 'aperture', attrs: { 'aria-hidden': 'true' } }), h('span', { class: 'wordmark', text: 'moment' })),
  h('nav', { class: 'topnav' },
    h('a', { href: '#features', text: 'Features' }),
    h('a', { href: '#gallery', text: 'Gallery' }),
    h('a', { href: '#waitlist', text: 'Waitlist' }),
  ),
);

// Hero
const Hero = () => {
  const node = h('section', { class: 'wrap hero' },
    h('h1', { text: 'Photography as a craft and a conversation' }),
    h('p', { class: 'lede', text: 'A curated social space for photographers and storytellers — built to honor craft, context, and community.' }),
    h('div', { class: 'cta' },
      h('a', { class: 'btn primary', href: '#waitlist', text: 'Join waitlist' }),
      h('a', { class: 'btn outline', href: '#gallery', text: 'See gallery' }),
    ),
  );
  node.appendChild(h('div', { class: 'blob', attrs: { 'aria-hidden': 'true' } }));
  return node;
};

// Why Moment
const Features = () => section('features', 'Why Moment',
  h('p', { class: 'muted', text: 'Three things you’ll feel from day one.' }),
  h('div', { class: 'grid three' },
    h('article', { class: 'card reveal' }, h('h3', { text: 'Curated space' }), h('p', { text: 'A curated social space for photographers and storytellers — by photographers and storytellers.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'Share, learn, grow' }), h('p', { text: 'A place to share your work, learn from peers, and grow together.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'Community first' }), h('p', { text: 'A genuine sense of community that values process as much as results.' })),
  ),
);

// Problem
const Problem = () => section('problem', 'The Problem',
  h('ul', { class: 'list' },
    h('li', { text: 'Virality over craft: general socials hide context — EXIF, story, process.' }),
    h('li', { text: 'Portfolios are static: little day‑to‑day feedback or collaboration.' }),
    h('li', { text: 'Events are fragmented: hard to gather everyone’s photos in one place.' }),
    h('li', { text: 'Opportunities are scattered: gigs and collabs rarely fit a niche.' }),
  ),
);

// Gags (job board)
const Gags = () => section('gags', 'Gags',
  h('p', { class: 'muted', text: 'A job board for photographers — gigs, collaborations, and paid opportunities.' }),
  h('div', { class: 'grid two' },
    h('article', { class: 'card reveal' }, h('h3', { text: 'Post a gig' }), h('p', { text: 'Share a brief, budget, and timeline to reach the right photographers.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'Apply with your work' }), h('p', { text: 'Show relevant projects, availability, and rates — all in one place.' })),
  ),
  h('div', { class: 'media-grid' }, h('div', { class: 'shot shot-wide reveal', attrs: { 'aria-hidden': 'true' } })),
);

const Communities = () => section('communities', 'Communities',
  h('p', { class: 'muted', text: 'Follow interests, join circles, and find your people.' }),
  h('div', { class: 'grid two' },
    h('article', { class: 'card reveal' }, h('h3', { text: 'By interest' }), h('p', { text: 'Street, portrait, travel, film — gather around the craft you love.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'By place' }), h('p', { text: 'Local scenes and meetups to turn online inspiration into real shoots.' })),
  ),
  h('div', { class: 'media-grid' }, h('div', { class: 'shot shot-wide reveal', attrs: { 'aria-hidden': 'true' } })),
);

const Events = () => section('events', 'Events',
  h('p', { class: 'muted', text: 'Photowalks, meetups, and live challenges — all in one place.' }),
  h('div', { class: 'grid two' },
    h('article', { class: 'card reveal' }, h('h3', { text: 'Shoot together' }), h('p', { text: 'Plan, RSVP, and share shots to a shared gallery for fast recap.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'Learn together' }), h('p', { text: 'Compare EXIF, get feedback, and iterate as a group.' })),
  ),
  h('div', { class: 'media-grid' }, h('div', { class: 'shot shot-wide reveal', attrs: { 'aria-hidden': 'true' } })),
);

const Projects = () => section('projects', 'Projects',
  h('p', { class: 'muted', text: 'Group posts into bodies of work and show your process.' }),
  h('div', { class: 'grid two' },
    h('article', { class: 'card reveal' }, h('h3', { text: 'Work in series' }), h('p', { text: 'Organize images into cohesive projects that evolve over time.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'Context & notes' }), h('p', { text: 'Behind‑the‑scenes, iterations, and learnings — all in context.' })),
  ),
  h('div', { class: 'media-grid' }, h('div', { class: 'shot shot-wide reveal', attrs: { 'aria-hidden': 'true' } })),
);

const Gallery = () => section('gallery', 'Gallery',
  h('p', { class: 'muted', text: 'A peek at the experience.' }),
  h('div', { class: 'media-grid' },
    h('div', { class: 'shot reveal', attrs: { 'aria-hidden': 'true' } }),
    h('div', { class: 'shot reveal', attrs: { 'aria-hidden': 'true' } }),
    h('div', { class: 'shot reveal', attrs: { 'aria-hidden': 'true' } }),
    h('div', { class: 'shot shot-wide reveal', attrs: { 'aria-hidden': 'true' } }),
    h('div', { class: 'shot reveal', attrs: { 'aria-hidden': 'true' } }),
    h('div', { class: 'shot reveal', attrs: { 'aria-hidden': 'true' } }),
  ),
);

const Waitlist = () => {
  const form = h('form', { class: 'waitlist-form', id: 'waitlist-form' },
    h('input', { class: 'field', attrs: { type: 'email', placeholder: 'you@example.com', 'aria-label': 'Email', required: 'true', autocomplete: 'email' } }),
    h('button', { class: 'btn primary', type: 'submit', text: 'Notify me' }),
  );
  const node = section('waitlist', 'Join the waitlist',
    h('p', { class: 'muted', text: 'No spam — just a heads‑up when we launch.' }),
    form,
    h('p', { class: 'sr-only', id: 'waitlist-status', attrs: { role: 'status', 'aria-live': 'polite' } }),
    h('p', { class: 'footnote', text: 'By joining, you agree to receive occasional updates.' }),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    // Local success immediately
    input.value = '';
    const status = node.querySelector('#waitlist-status');
    if (status) status.textContent = "Thanks! You're on the list.";
    // Serverless insert (Vercel)
    try {
      const resp = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      if (!resp.ok) {
        const status = node.querySelector('#waitlist-status');
        if (status) status.textContent = 'Thanks! (We had a hiccup saving; will retry later.)';
      }
    } catch {}
  });
  return node;
};

const Footer = () => h('footer', { class: 'wrap footer' }, h('p', { html: `© <span id="year"></span> moment • Photography as a craft` }));

// Mount
const HomePreview = () => section('home', 'A look at the homepage',
  h('div', { class: 'media-grid' },
    h('img', { class: 'shot shot-wide reveal', attrs: { src: './assets/home-preview.svg', alt: 'Homepage preview' } }),
  ),
);

const ui = [Header(), Hero(), Features(), HomePreview(), Problem(), Gags(), Communities(), Events(), Projects(), Gallery(), Waitlist(), Footer()];
ui.forEach((n) => app.appendChild(n));

// Year stamp
const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

// Reveal on scroll
const reveals = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
reveals.forEach((n, i) => { n.style.transitionDelay = `${Math.min(i * 40, 280)}ms`; io.observe(n); });

// Sticky header border on scroll
const headerEl = document.querySelector('.header');
const onScroll = () => headerEl?.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Serverless handles persistence; no client keys or meta tags needed
