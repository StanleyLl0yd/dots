# Upload checklist

1. Generate and securely keep a dedicated upload key with `scripts/setup-rustore-signing.ps1` while preserving the existing `my.jks` / `key0` app-signing identity offline.
2. Register the existing app-signing key in RuStore using PEPK and upload the generated upload certificate.
3. Run the native release workflow for the matching tag and use the verified `.aab` artifact.
4. Use the generated RuStore asset ZIP for icon, promo banner, and screenshots.
5. Fill in the public support contact before submitting the store card.
