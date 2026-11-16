param()
$ErrorActionPreference = 'Stop'
$geotwinRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$geotwinOutput = Join-Path $geotwinRoot 'entrega'
New-Item -ItemType Directory -Path $geotwinOutput -Force | Out-Null
$geotwinArchive = Join-Path $geotwinOutput 'GeoTwin_Explorer_v24_Entrega.zip'
$geotwinInputs = @('dist','scripts','tests','.github','Iniciar_GeoTwin.bat','iniciar_geotwin.mjs','iniciar_geotwin.py','package.json','package-lock.json','.gitignore','README.md','VERIFICACION.md') |
    ForEach-Object { Join-Path $geotwinRoot $_ }
$geotwinExcludedDirectories = Get-ChildItem -LiteralPath (Join-Path $geotwinRoot 'dist'),(Join-Path $geotwinRoot 'scripts'),(Join-Path $geotwinRoot 'tests'),(Join-Path $geotwinRoot '.github') -Directory -Recurse -Force |
    Where-Object { $_.Name -in @('node_modules','.cache','.git','__pycache__') }
if ($geotwinExcludedDirectories) { throw 'Retira las dependencias o cachés anidadas antes de empaquetar la entrega.' }
Compress-Archive -LiteralPath $geotwinInputs -DestinationPath $geotwinArchive -CompressionLevel Optimal -Force
$geotwinHash = Get-FileHash -LiteralPath $geotwinArchive -Algorithm SHA256
Set-Content -LiteralPath ($geotwinArchive + '.sha256') -Value ($geotwinHash.Hash.ToLowerInvariant() + '  ' + [System.IO.Path]::GetFileName($geotwinArchive)) -Encoding ascii
Write-Output $geotwinArchive
Write-Output ('SHA256: ' + $geotwinHash.Hash.ToLowerInvariant())

