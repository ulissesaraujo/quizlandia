// ========================================
// AUTH.JS - Autenticação com Google
// ========================================

let auth = null;
let googleProvider = null;
let usuarioAtual = null;
let listaAdmins = [];

// Callbacks para notificar mudanças de estado
let onAuthStateChangedCallback = null;

/**
 * Inicializa o módulo de autenticação
 */
export async function inicializarAuth() {
    try {
        const { getAuth, GoogleAuthProvider, onAuthStateChanged } = 
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        // Pega a instância do app que já foi inicializada
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        
        const firebaseConfig = {
            apiKey: "AIzaSyD_fPui3UT7BCSqUlLzl3E5TDWFkTkkU2I",
            authDomain: "jogo-da-velha-usa.firebaseapp.com",
            databaseURL: "https://jogo-da-velha-usa-default-rtdb.firebaseio.com",
            projectId: "jogo-da-velha-usa",
            storageBucket: "jogo-da-velha-usa.firebasestorage.app",
            messagingSenderId: "371808043984",
            appId: "1:371808043984:web:88e772bae13b93b881efd5"
        };
        
        // Usa app existente ou cria novo
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        
        // Carrega lista de admins do Firebase
        await carregarListaAdmins();
        
        // Observa mudanças de estado de autenticação
        onAuthStateChanged(auth, (user) => {
            usuarioAtual = user;
            console.log('🔐 Estado auth mudou:', user ? user.displayName : 'não logado');
            
            if (onAuthStateChangedCallback) {
                onAuthStateChangedCallback(user);
            }
        });
        
        console.log('✅ Auth inicializado com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar Auth:', error);
        return false;
    }
}

/**
 * Carrega lista de emails admin do Firebase
 */
async function carregarListaAdmins() {
    try {
        // Aguarda Firebase estar pronto
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (window._firestore && window._firestore.db) {
            const { doc, getDoc, db } = window._firestore;
            const configDoc = await getDoc(doc(db, 'configuracoes', 'admins'));
            
            if (configDoc.exists()) {
                listaAdmins = configDoc.data().emails || [];
                console.log('📋 Admins carregados:', listaAdmins.length);
            } else {
                // Fallback: cria documento com lista vazia
                // O admin precisará adicionar emails depois
                console.log('📋 Documento de admins não existe, usando lista vazia');
                listaAdmins = [];
            }
        }
    } catch (error) {
        console.warn('⚠️ Não foi possível carregar lista de admins:', error.message);
        listaAdmins = [];
    }
}

/**
 * Login com Google
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function loginComGoogle() {
    try {
        if (!auth || !googleProvider) {
            throw new Error('Auth não inicializado');
        }
        
        const { signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        console.log('✅ Login Google bem sucedido:', user.displayName);
        
        return {
            success: true,
            user: {
                uid: user.uid,
                nome: user.displayName,
                email: user.email,
                foto: user.photoURL,
                isAdmin: isAdmin(user.email)
            }
        };
    } catch (error) {
        console.error('❌ Erro no login Google:', error);
        
        // Mensagens amigáveis para erros comuns
        let mensagem = 'Erro ao fazer login';
        if (error.code === 'auth/popup-closed-by-user') {
            mensagem = 'Login cancelado';
        } else if (error.code === 'auth/network-request-failed') {
            mensagem = 'Sem conexão com internet';
        } else if (error.code === 'auth/unauthorized-domain') {
            mensagem = 'Domínio não autorizado. Contate o administrador.';
        }
        
        return {
            success: false,
            error: mensagem
        };
    }
}

/**
 * Logout
 */
export async function logout() {
    try {
        if (auth) {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            await signOut(auth);
            usuarioAtual = null;
            console.log('👋 Logout realizado');
        }
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

/**
 * Retorna o usuário atual
 * @returns {Object|null}
 */
export function obterUsuarioAtual() {
    if (!usuarioAtual) return null;
    
    return {
        uid: usuarioAtual.uid,
        nome: usuarioAtual.displayName,
        email: usuarioAtual.email,
        foto: usuarioAtual.photoURL,
        isAdmin: isAdmin(usuarioAtual.email)
    };
}

/**
 * Verifica se está logado
 * @returns {boolean}
 */
export function estaLogado() {
    return usuarioAtual !== null;
}

/**
 * Verifica se um email é admin
 * @param {string} email
 * @returns {boolean}
 */
export function isAdmin(email) {
    if (!email) return false;
    return listaAdmins.includes(email.toLowerCase());
}

/**
 * Define callback para mudanças de estado de auth
 * @param {Function} callback
 */
export function setOnAuthStateChanged(callback) {
    onAuthStateChangedCallback = callback;
}

/**
 * Aguarda o estado de auth estar definido
 * @returns {Promise<Object|null>}
 */
export function aguardarAuth() {
    return new Promise((resolve) => {
        if (usuarioAtual !== undefined) {
            resolve(obterUsuarioAtual());
            return;
        }
        
        const unsubscribe = setOnAuthStateChanged((user) => {
            unsubscribe;
            resolve(user ? obterUsuarioAtual() : null);
        });
        
        // Timeout de 3 segundos
        setTimeout(() => resolve(null), 3000);
    });
}
