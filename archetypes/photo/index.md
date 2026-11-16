---
# Put the image file (any name, e.g. photo.jpg) in this same folder.
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: {{ .Date }}
# year: 2024        # optional; shown instead of the year of `date`
tags: []            # filter buttons on the category page, e.g. [Consectetur, Adipiscing]
# weight: 10        # optional; lower comes first. Without weights, newest first
# featured: true    # optional; use as the section's cover on the homepage
draft: true
---

