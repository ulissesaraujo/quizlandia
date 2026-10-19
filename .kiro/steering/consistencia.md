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

---

# Validações do Admin

## Importação de JSON (Colar JSON)

O sistema já valida:
1. **Tema obrigatório** - Perguntas sem tema são filtradas e não importadas
2. **Tema deve existir** - O tema precisa estar cadastrado no Firebase (como tema principal ou subtema)

Se tentar importar perguntas com tema não cadastrado, aparece erro:
```
❌ ERRO: Os seguintes temas não estão cadastrados:
[lista de temas]
Cadastre os subtemas primeiro ou corrija o tema no JSON.
```