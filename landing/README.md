Standalone portfolio landing for Moment

What this is
- A simple static landing page (no framework), separate from the React app.

Preview locally
- Open `landing/index.html` in a browser. It loads `styles.css`.

Deploy options
- Any static host (Netlify/Vercel/GitHub Pages/S3/etc.).
- Upload the `landing/` folder or set it as the publish directory.

Animations
- Subtle reveal-on-scroll via a tiny inline script in `index.html`.
- Respects `prefers-reduced-motion` to disable animations for accessibility.

Customize
- Edit copy or add/remove sections in `landing/index.html`.
- Replace `.shot` blocks with real images/GIFs; the media grid is responsive by default.
