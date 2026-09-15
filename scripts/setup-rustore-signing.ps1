param(
    [Parameter(Mandatory = $true)]
    [string]$AppKeystore,

    [string]$AppAlias = "key0",
    [string]$OutputDir = (Join-Path $HOME "dots-rustore-signing")
)

$ErrorActionPreference = "Stop"

$Repo = "StanleyLl0yd/dots"
$UploadAlias = "upload"
$UploadKeystore = Join-Path $OutputDir "dots-upload.keystore"
$UploadCert = Join-Path $OutputDir "uploadcert.pem"
$AppPasswordEnv = "DOTS_APP_KEYSTORE_PASSWORD"
$UploadPasswordEnv = "DOTS_UPLOAD_KEYSTORE_PASSWORD"

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

function Assert-NativeSuccess {
    param([string]$Operation)

    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed with exit code $LASTEXITCODE."
    }
}

$AppKeystore = (Resolve-Path $AppKeystore).Path
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$AppPassword = ConvertFrom-SecureStringPlain (Read-Host "Existing app signing keystore password" -AsSecureString)
$UploadPassword = ConvertFrom-SecureStringPlain (Read-Host "New upload keystore password" -AsSecureString)
$UploadBase64 = $null

try {
    [Environment]::SetEnvironmentVariable($AppPasswordEnv, $AppPassword, "Process")
    [Environment]::SetEnvironmentVariable($UploadPasswordEnv, $UploadPassword, "Process")

    keytool -list -v -keystore $AppKeystore -storepass:env $AppPasswordEnv -alias $AppAlias | Select-String "Alias name|Signature algorithm name|Subject Public Key Algorithm|SHA256:"
    Assert-NativeSuccess "Reading app signing keystore"

    keytool -genkeypair -keystore $UploadKeystore -storetype JKS -alias $UploadAlias -keyalg RSA -keysize 4096 -validity 36500 -storepass:env $UploadPasswordEnv -keypass:env $UploadPasswordEnv -dname "CN=Dots Upload, O=Stanley Lloyd"
    Assert-NativeSuccess "Generating upload keystore"

    keytool -exportcert -keystore $UploadKeystore -alias $UploadAlias -storepass:env $UploadPasswordEnv -rfc -file $UploadCert
    Assert-NativeSuccess "Exporting upload certificate"

    $UploadBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($UploadKeystore))
    $UploadBase64 | gh secret set ANDROID_UPLOAD_KEYSTORE_BASE64 --repo $Repo
    Assert-NativeSuccess "Setting ANDROID_UPLOAD_KEYSTORE_BASE64"

    $UploadPassword | gh secret set ANDROID_UPLOAD_KEYSTORE_PASSWORD --repo $Repo
    Assert-NativeSuccess "Setting ANDROID_UPLOAD_KEYSTORE_PASSWORD"

    $UploadAlias | gh secret set ANDROID_UPLOAD_KEY_ALIAS --repo $Repo
    Assert-NativeSuccess "Setting ANDROID_UPLOAD_KEY_ALIAS"

    $UploadPassword | gh secret set ANDROID_UPLOAD_KEY_PASSWORD --repo $Repo
    Assert-NativeSuccess "Setting ANDROID_UPLOAD_KEY_PASSWORD"

    Write-Host ""
    keytool -list -v -keystore $UploadKeystore -alias $UploadAlias -storepass:env $UploadPasswordEnv | Select-String "SHA256:"
    Assert-NativeSuccess "Reading upload keystore"
}
finally {
    [Environment]::SetEnvironmentVariable($AppPasswordEnv, $null, "Process")
    [Environment]::SetEnvironmentVariable($UploadPasswordEnv, $null, "Process")
    $AppPassword = $null
    $UploadPassword = $null
    $UploadBase64 = $null
}

Write-Host ""
gh secret list --repo $Repo
Assert-NativeSuccess "Listing repository secrets"

Write-Host ""
Write-Host "RuStore signing setup complete."
Write-Host "App signing keystore kept unchanged: $AppKeystore"
Write-Host "Upload keystore: $UploadKeystore"
Write-Host "Upload certificate: $UploadCert"
Write-Host ""
Write-Host "Keep the existing app signing keystore and its password backed up. It remains the app-signing identity for Dots."
