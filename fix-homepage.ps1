$content = Get-Content -Path "homepage.html" -Raw
$pattern = '(?s)<script>.*?</script>\s*</body>'
$replacement = '    <script src="homepage.js"></script>' + "`r`n" + '</body>'
$newContent = $content -replace $pattern,$replacement
Set-Content -Path "homepage.html" -Value $newContent
