// contact-sheet: dropdown menus, folded navigation, gallery subcategory switching, photo viewer navigation.

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

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- photo fade-in
// Home tiles, gallery and About photos that haven't loaded yet fade in from their
// tint once they arrive (img.is-loading in main.css). Already-loaded images and
// visitors without JavaScript see them straight away.
for (const img of document.querySelectorAll('.tile-img, .frame img, .about-photo img')) {
  if (img.complete) continue;
  img.classList.add('is-loading');
  const done = () => img.classList.remove('is-loading');
  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', done, { once: true });
}

// ---------------------------------------------------------------- dropdown menus
// Category and language menus are <details> disclosures: one open at a time,
// closed by an outside click or Escape, and flipped to stay on screen. With a
// mouse they also open on hover, and a click then keeps them open instead of
// toggling them shut. In a category menu the name is a link to the category.
// Inside the folded navigation (see below) all menus stay open as rows of a
// table, so none of this applies there.
const menus = Array.from(document.querySelectorAll('[data-menu]'));
const inFold = (menu) => !!menu.closest('.is-folded');
// An open menu is a full-width band under the header (see .menu-list in main.css).
// Line its row of items up under the menu's name: category items start at the
// name's left edge, language items end at its right edge; never past either side.
const placeMenu = (menu) => {
  const list = menu.querySelector('.menu-list');
  const header = menu.closest('.site-header');
  const items = list ? list.querySelectorAll('li') : [];
  if (!header || !items.length) return;
  list.style.setProperty('--x', '0px');
  const h = header.getBoundingClientRect();
  const s = menu.querySelector('summary').getBoundingClientRect();
  const row = items[items.length - 1].getBoundingClientRect().right - items[0].getBoundingClientRect().left;
  const x = menu.classList.contains('lang') ? s.right - h.left - row : s.left - h.left;
  list.style.setProperty('--x', Math.max(0, Math.min(x, h.width - row)) + 'px');
};
for (const menu of menus) {
  menu.addEventListener('toggle', () => {
    if (!menu.open || inFold(menu)) return;
    for (const other of menus) if (other !== menu && !inFold(other)) other.open = false;
    placeMenu(menu);
  });
}
window.addEventListener('resize', () => { for (const menu of menus) if (menu.open) placeMenu(menu); });
document.addEventListener('click', (e) => {
  for (const menu of menus) {
    if (menu.open && !inFold(menu) && !menu.contains(e.target)) menu.open = false;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const menu of menus) {
    if (menu.open && !inFold(menu)) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
      e.preventDefault(); // don't also close the photo viewer
    }
  }
});
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  for (const menu of menus) {
    let timer;
    menu.addEventListener('mouseenter', () => { if (!inFold(menu)) { clearTimeout(timer); menu.open = true; } });
    menu.addEventListener('mouseleave', () => { if (!inFold(menu)) timer = setTimeout(() => { menu.open = false; }, 200); });
    menu.querySelector('summary')?.addEventListener('click', (e) => {
      if (e.detail === 0 || e.target.closest('a')) return; // keyboard toggles; the name is a link
      if (menu.open) e.preventDefault();
    });
  }
}

// ---------------------------------------------------------------- back links
// A note's back and close links return to the page the reader came from on this
// site (keeping its scroll position); opened from elsewhere, they follow their
// href. Escape closes the note, as on a photo page.
const backLinks = Array.from(document.querySelectorAll('[data-back]'));
for (const link of backLinks) {
  link.addEventListener('click', (e) => {
    if (!plainClick(e) || history.length < 2) return;
    try { if (new URL(document.referrer).origin !== location.origin) return; } catch { return; }
    e.preventDefault();
    history.back();
  });
}
if (backLinks.length) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      backLinks[backLinks.length - 1].click();
    }
  });
}

