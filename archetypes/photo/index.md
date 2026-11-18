---
# Put the image file (any name, e.g. photo.jpg) in this same folder.
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: {{ .Date }}
# year: 2024        # optional; shown instead of the year of `date`
tags: []            # each links to a page of its photos, e.g. [Consectetur, Adipiscing]
# weight: 10        # optional; lower comes first. Without weights, newest first
# featured: true    # optional; use as the section's cover on the homepage
# detail: |         # optional; plain text on the right of the caption, line breaks kept
#   Lisbon, Portugal
#   Fujifilm X-T5 · 23mm
draft: true
---

