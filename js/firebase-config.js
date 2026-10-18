// ========================================
// FIREBASE-CONFIG.JS - Configuração Firebase
// ========================================

// Flag para verificar se Firebase está disponível
let firebaseDisponivel = false;
let db = null;

// Temas disponíveis no quiz (ordem alfabética)
// Subtemas são opcionais - quando presentes, aparecem como acordeão
export const TEMAS_DISPONIVEIS = [
    { id: 'arte', nome: 'Arte', icone: '🎨' },
    { id: 'ciencia', nome: 'Ciência', icone: '🔬' },
    { 
        id: 'cinema-series', 
        nome: 'Cinema e Séries', 
        icone: '🎬',
        subtemas: [
            { id: 'harry-potter', nome: 'Harry Potter', icone: '⚡' },
            { id: 'chaves', nome: 'Chaves', icone: '🪣' }
        ]
    },
    { id: 'comidas-bebidas', nome: 'Comidas e Bebidas', icone: '🍔' },
    { 
        id: 'criancas', 
        nome: 'Crianças', 
        icone: '🧒',
        subtemas: [
            { id: 'ingles', nome: 'Inglês', icone: '🇺🇸' },
            { id: 'desenhos', nome: 'Desenhos Animados', icone: '🎬' },
            { id: 'matematica', nome: 'Matemática Divertida', icone: '🔢' },
            { id: 'adivinhas', nome: 'Adivinhas', icone: '🧩' },
            { id: 'planeta', nome: 'Planeta Terra', icone: '🌍' },
            { id: 'corpo', nome: 'Corpo Humano', icone: '🧬' },
            { id: 'musicas', nome: 'Músicas Infantis', icone: '🎵' },
            { id: 'superherois', nome: 'Super-heróis', icone: '🦸' },
            { id: 'espaco', nome: 'Espaço', icone: '🚀' },
            { id: 'alimentos', nome: 'Alimentação Saudável', icone: '🥗' },
            { id: 'contos', nome: 'Contos de Fadas', icone: '🏰' }
        ]
    },
    { id: 'curiosidades', nome: 'Curiosidades', icone: '💡' },
    { 
        id: 'esportes', 
        nome: 'Esportes', 
        icone: '⚽',
        subtemas: [
            { id: 'futebol', nome: 'Futebol', icone: '⚽' },
            { id: 'tenis', nome: 'Tênis', icone: '🎾' },
            { id: 'natacao', nome: 'Natação', icone: '🏊' },
            { id: 'f1', nome: 'F1', icone: '🏎️' },
            { id: 'volei', nome: 'Vôlei', icone: '🏐' },
            { id: 'basquete', nome: 'Basquete', icone: '🏀' },
            { id: 'flamengo', nome: 'Flamengo', icone: '🔴⚫' },
            { id: 'vasco', nome: 'Vasco', icone: '⚫⚪' },
            { id: 'olimpiadas', nome: 'Olimpíadas', icone: '🏅' },
            { id: 'copa-do-mundo', nome: 'Copa do Mundo', icone: '🏆' }
        ]
    },
    { id: 'geografia', nome: 'Geografia', icone: '🗺️' },
    { 
        id: 'historia', 
        nome: 'História', 
        icone: '📜',
        subtemas: [
            { id: 'politica-brasileira', nome: 'Política Brasileira', icone: '🇧🇷' }
        ]
    },
    { 
        id: 'literatura', 
        nome: 'Literatura', 
        icone: '📚',
        subtemas: [
            { id: 'lit-6ano', nome: '6º Ano', icone: '6️⃣' },
            { id: 'lit-7ano', nome: '7º Ano', icone: '7️⃣' },
            { id: 'lit-8ano', nome: '8º Ano', icone: '8️⃣' },
            { id: 'lit-9ano', nome: '9º Ano', icone: '9️⃣' },
            { id: 'lit-1em', nome: '1º Ano EM', icone: '🔟' },
            { id: 'lit-2em', nome: '2º Ano EM', icone: '🔢' },
            { id: 'lit-3em', nome: '3º Ano EM', icone: '🎓' }
        ]
    },
    { id: 'mitos-verdades', nome: 'Mitos ou Verdades', icone: '🤔' },
    { id: 'games', nome: 'Mundo dos Games', icone: '🎮' },
    { 
        id: 'musica', 
        nome: 'Música', 
        icone: '🎵',
        subtemas: [
            { id: 'musica-pop', nome: 'Pop', icone: '🎤' },
            { id: 'musica-rock', nome: 'Rock', icone: '🎸' },
            { id: 'musica-sertanejo', nome: 'Sertanejo', icone: '🤠' },
            { id: 'musica-olivia-rodrigo', nome: 'Olivia Rodrigo', icone: '💜' },
            { id: 'musica-taylor-swift', nome: 'Taylor Swift', icone: '✨' },
            { id: 'musica-ed-sheeran', nome: 'Ed Sheeran', icone: '🎸' }
        ]
    },
    { id: 'nostalgia', nome: 'Nostalgia', icone: '📼' },
    { id: 'z-testes', nome: 'Z-Testes', icone: '🧪' }
];

