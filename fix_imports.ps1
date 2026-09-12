$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -File
foreach ($f in $files) {
    $c = Get-Content -Path $f.FullName -Raw -Encoding UTF8
    if ($c -match "KisanQContext") {
        $c = $c -replace "KisanQContext","KisanFlowContext"
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed import path: $($f.Name)"
    }
}
Write-Host "Done"
