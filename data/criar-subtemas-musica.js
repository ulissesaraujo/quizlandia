// Script para criar subtemas de Música
// Cole no console do navegador (F12) na página do admin

(async () => {
    const { doc, getDoc, setDoc, db } = window._firestore;
    
    // Buscar o tema pai atual
    const temaRef = doc(db, "temas", "musica");
    const temaDoc = await getDoc(temaRef);
    
    if (!temaDoc.exists()) {
        console.error('❌ Tema musica não encontrado!');
        return;
    }
    
    const temaAtual = temaDoc.data();
    console.log('Tema encontrado:', temaAtual);
    
    // Definir subtemas
    const subtemas = [
        { id: 'musica-mpb', nome: 'MPB', icone: '🎸', ordem: 1 },
        { id: 'musica-banda-nacional', nome: 'Banda Nacional', icone: '🎤', ordem: 2 },
        { id: 'musica-carnaval', nome: 'Carnaval', icone: '🎭', ordem: 3 },
        { id: 'musica-carnaval-salvador', nome: 'Carnaval Salvador', icone: '🥁', ordem: 4 },
        { id: 'musica-complete', nome: 'Complete a Música', icone: '🎵', ordem: 5 }
    ];
    
    // Atualizar o tema com os subtemas
    await setDoc(temaRef, {
        ...temaAtual,
        subtemas: subtemas,
        atualizadoEm: new Date().toISOString()
    });
    
    console.log('✅ Subtemas adicionados ao tema musica!');
    console.log('Subtemas:', subtemas.map(s => s.nome).join(', '));
    console.log('\n🎉 Recarregue a página para ver os subtemas.');
})();