// Tenta inicializar o Firebase
async function inicializarFirebase() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { 
            getFirestore, 
            collection, 
            addDoc, 
            getDocs, 
            getDoc,
            getCountFromServer,
            doc,
            setDoc,
            updateDoc,
            deleteDoc,
            query, 
            orderBy, 
            where,
            limit,
            writeBatch,
            increment
        } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        const firebaseConfig = {
            apiKey: "AIzaSyD_fPui3UT7BCSqUlLzl3E5TDWFkTkkU2I",
            authDomain: "jogo-da-velha-usa.firebaseapp.com",
            databaseURL: "https://jogo-da-velha-usa-default-rtdb.firebaseio.com",
            projectId: "jogo-da-velha-usa",
            storageBucket: "jogo-da-velha-usa.firebasestorage.app",
            messagingSenderId: "371808043984",
            appId: "1:371808043984:web:88e772bae13b93b881efd5"
        };

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        firebaseDisponivel = true;
        
        // Armazena as funções do Firestore globalmente
        window._firestore = { 
            collection, addDoc, getDocs, getDoc, getCountFromServer, doc, setDoc, updateDoc, deleteDoc,
            query, orderBy, where, limit, writeBatch, increment, db 
        };
        
        console.log('✅ Firebase inicializado com sucesso!');
        return true;
    } catch (error) {
        console.warn('⚠️ Firebase não disponível, usando modo offline:', error.message);
        firebaseDisponivel = false;
        return false;
    }
}

// Inicializa ao carregar
const firebasePromise = inicializarFirebase();

// ========================================
// FUNÇÕES DE TEMAS
// ========================================

/**
 * Busca todos os temas disponíveis
 * Retorna os temas do Firebase com contagem já desnormalizada
 * Se Firebase não disponível, usa temas locais como fallback
 */
