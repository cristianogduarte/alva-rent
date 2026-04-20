# Sync ALVA Rent docs -> Obsidian vault
# Uso: powershell -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo  = "C:\Users\crist\ALVA RENT"
$vault = "C:\Users\crist\OBSIDIAN\01-PROJETOS\alva-rent"

# Arquivos do repo -> destino no vault
$map = @{
  "memoria-alva-rent.md"                                    = "memoria-alva-rent.md"
  "CLAUDE.md"                                               = "claude-md-alva-rent.md"
  "docs\ROADMAP.md"                                         = "roadmap-alva-rent.md"
  "docs\ARQUITETURA.md"                                     = "arquitetura-alva-rent.md"
  "docs\INTEGRACAO_INTER.md"                                = "integracao-inter.md"
  "C:\Users\crist\.claude\plans\elegant-wiggling-kitten.md" = "plano-short-stay.md"
}

if (-not (Test-Path $vault)) { New-Item -ItemType Directory -Path $vault | Out-Null }

$copied = 0
$skipped = 0
foreach ($entry in $map.GetEnumerator()) {
  if ([System.IO.Path]::IsPathRooted($entry.Key)) {
    $src = $entry.Key
  } else {
    $src = Join-Path $repo $entry.Key
  }
  $dst = Join-Path $vault $entry.Value

  if (-not (Test-Path $src)) {
    Write-Host "  (skip) $($entry.Key) - nao encontrado" -ForegroundColor DarkGray
    $skipped++
    continue
  }

  $content = Get-Content $src -Raw -Encoding UTF8
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm'
  $header = "> Sincronizado de ``$src`` em $ts`n> Nao edite aqui - edite no repo e rode ``scripts\sync-obsidian.ps1```n`n"

  # Remove cabecalho antigo se existir
  $content = $content -replace '(?s)^> Sincronizado.*?\r?\n\r?\n', ''
  $final = $header + $content

  Set-Content -Path $dst -Value $final -Encoding UTF8 -NoNewline
  Write-Host "  OK  $($entry.Key) -> $($entry.Value)" -ForegroundColor Green
  $copied++
}

Write-Host ""
Write-Host "Sync concluido: $copied copiado(s), $skipped pulado(s)" -ForegroundColor Cyan
Write-Host "Destino: $vault"
