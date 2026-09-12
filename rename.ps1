$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.html" -File
foreach ($f in $files) {
    $c = Get-Content -Path $f.FullName -Raw -Encoding UTF8
    if ($c -match "KisanFlow") {
        $c = $c -replace "KisanFlow AI","KisanQ AI"
        $c = $c -replace "KisanFlow","KisanQ"
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($f.Name)"
    }
}
# Also update index.html
$html = Get-Content -Path "index.html" -Raw -Encoding UTF8
if ($html -match "KisanFlow") {
    $html = $html -replace "KisanFlow","KisanQ"
    [System.IO.File]::WriteAllText("index.html", $html, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: index.html"
}
Write-Host "All done."
