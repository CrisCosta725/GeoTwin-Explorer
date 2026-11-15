param()
$ErrorActionPreference = 'Stop'
$geotwinRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$geotwinOutput = Join-Path $geotwinRoot 'entrega'
New-Item -ItemType Directory -Path $geotwinOutput -Force | Out-Null
$geotwinArchive = Join-Path $geotwinOutput 'GeoTwin_Explorer_v24_Entrega.zip'
$geotwinInputs = @('dist','scripts','tests','Iniciar_GeoTwin.bat','iniciar_geotwin.mjs','iniciar_geotwin.py','package.json','package-lock.json','.gitignore','LEEME.md','VERIFICACION.md') |
    ForEach-Object { Join-Path $geotwinRoot $_ }
Compress-Archive -LiteralPath $geotwinInputs -DestinationPath $geotwinArchive -CompressionLevel Optimal -Force
$geotwinHash = Get-FileHash -LiteralPath $geotwinArchive -Algorithm SHA256
Set-Content -LiteralPath ($geotwinArchive + '.sha256') -Value ($geotwinHash.Hash.ToLowerInvariant() + '  ' + [System.IO.Path]::GetFileName($geotwinArchive)) -Encoding ascii
Write-Output $geotwinArchive
Write-Output ('SHA256: ' + $geotwinHash.Hash.ToLowerInvariant())
