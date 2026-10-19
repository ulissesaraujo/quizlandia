// Script para criar subtemas de parques de diversão dentro de "Diversão"
// Cole no console do navegador (F12) na página do admin

(async () => {
    const { doc, getDoc, setDoc, db } = window._firestore;
    
    // Buscar o tema pai atual
    const temaRef = doc(db, "temas", "diversao");
    const temaDoc = await getDoc(temaRef);
    
    if (!temaDoc.exists()) {
        console.error('❌ Tema diversao não encontrado!');
        return;
    }
    
    const temaAtual = temaDoc.data();
    console.log('Tema encontrado:', temaAtual);
    
    // Pegar subtemas existentes ou criar array vazio
    const subtemasExistentes = temaAtual.subtemas || [];
    
    // Novos subtemas de parques
    const novosSubtemas = [
        { id: 'beto-carrero-world', nome: 'Beto Carrero World', icone: '🎢' },
        { id: 'hopi-hari', nome: 'Hopi Hari', icone: '🎡' },
        { id: 'legoland', nome: 'Legoland', icone: '🧱' },
        { id: 'nicolandia-brasilia', nome: 'Nicolândia Brasília', icone: '🎠' }
    ];
    
    // Calcular ordem inicial
    let ordem = subtemasExistentes.length + 1;
    
    // Adicionar novos subtemas (se não existirem)
    for (const novo of novosSubtemas) {
        if (subtemasExistentes.find(s => s.id === novo.id)) {
            console.log(`⚠️ Subtema "${novo.id}" já existe, pulando...`);
        } else {
            subtemasExistentes.push({ ...novo, ordem: ordem++ });
            console.log(`✅ Adicionado: ${novo.nome}`);
        }
    }
    
    // Atualizar o tema com os subtemas
    await setDoc(temaRef, {
        ...temaAtual,
        subtemas: subtemasExistentes,
        atualizadoEm: new Date().toISOString()
    });
    
    console.log('\n🎉 Subtemas de parques adicionados! Recarregue a página para ver.');
})();