// contact-sheet: language menu, gallery tag filters, photo viewer navigation.

const GALLERY_KEY = 'contact-sheet:gallery';

// Compare paths regardless of percent-encoding and a trailing index.html.
const normPath = (p) => {
  try { p = decodeURI(p); } catch { /* keep as is */ }
  return p.replace(/index\.html$/, '');
};

const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

// A plain left click, as opposed to one that opens a new tab or window.
const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

// ---------------------------------------------------------------- language menu
// <details> disclosure: close on outside click or Escape, keep it on screen.
const langMenus = Array.from(document.querySelectorAll('[data-lang]'));
for (const menu of langMenus) {
  menu.addEventListener('toggle', () => {
    if (!menu.open) return;
    for (const other of langMenus) if (other !== menu) other.open = false;
    menu.classList.remove('is-left');
    const list = menu.querySelector('.lang-menu');
    if (list && list.getBoundingClientRect().left < 8) menu.classList.add('is-left');
  });
}
document.addEventListener('click', (e) => {
  for (const menu of langMenus) {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const menu of langMenus) {
    if (menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
      e.preventDefault(); // don't also close the photo viewer
    }
  }
});

// ---------------------------------------------------------------- gallery
// Tag filters, mirrored in ?tag= so links and the back button keep them. The
// active tag is also added to each photo link, so the photo page can step
// through just the filtered photos. The gallery keeps the height of the
// unfiltered view, so the page doesn't jump when switching tags.
const group = document.querySelector('[data-filter-group]');
const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  const chips = group ? Array.from(group.querySelectorAll('[data-filter]')) : [];
  const items = Array.from(gallery.querySelectorAll('.item'));
  const frames = Array.from(gallery.querySelectorAll('.frame'));
  for (const f of frames) f.dataset.base = f.getAttribute('href');
  const known = new Set(chips.map((c) => c.dataset.filter));
  let current = 'all';

  // Remember which gallery the visitor came from, so the photo page's close
  // button can return here through history (keeping scroll position and filter).
  gallery.addEventListener('click', (e) => {
    if (e.target.closest('.frame')) store.set(GALLERY_KEY, normPath(location.pathname));
  });

  const show = (filter) => {
    for (const item of items) {
      const tags = (item.dataset.tags || '').split(' ');
      item.hidden = filter !== 'all' && !tags.includes(filter);
    }
  };

  const lockHeight = () => {
    gallery.style.minHeight = '';
    show('all');
    const height = gallery.getBoundingClientRect().height;
    show(current);
    gallery.style.minHeight = height + 'px';
  };

  const apply = (filter, updateUrl) => {
    current = known.has(filter) ? filter : 'all';
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === current));
    }
    show(current);
    const qs = current === 'all' ? '' : '?tag=' + encodeURIComponent(current);
    for (const f of frames) f.setAttribute('href', f.dataset.base + qs);
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (current === 'all') url.searchParams.delete('tag');
      else url.searchParams.set('tag', current);
      history.replaceState(history.state, '', url);
    }
  };

  for (const chip of chips) {
    chip.addEventListener('click', () => apply(chip.dataset.filter, true));
  }
  apply(new URLSearchParams(window.location.search).get('tag') || 'all', false);

  if (chips.length) {
    lockHeight();
    let lastWidth = gallery.clientWidth;
    new ResizeObserver(() => {
      if (gallery.clientWidth === lastWidth) return;
      lastWidth = gallery.clientWidth;
      lockHeight();
    }).observe(gallery);
  }
}

// ---------------------------------------------------------------- photo viewer
const viewer = document.querySelector('[data-viewer]');
if (viewer) {
  const section = normPath(viewer.dataset.section || '');
  const here = normPath(location.pathname);
  const prev = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');
  const closers = Array.from(document.querySelectorAll('[data-close]'));
  const counter = document.querySelector('[data-counter]');

  // 1. Filter-aware sequence: with ?tag=, step through only the photos with that tag.
  let seq = [];
  try { seq = JSON.parse(viewer.querySelector('[data-sequence]')?.textContent || '[]'); } catch { seq = []; }
  let tag = new URLSearchParams(location.search).get('tag');
  let list = seq;
  if (tag) {
    const filtered = seq.filter((p) => (p.t || []).includes(tag));
    if (filtered.some((p) => normPath(p.u) === here)) list = filtered;
    else tag = null; // this photo isn't in that filter: fall back to the whole category
  }
  const qs = tag ? '?tag=' + encodeURIComponent(tag) : '';
  const i = list.findIndex((p) => normPath(p.u) === here);
  const neighbours = [];
  if (i >= 0) {
    const n = list.length;
    const prevUrl = list[(i - 1 + n) % n].u + qs;
    const nextUrl = list[(i + 1) % n].u + qs;
    if (prev) { prev.href = prevUrl; prev.hidden = n < 2; }
    if (next) { next.href = nextUrl; next.hidden = n < 2; }
    if (counter) counter.textContent = `${i + 1} / ${n}`;
    for (const c of closers) c.href = c.getAttribute('href').split('?')[0] + qs;
    if (n > 1) neighbours.push(nextUrl, prevUrl);
  }

  // 2. Stepping replaces the history entry instead of adding one, so a single
  //    "back" (or the close button) returns to the gallery, however many photos
  //    were viewed. Modified clicks still open a new tab as usual.
  for (const step of [prev, next]) {
    step?.addEventListener('click', (e) => {
      if (!plainClick(e)) return;
      e.preventDefault();
      location.replace(step.href);
    });
  }

  // Close: when we got here from this category's gallery, go back in history so
  // the browser restores its scroll position and filter. Otherwise follow the link.
  const cameFromGallery = () => {
    if (history.length < 2 || store.get(GALLERY_KEY) !== section) return false;
    try {
      const ref = new URL(document.referrer);
      return ref.origin === location.origin && normPath(ref.pathname).startsWith(section);
    } catch { return false; }
  };
  for (const c of closers) {
    c.addEventListener('click', (e) => {
      if (!plainClick(e) || !cameFromGallery()) return;
      e.preventDefault();
      history.back();
    });
  }

  // Keyboard: arrows step, Escape closes. Swipe on touch screens.
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowLeft' && prev && !prev.hidden) prev.click();
    else if (e.key === 'ArrowRight' && next && !next.hidden) next.click();
    else if (e.key === 'Escape' && closers.length) closers[closers.length - 1].click();
  });

  const stage = document.querySelector('.stage');
  let startX = null;
  let startY = null;
  stage?.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { startX = null; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  stage?.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && prev && !prev.hidden) prev.click();
    else if (dx < 0 && next && !next.hidden) next.click();
  });

  // 3. Preload the neighbouring photos once this one is shown: fetch each page
  //    (warming the cache for the navigation itself), then download the same
  //    image candidate that page will pick from its srcset.
  const preload = (url) =>
    fetch(url, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((html) => {
        if (!html) return;
        const img = new DOMParser().parseFromString(html, 'text/html').querySelector('.shot img');
        if (!img) return;
        const pre = new Image();
        pre.decoding = 'async';
        if (img.getAttribute('sizes')) pre.sizes = img.getAttribute('sizes');
        if (img.getAttribute('srcset')) pre.srcset = img.getAttribute('srcset');
        pre.src = img.getAttribute('src');
      })
      .catch(() => { /* offline or blocked: navigation still works, just not preloaded */ });

  const startPreload = () => {
    const conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
    for (const url of new Set(neighbours)) preload(url);
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  if (document.readyState === 'complete') idle(startPreload);
  else window.addEventListener('load', () => idle(startPreload), { once: true });
}
