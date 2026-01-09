# 🚀 GUIA RÁPIDO - Adicionar Ícones de Raças

## ⚡ 3 Passos Simples

### 1️⃣ Copiar SVGs para a Pasta Correta

```bash
# Opção A: Arrastar e soltar
# Arraste seus arquivos .svg para: /public/breed-icons/

# Opção B: Terminal
cp ~/Downloads/*.svg /Users/rodrigorochameire/.cursor/worktrees/TeteCareHub/lfw/public/breed-icons/
```

### 2️⃣ Executar o Script Conversor

```bash
cd /Users/rodrigorochameire/.cursor/worktrees/TeteCareHub/lfw
node scripts/convert-breed-svgs.js
```

**Saída esperada:**
```
🐕 Convertendo SVGs de raças para componentes React...

📦 Encontrados 24 arquivos SVG

   ✓ golden_retriever.svg → GoldenRetrieverIcon
   ✓ beagle.svg → BeagleIcon
   ✓ pug.svg → PugIcon
   ...

✅ Arquivo gerado com sucesso: src/components/breed-icon-svgs.tsx

📝 Próximo passo: Adicione os mapeamentos em src/components/breed-icons.tsx
```

### 3️⃣ Testar

```bash
npm run dev
```

Acesse qualquer página com pets (ex: `/admin/pets` ou `/tutor/pets`)

---

## 📝 Nomes de Arquivo Recomendados

Use nomes descritivos separados por underscore:

✅ **BOM:**
- `golden_retriever.svg`
- `cavalier_king_charles_spaniel.svg`  
- `vira_lata_mixed_breed.svg`
- `lulu_da_pomerania_pomeranian.svg`

❌ **EVITAR:**
- `golden retriever.svg` (espaços)
- `Golden-Retriever.svg` (hífen)
- `GoldenRetriever.svg` (camelCase)

---

## 🎯 Seus SVGs Atuais

Baseado na imagem que você forneceu, você tem 24 raças:

1. `golden_retriever.svg`
2. `cavalier_king_charles_spaniel.svg`
3. `vira_lata_mixed_breed.svg`
4. `shitzu.svg`
5. `beagle.svg`
6. `salsicha_dachshund.svg`
7. `lulu_da_pomerania_pomeranian.svg`
8. `chihuahua.svg`
9. `labrador_retriever.svg`
10. `yorkshire_terrier.svg`
11. `pug.svg`
12. `buldogue_frances_french_bulldog.svg`
13. `pastor_alemao.svg`
14. `boxer.svg`
15. `dalmata.svg`
16. `cocker_spaniel.svg`
17. `sao_bernardo.svg`
18. `husky_siberiano.svg`
19. `poodle.svg`
20. `shiba_inu.svg`
21. `galgo.svg`
22. `border_collie.svg`
23. `malamute_do_alasca.svg`
24. `chow_chow.svg`

---

## 🔧 Se Algo Der Errado

### Erro: "Nenhum arquivo SVG encontrado"
```bash
# Verifique se os arquivos estão na pasta correta:
ls -la public/breed-icons/
```

### Erro: "node: command not found"
```bash
# Instale o Node.js ou use npm:
npm run convert-svgs  # (se adicionar script no package.json)
```

### SVGs não aparecem na aplicação
1. Abra `src/components/breed-icon-svgs.tsx` - verifique se os componentes foram gerados
2. Abra `src/components/breed-icons.tsx` - adicione os mapeamentos manualmente se necessário

---

## 💡 Dica Extra

Adicione ao `package.json`:

```json
{
  "scripts": {
    "convert-svgs": "node scripts/convert-breed-svgs.js"
  }
}
```

Depois pode rodar simplesmente:
```bash
npm run convert-svgs
```

---

**Documentação completa:** `COMO_ADICIONAR_ICONES.md`

