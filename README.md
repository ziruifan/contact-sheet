# contact-sheet

A dark, image-first Hugo theme for a personal gallery homepage. Requires Hugo ≥ 0.153.

- **Home**: one big tile per category. The grid adapts to how many categories there are.
- **Category**: a justified photo grid. Rows fill the width and every image keeps its own aspect ratio. Tag filter buttons appear when they would actually filter something. The page keeps the same height whichever tag is selected.
- **Photo**: one image per page with prev/next (←/→ keys, swipe), a counter, Esc to close, and the title, year, optional description and tags. Opened from a filtered gallery, prev/next and the counter cover only that tag. Closing returns to the gallery at the same scroll position and filter. The neighbouring photos are preloaded, so stepping is instant.
- **About**: portrait, bio, a Journey timeline and links.
- Light and dark palettes, picked automatically from the visitor's browser/OS setting (`prefers-color-scheme`). Colours are CSS variables at the top of `assets/css/main.css`.
- Multilingual. The language menu matches the site's style, works without JavaScript, and hides itself when the site has only one language.

## Example site

`exampleSite/` is a complete demo with Lorem Ipsum text (the Chinese pages use the
千字文, the traditional Chinese filler text). It has 24 abstract photos in four
categories, with tags, descriptions and an About page, in English and Chinese.
Preview it from the theme folder:

```
hugo server --source exampleSite
```

To start your own site from it, copy `exampleSite/hugo.toml` and `exampleSite/content/`
into your site and delete the `themesDir` line from the config.

## Categories

Each category is a folder under `content/`. Pick which ones appear and in what order in `hugo.toml`:

```toml
[params]
  categories = ['engineering', 'art', 'wildlife', 'rides']
```

To add a category, create `content/<name>/_index.md` (plus `_index.zh.md` for its
Chinese title) and add `<name>` to the list. Without `categories`, every top-level
section is shown, ordered by `weight` in its `_index.md`. A section left off the list
still builds and is reachable by URL. It is just not linked from the homepage or nav.

Category `_index.md` fields: `title`, `weight` (only used without `categories`),
`tint` (placeholder colour behind images while they load). The body, if any, is shown
under the heading.

## Content layout

```
content/
  _index.md                 # homepage (title only)
  about/
    index.md                # layout: about  (see layouts/about.html for fields)
    portrait.jpg
  art/                      # one folder per section; the homepage shows them in `weight` order
    _index.md               # title, weight, tint (placeholder colour, optional)
    cover.jpg               # optional homepage tile image
    red-helmet/             # one folder per photo
      index.md              # title, date, tags, optional year/weight/featured; body = description
      index.zh.md           # optional translation
      photo.jpg
```

Create a new photo with:

```
hugo new content --kind photo art/red-helmet
```

Then drop the image into the new folder and set `draft: false`.

### Photo front matter

| key        | meaning                                                                 |
|------------|-------------------------------------------------------------------------|
| `title`    | Caption title                                                           |
| `date`     | Sort order (newest first) and default year                              |
| `year`     | Optional. Shown instead of the year from `date`                         |
| `tags`     | List of tags, e.g. `[Painting, Helmets]`. Each becomes a filter button on the category page. Translate them in `index.zh.md` |
| `weight`   | Optional manual order (lower first)                                     |
| `featured` | Optional. Use this photo as the section's homepage tile (if no `cover.*`)|
| `image`    | Optional. File name, if the folder holds more than one image            |

The page body is the description. Leave it empty and the description block is left out.

### Homepage tile image

The theme picks the first of these that exists: `cover.*` in the section folder, then a photo marked `featured: true`, then the first photo.

## Site params

```toml
[params]
  author = 'Your Name'   # header + footer (defaults to site title)
  logo = ''              # optional footer logo, path in assets/ or static/
  copyright = ''         # optional, replaces "© <year> <author>"
  description = ''       # fallback meta description
  googleFonts = true     # load web fonts from Google Fonts
```

## Fonts

Latin text uses **Ubuntu**. Pages in a `zh*` language pair it with **Noto Sans SC**,
the web version of Noto Sans CJK SC. A locally installed Noto Sans CJK SC is used first when available. 
Google Fonts splits Noto Sans SC into unicode-range slices, so a page downloads only the characters it shows.
With `googleFonts = false`, the CSS falls back to local fonts only.

## Translations without gaps

The site config mounts `content/` into every language. A photo without an
`index.zh.md` still appears on the Chinese site, using its English text:

```toml
[[module.mounts]]
  source = 'content'
  target = 'content'
  [module.mounts.sites.matrix]
    languages = ['**']
```

UI strings live in `i18n/en.toml` and `i18n/zh.toml`.
