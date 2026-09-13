# RuStore publication package

The `RuStore Assets` workflow builds a complete publisher pack from the current Dots sources and real Android-emulator captures.

The generated ZIP contains:

- `icon-512.png` — 512×512 store icon;
- `promo-banner-1080x607.png` — ASO promo banner;
- four 1080×1920 ASO screenshots captured from the real Android UI;
- `metadata-ru.md` — complete RuStore metadata, ASO strategy, legal URLs and data-safety notes;
- `console-copy/` — ready-to-paste RuStore fields as separate UTF-8 text files;
- `UPLOAD.md` and `SIGNING.md` — publication and signing notes.

The workflow validates image dimensions and store-copy limits before publishing the artifact. Generated PNG files are intentionally not committed because the workflow reproduces them from source.

For RuStore Console, start with the files in `console-copy/` in numeric order. They contain the customer-facing ASO copy; internal implementation details and technical changelogs are intentionally excluded from the store-facing text.
