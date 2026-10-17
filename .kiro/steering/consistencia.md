# Consistência de Dados

## Regra

Antes de criar IDs, códigos ou chaves em qualquer lugar (banco de dados, arquivos, etc.), **verificar primeiro** se já existe um padrão definido no código.

## Exemplo

Se o código tem um mapeamento como:
```javascript
const materias = { 'por': 'Português', 'his': 'História' }
```

Então ao criar temas no Firebase, usar `por-6ano` e NÃO `port-6ano`.

## Por que?

Criar dados inconsistentes com o código causa bugs difíceis de rastrear. O código não reconhece os dados que ele mesmo deveria processar.