export async function buscarTemas() {
    await firebasePromise;
    
    // Tenta buscar do Firebase primeiro
    if (firebaseDisponivel && window._firestore) {
        try {
            const { collection, getDocs, query, orderBy, db } = window._firestore;
            const temasCollection = collection(db, "temas");
            const q = query(temasCollection, orderBy("ordem", "asc"));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const temas = [];
                snapshot.forEach((doc) => {
                    temas.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                console.log(`✅ ${temas.length} temas carregados do Firebase`);
                return temas;
            }
        } catch (error) {
            console.warn("Erro ao buscar temas do Firebase, usando fallback:", error);
        }
    }
    
    // Fallback: usa temas locais (para quando não há temas no Firebase)
    console.log('📝 Usando temas locais (fallback)');
    return TEMAS_DISPONIVEIS.map(t => ({ ...t, totalPerguntas: 0 }));
}

/**
 * Busca informações de um tema específico (incluindo subtemas)
 * Funciona tanto com temas locais quanto do Firebase
 */
export function buscarTemaPorId(temaId, temasCarregados = null) {
    // Se receber temas carregados, usa eles
    const temas = temasCarregados || TEMAS_DISPONIVEIS;
    
    // Primeiro busca nos temas principais
    const temaPrincipal = temas.find(t => t.id === temaId);
    if (temaPrincipal) return temaPrincipal;
    
    // Se não encontrou, busca nos subtemas
    for (const tema of temas) {
        if (tema.subtemas) {
            const subtema = tema.subtemas.find(s => s.id === temaId);
            if (subtema) return { ...subtema, temaPai: tema.id };
        }
    }
    
    return null;
}

/**
 * Retorna todos os IDs de temas relacionados (tema + subtemas)
 * Útil para buscar perguntas quando um tema pai é selecionado
 */
export function obterTodosIdsTema(temaId, temasCarregados = null) {
    const temas = temasCarregados || TEMAS_DISPONIVEIS;
    const tema = temas.find(t => t.id === temaId);
    if (!tema) return [temaId];
    
    const ids = [temaId];
    if (tema.subtemas) {
        tema.subtemas.forEach(s => ids.push(s.id));
    }
    return ids;
}

// ========================================
// FUNÇÕES DE PERGUNTAS
// ========================================

/**
 * Obtém o histórico de perguntas respondidas do jogador (localStorage)
 * @param {string} jogador - Nome do jogador
 * @returns {Array} - Array de IDs de perguntas
 */
function obterHistoricoPerguntas(jogador) {
    const key = `quiz_perguntas_respondidas_${jogador}`;
    const salvo = localStorage.getItem(key);
    
    if (!salvo) return [];
    
    try {
        const dados = JSON.parse(salvo);
        
        // Verifica se é o formato novo (com data) ou antigo (só array)
        if (dados.dataAtualizacao) {
            const agora = Date.now();
            const diasPassados = (agora - dados.dataAtualizacao) / (1000 * 60 * 60 * 24);
            
            // Expira após 30 dias
            if (diasPassados > 30) {
                localStorage.removeItem(key);
                console.log(`🗑️ Histórico de perguntas expirado (${Math.floor(diasPassados)} dias)`);
                return [];
            }
            
            return dados.perguntas || [];
        }
        
        // Formato antigo: migra para o novo
        return Array.isArray(dados) ? dados : [];
    } catch {
        return [];
    }
}

/**
 * Salva IDs de perguntas no histórico do jogador
 * @param {string} jogador - Nome do jogador
 * @param {Array} perguntasIds - IDs das perguntas respondidas
 * @param {number} limite - Quantidade máxima a manter no histórico
 */
export function salvarHistoricoPerguntas(jogador, perguntasIds, limite = 50) {
    if (!jogador || limite === 0) return;
    
    const key = `quiz_perguntas_respondidas_${jogador}`;
    let historico = obterHistoricoPerguntas(jogador);
    
    // Adiciona novas perguntas no início
    historico = [...perguntasIds, ...historico];
    
    // Mantém apenas o limite configurado
    if (historico.length > limite) {
        historico = historico.slice(0, limite);
    }
    
    // Salva com timestamp para controle de expiração
    const dados = {
        perguntas: historico,
        dataAtualizacao: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(dados));
    console.log(`📝 Histórico atualizado: ${historico.length} perguntas (limite: ${limite})`);
}

/**
 * Filtra perguntas para evitar repetição
 * @param {Array} perguntas - Array de perguntas
 * @param {Array} historico - IDs de perguntas a evitar
 * @param {number} quantidade - Quantidade desejada
 * @returns {Array} - Perguntas filtradas
 */
function filtrarPerguntasEvitandoRepeticao(perguntas, historico, quantidade) {
    if (!historico || historico.length === 0) {
        return embaralharArray(perguntas).slice(0, quantidade);
    }
    
    const historicoSet = new Set(historico);
    
    // Separa perguntas novas das já respondidas
    const perguntasNovas = perguntas.filter(p => !historicoSet.has(p.id));
    const perguntasRepetidas = perguntas.filter(p => historicoSet.has(p.id));
    
    console.log(`🔍 Perguntas disponíveis: ${perguntas.length} (novas: ${perguntasNovas.length}, já respondidas: ${perguntasRepetidas.length})`);
    
    // Embaralha as novas
    let resultado = embaralharArray(perguntasNovas);
    
    // Se não tiver suficientes, complementa com repetidas
    if (resultado.length < quantidade) {
        const faltam = quantidade - resultado.length;
        resultado = [...resultado, ...embaralharArray(perguntasRepetidas).slice(0, faltam)];
        console.log(`⚠️ Complementando com ${faltam} perguntas repetidas`);
    }
    
    return resultado.slice(0, quantidade);
}

/**
 * Busca perguntas por temas selecionados
 * @param {Array} temas - Array de IDs de temas (ex: ['geografia', 'historia'])
 * @param {number} quantidade - Quantidade de perguntas para sortear
 * @param {string} jogador - Nome do jogador (para evitar repetição)
 * @param {number} evitarRepeticao - Quantidade de perguntas recentes a evitar
 * @returns {Promise<Array>} - Array de perguntas sorteadas
 */
export async function buscarPerguntasPorTemas(temas, quantidade = 10, jogador = null, evitarRepeticao = 0) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        console.log('Firebase offline - não é possível buscar perguntas');
        return [];
    }
    
    try {
        const { collection, getDocs, query, where, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        
        let todasPerguntas = [];
        
        // Busca perguntas de cada tema usando query com where (mais eficiente)
        for (const temaId of temas) {
            const q = query(
                perguntasCollection,
                where("tema", "==", temaId)
            );
            
            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => {
                todasPerguntas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }
        
        // Aplica filtro de repetição se configurado
        let perguntasSorteadas;
        if (jogador && evitarRepeticao > 0) {
            const historico = obterHistoricoPerguntas(jogador);
            perguntasSorteadas = filtrarPerguntasEvitandoRepeticao(todasPerguntas, historico, quantidade);
        } else {
            perguntasSorteadas = embaralharArray(todasPerguntas).slice(0, quantidade);
        }
        
        console.log(`✅ ${perguntasSorteadas.length} perguntas sorteadas de ${temas.length} tema(s)`);
        return perguntasSorteadas;
    } catch (error) {
        console.error("Erro ao buscar perguntas:", error);
        throw error;
    }
}

/**
 * Busca perguntas aleatórias de todos os temas
 * @param {number} quantidade - Quantidade de perguntas
 * @param {string} jogador - Nome do jogador (para evitar repetição)
 * @param {number} evitarRepeticao - Quantidade de perguntas recentes a evitar
 * @returns {Promise<Array>}
 */
export async function buscarPerguntasAleatorias(quantidade = 10, jogador = null, evitarRepeticao = 0) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    // Temas excluídos do modo aleatório (não afetam ranking geral)
    const temasExcluidos = ['criancas', 'z-testes'];
    
    try {
        const { collection, getDocs, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        
        const snapshot = await getDocs(perguntasCollection);
        const todasPerguntas = [];
        
        snapshot.forEach((doc) => {
            const pergunta = { id: doc.id, ...doc.data() };
            // Filtra temas excluídos
            if (!temasExcluidos.includes(pergunta.tema)) {
                todasPerguntas.push(pergunta);
            }
        });
        
        // Aplica filtro de repetição se configurado
        let perguntasSorteadas;
        if (jogador && evitarRepeticao > 0) {
            const historico = obterHistoricoPerguntas(jogador);
            perguntasSorteadas = filtrarPerguntasEvitandoRepeticao(todasPerguntas, historico, quantidade);
        } else {
            perguntasSorteadas = embaralharArray(todasPerguntas).slice(0, quantidade);
        }
        
        console.log(`✅ ${perguntasSorteadas.length} perguntas aleatórias sorteadas (excluídos: ${temasExcluidos.join(', ')})`);
        return perguntasSorteadas;
    } catch (error) {
        console.error("Erro ao buscar perguntas aleatórias:", error);
        return [];
    }
}

/**
 * Busca perguntas específicas por IDs (para modo Desafio)
 * @param {Array} perguntasIds - Array de IDs das perguntas
 * @returns {Promise<Array>} - Array de perguntas na mesma ordem dos IDs
 */
export async function buscarPerguntasPorIds(perguntasIds) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        console.log('Firebase offline - não é possível buscar perguntas');
        return [];
    }
    
    if (!perguntasIds || perguntasIds.length === 0) {
        return [];
    }
    
    try {
        const { doc, getDoc, db } = window._firestore;
        
        const perguntas = [];
        
        // Busca cada pergunta pelo ID
        for (const perguntaId of perguntasIds) {
            const docRef = doc(db, "perguntas", perguntaId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                perguntas.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            } else {
                console.warn(`Pergunta não encontrada: ${perguntaId}`);
            }
        }
        
        console.log(`✅ ${perguntas.length} perguntas carregadas para desafio`);
        return perguntas;
    } catch (error) {
        console.error("Erro ao buscar perguntas por IDs:", error);
        return [];
    }
}