// ---------------------------------------------------------------- folded navigation
// When the header is crowded, the menu button opens the navigation as a panel
// under the header (see .is-folded in main.css), with every menu open as a row:
// the name on the left, its items to the right. It closes on a link, an outside
// click or Escape.
const navToggle = document.querySelector('[data-nav-toggle]');
if (navToggle) {
  const header = navToggle.closest('.site-header');
  const isOpen = () => header.classList.contains('is-open');
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    for (const menu of menus) if (header.contains(menu)) menu.open = open;
  };
  navToggle.addEventListener('click', () => setOpen(!isOpen()));
  header.querySelector('.nav')?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (isOpen() && !header.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen() || e.defaultPrevented) return;
    setOpen(false);
    navToggle.focus();
    e.preventDefault();
  });
}

// ---------------------------------------------------------------- gallery
// On a category or subcategory page, the category's navigation dropdown (its name
// and its items) links to the category and subcategory pages, which render the
// same gallery with that subcategory selected. Here those links switch in place
// instead, and the address bar follows, so reloading or going back shows the same
// view. The active subcategory is also added to each photo link (?sub=), so the
// photo page can step through just those photos. Each view takes its own height.
// With View Transitions, the photos slide to their new spots while switching.
const group = document.querySelector('[data-filter-group]');
const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  // The dropdown's name and items, plus the category crumb in the header.
  const links = group ? [...group.querySelectorAll('[data-filter]'), ...document.querySelectorAll('.crumbs [data-filter]')] : [];
  const items = Array.from(gallery.querySelectorAll('.item'));
  const frames = Array.from(gallery.querySelectorAll('.frame'));
  for (const f of frames) f.dataset.base = f.getAttribute('href').split('?')[0];
  const known = new Set(links.map((l) => l.dataset.filter));
  const subCrumb = document.querySelector('[data-sub-title]');
  const subName = document.querySelector('[data-sub-name]');
  let current = gallery.dataset.active || 'all';

  // Remember which gallery the visitor came from, so the photo page's close
  // button can return here through history (keeping scroll position and selection).
  gallery.addEventListener('click', (e) => {
    if (e.target.closest('.frame')) store.set(GALLERY_KEY, normPath(location.pathname));
  });

  const show = (filter) => {
    for (const item of items) item.hidden = filter !== 'all' && item.dataset.sub !== filter;
  };

  const apply = (filter, updateUrl) => {
    if (!links.length) return; // no subcategories (or a tag page): links stay as rendered
    current = known.has(filter) ? filter : 'all';
    let active = null;
    for (const link of links) {
      if (link.dataset.filter === current) { link.setAttribute('aria-current', 'page'); active = active || link; }
      else link.removeAttribute('aria-current');
    }
    show(current);
    const qs = current === 'all' ? '' : '?sub=' + encodeURIComponent(current);
    for (const f of frames) f.setAttribute('href', f.dataset.base + qs);
    if (subCrumb) subCrumb.hidden = current === 'all' || !active;
    if (subName && active && current !== 'all') subName.textContent = active.dataset.name;
    if (updateUrl && active) {
      history.replaceState(history.state, '', active.href);
      if (active.dataset.title) document.title = active.dataset.title;
    }
  };

  // Each photo gets its own transition name for the switch, so the photos that stay
  // move and resize into place while the others fade out or in.
  // If the browser hasn't run the update within 250ms (no frames being drawn, e.g.
  // a background tab), skip the animation and switch directly.
  const switchTo = (filter) => {
    if (!document.startViewTransition || reducedMotion() || filter === current) return apply(filter, true);
    let done = false;
    const update = () => { if (!done) { done = true; apply(filter, true); } };
    items.forEach((item, i) => { item.style.viewTransitionName = 'cs-item-' + i; });
    const transition = document.startViewTransition(update);
    const clear = () => { for (const item of items) item.style.viewTransitionName = ''; };
    transition.finished.finally(clear);
    setTimeout(() => { if (!done) { transition.skipTransition(); update(); clear(); } }, 250);
  };

  for (const link of links) {
    link.addEventListener('click', (e) => {
      if (!plainClick(e)) return; // let modified clicks open the subcategory page
      e.preventDefault();
      const menu = link.closest('details');
      if (menu) menu.open = false;
      switchTo(link.dataset.filter);
    });
  }
  apply(current, false);

  // Gallery <-> photo morph (cross-document View Transitions): the photo page's
  // image is always "cs-photo"; here the frame of the photo being opened, or of the
  // one just closed, takes that name for the length of the transition. The frame,
  // not the image inside it, so its tint travels with the photo instead of showing
  // as an empty coloured slot while the photo flies in (the frame has the photo's
  // own aspect ratio, so the morph is the same).
  const thumbFor = (url) => {
    const path = normPath(new URL(url, location.href).pathname);
    return frames.find((f) => !f.closest('.item').hidden && normPath(new URL(f.href).pathname) === path) || null;
  };
  const morph = (el, transition) => {
    // A gallery restored with the back button can still carry the name from the
    // last morph; two elements with one name would cancel the transition.
    for (const f of frames) f.style.viewTransitionName = '';
    if (!el || !transition) return;
    el.style.viewTransitionName = 'cs-photo';
    transition.finished.finally(() => { el.style.viewTransitionName = ''; });
  };
  window.addEventListener('pageswap', (e) => {
    if (!e.activation || !e.activation.entry) return;
    const frame = thumbFor(e.activation.entry.url);
    // The thumbnail the browser actually shows (already cached): the photo page puts
    // it behind the full photo until that arrives (see layouts/page.html).
    const img = frame && frame.querySelector('img');
    if (img && img.currentSrc) {
      store.set('contact-sheet:thumb', JSON.stringify({ u: normPath(new URL(e.activation.entry.url).pathname), src: img.currentSrc }));
    }
    if (e.viewTransition) morph(frame, e.viewTransition);
  });
  window.addEventListener('pagereveal', (e) => {
    const from = window.navigation && window.navigation.activation && window.navigation.activation.from;
    if (e.viewTransition && from) morph(thumbFor(from.url), e.viewTransition);
    else for (const f of frames) f.style.viewTransitionName = '';
  });
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

  // 1. Step through the gallery the visitor came from: the whole category by
  //    default, one subcategory with ?sub=, or a tag page (across categories)
  //    with ?tag=. Close then returns to that gallery.
  let data = {};
  try { data = JSON.parse(viewer.querySelector('[data-sequence]')?.textContent || '{}'); } catch { data = {}; }
  const params = new URLSearchParams(location.search);
  const has = (urls) => urls.some((u) => normPath(u) === here);
  let list = (data.seq || []).map((p) => p.u);
  let qs = '';
  let from = null; // { u: gallery URL, n: its name } when not the whole category
  const tag = params.get('tag');
  const sub = params.get('sub');
  if (tag && data.tags?.[tag] && has(data.tags[tag].p)) {
    list = data.tags[tag].p;
    qs = '?tag=' + encodeURIComponent(tag);
    from = data.tags[tag];
  } else if (sub && data.subs?.[sub]) {
    const urls = (data.seq || []).filter((p) => p.s === sub).map((p) => p.u);
    if (has(urls)) {
      list = urls;
      qs = '?sub=' + encodeURIComponent(sub);
      from = data.subs[sub];
    }
  }
  if (from) {
    for (const c of closers) c.href = from.u;
    const label = document.querySelector('[data-back-label]');
    if (label) label.textContent = from.n;
  }
  const galleryPath = normPath(from ? from.u : section);
  const i = list.findIndex((u) => normPath(u) === here);
  const neighbours = [];
  if (i >= 0) {
    const n = list.length;
    const prevUrl = list[(i - 1 + n) % n] + qs;
    const nextUrl = list[(i + 1) % n] + qs;
    if (prev) { prev.href = prevUrl; prev.hidden = n < 2; }
    if (next) { next.href = nextUrl; next.hidden = n < 2; }
    if (counter) counter.textContent = `${i + 1} / ${n}`;
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

  // Close: when we got here from that gallery (directly, or by stepping from a
  // photo opened there), go back in history so the browser restores its scroll
  // position and selection. Otherwise follow the link.
  const cameFromGallery = () => {
    if (history.length < 2 || store.get(GALLERY_KEY) !== galleryPath) return false;
    try {
      const ref = new URL(document.referrer);
      if (ref.origin !== location.origin) return false;
      const path = normPath(ref.pathname);
      return path === galleryPath || list.some((u) => normPath(u) === path);
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
