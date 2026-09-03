# RuStore publication package

Generated publication assets are produced by `.github/workflows/rustore-assets.yml` from the current Dots interface. The workflow derives the 512×512 store icon from `branding/dots-icon-master.png`, creates a 1080×607 promo banner and four 1080×1920 screenshots, verifies dimensions, zips the set, and uploads it as a workflow artifact. On a release push it also attaches the ZIP to the matching GitHub Release.

Store text, legal URLs, signing steps, and data-safety declarations live in this directory. Generated PNG files are intentionally not committed because the workflow reproduces them from source.