/**
 * Busca uma partida específica pelo sessaoId
 * @param {string} sessaoId - ID da sessão/partida
 * @returns {Promise<Object|null>}
 */
export async function buscarPartidaPorSessaoId(sessaoId) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return null;
    }
    
    try {
        const { collection, getDocs, query, where, db } = window._firestore;
        const resultsCollection = collection(db, "quiz-results");
        
        const q = query(
            resultsCollection,
            where("sessaoId", "==", sessaoId)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }
        
        // Retorna o primeiro resultado (deve ser único)
        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error("Erro ao buscar partida:", error);
        return null;
    }
}

/**
 * Busca ranking de uma partida específica (todos que jogaram a mesma sessão)
 * @param {string} sessaoId - ID da sessão original
 * @param {number} limite - Quantidade máxima de resultados
 * @returns {Promise<Array>}
 */
export async function buscarRankingPorSessao(sessaoId, limite = 50) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, getDocs, query, where, orderBy, limit: limitFn, db } = window._firestore;
        const resultsCollection = collection(db, "quiz-results");
        
        // Busca todos que jogaram esta sessão ou desafiaram ela
        const q = query(
            resultsCollection,
            where("sessaoOriginalId", "==", sessaoId),
            orderBy("pontuacaoTotal", "desc"),
            limitFn(limite)
        );
        
        const snapshot = await getDocs(q);
        const ranking = [];
        
        snapshot.forEach((doc) => {
            ranking.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return ranking;
    } catch (error) {
        console.error("Erro ao buscar ranking da sessão:", error);
        // Se der erro de índice, tenta busca simples
        return [];
    }
}

/**
 * Adiciona uma nova pergunta ao Firebase
 * @param {Object} pergunta - Dados da pergunta
 */
export async function adicionarPergunta(pergunta) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { collection, addDoc, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        
        const docRef = await addDoc(perguntasCollection, {
            ...pergunta,
            criadoEm: new Date().toISOString()
        });
        
        console.log("✅ Pergunta adicionada com ID:", docRef.id);
        return docRef;
    } catch (error) {
        console.error("Erro ao adicionar pergunta:", error);
        throw error;
    }
}

/**
 * Adiciona múltiplas perguntas em lote
 * @param {Array} perguntas - Array de perguntas
 */
export async function adicionarPerguntasEmLote(perguntas) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { collection, writeBatch, doc, db } = window._firestore;
        const batch = writeBatch(db);
        const perguntasCollection = collection(db, "perguntas");
        
        perguntas.forEach((pergunta) => {
            const novoDoc = doc(perguntasCollection);
            batch.set(novoDoc, {
                ...pergunta,
                criadoEm: new Date().toISOString()
            });
        });
        
        await batch.commit();
        console.log(`✅ ${perguntas.length} perguntas adicionadas em lote`);
        return true;
    } catch (error) {
        console.error("Erro ao adicionar perguntas em lote:", error);
        throw error;
    }
}

/**
 * Busca todas as perguntas (para o painel admin)
 */
export async function buscarTodasPerguntas() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, getDocs, query, orderBy, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        
        const q = query(perguntasCollection, orderBy("criadoEm", "desc"));
        const snapshot = await getDocs(q);
        
        const perguntas = [];
        snapshot.forEach((doc) => {
            perguntas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return perguntas;
    } catch (error) {
        console.error("Erro ao buscar todas as perguntas:", error);
        return [];
    }
}

