# Migrate MySQL catalog ICC -> smcicc (dump/import + post-migrate SQL).
# Requires mysql + mysqldump on PATH.
param(
    [string]$Host = '127.0.0.1',
    [string]$Port = '3306',
    [string]$User = 'tarsAdmin',
    [string]$Password = 'Tars@2019',
    [string]$SourceDb = 'ICC',
    [string]$TargetDb = 'smcicc'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sqlPost = Join-Path $root 'sql\migrate_smcicc_to_smcicc.sql'

$mysqlArgs = @('-h', $Host, '-P', $Port, '-u', $User)
if ($Password) { $env:MYSQL_PWD = $Password }

Write-Host "==> CREATE DATABASE $TargetDb (if not exists)" -ForegroundColor Cyan
& mysql @mysqlArgs -e "CREATE DATABASE IF NOT EXISTS ``$TargetDb`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

Write-Host "==> mysqldump $SourceDb -> $TargetDb" -ForegroundColor Cyan
& mysqldump @mysqlArgs --single-transaction --routines --triggers $SourceDb | & mysql @mysqlArgs $TargetDb

Write-Host "==> post-migrate SQL (ODBC DBName)" -ForegroundColor Cyan
Get-Content $sqlPost -Raw | & mysql @mysqlArgs $TargetDb

Write-Host "==> table count check" -ForegroundColor Cyan
$srcCount = (& mysql @mysqlArgs -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SourceDb';")
$dstCount = (& mysql @mysqlArgs -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TargetDb';")
Write-Host "  $SourceDb tables: $srcCount"
Write-Host "  $TargetDb tables: $dstCount"

if ($srcCount -ne $dstCount) {
    Write-Warning "Table counts differ — verify manually before cutover."
    exit 1
}

Write-Host "Done. Set DB_ICC_SCHEMA=$TargetDb for ConfServer." -ForegroundColor Green
