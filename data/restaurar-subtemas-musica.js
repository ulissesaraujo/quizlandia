// Script para RESTAURAR subtemas de Música (antigos + novos)
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
    
    // TODOS os subtemas (antigos restaurados + novos)
    const subtemas = [
        // Antigos (restaurados)
        { id: 'musica-pop', nome: 'Pop', icone: '🎤', ordem: 1 },
        { id: 'musica-rock', nome: 'Rock', icone: '🎸', ordem: 2 },
        { id: 'musica-sertanejo', nome: 'Sertanejo', icone: '🤠', ordem: 3 },
        { id: 'musica-olivia-rodrigo', nome: 'Olivia Rodrigo', icone: '💜', ordem: 4 },
        { id: 'musica-taylor-swift', nome: 'Taylor Swift', icone: '✨', ordem: 5 },
        { id: 'musica-ed-sheeran', nome: 'Ed Sheeran', icone: '🎵', ordem: 6 },
        // Novos
        { id: 'musica-mpb', nome: 'MPB', icone: '🇧🇷', ordem: 7 },
        { id: 'musica-rock-nacional', nome: 'Rock Nacional', icone: '🎸', ordem: 8 },
        { id: 'musica-carnaval', nome: 'Carnaval', icone: '🎭', ordem: 9 },
        { id: 'musica-carnaval-salvador', nome: 'Carnaval Salvador', icone: '🥁', ordem: 10 },
        { id: 'musica-complete', nome: 'Complete a Música', icone: '🎶', ordem: 11 },
        { id: 'musica-historia-curiosidades', nome: 'História e Curiosidades', icone: '📖', ordem: 12 }
    ];
    
    // Atualizar o tema com os subtemas
    await setDoc(temaRef, {
        ...temaAtual,
        subtemas: subtemas,
        atualizadoEm: new Date().toISOString()
    });
    
    console.log('✅ Subtemas restaurados e novos adicionados ao tema musica!');
    console.log('Subtemas:', subtemas.map(s => `${s.icone} ${s.nome}`).join(', '));
    console.log('\n🎉 Recarregue a página para ver os subtemas.');
})();