/**
 * Busca perguntas marcadas para revisão
 */
export async function buscarPerguntasRevisao() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, getDocs, query, where, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        
        const q = query(perguntasCollection, where("revisar", "==", true));
        const snapshot = await getDocs(q);
        
        const perguntas = [];
        snapshot.forEach((doc) => {
            perguntas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordena localmente por data de revisão (mais recentes primeiro)
        perguntas.sort((a, b) => {
            const dataA = a.dataRevisao || '';
            const dataB = b.dataRevisao || '';
            return dataB.localeCompare(dataA);
        });
        
        console.log(`🔍 Encontradas ${perguntas.length} perguntas para revisão`);
        return perguntas;
    } catch (error) {
        console.error("Erro ao buscar perguntas para revisão:", error);
        return [];
    }
}

/**
 * Busca perguntas destacadas
 */
export async function buscarPerguntasDestaque() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, getDocs, query, where, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        
        const q = query(perguntasCollection, where("destaque", "==", true));
        const snapshot = await getDocs(q);
        
        const perguntas = [];
        snapshot.forEach((doc) => {
            perguntas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordena localmente por data de destaque (mais recentes primeiro)
        perguntas.sort((a, b) => {
            const dataA = a.dataDestaque || '';
            const dataB = b.dataDestaque || '';
            return dataB.localeCompare(dataA);
        });
        
        console.log(`⭐ Encontradas ${perguntas.length} perguntas destacadas`);
        return perguntas;
    } catch (error) {
        console.error("Erro ao buscar perguntas destacadas:", error);
        return [];
    }
}

/**
 * Conta perguntas para revisão (sem trazer dados)
 * @returns {Promise<number>}
 */
export async function contarPerguntasRevisao() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return 0;
    }
    
    try {
        const { collection, getCountFromServer, query, where, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        const q = query(perguntasCollection, where("revisar", "==", true));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Erro ao contar revisões:", error);
        return 0;
    }
}

/**
 * Conta perguntas destacadas (sem trazer dados)
 * @returns {Promise<number>}
 */
export async function contarPerguntasDestaque() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return 0;
    }
    
    try {
        const { collection, getCountFromServer, query, where, db } = window._firestore;
        const perguntasCollection = collection(db, "perguntas");
        const q = query(perguntasCollection, where("destaque", "==", true));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Erro ao contar destaques:", error);
        return 0;
    }
}

/**
 * Exclui uma pergunta
 * @param {string} perguntaId - ID da pergunta
 */
export async function excluirPergunta(perguntaId) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, deleteDoc, db } = window._firestore;
        await deleteDoc(doc(db, "perguntas", perguntaId));
        console.log("✅ Pergunta excluída:", perguntaId);
        return true;
    } catch (error) {
        console.error("Erro ao excluir pergunta:", error);
        throw error;
    }
}

/**
 * Exclui todas as perguntas de um tema específico
 * @param {string} tema - ID do tema
 * @returns {Promise<{sucesso: boolean, excluidas: number}>}
 */
export async function excluirPerguntasPorTema(tema) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    const { collection, getDocs, deleteDoc, doc, query, where, db } = window._firestore;
    
    try {
        // Busca todas as perguntas do tema
        const q = query(collection(db, "perguntas"), where("tema", "==", tema));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log("⚠️ Nenhuma pergunta encontrada para o tema:", tema);
            return { sucesso: true, excluidas: 0 };
        }
        
        // Exclui em lotes de 10 para não sobrecarregar
        const deletePromises = [];
        let count = 0;
        
        snapshot.forEach((documento) => {
            deletePromises.push(deleteDoc(doc(db, "perguntas", documento.id)));
            count++;
        });
        
        await Promise.all(deletePromises);
        
        console.log(`🗑️ ${count} perguntas do tema "${tema}" excluídas com sucesso`);
        return { sucesso: true, excluidas: count };
    } catch (error) {
        console.error("Erro ao excluir perguntas do tema:", error);
        throw error;
    }
}

/**
 * Atualiza uma pergunta existente
 * @param {string} perguntaId - ID da pergunta
 * @param {Object} dados - Dados a atualizar
 */
export async function atualizarPergunta(perguntaId, dados) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, updateDoc, db } = window._firestore;
        await updateDoc(doc(db, "perguntas", perguntaId), dados);
        console.log("✅ Pergunta atualizada:", perguntaId);
        return true;
    } catch (error) {
        console.error("Erro ao atualizar pergunta:", error);
        throw error;
    }
}

/**
 * Marca uma pergunta para revisão
 * @param {string} perguntaId - ID da pergunta
 * @param {string} motivo - Motivo da revisão (opcional)
 * @returns {Promise<boolean>}
 */
