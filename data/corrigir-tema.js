// =====================================================
// SCRIPT: Corrigir Tema de Perguntas
// Altera o tema de perguntas de um valor para outro
// 
// Como usar:
// 1. Abra o console do Firebase (F12 no admin.html)
// 2. Cole e execute este script
// 3. Chame: corrigirTema('tema-errado', 'tema-correto')
// =====================================================

const corrigirTema = async (temaErrado, temaCerto) => {
  // Verifica se Firebase está disponível
  if (!window._firestore) {
    console.error('❌ Firebase não inicializado! Execute este script no admin.html');
    return;
  }
  
  if (!temaErrado || !temaCerto) {
    console.log('❌ Uso: corrigirTema("tema-errado", "tema-correto")');
    console.log('   Exemplo: corrigirTema("bio-9ano-extra", "bio-9ano")');
    return;
  }
  
  const { collection, getDocs, query, where, writeBatch, db } = window._firestore;
  
  console.log(`🔍 Buscando perguntas com tema "${temaErrado}"...`);
  
  const q = query(collection(db, 'perguntas'), where('tema', '==', temaErrado));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log(`⚠️ Nenhuma pergunta encontrada com tema "${temaErrado}"`);
    return;
  }
  
  console.log(`📝 Encontradas ${snapshot.size} perguntas`);
  console.log(`🔄 Alterando tema para "${temaCerto}"...\n`);
  
  // Usa batch para atualizar em lote (máx 500 por batch)
  const batchSize = 500;
  const docs = snapshot.docs;
  let atualizadas = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + batchSize);
    
    chunk.forEach(doc => {
      batch.update(doc.ref, { tema: temaCerto });
    });
    
    await batch.commit();
    atualizadas += chunk.length;
    console.log(`✅ ${atualizadas}/${docs.length} atualizadas`);
  }
  
  console.log(`\n🎉 Concluído! ${atualizadas} perguntas alteradas de "${temaErrado}" para "${temaCerto}"`);
};

// Função auxiliar para corrigir vários temas de uma vez
const corrigirTemasBatch = async (correcoes) => {
  // correcoes = [{ de: 'tema-errado', para: 'tema-certo' }, ...]
  console.log(`🔄 Corrigindo ${correcoes.length} temas...\n`);
  
  for (const { de, para } of correcoes) {
    await corrigirTema(de, para);
    console.log('---');
  }
  
  console.log('\n✅ Todas as correções aplicadas!');
};

// Exemplos de uso:
console.log('📌 Script carregado!');
console.log('');
console.log('Uso:');
console.log('  corrigirTema("bio-9ano-extra", "bio-9ano")');
console.log('');
console.log('Ou para corrigir vários:');
console.log('  corrigirTemasBatch([');
console.log('    { de: "bio-9ano-extra", para: "bio-9ano" },');
console.log('    { de: "geo-3em-extra", para: "geo-3em" }');
console.log('  ])');
