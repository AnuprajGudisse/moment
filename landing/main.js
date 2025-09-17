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

// Header with mobile navigation
const Header = () => {
  const nav = h('nav', { class: 'topnav' },
    h('a', { href: '#features', text: 'Features' }),
    h('a', { href: '#gallery', text: 'Gallery' }),
    h('a', { href: '#future', text: 'Roadmap' }),
    h('a', { href: '#waitlist', text: 'Waitlist' }),
  );
  
  const mobileMenuBtn = h('button', { 
    class: 'mobile-menu-btn', 
    attrs: { 'aria-label': 'Toggle navigation', 'aria-expanded': 'false' }
  }, '☰');
  
  const header = h('header', { class: 'wrap header' },
    h('div', { class: 'brand' }, 
      h('div', { class: 'aperture', attrs: { 'aria-hidden': 'true' } }), 
      h('span', { class: 'wordmark', text: 'moment' })
    ),
    nav,
    mobileMenuBtn
  );
  
  // Mobile menu functionality
  mobileMenuBtn.addEventListener('click', () => {
    const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
    mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
    nav.classList.toggle('mobile-open');
    document.body.classList.toggle('mobile-menu-open');
  });
  
  // Close mobile menu when clicking nav links
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      nav.classList.remove('mobile-open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-menu-open');
    }
  });
  
  // Close mobile menu on window resize if it gets too large
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 640 && nav.classList.contains('mobile-open')) {
      nav.classList.remove('mobile-open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-menu-open');
    }
  });
  
  return header;
};

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
  h('div', { class: 'media-grid' }, 
    h('img', { class: 'shot shot-wide reveal', attrs: { src: './assets/img/gags.jpg', alt: 'Gags job board showing photography opportunities' } }),
  ),
);

const Communities = () => section('communities', 'Communities',
  h('p', { class: 'muted', text: 'Follow interests, join circles, and find your people.' }),
  h('div', { class: 'grid two' },
    h('article', { class: 'card reveal' }, h('h3', { text: 'By interest' }), h('p', { text: 'Street, portrait, travel, film — gather around the craft you love.' })),
    h('article', { class: 'card reveal' }, h('h3', { text: 'By place' }), h('p', { text: 'Local scenes and meetups to turn online inspiration into real shoots.' })),
  ),
  h('div', { class: 'media-grid' }, 
    h('img', { class: 'shot shot-wide reveal', attrs: { src: './assets/img/communities.jpg', alt: 'Communities overview page' } }),
  ),
);

// Future Features - Coming Soon
const FutureFeatures = () => section('future', 'Coming Soon',
  h('p', { class: 'muted', text: 'Features we\'re planning for future releases.' }),
  h('div', { class: 'grid two' },
    h('article', { class: 'card reveal future-card' }, 
      h('div', { class: 'future-badge' }, h('span', { text: 'Coming Soon' })),
      h('h3', { text: 'Events' }), 
      h('p', { text: 'Photowalks, meetups, and live challenges with shared galleries and group feedback.' })
    ),
    h('article', { class: 'card reveal future-card' }, 
      h('div', { class: 'future-badge' }, h('span', { text: 'Coming Soon' })),
      h('h3', { text: 'Projects' }), 
      h('p', { text: 'Organize images into cohesive series with context, notes, and process documentation.' })
    ),
  ),
);

