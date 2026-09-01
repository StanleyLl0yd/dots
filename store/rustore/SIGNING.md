# RuStore signing

Dots keeps the existing Android app-signing identity for upgrade continuity. The previously used `my.jks` / `key0` signing key remains offline and is used only for RuStore app-signing registration through PEPK. A separate upload key signs AAB files in GitHub Actions.

Use `scripts/setup-rustore-signing.ps1` to create the upload key and configure the four `ANDROID_UPLOAD_*` repository secrets. Use `scripts/prepare-rustore-pepk.ps1` with RuStore's current PEPK tool and encryption key to export the existing app-signing key for one-time registration.

Never commit keystores, passwords, exported private-key material, or PEPK output.