export async function marcarPerguntaRevisao(perguntaId, motivo = '') {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, updateDoc, increment, db } = window._firestore;
        await updateDoc(doc(db, "perguntas", perguntaId), {
            revisar: true,
            motivoRevisao: motivo,
            dataRevisao: new Date().toISOString(),
            reportes: increment(1)
        });
        console.log("🔍 Pergunta marcada para revisão:", perguntaId);
        return true;
    } catch (error) {
        console.error("Erro ao marcar pergunta para revisão:", error);
        throw error;
    }
}

/**
 * Marca uma pergunta como destaque (excelente)
 * @param {string} perguntaId - ID da pergunta
 * @returns {Promise<boolean>}
 */
export async function marcarPerguntaDestaque(perguntaId) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, updateDoc, increment, db } = window._firestore;
        await updateDoc(doc(db, "perguntas", perguntaId), {
            destaque: true,
            curtidas: increment(1),
            dataDestaque: new Date().toISOString()
        });
        console.log("⭐ Pergunta marcada como destaque:", perguntaId);
        return true;
    } catch (error) {
        console.error("Erro ao marcar pergunta como destaque:", error);
        throw error;
    }
}

/**
 * Busca perguntas por tema específico
 * @param {string} tema - ID do tema
 * @returns {Promise<Array>} - Array de perguntas com id
 */
export async function buscarPerguntasPorTema(tema) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, query, where, orderBy, getDocs, db } = window._firestore;
        const perguntasRef = collection(db, "perguntas");
        const q = query(
            perguntasRef, 
            where("tema", "==", tema),
            orderBy("criadoEm", "desc")
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Erro ao buscar perguntas por tema:", error);
        return [];
    }
}

// ========================================
// FUNÇÕES DE RESULTADO/RANKING
// ========================================

/**
 * Salva o resultado de uma partida no Firebase
 */
export async function salvarResultado(resultado) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        console.log('Firebase offline - resultado salvo apenas localmente');
        return null;
    }
    
    try {
        const { collection, addDoc, db } = window._firestore;
        const quizResultsCollection = collection(db, "quiz-results");
        
        const docRef = await addDoc(quizResultsCollection, {
            ...resultado,
            dataHora: new Date().toISOString()
        });
        console.log("✅ Resultado salvo no Firebase com ID:", docRef.id);
        return docRef;
    } catch (error) {
        console.error("Erro ao salvar resultado:", error);
        throw error;
    }
}

/**
 * Busca o ranking global ordenado por pontuação
 */
export async function buscarRanking(limite = 50) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        console.log('Firebase offline - ranking não disponível');
        return [];
    }
    
    try {
        const { collection, getDocs, query, orderBy, limit: limitFn, db } = window._firestore;
        const quizResultsCollection = collection(db, "quiz-results");
        
        const q = query(
            quizResultsCollection,
            orderBy("pontuacaoTotal", "desc"),
            orderBy("dataHora", "asc"),
            limitFn(limite)
        );
        
        const snapshot = await getDocs(q);
        const ranking = [];
        
        snapshot.forEach((doc) => {
            ranking.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return ranking;
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        if (error.message && error.message.includes('index')) {
            console.log('⚠️ É necessário criar um índice no Firebase. Verifique o link acima.');
        }
        return [];
    }
}

/**
 * Busca o ranking filtrado por temas
 */
export async function buscarRankingPorTemas(temas, limite = 20) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, getDocs, query, orderBy, where, limit: limitFn, db } = window._firestore;
        const quizResultsCollection = collection(db, "quiz-results");
        
        // Firestore tem limitação com array-contains-any, então fazemos uma busca mais ampla
        const q = query(
            quizResultsCollection,
            orderBy("pontuacaoTotal", "desc"),
            orderBy("dataHora", "asc"),
            limitFn(limite * 2) // Busca mais para filtrar depois
        );
        
        const snapshot = await getDocs(q);
        const ranking = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Filtra pelos temas se especificado
            if (temas && temas.length > 0) {
                const temasPartida = data.temas || [];
                const temIntersecao = temas.some(t => temasPartida.includes(t));
                if (temIntersecao) {
                    ranking.push({ id: doc.id, ...data });
                }
            } else {
                ranking.push({ id: doc.id, ...data });
            }
        });
        
        return ranking.slice(0, limite);
    } catch (error) {
        console.error("Erro ao buscar ranking por temas:", error);
        return [];
    }
}

/**
 * Busca histórico de partidas de um jogador
 */
