param(
    [Parameter(Mandatory = $true)]
    [string]$PepkJar,

    [Parameter(Mandatory = $true)]
    [string]$EncryptionKey,

    [string]$SigningDir = (Join-Path $HOME "dots-rustore-signing")
)

$AppKeystore = Join-Path $SigningDir "dots-app-signing.keystore"
$UploadCert = Join-Path $SigningDir "uploadcert.pem"
$Output = Join-Path $SigningDir "pepk_out.zip"

java -jar $PepkJar --keystore=$AppKeystore --alias=sign --output=$Output --encryptionkey=$EncryptionKey

Write-Host ""
Write-Host "Ready for RuStore Console:"
Write-Host "  App signing archive: $Output"
Write-Host "  Upload certificate:  $UploadCert"
