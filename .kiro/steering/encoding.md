# Encoding UTF-8

## Regra Obrigatória

Ao criar ou modificar arquivos JSON no PowerShell, **SEMPRE** usar UTF-8 sem BOM:

```powershell
# CORRETO - UTF-8 sem BOM
$json = $objeto | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("caminho/arquivo.json", $json, [System.Text.UTF8Encoding]::new($false))

# ERRADO - Pode corromper acentos
$objeto | ConvertTo-Json | Set-Content "arquivo.json" -Encoding UTF8
```

## Por que?

O `Set-Content -Encoding UTF8` no Windows PowerShell adiciona BOM e pode causar problemas de encoding com caracteres acentuados (ã, é, ç, etc).

## Verificação

Após criar arquivos com texto em português, sempre verificar se os acentos estão corretos lendo as primeiras linhas do arquivo.
