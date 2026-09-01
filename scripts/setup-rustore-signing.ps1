param(
    [string]$OutputDir = (Join-Path $HOME "dots-rustore-signing")
)

$Repo = "StanleyLl0yd/dots"
$AppAlias = "sign"
$UploadAlias = "upload"
$AppKeystore = Join-Path $OutputDir "dots-app-signing.keystore"
$UploadKeystore = Join-Path $OutputDir "dots-upload.keystore"
$UploadCert = Join-Path $OutputDir "uploadcert.pem"

function ConvertFrom-SecureStringPlain {
    param([Security.SecureString]$SecureString)

    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try {
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$AppPassword = ConvertFrom-SecureStringPlain (Read-Host "App signing keystore password" -AsSecureString)
$UploadPassword = ConvertFrom-SecureStringPlain (Read-Host "Upload keystore password" -AsSecureString)

keytool -genkeypair -keystore $AppKeystore -storetype JKS -alias $AppAlias -keyalg RSA -keysize 4096 -validity 36500 -storepass $AppPassword -keypass $AppPassword -dname "CN=Dots, O=Stanley Lloyd"
keytool -genkeypair -keystore $UploadKeystore -storetype JKS -alias $UploadAlias -keyalg RSA -keysize 4096 -validity 36500 -storepass $UploadPassword -keypass $UploadPassword -dname "CN=Dots Upload, O=Stanley Lloyd"
keytool -exportcert -keystore $UploadKeystore -alias $UploadAlias -storepass $UploadPassword -rfc -file $UploadCert

$UploadBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($UploadKeystore))
$UploadBase64 | gh secret set ANDROID_UPLOAD_KEYSTORE_BASE64 --repo $Repo
$UploadPassword | gh secret set ANDROID_UPLOAD_KEYSTORE_PASSWORD --repo $Repo
$UploadAlias | gh secret set ANDROID_UPLOAD_KEY_ALIAS --repo $Repo
$UploadPassword | gh secret set ANDROID_UPLOAD_KEY_PASSWORD --repo $Repo

Write-Host ""
Write-Host "RuStore signing files created:"
Write-Host "  App signing keystore: $AppKeystore"
Write-Host "  Upload keystore:      $UploadKeystore"
Write-Host "  Upload certificate:   $UploadCert"
Write-Host ""
Write-Host "Keep the app signing keystore and its password offline. Do not upload it to GitHub."
Write-Host ""
keytool -list -v -keystore $AppKeystore -alias $AppAlias -storepass $AppPassword | Select-String "SHA256:"
keytool -list -v -keystore $UploadKeystore -alias $UploadAlias -storepass $UploadPassword | Select-String "SHA256:"
Write-Host ""
gh secret list --repo $Repo
