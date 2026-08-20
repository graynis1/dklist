# Starts the local v2 dev/shadow MySQL instance (port 3308, D:\mysql-data-v2shadow).
# Entirely separate from the VPS/prod database and from the old v1 local MySQL
# (D:\mysql-data, port 3306) - safe to run alongside either.
$configPath = Join-Path $PSScriptRoot "..\dev-db.ini"
Start-Process -FilePath "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" `
    -ArgumentList "--defaults-file=`"$configPath`"", "--console" `
    -WindowStyle Hidden
Start-Sleep -Seconds 5
Write-Host "v2 shadow MySQL should be up on 127.0.0.1:3308 (dklist_shadow db, dklist_dev user)."