const Gallery = () => {
  const images = [
    { src: './assets/img/login.jpg', alt: 'Login page with clean authentication interface' },
    { src: './assets/img/gig-post.jpg', alt: 'Creating a new gig post' },
    { src: './assets/img/job application.jpg', alt: 'Job application interface for photographers' },
    { src: './assets/img/individual community page.jpg', alt: 'Individual community page showing member posts' },
    { src: './assets/img/discover.jpg', alt: 'Discover page for finding new photographers' },
    { src: './assets/img/post.jpg', alt: 'Individual post view with EXIF data and comments' },
    { src: './assets/img/profile.jpg', alt: 'Photographer profile page' },
    { src: './assets/img/job-poster.jpg', alt: 'Job posting interface' },
  ];

  const galleryContainer = h('div', { class: 'gallery-container reveal' });
  const mainImage = h('img', { class: 'gallery-main', attrs: { src: images[0].src, alt: images[0].alt } });
  const prevBtn = h('button', { class: 'gallery-nav prev', attrs: { 'aria-label': 'Previous image' } }, '‹');
  const nextBtn = h('button', { class: 'gallery-nav next', attrs: { 'aria-label': 'Next image' } }, '›');
  const counter = h('div', { class: 'gallery-counter', text: '1 / ' + images.length });
  
  // Modal elements
  const modal = h('div', { class: 'gallery-modal', attrs: { 'aria-hidden': 'true' } });
  const modalContent = h('div', { class: 'gallery-modal-content' });
  const modalImage = h('img', { class: 'gallery-modal-image' });
  const modalPrevBtn = h('button', { class: 'gallery-modal-nav prev', attrs: { 'aria-label': 'Previous image' } }, '‹');
  const modalNextBtn = h('button', { class: 'gallery-modal-nav next', attrs: { 'aria-label': 'Next image' } }, '›');
  const modalCloseBtn = h('button', { class: 'gallery-modal-close', attrs: { 'aria-label': 'Close gallery' } }, '×');
  const modalCounter = h('div', { class: 'gallery-modal-counter' });
  
  modalContent.appendChild(modalCloseBtn);
  modalContent.appendChild(modalPrevBtn);
  modalContent.appendChild(modalImage);
  modalContent.appendChild(modalNextBtn);
  modalContent.appendChild(modalCounter);
  modal.appendChild(modalContent);
  
  const thumbnails = h('div', { class: 'gallery-thumbnails' });
  images.forEach((img, index) => {
    const thumb = h('img', { 
      class: `gallery-thumb ${index === 0 ? 'active' : ''}`, 
      attrs: { src: img.src, alt: img.alt, tabindex: '0' }
    });
    thumbnails.appendChild(thumb);
  });

  let currentIndex = 0;

  const updateGallery = (index) => {
    currentIndex = index;
    mainImage.src = images[index].src;
    mainImage.alt = images[index].alt;
    counter.textContent = `${index + 1} / ${images.length}`;
    
    thumbnails.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  };

  const updateModal = (index) => {
    currentIndex = index;
    modalImage.src = images[index].src;
    modalImage.alt = images[index].alt;
    modalCounter.textContent = `${index + 1} / ${images.length}`;
  };

  const openModal = (index) => {
    updateModal(index);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const navigateModal = (direction) => {
    const newIndex = direction === 'next' 
      ? (currentIndex < images.length - 1 ? currentIndex + 1 : 0)
      : (currentIndex > 0 ? currentIndex - 1 : images.length - 1);
    updateModal(newIndex);
    updateGallery(newIndex); // Sync with main gallery
  };

  // Gallery navigation
  prevBtn.addEventListener('click', () => {
    updateGallery(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  });

  nextBtn.addEventListener('click', () => {
    updateGallery(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  });

  // Main image click to open modal
  mainImage.addEventListener('click', () => openModal(currentIndex));
  mainImage.style.cursor = 'pointer';

  // Modal navigation
  modalPrevBtn.addEventListener('click', () => navigateModal('prev'));
  modalNextBtn.addEventListener('click', () => navigateModal('next'));
  modalCloseBtn.addEventListener('click', closeModal);

  // Close modal on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Keyboard navigation for modal
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    
    switch(e.key) {
      case 'Escape':
        closeModal();
        break;
      case 'ArrowLeft':
        navigateModal('prev');
        break;
      case 'ArrowRight':
        navigateModal('next');
        break;
    }
  });

  thumbnails.addEventListener('click', (e) => {
    if (e.target.classList.contains('gallery-thumb')) {
      const index = Array.from(thumbnails.children).indexOf(e.target);
      updateGallery(index);
    }
  });

  // Thumbnail keyboard navigation
  thumbnails.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('gallery-thumb')) {
      const index = Array.from(thumbnails.children).indexOf(e.target);
      updateGallery(index);
    }
  });

  galleryContainer.appendChild(h('div', { class: 'gallery-main-container' }, prevBtn, mainImage, nextBtn));
  galleryContainer.appendChild(counter);
  galleryContainer.appendChild(thumbnails);
  galleryContainer.appendChild(modal);

  return section('gallery', 'Gallery',
    h('p', { class: 'muted', text: 'Navigate through the app experience. Click on the main image for full-screen view.' }),
    galleryContainer,
  );
};

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
    h('img', { class: 'shot shot-wide reveal', attrs: { src: './assets/img/homepage.jpg', alt: 'Moment homepage showing curated photography feed' } }),
  ),
);

const ui = [Header(), Hero(), Features(), HomePreview(), Problem(), Gags(), Communities(), Gallery(), FutureFeatures(), Waitlist(), Footer()];
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
