// =====================================================
// SCRIPT: Listar Temas Órfãos
// Encontra temas em perguntas que não têm subtema cadastrado
// 
// Como usar:
// 1. Abra o console do Firebase (F12 no admin.html)
// 2. Cole e execute este script
// =====================================================

const listarTemasOrfaos = async () => {
  // Verifica se Firebase está disponível
  if (!window._firestore) {
    console.error('❌ Firebase não inicializado! Execute este script no admin.html');
    return;
  }
  
  const { collection, getDocs, db } = window._firestore;
  
  console.log('🔍 Buscando temas órfãos...\n');
  
  // 1. Busca todos os subtemas cadastrados
  const subtemasSnapshot = await getDocs(collection(db, 'subtemas'));
  const subtemasIds = new Set();
  
  subtemasSnapshot.forEach(doc => {
    subtemasIds.add(doc.id);
  });
  
  console.log(`📋 Subtemas cadastrados: ${subtemasIds.size}`);
  
  // 2. Busca todos os temas únicos das perguntas
  const perguntasSnapshot = await getDocs(collection(db, 'perguntas'));
  const temasPerguntas = new Map(); // tema -> quantidade
  
  perguntasSnapshot.forEach(doc => {
    const tema = doc.data().tema;
    if (tema) {
      temasPerguntas.set(tema, (temasPerguntas.get(tema) || 0) + 1);
    }
  });
  
  console.log(`📝 Total de perguntas: ${perguntasSnapshot.size}`);
  console.log(`🏷️ Temas únicos em perguntas: ${temasPerguntas.size}\n`);
  
  // 3. Encontra temas órfãos (em perguntas mas sem subtema)
  const temasOrfaos = [];
  
  temasPerguntas.forEach((qtd, tema) => {
    if (!subtemasIds.has(tema)) {
      temasOrfaos.push({ tema, quantidade: qtd });
    }
  });
  
  // Ordena por quantidade (maior primeiro)
  temasOrfaos.sort((a, b) => b.quantidade - a.quantidade);
  
  // 4. Exibe resultado
  if (temasOrfaos.length === 0) {
    console.log('✅ Nenhum tema órfão encontrado! Todos os temas têm subtema cadastrado.');
  } else {
    console.log(`⚠️ TEMAS ÓRFÃOS ENCONTRADOS: ${temasOrfaos.length}\n`);
    console.log('Tema | Perguntas');
    console.log('-----|----------');
    
    let totalOrfaos = 0;
    temasOrfaos.forEach(({ tema, quantidade }) => {
      console.log(`${tema} | ${quantidade}`);
      totalOrfaos += quantidade;
    });
    
    console.log(`\n📊 Total de perguntas órfãs: ${totalOrfaos}`);
    console.log('\n💡 Para corrigir, use o script corrigir-tema.js');
  }
  
  return temasOrfaos;
};

// Executa
listarTemasOrfaos();
