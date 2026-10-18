// Script para apagar perguntas do tema geo-3em-extra
// Cole no console do navegador (F12) na página do admin

(async () => {
    const { collection, query, where, getDocs, deleteDoc, db } = window._firestore;
    
    const temaParaApagar = 'geo-3em-extra';
    
    console.log(`🔍 Buscando perguntas do tema: ${temaParaApagar}...`);
    
    const q = query(collection(db, "perguntas"), where("tema", "==", temaParaApagar));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log('❌ Nenhuma pergunta encontrada com esse tema.');
        return;
    }
    
    console.log(`📋 Encontradas ${snapshot.size} perguntas. Apagando...`);
    
    let apagadas = 0;
    for (const docSnap of snapshot.docs) {
        try {
            await deleteDoc(docSnap.ref);
            apagadas++;
            console.log(`✅ Apagada: ${docSnap.id}`);
        } catch (error) {
            console.log(`⚠️ Erro ao apagar ${docSnap.id}:`, error.message);
        }
    }
    
    console.log(`\n🎉 Pronto! ${apagadas} perguntas apagadas do tema ${temaParaApagar}.`);
    console.log('Recarregue a página para atualizar.');
})();
