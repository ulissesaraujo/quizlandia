// Script para criar subtemas de Literatura
// Cole no console do navegador (F12) na página do admin

(async () => {
    const { doc, getDoc, setDoc, db } = window._firestore;
    
    // Buscar o tema pai atual
    const temaRef = doc(db, "temas", "esc-literatura");
    const temaDoc = await getDoc(temaRef);
    
    if (!temaDoc.exists()) {
        console.error('❌ Tema esc-literatura não encontrado!');
        return;
    }
    
    const temaAtual = temaDoc.data();
    console.log('Tema encontrado:', temaAtual);
    
    // Definir subtemas
    const subtemas = [
        { id: 'lit-6ano', nome: '6º Ano', icone: '6️⃣', ordem: 1 },
        { id: 'lit-7ano', nome: '7º Ano', icone: '7️⃣', ordem: 2 },
        { id: 'lit-8ano', nome: '8º Ano', icone: '8️⃣', ordem: 3 },
        { id: 'lit-9ano', nome: '9º Ano', icone: '9️⃣', ordem: 4 },
        { id: 'lit-1em', nome: '1º EM', icone: '1️⃣', ordem: 5 },
        { id: 'lit-2em', nome: '2º EM', icone: '2️⃣', ordem: 6 },
        { id: 'lit-3em', nome: '3º EM', icone: '3️⃣', ordem: 7 }
    ];
    
    // Atualizar o tema com os subtemas
    await setDoc(temaRef, {
        ...temaAtual,
        subtemas: subtemas,
        atualizadoEm: new Date().toISOString()
    });
    
    console.log('✅ Subtemas adicionados ao esc-literatura!');
    console.log('Subtemas:', subtemas.map(s => s.nome).join(', '));
    console.log('\n🎉 Recarregue a página para ver os subtemas.');
})();
