#!/usr/bin/env node
/**
 * Confere que toda função importada com  const { a, b } = require('./x')  existe em src/x.js.
 * Pega o tipo de erro que deixou de gerar a planilha .xlsx dos contratos novos (função removida de um módulo).
 *   node scripts/verificar-importacoes.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
process.env.SEM_ATUALIZAR = '1';
let erros = 0;
for (const arq of fs.readdirSync(SRC).filter((f) => f.endsWith('.js'))) {
  const texto = fs.readFileSync(path.join(SRC, arq), 'utf8');
  for (const m of texto.matchAll(/const\s*\{([^}]+)\}\s*=\s*require\('\.\/([^']+)'\)/g)) {
    const nomes = m[1].split(',').map((n) => n.split(':')[0].trim()).filter(Boolean);
    const mod = require(path.join(SRC, m[2]));
    for (const n of nomes) {
      if (mod[n] === undefined) { console.error(`✗ ${arq}: "${n}" não existe em src/${m[2]}.js`); erros++; }
    }
  }
}
if (erros) process.exit(1);
console.log('✓ importações entre os módulos conferidas');
