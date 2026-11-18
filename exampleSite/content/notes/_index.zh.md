---
title: 笔记
# Notes are long texts that photo descriptions link to, optionally grouped in
# category folders (notes/<category>/<note>/, with the category's title in its
# _index.md). Neither this folder nor the category folders become pages or appear
# in the navigation, the homepage or any list; the notes get the note layout.
build:
  render: never
  list: never
cascade:
  - target:
      kind: page
    layout: note
  - target:
      kind: section
    build:
      render: never
      list: never
---