export async function buscarHistoricoJogador(jogador, limite = 20) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        return [];
    }
    
    try {
        const { collection, getDocs, query, where, orderBy, limit: limitFn, db } = window._firestore;
        const quizResultsCollection = collection(db, "quiz-results");
        
        const q = query(
            quizResultsCollection,
            where("jogador", "==", jogador),
            orderBy("dataHora", "desc"),
            limitFn(limite)
        );
        
        const snapshot = await getDocs(q);
        const historico = [];
        
        snapshot.forEach((doc) => {
            historico.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return historico;
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        return [];
    }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Embaralha um array usando Fisher-Yates
 */
function embaralharArray(array) {
    const novoArray = [...array];
    for (let i = novoArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [novoArray[i], novoArray[j]] = [novoArray[j], novoArray[i]];
    }
    return novoArray;
}

/**
 * Verifica se o Firebase está disponível
 */
export function isFirebaseDisponivel() {
    return firebaseDisponivel;
}

/**
 * Exclui todas as partidas (resultados) do Firebase
 * @returns {Promise<number>} - Número de partidas excluídas
 */
export async function excluirTodasPartidas() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    const { collection, getDocs, deleteDoc, doc, db } = window._firestore;
    
    try {
        const resultadosRef = collection(db, 'quiz-results');
        const snapshot = await getDocs(resultadosRef);
        
        let count = 0;
        const deletePromises = [];
        
        snapshot.forEach((documento) => {
            deletePromises.push(deleteDoc(doc(db, 'quiz-results', documento.id)));
            count++;
        });
        
        await Promise.all(deletePromises);
        
        console.log(`✅ ${count} partidas excluídas`);
        return count;
    } catch (error) {
        console.error("Erro ao excluir partidas:", error);
        throw error;
    }
}

/**
 * Aguarda o Firebase inicializar
 */
export async function aguardarFirebase() {
    return firebasePromise;
}

// ========================================
// FUNÇÕES DE CONFIGURAÇÃO GLOBAL
// ========================================

const CONFIG_PADRAO = {
    qtdPerguntas: 10,
    evitarRepeticao: 50,
    tempoPergunta: 10,
    ajudaTempo: true,
    tempoExtra: 10,
    ajudaEliminar: true,
    ajudaPular: false
};

/**
 * Busca as configurações globais do quiz
 * @returns {Promise<Object>} - Objeto com as configurações
 */
export async function buscarConfiguracoes() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        console.log('Firebase offline - usando configurações padrão');
        return CONFIG_PADRAO;
    }
    
    try {
        const { doc, getDoc, db } = window._firestore;
        const configRef = doc(db, 'configuracoes', 'global');
        const configDoc = await getDoc(configRef);
        
        if (configDoc.exists()) {
            const config = configDoc.data();
            console.log('✅ Configurações carregadas do Firebase');
            return { ...CONFIG_PADRAO, ...config };
        } else {
            console.log('📝 Usando configurações padrão');
            return CONFIG_PADRAO;
        }
    } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        return CONFIG_PADRAO;
    }
}

/**
 * Salva as configurações globais do quiz
 * @param {Object} config - Objeto com as configurações
 * @returns {Promise<boolean>} - true se salvou com sucesso
 */
export async function salvarConfiguracoes(config) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, setDoc, db } = window._firestore;
        const configRef = doc(db, 'configuracoes', 'global');
        
        await setDoc(configRef, {
            ...config,
            atualizadoEm: new Date().toISOString()
        });
        
        console.log('✅ Configurações salvas no Firebase');
        return true;
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        throw error;
    }
}

/**
 * Retorna as configurações padrão
 */
export function getConfigPadrao() {
    return { ...CONFIG_PADRAO };
}

// ========================================
// FUNÇÕES DE CRUD DE TEMAS
// ========================================

/**
 * Busca todos os temas do Firebase
 * @returns {Promise<Array>} - Array de temas
 */
