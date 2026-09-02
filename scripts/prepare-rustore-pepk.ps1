param(
    [Parameter(Mandatory = $true)]
    [string]$AppKeystore,

    [Parameter(Mandatory = $true)]
    [string]$PepkJar,

    [Parameter(Mandatory = $true)]
    [string]$EncryptionKey,

    [string]$AppAlias = "key0",
    [string]$OutputDir = (Join-Path $HOME "dots-rustore-signing")
)

$AppKeystore = (Resolve-Path $AppKeystore).Path
$PepkJar = (Resolve-Path $PepkJar).Path
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$UploadCert = Join-Path $OutputDir "uploadcert.pem"
$Output = Join-Path $OutputDir "pepk_out.zip"

if (-not (Test-Path $UploadCert)) {
    throw "Upload certificate not found: $UploadCert. Run setup-rustore-signing.ps1 first."
}

Write-Host "App signing keystore: $AppKeystore"
Write-Host "App signing alias:    $AppAlias"
Write-Host "PEPK output:          $Output"
Write-Host ""
Write-Host "PEPK will prompt for the existing app-signing keystore/key password."

java -jar $PepkJar `
    --keystore=$AppKeystore `
    --alias=$AppAlias `
    --output=$Output `
    --encryptionkey=$EncryptionKey `
    --include-cert

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Output)) {
    throw "PEPK export failed."
}

Write-Host ""
Write-Host "Ready for RuStore Console:"
Write-Host "  App signing archive: $Output"
Write-Host "  Upload certificate:  $UploadCert"
Write-Host ""
Write-Host "The app-signing identity is the existing key used by previous Dots APK releases."
