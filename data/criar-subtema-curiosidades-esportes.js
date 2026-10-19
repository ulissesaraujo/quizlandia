// Script para criar subtema "Curiosidades" dentro de "Esportes"
// Cole no console do navegador (F12) na página do admin

(async () => {
    const { doc, getDoc, setDoc, db } = window._firestore;
    
    // Buscar o tema pai atual
    const temaRef = doc(db, "temas", "esportes");
    const temaDoc = await getDoc(temaRef);
    
    if (!temaDoc.exists()) {
        console.error('❌ Tema esportes não encontrado!');
        return;
    }
    
    const temaAtual = temaDoc.data();
    console.log('Tema encontrado:', temaAtual);
    
    // Pegar subtemas existentes ou criar array vazio
    const subtemasExistentes = temaAtual.subtemas || [];
    
    // Adicionar novo subtema
    const novoSubtema = { 
        id: 'curiosidades-esportes', 
        nome: 'Curiosidades', 
        icone: '💡', 
        ordem: subtemasExistentes.length + 1 
    };
    
    // Verificar se já existe
    if (subtemasExistentes.find(s => s.id === novoSubtema.id)) {
        console.log('⚠️ Subtema "curiosidades-esportes" já existe!');
        return;
    }
    
    subtemasExistentes.push(novoSubtema);
    
    // Atualizar o tema com os subtemas
    await setDoc(temaRef, {
        ...temaAtual,
        subtemas: subtemasExistentes,
        atualizadoEm: new Date().toISOString()
    });
    
    console.log('✅ Subtema "Curiosidades" adicionado ao tema Esportes!');
    console.log('   ID: curiosidades-esportes');
    console.log('\n🎉 Recarregue a página para ver.');
})();