export async function buscarTemasFirebase() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        console.log('Firebase offline - usando temas locais');
        return TEMAS_DISPONIVEIS.map(t => ({ ...t, totalPerguntas: 0 }));
    }
    
    try {
        const { collection, getDocs, query, orderBy, db } = window._firestore;
        const temasCollection = collection(db, "temas");
        const q = query(temasCollection, orderBy("ordem", "asc"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log('📝 Nenhum tema no Firebase, usando temas locais');
            return TEMAS_DISPONIVEIS.map(t => ({ ...t, totalPerguntas: 0 }));
        }
        
        const temas = [];
        snapshot.forEach((doc) => {
            temas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ ${temas.length} temas carregados do Firebase`);
        return temas;
    } catch (error) {
        console.error("Erro ao buscar temas:", error);
        return TEMAS_DISPONIVEIS.map(t => ({ ...t, totalPerguntas: 0 }));
    }
}

/**
 * Salva um tema no Firebase (criar ou atualizar)
 * @param {Object} tema - Dados do tema
 * @returns {Promise<string>} - ID do tema
 */
export async function salvarTema(tema) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, setDoc, db } = window._firestore;
        const temaRef = doc(db, "temas", tema.id);
        
        await setDoc(temaRef, {
            nome: tema.nome,
            icone: tema.icone,
            ordem: tema.ordem || 0,
            totalPerguntas: tema.totalPerguntas || 0,
            subtemas: tema.subtemas || null,
            atualizadoEm: new Date().toISOString()
        });
        
        console.log("✅ Tema salvo:", tema.id);
        return tema.id;
    } catch (error) {
        console.error("Erro ao salvar tema:", error);
        throw error;
    }
}

/**
 * Exclui um tema do Firebase
 * @param {string} temaId - ID do tema
 */
export async function excluirTema(temaId) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, deleteDoc, db } = window._firestore;
        await deleteDoc(doc(db, "temas", temaId));
        console.log("✅ Tema excluído:", temaId);
        return true;
    } catch (error) {
        console.error("Erro ao excluir tema:", error);
        throw error;
    }
}

/**
 * Atualiza a contagem de perguntas de um tema
 * @param {string} temaId - ID do tema (pode ser tema raiz ou subtema)
 * @returns {Promise<number>} - Nova contagem
 */
export async function atualizarContagemTema(temaId) {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    console.log(`📊 atualizarContagemTema chamada para: ${temaId}`);
    
    try {
        const { collection, getDocs, query, where, doc, getDoc, updateDoc, db } = window._firestore;
        
        // Primeiro, tenta buscar como tema raiz
        const temaRef = doc(db, "temas", temaId);
        const temaDoc = await getDoc(temaRef);
        
        console.log(`📊 Tema ${temaId} existe como raiz: ${temaDoc.exists()}`);
        
        if (temaDoc.exists()) {
            // É um tema raiz - processa normalmente
            const temaData = temaDoc.data();
            let totalPerguntas = 0;
            
            // Conta perguntas do tema principal
            const qPrincipal = query(collection(db, "perguntas"), where("tema", "==", temaId));
            const snapshotPrincipal = await getDocs(qPrincipal);
            totalPerguntas = snapshotPrincipal.size;
            
            // Se tem subtemas, conta e atualiza cada um
            let subtemasAtualizados = null;
            if (temaData.subtemas && temaData.subtemas.length > 0) {
                subtemasAtualizados = await Promise.all(
                    temaData.subtemas.map(async (subtema) => {
                        const qSub = query(collection(db, "perguntas"), where("tema", "==", subtema.id));
                        const snapshotSub = await getDocs(qSub);
                        const subCount = snapshotSub.size;
                        totalPerguntas += subCount;
                        return { ...subtema, totalPerguntas: subCount };
                    })
                );
            }
            
            // Atualiza o tema no Firebase
            await updateDoc(temaRef, {
                totalPerguntas,
                subtemas: subtemasAtualizados || temaData.subtemas,
                atualizadoEm: new Date().toISOString()
            });
            
            console.log(`✅ Contagem atualizada para ${temaId}: ${totalPerguntas} perguntas`);
            return totalPerguntas;
        } else {
            // Não é tema raiz - pode ser subtema, busca o tema pai
            console.log(`🔍 ${temaId} não é tema raiz, buscando tema pai...`);
            const temasCollection = collection(db, "temas");
            const temasSnapshot = await getDocs(temasCollection);
            
            console.log(`🔍 Buscando em ${temasSnapshot.size} temas...`);
            
            for (const temaDocItem of temasSnapshot.docs) {
                const temaData = temaDocItem.data();
                if (temaData.subtemas && temaData.subtemas.some(s => s.id === temaId)) {
                    // Encontrou o tema pai - atualiza ele (que vai atualizar todos os subtemas)
                    console.log(`🔍 ${temaId} é subtema de ${temaDocItem.id}, atualizando tema pai...`);
                    return await atualizarContagemTema(temaDocItem.id);
                }
            }
            
            console.error(`❌ Tema não encontrado: ${temaId}`);
            throw new Error(`Tema não encontrado: ${temaId}`);
        }
    } catch (error) {
        console.error("Erro ao atualizar contagem:", error);
        throw error;
    }
}

/**
 * Atualiza a contagem de perguntas de TODOS os temas
 * @returns {Promise<Object>} - Resumo da atualização
 */
export async function atualizarContagemTodosTemas() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const temas = await buscarTemasFirebase();
        let totalAtualizado = 0;
        
        for (const tema of temas) {
            await atualizarContagemTema(tema.id);
            totalAtualizado++;
        }
        
        console.log(`✅ Contagem atualizada para ${totalAtualizado} temas`);
        return { temasAtualizados: totalAtualizado };
    } catch (error) {
        console.error("Erro ao atualizar contagem de todos os temas:", error);
        throw error;
    }
}

/**
 * Migra os temas locais (TEMAS_DISPONIVEIS) para o Firebase
 * @returns {Promise<number>} - Quantidade de temas migrados
 */
export async function migrarTemasParaFirebase() {
    await firebasePromise;
    
    if (!firebaseDisponivel || !window._firestore) {
        throw new Error('Firebase não disponível');
    }
    
    try {
        const { doc, setDoc, db } = window._firestore;
        let count = 0;
        
        for (let i = 0; i < TEMAS_DISPONIVEIS.length; i++) {
            const tema = TEMAS_DISPONIVEIS[i];
            const temaRef = doc(db, "temas", tema.id);
            
            await setDoc(temaRef, {
                nome: tema.nome,
                icone: tema.icone,
                ordem: i + 1,
                totalPerguntas: 0,
                subtemas: tema.subtemas ? tema.subtemas.map(s => ({
                    id: s.id,
                    nome: s.nome,
                    icone: s.icone,
                    totalPerguntas: 0
                })) : null,
                criadoEm: new Date().toISOString()
            });
            
            count++;
        }
        
        console.log(`✅ ${count} temas migrados para o Firebase`);
        return count;
    } catch (error) {
        console.error("Erro ao migrar temas:", error);
        throw error;
    }
}

export { db, firebaseDisponivel };
