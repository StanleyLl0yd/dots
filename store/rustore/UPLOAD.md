# Upload checklist

1. Generate and securely keep a dedicated upload key with `scripts/setup-rustore-signing.ps1` while preserving the existing `my.jks` / `key0` app-signing identity offline.
2. Register the existing app-signing key in RuStore using PEPK and upload the generated upload certificate.
3. Run the native release workflow for the matching tag and use the verified `.aab` artifact.
4. Download the latest `Dots-v<version>-RuStore-assets` workflow artifact and unpack the inner ZIP.
5. Fill RuStore Console from `console-copy/` in numeric order: name, subtitle, short description, full description, What's New, categories/tags, moderator comment and data-safety declaration.
6. Upload `icon-512.png`, `promo-banner-1080x607.png` and the four screenshots in numeric order.
7. Fill in the real public developer/support contact and verify the privacy-policy and user-agreement URLs.
8. After uploading the AAB, compare RuStore's automatically detected permissions/data declarations with the final Android manifest before submission.
9. Preview the public card on phone width and re-check the first screenshot, first 2–3 description lines and What's New as a user would see them.
