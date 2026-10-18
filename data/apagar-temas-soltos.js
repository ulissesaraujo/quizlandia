// Script para apagar os temas de literatura criados errado
// Cole no console do navegador (F12) na página do admin

(async () => {
    const { doc, deleteDoc, db } = window._firestore;
    
    const temasParaApagar = [
        'lit-6ano',
        'lit-7ano',
        'lit-8ano',
        'lit-9ano',
        'lit-1em',
        'lit-2em',
        'lit-3em'
    ];
    
    console.log('Apagando temas soltos...');
    
    for (const temaId of temasParaApagar) {
        try {
            await deleteDoc(doc(db, "temas", temaId));
            console.log(`✅ Apagado: ${temaId}`);
        } catch (error) {
            console.log(`⚠️ ${temaId} não existe ou já foi apagado`);
        }
    }
    
    console.log('\n🎉 Pronto! Recarregue a página.');
})();