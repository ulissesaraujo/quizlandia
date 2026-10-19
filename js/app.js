// ========================================
// APP.JS - Aplicação Principal Quizlândia
// ========================================

import { QuizEngine } from './quiz.js';
import { RankingManager } from './ranking.js';
import { TemasManager } from './temas.js';
import { buscarPerguntasPorIds, buscarConfiguracoes, salvarHistoricoPerguntas, marcarPerguntaRevisao, marcarPerguntaDestaque } from './firebase-config.js';
import { Anunciador, GerenciadorFoco, NavegacaoTeclado } from './acessibilidade.js';

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

/**
 * Toca beep de alerta usando Web Audio API
 * @param {number} vezes - Quantidade de beeps (1 = amarelo, 2 = vermelho)
 */
function tocarBeep(vezes = 1) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const tocarUmBeep = (delay = 0) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.frequency.value = 800; // Frequência do beep (Hz)
            oscillator.type = 'sine';
            
            gainNode.gain.value = 0.3; // Volume (0 a 1)
            
            const startTime = audioCtx.currentTime + delay;
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.15); // Duração do beep (150ms)
        };
        
        for (let i = 0; i < vezes; i++) {
            tocarUmBeep(i * 0.25); // 250ms entre beeps
        }
    } catch (e) {
        // Silencia erros de áudio (pode falhar em alguns navegadores)
    }
}

/**
 * Verifica se está em modo mobile (tela pequena)
 */
function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * Entra em modo fullscreen (esconde barra do navegador no mobile)
 */
function entrarFullscreen() {
    // Só tenta fullscreen em mobile
    if (!isMobile()) return;
    
    const elem = document.documentElement;
    
    try {
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } catch (e) {
        // Silencia erros de fullscreen (requer interação do usuário)
    }
}

/**
 * Sai do modo fullscreen
 */
function sairFullscreen() {
    try {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    } catch (e) {
        // Silencia erros
    }
}

/**
 * Separa emojis do início do texto
 * Retorna { emoji: string|null, texto: string }
 */
function separarEmojiDoTexto(enunciado) {
    // Se contém sinais matemáticos, é uma expressão - não separa
    if (/[+\-=×÷]/.test(enunciado)) {
        return { emoji: null, texto: enunciado };
    }
    
    // Regex para detectar emojis no início (incluindo sequências de emojis)
    const emojiRegex = /^([\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\s]+)/u;
    const match = enunciado.match(emojiRegex);
    
    if (match) {
        const emoji = match[1].trim();
        // Remove o emoji e quebras de linha do início
        let texto = enunciado.slice(match[0].length).replace(/^\n+/, '').trim();
        
        // Só considera como emoji separado se tiver pelo menos um emoji real
        if (emoji && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(emoji)) {
            return { emoji, texto };
        }
    }
    
    return { emoji: null, texto: enunciado };
}

// ========================================
// ESTADO DA APLICAÇÃO
// ========================================
const estado = {
    jogador: '',
    carregando: false,
    config: null, // Configurações globais do quiz
    perguntasReserva: [] // Perguntas extras para quando o usuário pular (pode ser mais de uma)
};

// Instâncias dos gerenciadores
const quizEngine = new QuizEngine();
const rankingManager = new RankingManager();
const temasManager = new TemasManager();

// ========================================
// SISTEMA DE AJUDAS FLEXÍVEL
// ========================================

/**
 * Calcula a configuração de ajudas baseado nos temas selecionados
 * @param {string[]} temasSelecionados - IDs dos temas selecionados
 * @param {Object} configBase - Configurações base do sistema
 * @returns {Object} Configuração de ajudas { tempo, eliminar, pular }
 */
function calcularAjudasPorTema(temasSelecionados, configBase) {
    // Configuração padrão: 1 uso cada, multiplicador 1x
    const ajudas = {
        tempo: { 
            disponivel: configBase.ajudaTempo ? 1 : 0, 
            usado: 0, 
            multiplicador: 1 
        },
        eliminar: { 
            disponivel: configBase.ajudaEliminar ? 1 : 0, 
            usado: 0, 
            multiplicador: 1 
        },
        pular: { 
            disponivel: configBase.ajudaPular ? 1 : 0, 
            usado: 0, 
            multiplicador: 1 
        }
    };
    
    // Prefixos de subtemas escolares (mat-, qui-, fis-, bio-, his-, geo-, por-, ing-)
    const prefixosEscolares = ['mat-', 'qui-', 'fis-', 'bio-', 'his-', 'geo-', 'por-', 'ing-'];
    
    // Verifica se algum tema selecionado é escolar (esc-* ou subtemas com prefixos escolares)
    const temEscolar = temasSelecionados.some(t => 
        t.startsWith('esc-') || 
        prefixosEscolares.some(prefix => t.startsWith(prefix))
    );
    
    // Verifica se é o tema crianças
    const temCriancas = temasSelecionados.includes('criancas') || 
                        temasSelecionados.some(t => ['ingles', 'desenhos', 'matematica', 'adivinhas', 
                            'planeta', 'corpo', 'musicas', 'superherois', 'espaco', 
                            'alimentos', 'contos'].includes(t));
    
    // Regras especiais para temas escolares: 3x tempo com dobro do valor
    if (temEscolar && configBase.ajudaTempo) {
        ajudas.tempo.disponivel = 3;
        ajudas.tempo.multiplicador = 2; // Dobro do tempo configurado
        console.log('📚 Tema escolar detectado: 3x ajuda tempo com 2x valor');
    }
    
    // Regras especiais para tema crianças: 3x eliminar
    if (temCriancas && configBase.ajudaEliminar) {
        ajudas.eliminar.disponivel = 3;
        console.log('🧒 Tema crianças detectado: 3x ajuda eliminar');
    }
    
    return ajudas;
}

// ========================================
// ELEMENTOS DO DOM
// ========================================
const elementos = {
    // Telas
    telaLogin: document.getElementById('tela-login'),
    telaTemas: document.getElementById('tela-temas'),
    telaQuiz: document.getElementById('tela-quiz'),
    telaResultado: document.getElementById('tela-resultado'),
    
    // Login
    formLogin: document.getElementById('form-login'),
    inputNome: document.getElementById('nome-jogador'),
    displayJogador: document.getElementById('display-jogador'),
    btnTrocarJogador: document.getElementById('btn-trocar-jogador'),
    btnMenuHamburguer: document.getElementById('btn-menu-hamburguer'),
    menuDropdown: document.getElementById('menu-dropdown'),
    
    // Temas
    temasGrid: document.getElementById('temas-grid'),
    btnAleatorio: document.getElementById('btn-aleatorio'),
    btnJogar: document.getElementById('btn-jogar'),
    badgeSelecionados: document.getElementById('badge-selecionados'),
    selecaoInfo: document.getElementById('selecao-info'),
    btnVerRankingSalas: document.getElementById('btn-ver-ranking-salas'),
    btnVerRankingGeral: document.getElementById('btn-ver-ranking-geral'),
    // Link para limpar seleção
    limparSelecaoLink: document.getElementById('limpar-selecao-link'),
    linkLimparSelecao: document.getElementById('link-limpar-selecao'),
    
    // Quiz
    perguntaContador: document.getElementById('pergunta-contador'),
    // pontosAtuais removido - pontos só aparecem no resultado final
    faseLeitura: document.getElementById('fase-leitura'),
    countdownNumero: document.getElementById('countdown-numero'),
    perguntaEnunciado: document.getElementById('pergunta-enunciado'),
    perguntaTema: document.getElementById('pergunta-tema'),
    alternativasContainer: document.getElementById('alternativas-container'),
    cronometro: document.getElementById('cronometro'),
    cronometroTempo: document.getElementById('cronometro-tempo'),
    ajudasBar: document.getElementById('ajudas-bar'),
    btnAjudaTempo: document.getElementById('btn-ajuda-tempo'),
    btnAjudaEliminar: document.getElementById('btn-ajuda-eliminar'),
    btnAjudaPular: document.getElementById('btn-ajuda-pular'),
    alternativas: document.getElementById('alternativas'),
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackTexto: document.getElementById('feedback-texto'),
    feedbackPontos: document.getElementById('feedback-pontos'),
    feedback: document.getElementById('feedback'),
    btnDesistir: document.getElementById('btn-desistir'),
    
    // Resultado
    resultadoTemas: document.getElementById('resultado-temas'),
    resultadoPontuacao: document.getElementById('resultado-pontuacao'),
    resultadoAcertos: document.getElementById('resultado-acertos'),
    resultadoTempo: document.getElementById('resultado-tempo'),
    resultadoMensagem: document.getElementById('resultado-mensagem'),
    detalhesLista: document.getElementById('detalhes-lista'),
    rankingPartidaBody: document.getElementById('ranking-partida-body'),
    btnJogarNovamente: document.getElementById('btn-jogar-novamente'),
    btnVoltarTemas: document.getElementById('btn-voltar-temas'),
    btnRankingGlobal: document.getElementById('btn-ranking-global'),
    
    // Modal Ranking por Sala
    modalRanking: document.getElementById('modal-ranking'),
    modalFechar: document.getElementById('modal-fechar'),
    rankingGlobalBody: document.getElementById('ranking-global-body'),
    
    // Modal Ranking Geral
    modalRankingGeral: document.getElementById('modal-ranking-geral'),
    modalFecharGeral: document.getElementById('modal-fechar-geral'),
    rankingGeralBody: document.getElementById('ranking-geral-body'),
    
    // Modal Ajuda
    modalAjuda: document.getElementById('modal-ajuda'),
    btnAjuda: document.getElementById('btn-ajuda'),
    btnFecharAjuda: document.getElementById('btn-fechar-ajuda')
};

// ========================================
// NAVEGAÇÃO ENTRE TELAS
// ========================================
function mostrarTela(telaNome) {
    // Oculta todas as telas
    document.querySelectorAll('.tela').forEach(tela => {
        tela.classList.remove('ativa');
    });
    
    // Mostra a tela selecionada
    const tela = document.getElementById(`tela-${telaNome}`);
    if (tela) {
        tela.classList.add('ativa');
        
        // Gerencia foco para acessibilidade
        GerenciadorFoco.moverFoco(`tela-${telaNome}`);
        
        // Anuncia mudança de tela para leitores de tela
        const titulosTelas = {
            'login': 'Tela de login',
            'temas': 'Seleção de temas',
            'quiz': 'Quiz iniciado',
            'resultado': 'Resultado da partida'
        };
        
        if (titulosTelas[telaNome]) {
            Anunciador.anunciar(titulosTelas[telaNome]);
        }
        
        // Atualiza UI dos temas quando volta para a tela de seleção
        if (telaNome === 'temas') {
            // Usa setTimeout para garantir que o DOM está pronto
            setTimeout(() => atualizarUITemas(), 0);
        }
    }
}

// ========================================
// TELA DE LOGIN
// ========================================
async function inicializarLogin() {
    // Verifica se já existe um jogador salvo
    const jogadorSalvo = localStorage.getItem('quiz_jogador');
    if (jogadorSalvo) {
        estado.jogador = jogadorSalvo;
        rankingManager.setJogador(jogadorSalvo);
        elementos.inputNome.value = jogadorSalvo;
        
        // Auto-login: pula direto para temas se já tem jogador
        await rankingManager.carregarHistorico();
        elementos.displayJogador.textContent = jogadorSalvo;
        await carregarTemas();
        mostrarTela('temas');
        
        // Mostra atalho admin se jogador for Admin
        const btnAdmin = document.getElementById('btn-painel-admin');
        if (btnAdmin) {
            if (jogadorSalvo.toLowerCase() === 'admin') {
                btnAdmin.classList.remove('oculto');
            } else {
                btnAdmin.classList.add('oculto');
            }
        }
        
        console.log(`🚀 Auto-login: ${jogadorSalvo}`);
    }
    
    elementos.formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = elementos.inputNome.value.trim();
        
        if (nome.length >= 2) {
            estado.jogador = nome;
            localStorage.setItem('quiz_jogador', nome);
            rankingManager.setJogador(nome);
            
            // Carrega histórico do jogador
            await rankingManager.carregarHistorico();
            
            // Atualiza display e vai para seleção de temas
            elementos.displayJogador.textContent = nome;
            await carregarTemas();
            mostrarTela('temas');
            
            // Mostra atalho admin se jogador for Admin
            const btnAdmin = document.getElementById('btn-painel-admin');
            if (btnAdmin) {
                if (nome.toLowerCase() === 'admin') {
                    btnAdmin.classList.remove('oculto');
                } else {
                    btnAdmin.classList.add('oculto');
                }
            }
        }
    });
}

// ========================================
// TELA DE SELEÇÃO DE TEMAS
// ========================================
async function carregarTemas() {
    estado.carregando = true;
    
    try {
        await temasManager.carregarTemas();
        renderizarTemas();
    } catch (error) {
        console.error('Erro ao carregar temas:', error);
    } finally {
        estado.carregando = false;
    }
}

function renderizarTemas() {
    const temas = temasManager.obterTemas();
    
    elementos.temasGrid.innerHTML = '';
    
    temas.forEach((tema, index) => {
        const selecionado = temasManager.temaSelecionado(tema.id);
        const temSubtemas = tema.subtemas && tema.subtemas.length > 0;
        const parcialmenteSelecionado = temasManager.temaParcialmenteSelecionado(tema.id);
        
        // Container do tema (com ou sem subtemas)
        const temaContainer = document.createElement('div');
        temaContainer.className = 'tema-container';
        
        const card = document.createElement('div');
        card.className = `tema-card${selecionado ? ' selecionado' : ''}${parcialmenteSelecionado ? ' parcial' : ''}${temSubtemas ? ' tem-subtemas' : ''}`;
        card.dataset.temaId = tema.id;
        
        // Atributos de acessibilidade
        card.setAttribute('role', 'checkbox');
        card.setAttribute('aria-checked', selecionado ? 'true' : (parcialmenteSelecionado ? 'mixed' : 'false'));
        card.setAttribute('aria-label', `${tema.nome}, ${tema.totalPerguntas || 0} perguntas${selecionado ? ', selecionado' : ''}`);
        card.setAttribute('tabindex', '0');
        
        // Indicador de subtemas
        const expandirBtn = temSubtemas ? `<span class="tema-expandir" aria-hidden="true">▶</span>` : '';
        
        // Texto do contador (mostra "Em manutenção" se 0 perguntas)
        const contadorTexto = (tema.totalPerguntas || 0) === 0 
            ? '🔧 Em manutenção' 
            : `${tema.totalPerguntas} perguntas`;
        
        card.innerHTML = `
            <span class="tema-icone" aria-hidden="true">${tema.icone}</span>
            <h3 class="tema-nome">${tema.nome}</h3>
            <span class="tema-contador">${contadorTexto}</span>
            ${expandirBtn}
        `;
        
        // Click handler para selecionar tema
        card.addEventListener('click', (e) => {
            // Se clicou no botão de expandir, não seleciona
            if (e.target.classList.contains('tema-expandir')) {
                toggleSubtemas(temaContainer);
                return;
            }
            console.log('🖱️ Click no tema:', tema.id);
            temasManager.alternarTema(tema.id);
            atualizarUITemas();
        });
        
        // Keyboard handler
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                temasManager.alternarTema(tema.id);
                atualizarUITemas();
            }
            // Seta direita expande subtemas
            if (e.key === 'ArrowRight' && temSubtemas) {
                e.preventDefault();
                temaContainer.classList.add('expandido');
            }
            // Seta esquerda colapsa
            if (e.key === 'ArrowLeft' && temSubtemas) {
                e.preventDefault();
                temaContainer.classList.remove('expandido');
            }
        });
        
        temaContainer.appendChild(card);
        
        // Renderiza subtemas se existirem
        if (temSubtemas) {
            const subtemasContainer = document.createElement('div');
            subtemasContainer.className = 'subtemas-container';
            
            tema.subtemas.forEach(subtema => {
                const subtemaCard = criarCardSubtema(subtema, tema.id);
                subtemasContainer.appendChild(subtemaCard);
            });
            
            temaContainer.appendChild(subtemasContainer);
        }
        
        elementos.temasGrid.appendChild(temaContainer);
    });
    
    atualizarUITemas();
}

/**
 * Cria um card de subtema
 */
function criarCardSubtema(subtema, temaPaiId) {
    const selecionado = temasManager.temaSelecionado(subtema.id, true);
    
    const card = document.createElement('div');
    card.className = `subtema-card${selecionado ? ' selecionado' : ''}`;
    card.dataset.subtemaId = subtema.id;
    card.dataset.temaPaiId = temaPaiId;
    
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', selecionado ? 'true' : 'false');
    card.setAttribute('aria-label', `${subtema.nome}, ${subtema.totalPerguntas || 0} perguntas${selecionado ? ', selecionado' : ''}`);
    card.setAttribute('tabindex', '0');
    
    // Texto do contador (mostra "🔧" se 0 perguntas)
    const contadorTexto = (subtema.totalPerguntas || 0) === 0 
        ? '🔧' 
        : subtema.totalPerguntas;
    
    card.innerHTML = `
        <span class="subtema-icone" aria-hidden="true">${subtema.icone}</span>
        <span class="subtema-nome">${subtema.nome}</span>
        <span class="subtema-contador">${contadorTexto}</span>
    `;
    
    card.addEventListener('click', () => {
        temasManager.alternarTema(subtema.id, true);
        atualizarUITemas();
    });
    
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            temasManager.alternarTema(subtema.id, true);
            atualizarUITemas();
        }
    });
    
    return card;
}

/**
 * Expande/colapsa subtemas de um tema
 */
function toggleSubtemas(temaContainer) {
    temaContainer.classList.toggle('expandido');
    const expandirBtn = temaContainer.querySelector('.tema-expandir');
    if (expandirBtn) {
        expandirBtn.textContent = temaContainer.classList.contains('expandido') ? '▼' : '▶';
    }
}

function atualizarUITemas() {
    const temas = temasManager.obterTemas();
    const temasSelecionados = temasManager.obterTemasSelecionados();
    const numTemasPrincipais = temasManager.obterTemasPrincipaisSelecionados().length;
    const numSubtemas = temasManager.subtemasSelecionados.size;
    const numSelecionados = numTemasPrincipais + numSubtemas;
    const modoAleatorio = temasManager.isModoAleatorio();
    
    console.log('📊 atualizarUITemas:', { numTemasPrincipais, numSubtemas, numSelecionados, modoAleatorio });
    
    // Atualiza cards de temas principais
    document.querySelectorAll('.tema-card').forEach(card => {
        const temaId = card.dataset.temaId;
        const selecionado = temasManager.temaSelecionado(temaId);
        const parcialmenteSelecionado = temasManager.temaParcialmenteSelecionado(temaId);
        const tema = temas.find(t => t.id === temaId);
        
        card.classList.toggle('selecionado', selecionado);
        card.classList.toggle('parcial', parcialmenteSelecionado);
        
        // Atualiza ARIA
        card.setAttribute('aria-checked', selecionado ? 'true' : (parcialmenteSelecionado ? 'mixed' : 'false'));
        if (tema) {
            card.setAttribute('aria-label', `${tema.nome}, ${tema.totalPerguntas || 0} perguntas${selecionado ? ', selecionado' : ''}`);
        }
    });
    
    // Atualiza cards de subtemas
    document.querySelectorAll('.subtema-card').forEach(card => {
        const subtemaId = card.dataset.subtemaId;
        const selecionado = temasManager.temaSelecionado(subtemaId, true);
        
        card.classList.toggle('selecionado', selecionado);
        card.setAttribute('aria-checked', selecionado ? 'true' : 'false');
    });
    
    // Atualiza botão aleatório
    if (modoAleatorio) {
        elementos.btnAleatorio.classList.add('ativo');
        elementos.btnAleatorio.setAttribute('aria-pressed', 'true');
    } else {
        elementos.btnAleatorio.classList.remove('ativo');
        elementos.btnAleatorio.setAttribute('aria-pressed', 'false');
    }
    
    // Atualiza badge do botão jogar e elementos de limpar
    const temSelecao = numSelecionados > 0 && !modoAleatorio;
    
    if (temSelecao) {
        elementos.badgeSelecionados.textContent = numSelecionados;
        elementos.badgeSelecionados.classList.remove('oculto');
        // Mostra link de limpar
        elementos.limparSelecaoLink?.classList.remove('oculto');
    } else {
        elementos.badgeSelecionados.classList.add('oculto');
        // Oculta link de limpar
        elementos.limparSelecaoLink?.classList.add('oculto');
    }
    
    // Atualiza estado do botão jogar
    const podeIniciar = temasManager.podeIniciar();
    elementos.btnJogar.disabled = !podeIniciar;
    elementos.btnJogar.setAttribute('aria-disabled', !podeIniciar ? 'true' : 'false');
    
    // Atualiza info de seleção (mais discreto)
    const totalPerguntas = temasManager.totalPerguntasDisponiveis();
    if (podeIniciar) {
        const descricao = temasManager.gerarDescricaoSelecao();
        elementos.selecaoInfo.textContent = `${descricao} • ${totalPerguntas} perguntas`;
    } else {
        elementos.selecaoInfo.textContent = '';
    }
}

function inicializarTemas() {
    // Menu hambúrguer
    elementos.btnMenuHamburguer?.addEventListener('click', () => {
        const menu = elementos.menuDropdown;
        const isOpen = !menu.classList.contains('oculto');
        
        if (isOpen) {
            menu.classList.add('oculto');
            elementos.btnMenuHamburguer.setAttribute('aria-expanded', 'false');
        } else {
            menu.classList.remove('oculto');
            elementos.btnMenuHamburguer.setAttribute('aria-expanded', 'true');
        }
    });
    
    // Fecha menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-container')) {
            elementos.menuDropdown?.classList.add('oculto');
            elementos.btnMenuHamburguer?.setAttribute('aria-expanded', 'false');
        }
    });
    
    // Botão aleatório - vai direto para o jogo com temas aleatórios
    elementos.btnAleatorio.addEventListener('click', async () => {
        temasManager.setModoAleatorio(true);
        atualizarUITemas();
        await iniciarQuiz();
    });
    
    // Botão jogar
    elementos.btnJogar.addEventListener('click', async () => {
        if (!temasManager.podeIniciar()) return;
        await iniciarQuiz();
    });
    
    // Botão trocar jogador
    elementos.btnTrocarJogador.addEventListener('click', () => {
        elementos.menuDropdown?.classList.add('oculto');
        mostrarTela('login');
    });
    
    // Botão ver ranking por sala (agrupado)
    elementos.btnVerRankingSalas.addEventListener('click', () => {
        elementos.menuDropdown?.classList.add('oculto');
        mostrarRankingGlobal();
    });
    
    // Botão ver ranking geral (lista simples)
    elementos.btnVerRankingGeral.addEventListener('click', () => {
        elementos.menuDropdown?.classList.add('oculto');
        mostrarRankingGeral();
    });
    
    // Botão de ajuda / como jogar
    elementos.btnAjuda?.addEventListener('click', () => {
        elementos.menuDropdown?.classList.add('oculto');
        mostrarModalAjuda();
    });
    
    // Fechar modal de ajuda
    elementos.btnFecharAjuda?.addEventListener('click', () => {
        elementos.modalAjuda?.classList.add('oculto');
    });
    
    // Fechar modal de ajuda clicando fora
    elementos.modalAjuda?.addEventListener('click', (e) => {
        if (e.target === elementos.modalAjuda) {
            elementos.modalAjuda.classList.add('oculto');
        }
    });
    
    // Link para limpar seleção
    elementos.linkLimparSelecao?.addEventListener('click', (e) => {
        e.preventDefault();
        temasManager.limparSelecao();
        renderizarTemas();
    });
    
    // Callback quando seleção muda
    temasManager.onSelecaoAlterada = () => {
        console.log('🔄 Seleção alterada - atualizando UI');
        atualizarUITemas();
    };
    
    console.log('✅ Callback onSelecaoAlterada configurado');
}

// ========================================
// TELA DE QUIZ
// ========================================
async function iniciarQuiz() {
    estado.carregando = true;
    elementos.btnJogar.disabled = true;
    
    // Atualiza apenas o texto, mantendo a estrutura do botão
    const textoBtn = elementos.btnJogar.querySelector('.btn-acao-texto');
    if (textoBtn) {
        textoBtn.textContent = 'Carregando...';
    }
    
    try {
        // Carrega configurações globais
        estado.config = await buscarConfiguracoes();
        const qtdPerguntas = estado.config.qtdPerguntas || 10;
        const evitarRepeticao = estado.config.evitarRepeticao || 0;
        
        // Obtém temas selecionados para calcular ajudas
        const temasSelecionados = temasManager.obterTemasSelecionados();
        
        // Calcula ajudas específicas para os temas selecionados
        const ajudas = calcularAjudasPorTema(temasSelecionados, estado.config);
        
        // Quantidade de perguntas reserva = quantidade de pulos disponíveis
        const qtdReserva = ajudas.pular.disponivel;
        const qtdBuscar = qtdPerguntas + qtdReserva;
        
        // Busca perguntas usando a quantidade configurada + reservas
        const perguntas = await temasManager.buscarPerguntas(qtdBuscar, estado.jogador, evitarRepeticao);
        
        if (perguntas.length === 0) {
            alert('Não há perguntas disponíveis para os temas selecionados.');
            return;
        }
        
        // Separa perguntas reserva e perguntas principais
        let perguntasQuiz = perguntas;
        estado.perguntasReserva = [];
        
        if (qtdReserva > 0 && perguntas.length > qtdPerguntas) {
            perguntasQuiz = perguntas.slice(0, qtdPerguntas);
            estado.perguntasReserva = perguntas.slice(qtdPerguntas, qtdPerguntas + qtdReserva);
            console.log(`🎯 ${estado.perguntasReserva.length} pergunta(s) reserva carregada(s): ${estado.perguntasReserva.map(p => p.id).join(', ')}`);
        }
        
        // Prepara configuração dos temas
        const configTemas = temasManager.serializarParaResultado();
        
        // Atualiza UI (pontos só aparecem no resultado final)
        
        // Atualiza o badge do tema na barra de controles
        if (elementos.perguntaTema) {
            elementos.perguntaTema.textContent = configTemas.descricao;
        }
        
        // Configura callbacks do quiz engine
        configurarCallbacksQuiz();
        
        // Adiciona ajudas à configuração
        const configComAjudas = { ...estado.config, ajudas };
        
        // Inicia o quiz com as configurações
        quizEngine.iniciar(perguntasQuiz, configTemas, configComAjudas);
        
        // Configura os botões de ajuda APÓS iniciar o quiz (ajudas já estão setadas)
        configurarAjudas();
        
        // Mostra tela do quiz
        mostrarTela('quiz');
        
        // Entra em fullscreen no mobile para mais espaço
        entrarFullscreen();
    } catch (error) {
        console.error('Erro ao iniciar quiz:', error);
        // Mostra mensagem mais específica se disponível
        const msg = error.message || 'Erro desconhecido';
        alert(`Erro ao carregar perguntas: ${msg}`);
    } finally {
        estado.carregando = false;
        elementos.btnJogar.disabled = false;
        
        // Restaura o texto do botão
        const textoBtn = elementos.btnJogar.querySelector('.btn-acao-texto');
        if (textoBtn) {
            textoBtn.textContent = 'Jogar';
        }
    }
}

/**
 * Inicia um desafio - joga com as mesmas perguntas de outro jogador
 * @param {Object} partidaOriginal - Dados da partida a ser desafiada
 */
async function iniciarDesafio(partidaOriginal) {
    // Determina o ID da sessão original (pode ser a própria sessão ou uma sessão que ela desafiou)
    const sessaoOriginalId = partidaOriginal.sessaoOriginalId || partidaOriginal.sessaoId;
    
    // Verifica se o jogador já jogou esta sessão
    if (rankingManager.jaJogouSessao(sessaoOriginalId)) {
        alert('Você já jogou este desafio! Não é possível jogar novamente as mesmas perguntas.');
        return;
    }
    
    // Verifica se a partida tem os IDs das perguntas
    if (!partidaOriginal.perguntasIds || partidaOriginal.perguntasIds.length === 0) {
        alert('Esta partida não suporta desafio (formato antigo).');
        return;
    }
    
    estado.carregando = true;
    
    try {
        // Fecha o modal se estiver aberto
        elementos.modalRanking.classList.add('oculto');
        
        // Carrega configurações globais (se ainda não carregou)
        if (!estado.config) {
            estado.config = await buscarConfiguracoes();
        }
        
        // Busca as perguntas específicas pelo ID
        const perguntas = await buscarPerguntasPorIds(partidaOriginal.perguntasIds);
        
        if (perguntas.length === 0) {
            alert('Não foi possível carregar as perguntas do desafio.');
            return;
        }
        
        // Calcula ajudas baseadas nos temas do desafio
        const temasDesafio = partidaOriginal.temas || [];
        const ajudas = calcularAjudasPorTema(temasDesafio, estado.config);
        
        // Prepara configuração do desafio
        const configDesafio = {
            temas: temasDesafio,
            temasNomes: partidaOriginal.temasNomes || [],
            modoAleatorio: partidaOriginal.modoAleatorio || false,
            descricao: `⚔️ Desafio: ${partidaOriginal.jogador}`,
            modoDesafio: true,
            sessaoOriginalId: sessaoOriginalId,
            jogadorDesafiado: partidaOriginal.jogador
        };
        
        // Atualiza UI
        if (elementos.perguntaTema) {
            elementos.perguntaTema.textContent = configDesafio.descricao;
        }
        // Pontos só aparecem no resultado final
        
        // Configura callbacks do quiz engine
        configurarCallbacksQuiz();
        
        // Adiciona ajudas à configuração
        const configComAjudas = { ...estado.config, ajudas };
        
        // Inicia o quiz em modo desafio
        quizEngine.iniciar(perguntas, configDesafio, configComAjudas);
        
        // Configura os botões de ajuda APÓS iniciar o quiz
        configurarAjudas();
        
        console.log(`⚔️ Desafio iniciado contra ${partidaOriginal.jogador} - Temas: ${temasDesafio.join(', ')}`);
        
        // Mostra tela do quiz
        mostrarTela('quiz');
        
        // Entra em fullscreen no mobile para mais espaço
        entrarFullscreen();
    } catch (error) {
        console.error('Erro ao iniciar desafio:', error);
        alert('Erro ao carregar o desafio. Tente novamente.');
    } finally {
        estado.carregando = false;
    }
}

function configurarCallbacksQuiz() {
    quizEngine.onPerguntaCarregada = ({ numero, total, pergunta, tema }) => {
        elementos.perguntaContador.textContent = `${numero}/${total}`;
        
        // Detecta emojis no início do enunciado
        const { emoji, texto } = separarEmojiDoTexto(pergunta.enunciado);
        
        if (emoji) {
            // Mostra emoji grande separado do texto
            elementos.perguntaEnunciado.innerHTML = `<span class="pergunta-emoji">${emoji}</span><span class="pergunta-texto">${texto}</span>`;
        } else {
            elementos.perguntaEnunciado.textContent = pergunta.enunciado;
        }
        
        // Mostra o tema da pergunta se disponível (útil para modo aleatório)
        // Se a pergunta tem tema específico, mostra ele; senão mantém o tema geral
        if (elementos.perguntaTema && tema) {
            const temaObj = temasManager.obterTemaPorId(tema);
            if (temaObj) {
                // Se é subtema, mostra "Tema Pai - Subtema"
                if (temaObj.temaPaiNome) {
                    elementos.perguntaTema.textContent = `${temaObj.temaPaiIcone || ''} ${temaObj.temaPaiNome} - ${temaObj.nome}`.trim();
                } else {
                    elementos.perguntaTema.textContent = `${temaObj.icone} ${temaObj.nome}`;
                }
            }
        }
        
        // Reseta estados visuais
        elementos.feedbackContainer.classList.add('oculto');
        elementos.alternativasContainer.classList.add('oculto');
        elementos.cronometro.classList.add('oculto'); // Esconde cronômetro durante leitura
        
        // Desabilita ajudas durante fase de leitura
        habilitarAjudas(false);
        
        // Limpa alternativas anteriores para forçar nova renderização
        elementos.alternativas.innerHTML = '';
        elementos.alternativas.dataset.perguntaId = '';
    };
    
    quizEngine.onFaseLeitura = ({ segundos, ativa }) => {
        if (ativa) {
            elementos.faseLeitura.classList.remove('oculto');
            elementos.countdownNumero.textContent = segundos;
        } else {
            elementos.faseLeitura.classList.add('oculto');
        }
    };
    
    quizEngine.onFaseResposta = ({ ativa, tempo, tempoLimite }) => {
        if (ativa) {
            elementos.faseLeitura.classList.add('oculto');
            elementos.alternativasContainer.classList.remove('oculto');
            elementos.cronometro.classList.remove('oculto');
            
            // Usa o tempo limite configurado (padrão 10s)
            const limite = tempoLimite || 10;
            
            // Cronômetro regressivo: mostra tempo RESTANTE
            const tempoRestante = Math.max(0, limite - tempo);
            elementos.cronometroTempo.textContent = `${tempoRestante.toFixed(1)}s`;
            
            // Calcula thresholds para alertas (baseado no tempo restante)
            const tempoAlerta = limite * 0.4;  // 40% restante = alerta
            const tempoCritico = limite * 0.2; // 20% restante = crítico
            
            // Estado anterior para detectar transição
            const eraAlerta = elementos.cronometroTempo.classList.contains('alerta');
            const eraCritico = elementos.cronometroTempo.classList.contains('critico');
            
            // Muda cor do cronômetro conforme o tempo restante
            elementos.cronometroTempo.classList.remove('alerta', 'critico');
            if (tempoRestante <= tempoCritico) {
                elementos.cronometroTempo.classList.add('critico');
                // Beep duplo ao entrar em crítico (vermelho)
                if (!eraCritico) {
                    tocarBeep(2);
                }
            } else if (tempoRestante <= tempoAlerta) {
                elementos.cronometroTempo.classList.add('alerta');
                // Beep simples ao entrar em alerta (amarelo)
                if (!eraAlerta && !eraCritico) {
                    tocarBeep(1);
                }
            }
            
            // Habilita ajudas quando fase de resposta inicia (alternativas visíveis)
            habilitarAjudas(true);
            
            // Renderiza alternativas apenas uma vez
            const perguntaAtual = quizEngine.perguntas[quizEngine.perguntaAtual];
            if (elementos.alternativas.children.length === 0 || 
                elementos.alternativas.dataset.perguntaId !== perguntaAtual.id) {
                renderizarAlternativas();
            }
        }
    };
    
    quizEngine.onPontuacaoAtualizada = (pontuacao) => {
        // Pontos não são mais exibidos durante o quiz, apenas no resultado final
        console.log('Pontuação atual:', pontuacao);
    };
    
    quizEngine.onRespostaProcessada = (resultado) => {
        mostrarFeedback(resultado);
    };
    
    quizEngine.onQuizFinalizado = (resultado) => {
        mostrarResultado(resultado);
    };
    
    // Nota: configurarAjudas() é chamado após quizEngine.iniciar() na função iniciarQuiz()
}

/**
 * Configura os botões de ajuda baseado nas configurações e ajudas calculadas
 * Inicia desabilitado - será habilitado quando a fase de resposta começar
 */
function configurarAjudas() {
    const config = estado.config || {};
    const ajudas = quizEngine.ajudas || {};
    
    // Configura botão de tempo
    if (elementos.btnAjudaTempo) {
        const tempoDisponivel = ajudas.tempo?.disponivel > 0;
        elementos.btnAjudaTempo.style.display = tempoDisponivel ? 'flex' : 'none';
        elementos.btnAjudaTempo.disabled = true; // Inicia desabilitado
        elementos.btnAjudaTempo.classList.remove('usado');
        atualizarBadgeAjuda(elementos.btnAjudaTempo, ajudas.tempo);
    }
    
    // Configura botão de eliminar
    if (elementos.btnAjudaEliminar) {
        const eliminarDisponivel = ajudas.eliminar?.disponivel > 0;
        elementos.btnAjudaEliminar.style.display = eliminarDisponivel ? 'flex' : 'none';
        elementos.btnAjudaEliminar.disabled = true; // Inicia desabilitado
        elementos.btnAjudaEliminar.classList.remove('usado');
        atualizarBadgeAjuda(elementos.btnAjudaEliminar, ajudas.eliminar);
    }
    
    // Configura botão de pular (não disponível no modo desafio - perguntas são fixas)
    if (elementos.btnAjudaPular) {
        const pularDisponivel = ajudas.pular?.disponivel > 0 && !quizEngine.modoDesafio;
        elementos.btnAjudaPular.style.display = pularDisponivel ? 'flex' : 'none';
        elementos.btnAjudaPular.disabled = true; // Inicia desabilitado
        elementos.btnAjudaPular.classList.remove('usado');
        atualizarBadgeAjuda(elementos.btnAjudaPular, ajudas.pular);
    }
    
    // Verifica se há alguma ajuda ativada (pular não conta no modo desafio)
    const temAjudas = (ajudas.tempo?.disponivel > 0) || 
                      (ajudas.eliminar?.disponivel > 0) || 
                      (ajudas.pular?.disponivel > 0 && !quizEngine.modoDesafio);
    if (elementos.ajudasBar) {
        elementos.ajudasBar.style.display = temAjudas ? 'flex' : 'none';
    }
}

/**
 * Habilita ou desabilita os botões de ajuda
 * @param {boolean} habilitar - true para habilitar, false para desabilitar
 */
function habilitarAjudas(habilitar) {
    const ajudas = quizEngine.ajudas || {};
    
    // Só habilita se ainda tiver ajuda disponível e não estiver marcado como usado
    if (elementos.btnAjudaTempo && elementos.btnAjudaTempo.style.display !== 'none') {
        const temDisponivel = quizEngine.ajudaDisponivel('tempo');
        elementos.btnAjudaTempo.disabled = !habilitar || !temDisponivel;
    }
    
    if (elementos.btnAjudaEliminar && elementos.btnAjudaEliminar.style.display !== 'none') {
        const temDisponivel = quizEngine.ajudaDisponivel('eliminar');
        elementos.btnAjudaEliminar.disabled = !habilitar || !temDisponivel;
    }
    
    if (elementos.btnAjudaPular && elementos.btnAjudaPular.style.display !== 'none') {
        const temDisponivel = quizEngine.ajudaDisponivel('pular');
        elementos.btnAjudaPular.disabled = !habilitar || !temDisponivel;
    }
}

/**
 * Atualiza o badge de contador em um botão de ajuda
 * @param {HTMLElement} btn - Botão da ajuda
 * @param {Object} ajuda - Dados da ajuda { disponivel, usado, multiplicador }
 */
function atualizarBadgeAjuda(btn, ajuda) {
    if (!btn || !ajuda) return;
    
    // Remove badge existente
    let badge = btn.querySelector('.ajuda-badge');
    
    const restante = ajuda.disponivel - ajuda.usado;
    
    // Só mostra badge se tiver mais de 1 disponível ou se já usou alguma
    if (ajuda.disponivel > 1 || ajuda.usado > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'ajuda-badge';
            btn.appendChild(badge);
        }
        badge.textContent = restante;
        badge.style.display = restante > 0 ? 'flex' : 'none';
    } else if (badge) {
        badge.remove();
    }
}

/**
 * Inicializa os event listeners dos botões de ajuda (chamado uma vez na inicialização)
 */
function inicializarAjudas() {
    if (elementos.btnAjudaTempo) {
        elementos.btnAjudaTempo.addEventListener('click', usarAjudaTempo);
    }
    
    if (elementos.btnAjudaEliminar) {
        elementos.btnAjudaEliminar.addEventListener('click', usarAjudaEliminar);
    }
    
    if (elementos.btnAjudaPular) {
        elementos.btnAjudaPular.addEventListener('click', usarAjudaPular);
    }
}

/**
 * Usa a ajuda de tempo extra
 */
function usarAjudaTempo() {
    if (!quizEngine.ajudaDisponivel('tempo') || !estado.config?.ajudaTempo) return;
    
    const resultado = quizEngine.usarAjuda('tempo');
    if (!resultado.sucesso) return;
    
    // Atualiza badge
    atualizarBadgeAjuda(elementos.btnAjudaTempo, quizEngine.ajudas.tempo);
    
    // Se não tem mais, desabilita o botão
    if (resultado.restante === 0) {
        elementos.btnAjudaTempo.disabled = true;
        elementos.btnAjudaTempo.classList.add('usado');
    }
    
    // Adiciona tempo extra ao cronômetro (multiplicador pode dobrar o valor)
    const tempoBase = estado.config.tempoExtra || 10;
    const tempoExtra = tempoBase * resultado.multiplicador;
    quizEngine.tempoAdicional += tempoExtra; // Adiciona ao tempo adicional
    
    console.log(`⏱️ Ajuda usada: +${tempoExtra} segundos (${resultado.multiplicador}x) - Restante: ${resultado.restante}`);
}

/**
 * Usa a ajuda de eliminar alternativas
 */
function usarAjudaEliminar() {
    if (!quizEngine.ajudaDisponivel('eliminar') || !estado.config?.ajudaEliminar) return;
    if (quizEngine.respondeu) return;
    
    const resultado = quizEngine.usarAjuda('eliminar');
    if (!resultado.sucesso) return;
    
    // Atualiza badge
    atualizarBadgeAjuda(elementos.btnAjudaEliminar, quizEngine.ajudas.eliminar);
    
    // Se não tem mais, desabilita o botão
    if (resultado.restante === 0) {
        elementos.btnAjudaEliminar.disabled = true;
        elementos.btnAjudaEliminar.classList.add('usado');
    }
    
    const pergunta = quizEngine.perguntas[quizEngine.perguntaAtual];
    const correta = pergunta.correta;
    
    // Encontra índices das alternativas erradas que ainda não foram eliminadas
    const botoes = elementos.alternativas.querySelectorAll('.alternativa-btn');
    const erradas = [];
    for (let i = 0; i < pergunta.alternativas.length; i++) {
        if (i !== correta && botoes[i] && !botoes[i].disabled) {
            erradas.push(i);
        }
    }
    
    // Embaralha e pega 2 erradas para eliminar (ou menos se não tiver)
    const qtdEliminar = Math.min(2, erradas.length);
    const eliminar = erradas.sort(() => Math.random() - 0.5).slice(0, qtdEliminar);
    
    // Desabilita os botões das alternativas eliminadas
    eliminar.forEach(idx => {
        if (botoes[idx]) {
            botoes[idx].disabled = true;
            botoes[idx].style.opacity = '0.3';
            botoes[idx].style.textDecoration = 'line-through';
        }
    });
    
    console.log(`❌ Ajuda usada: Eliminadas alternativas ${eliminar.map(i => i + 1).join(' e ')} - Restante: ${resultado.restante}`);
}

/**
 * Usa a ajuda de pular pergunta - usa as perguntas reserva carregadas no início
 */
function usarAjudaPular() {
    if (!quizEngine.ajudaDisponivel('pular') || !estado.config?.ajudaPular) return;
    if (quizEngine.respondeu) return;
    
    const resultado = quizEngine.usarAjuda('pular');
    if (!resultado.sucesso) return;
    
    // Atualiza badge
    atualizarBadgeAjuda(elementos.btnAjudaPular, quizEngine.ajudas.pular);
    
    // Se não tem mais, desabilita o botão
    if (resultado.restante === 0) {
        elementos.btnAjudaPular.disabled = true;
        elementos.btnAjudaPular.classList.add('usado');
    }
    
    // Para o cronômetro
    clearInterval(quizEngine.timerCronometro);
    
    // Pega a pergunta atual que será pulada
    const perguntaPulada = quizEngine.perguntas[quizEngine.perguntaAtual];
    
    console.log(`⏭️ Ajuda usada: Pulando pergunta "${perguntaPulada.id}" - Restante: ${resultado.restante}`);
    
    // Usa a próxima pergunta reserva se disponível
    if (estado.perguntasReserva && estado.perguntasReserva.length > 0) {
        const perguntaReserva = estado.perguntasReserva.shift(); // Remove e retorna a primeira
        quizEngine.perguntas[quizEngine.perguntaAtual] = perguntaReserva;
        console.log(`✅ Usando pergunta reserva: "${perguntaReserva.id}" (restam ${estado.perguntasReserva.length} reservas)`);
    } else {
        // Sem reserva - remove a pergunta pulada
        console.log(`⚠️ Sem pergunta reserva disponível`);
        quizEngine.perguntas.splice(quizEngine.perguntaAtual, 1);
    }
    
    // Recarrega (nova pergunta ou próxima)
    setTimeout(() => quizEngine.carregarPergunta(), 300);
}

function renderizarAlternativas() {
    const pergunta = quizEngine.perguntas[quizEngine.perguntaAtual];
    elementos.alternativas.innerHTML = '';
    elementos.alternativas.dataset.perguntaId = pergunta.id;
    
    // Letras das alternativas para anúncios
    const letras = ['A', 'B', 'C', 'D'];
    
    pergunta.alternativas.forEach((texto, indice) => {
        const btn = document.createElement('button');
        btn.className = 'alternativa-btn';
        btn.textContent = texto;
        
        // Atributos de acessibilidade
        btn.setAttribute('aria-label', `Alternativa ${letras[indice]}: ${texto}. Pressione ${indice + 1} para selecionar.`);
        btn.setAttribute('data-indice', indice);
        
        btn.addEventListener('click', () => {
            quizEngine.responder(indice);
        });
        elementos.alternativas.appendChild(btn);
    });
    
    // Ativa navegação por teclado (1-4) para alternativas
    NavegacaoTeclado.ativarAtalhos(elementos.alternativas, (indice) => {
        const btn = elementos.alternativas.querySelector(`[data-indice="${indice}"]`);
        if (btn && !btn.disabled) {
            quizEngine.responder(indice);
        }
    });
}

function mostrarFeedback(resultado) {
    const { correta, indiceCorreto, indiceEscolhido, pontosGanhos, bonus, tempoEsgotado, tempo } = resultado;
    
    // Oculta o cronômetro durante o feedback
    elementos.cronometro.classList.add('oculto');
    
    // Destaca a alternativa correta/errada
    const botoes = elementos.alternativas.querySelectorAll('.alternativa-btn');
    botoes.forEach((btn, i) => {
        btn.disabled = true;
        if (i === indiceCorreto) {
            btn.classList.add('correta');
        }
        if (i === indiceEscolhido && !correta && indiceEscolhido >= 0) {
            btn.classList.add('errada');
        }
    });
    
    // Mostra feedback
    elementos.feedback.className = `feedback ${correta ? 'correto' : 'errado'}`;
    
    // Formata o tempo
    const tempoFormatado = tempo ? `${tempo.toFixed(1)}s` : '';
    
    if (tempoEsgotado) {
        elementos.feedbackIcon.textContent = '⏱️';
        elementos.feedbackTexto.textContent = 'Tempo esgotado!';
        elementos.feedbackPontos.textContent = '0 pts';
    } else if (correta) {
        elementos.feedbackIcon.textContent = '✓';
        elementos.feedbackTexto.textContent = 'Correto!';
        const bonusTexto = bonus > 0 ? ` (+${bonus} bônus)` : '';
        elementos.feedbackPontos.textContent = `+${pontosGanhos} pts${bonusTexto} • ${tempoFormatado}`;
    } else {
        elementos.feedbackIcon.textContent = '✗';
        elementos.feedbackTexto.textContent = 'Errado!';
        elementos.feedbackPontos.textContent = `0 pts • ${tempoFormatado}`;
    }
    
    elementos.feedbackContainer.classList.remove('oculto');
    
    // Avança para próxima pergunta após 1.5 segundos
    setTimeout(() => {
        quizEngine.proximaPergunta();
    }, 1500);
}

// ========================================
// TELA DE RESULTADO
// ========================================
async function mostrarResultado(resultado) {
    // Adiciona jogador ao resultado
    resultado.jogador = estado.jogador;
    
    // Salva no Firebase
    await rankingManager.salvarResultadoPartida(resultado);
    
    // Salva histórico de perguntas para evitar repetição
    if (resultado.perguntasIds && estado.config) {
        salvarHistoricoPerguntas(estado.jogador, resultado.perguntasIds, estado.config.evitarRepeticao);
    }
    
    // Atualiza UI
    elementos.resultadoTemas.textContent = resultado.descricaoTemas;
    elementos.resultadoPontuacao.textContent = resultado.pontuacaoTotal;
    elementos.resultadoAcertos.textContent = `${resultado.acertos}/${resultado.totalPerguntas}`;
    elementos.resultadoTempo.textContent = rankingManager.formatarTempo(resultado.tempoTotal);
    
    // Calcula percentual de acerto e mostra mensagem motivacional
    const percentualAcerto = (resultado.acertos / resultado.totalPerguntas) * 100;
    elementos.resultadoMensagem.innerHTML = obterMensagemMotivacional(percentualAcerto);
    
    // Esconde botão "Jogar Novamente" no modo desafio (não faz sentido repetir um desafio)
    elementos.btnJogarNovamente.style.display = resultado.modoDesafio ? 'none' : '';
    
    // Renderiza detalhes por pergunta
    elementos.detalhesLista.innerHTML = '';
    resultado.detalhes.forEach((detalhe, index) => {
        const item = document.createElement('div');
        item.className = `detalhe-item ${detalhe.correto ? 'correto' : 'errado'}`;
        
        // Busca info do tema
        let temaInfo = '';
        if (detalhe.tema) {
            const temaObj = temasManager.obterTemaPorId(detalhe.tema);
            if (temaObj) {
                temaInfo = `<span class="detalhe-tema">${temaObj.icone}</span>`;
            }
        }
        
        // Formata o enunciado (trunca se muito longo)
        const enunciado = detalhe.enunciado || 'Pergunta não disponível';
        const enunciadoCurto = enunciado.length > 80 ? enunciado.substring(0, 80) + '...' : enunciado;
        
        // Determina a resposta dada e a correta
        let respostaInfo = '';
        if (detalhe.alternativas) {
            const respostaCorreta = detalhe.alternativas[detalhe.respostaCorreta];
            
            if (detalhe.tempoEsgotado) {
                respostaInfo = `<span class="detalhe-resposta tempo-esgotado">⏱️ Tempo esgotado</span>
                               <span class="detalhe-correta">✓ ${respostaCorreta}</span>`;
            } else if (detalhe.correto) {
                respostaInfo = `<span class="detalhe-resposta acertou">✓ ${respostaCorreta}</span>`;
            } else {
                const respostaDada = detalhe.alternativas[detalhe.respostaEscolhida];
                respostaInfo = `<span class="detalhe-resposta errou">✗ ${respostaDada}</span>
                               <span class="detalhe-correta">✓ ${respostaCorreta}</span>`;
            }
        }
        
        // Botão de reportar erro (só se tiver ID da pergunta)
        const btnRevisar = detalhe.perguntaId 
            ? `<button class="btn-revisar" data-pergunta-id="${detalhe.perguntaId}" title="Reportar erro nesta pergunta">⚠️</button>`
            : '';
        
        // Botão de destaque (pergunta excelente)
        const btnDestaque = detalhe.perguntaId 
            ? `<button class="btn-destaque" data-pergunta-id="${detalhe.perguntaId}" title="Marcar como pergunta excelente">⭐</button>`
            : '';
        
        item.innerHTML = `
            <div class="detalhe-header">
                <span class="detalhe-numero">#${index + 1}</span>
                ${temaInfo}
                <span class="detalhe-tempo">${detalhe.tempo || 0}s</span>
                <span class="detalhe-pontos">${detalhe.pontosTotais || 0} pts</span>
                ${btnDestaque}
                ${btnRevisar}
            </div>
            <div class="detalhe-enunciado" title="${enunciado.replace(/"/g, '&quot;')}">${enunciadoCurto}</div>
            <div class="detalhe-respostas">${respostaInfo}</div>
        `;
        elementos.detalhesLista.appendChild(item);
    });
    
    // Adiciona event listeners para os botões de revisar
    elementos.detalhesLista.querySelectorAll('.btn-revisar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const perguntaId = e.target.dataset.perguntaId;
            if (perguntaId && confirm('Marcar esta pergunta para revisão?\n\nIsso indica que a resposta pode estar errada.')) {
                try {
                    await marcarPerguntaRevisao(perguntaId, 'Reportado pelo jogador');
                    e.target.textContent = '✓';
                    e.target.disabled = true;
                    e.target.title = 'Marcada para revisão';
                    e.target.classList.add('revisada');
                } catch (error) {
                    alert('Erro ao marcar pergunta. Tente novamente.');
                    console.error(error);
                }
            }
        });
    });
    
    // Adiciona event listeners para os botões de destaque
    elementos.detalhesLista.querySelectorAll('.btn-destaque').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const perguntaId = e.target.dataset.perguntaId;
            if (perguntaId && confirm('Marcar esta pergunta como excelente?\n\nIsso indica que a pergunta é muito boa!')) {
                try {
                    await marcarPerguntaDestaque(perguntaId);
                    e.target.textContent = '🌟';
                    e.target.disabled = true;
                    e.target.title = 'Marcada como excelente!';
                    e.target.classList.add('destacada');
                } catch (error) {
                    alert('Erro ao marcar pergunta. Tente novamente.');
                    console.error(error);
                }
            }
        });
    });
    
    // Adiciona mensagem explicativa sobre os botões
    const dicaRevisar = document.createElement('div');
    dicaRevisar.className = 'dica-revisar';
    dicaRevisar.innerHTML = '💡 <strong>Dica:</strong> Gostou muito de uma pergunta? Clique no ⭐ para destacar! Encontrou erro? Clique no ⚠️ para reportar.';
    elementos.detalhesLista.appendChild(dicaRevisar);
    
    // Carrega ranking
    await carregarRankingPartida(resultado.temas);
    
    // Mostra tela de resultado
    mostrarTela('resultado');
    
    // Sai do fullscreen ao terminar
    sairFullscreen();
}

// Estado da ordenação do histórico pessoal
let historicoPessoalDados = [];
let ordenacaoHistorico = { campo: 'dataHora', ordem: 'desc' };

async function carregarRankingPartida(temas) {
    // Busca histórico de partidas do jogador atual
    historicoPessoalDados = await rankingManager.obterHistoricoJogador(20);
    
    renderizarHistoricoPessoal();
    
    // Configura os event listeners para ordenação
    configurarOrdenacaoHistorico();
}

function configurarOrdenacaoHistorico() {
    const tabela = document.getElementById('ranking-partida-tabela');
    const headers = tabela.querySelectorAll('.th-ordenavel');
    
    headers.forEach(th => {
        // Remove listener antigo se existir
        th.removeEventListener('click', th._clickHandler);
        
        // Cria novo handler
        th._clickHandler = () => {
            const campo = th.dataset.sort;
            
            // Se clicar no mesmo campo, inverte a ordem
            if (ordenacaoHistorico.campo === campo) {
                ordenacaoHistorico.ordem = ordenacaoHistorico.ordem === 'asc' ? 'desc' : 'asc';
            } else {
                ordenacaoHistorico.campo = campo;
                // Ordem padrão por campo
                ordenacaoHistorico.ordem = (campo === 'tempoTotal') ? 'asc' : 'desc';
            }
            
            // Atualiza visual dos headers
            headers.forEach(h => {
                h.classList.remove('th-ativo');
                const baseName = h.textContent.replace(/[▲▼⇅]/g, '').trim();
                h.textContent = baseName + ' ⇅';
            });
            
            th.classList.add('th-ativo');
            const baseName = th.textContent.replace(/[▲▼⇅]/g, '').trim();
            th.textContent = baseName + (ordenacaoHistorico.ordem === 'desc' ? ' ▼' : ' ▲');
            
            renderizarHistoricoPessoal();
        };
        
        th.addEventListener('click', th._clickHandler);
    });
}

function renderizarHistoricoPessoal() {
    elementos.rankingPartidaBody.innerHTML = '';
    
    if (historicoPessoalDados.length === 0) {
        elementos.rankingPartidaBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #9ca3af;">
                    Nenhuma partida ainda
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordena os dados
    const historicoOrdenado = [...historicoPessoalDados].sort((a, b) => {
        let valorA = a[ordenacaoHistorico.campo];
        let valorB = b[ordenacaoHistorico.campo];
        
        // Tratamento para datas (pode ser Firestore Timestamp ou string ISO)
        if (ordenacaoHistorico.campo === 'dataHora') {
            const dataA = valorA?.toDate ? valorA.toDate() : new Date(valorA);
            const dataB = valorB?.toDate ? valorB.toDate() : new Date(valorB);
            valorA = dataA.getTime();
            valorB = dataB.getTime();
        }
        
        let resultado = 0;
        if (valorA < valorB) resultado = -1;
        else if (valorA > valorB) resultado = 1;
        
        return ordenacaoHistorico.ordem === 'desc' ? -resultado : resultado;
    });
    
    // Encontra o índice da partida mais recente (para destacar)
    let indexPartidaAtual = -1;
    if (ordenacaoHistorico.campo === 'dataHora' && ordenacaoHistorico.ordem === 'desc') {
        indexPartidaAtual = 0;
    } else {
        // Encontra a partida mais recente na lista ordenada
        let maisRecente = null;
        historicoOrdenado.forEach((item, idx) => {
            const dataItem = item.dataHora?.toDate ? item.dataHora.toDate() : new Date(item.dataHora);
            if (!maisRecente || dataItem > maisRecente) {
                maisRecente = dataItem;
                indexPartidaAtual = idx;
            }
        });
    }
    
    historicoOrdenado.forEach((item, index) => {
        const isPartidaAtual = index === indexPartidaAtual;
        const tr = document.createElement('tr');
        tr.className = isPartidaAtual ? 'destaque partida-atual' : '';
        
        const temasDisplay = rankingManager.formatarTemas(item.temasNomes || item.temas);
        
        // Formata a data
        let dataDisplay = '—';
        const dataHora = item.dataHora || item.timestamp;
        if (dataHora) {
            const data = dataHora.toDate ? dataHora.toDate() : new Date(dataHora);
            dataDisplay = data.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Formata tempo total usando a função que arredonda
        const tempoDisplay = rankingManager.formatarTempo(item.tempoTotal || 0);
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${temasDisplay}</td>
            <td>${item.pontuacaoTotal}</td>
            <td>${item.acertos}/${item.totalPerguntas || 10}</td>
            <td>${tempoDisplay}</td>
            <td>${dataDisplay}</td>
        `;
        
        elementos.rankingPartidaBody.appendChild(tr);
        
        // Scroll para a partida atual
        if (isPartidaAtual) {
            tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

/**
 * Retorna mensagem motivacional baseada no percentual de acerto
 */
function obterMensagemMotivacional(percentual) {
    if (percentual === 100) {
        return '<span class="mensagem-icone">🏆</span> <strong>Perfeito!</strong> Você é um mestre!';
    } else if (percentual >= 80) {
        return '<span class="mensagem-icone">🎉</span> <strong>Parabéns!</strong> Excelente desempenho!';
    } else if (percentual >= 60) {
        return '<span class="mensagem-icone">👍</span> <strong>Muito bem!</strong> Continue assim!';
    } else if (percentual >= 40) {
        return '<span class="mensagem-icone">💪</span> <strong>Bom esforço!</strong> Quase lá!';
    } else if (percentual >= 30) {
        return '<span class="mensagem-icone">📚</span> <strong>Continue praticando!</strong>';
    } else {
        return '<span class="mensagem-icone">🎯</span> <strong>Você pode melhorar!</strong> Tente novamente!';
    }
}

function inicializarResultado() {
    // Botão "Jogar Novamente" - joga a mesma sala (mesmos temas)
    elementos.btnJogarNovamente.addEventListener('click', async () => {
        // Inicia quiz com os mesmos temas selecionados
        await iniciarQuiz();
    });
    
    // Botão "Escolher Temas" - volta para seleção
    elementos.btnVoltarTemas.addEventListener('click', () => {
        // Limpa a seleção para permitir escolher outros temas
        temasManager.limparSelecao();
        mostrarTela('temas');
    });
    
    elementos.btnRankingGlobal.addEventListener('click', () => {
        mostrarRankingGlobal();
    });
}

// ========================================
// MODAL DE RANKING GLOBAL
// ========================================

/**
 * Agrupa os resultados por sessão original
 * @param {Array} ranking - Lista de resultados
 * @returns {Array} - Array de grupos, cada um com sessaoId, info e resultados ordenados
 */
function agruparPorSessao(ranking) {
    const grupos = new Map();
    
    ranking.forEach(item => {
        const sessaoId = item.sessaoOriginalId || item.sessaoId || 'sem-sessao';
        
        if (!grupos.has(sessaoId)) {
            // Usa temasNomes para descrição (ignora descricaoTemas que pode ser "Desafio: jogador")
            const descricaoTemas = item.temasNomes && item.temasNomes.length > 0
                ? rankingManager.formatarTemas(item.temasNomes)
                : (item.temas && item.temas.length > 0 
                    ? rankingManager.formatarTemas(item.temas)
                    : 'Aleatório');
            
            grupos.set(sessaoId, {
                sessaoId: sessaoId,
                temas: item.temasNomes || item.temas || [],
                descricao: descricaoTemas,
                modoDesafio: item.modoDesafio || false,
                perguntasIds: item.perguntasIds || [],
                dataHora: item.dataHora || null, // Data da primeira partida do grupo
                resultados: []
            });
        }
        
        // Atualiza a data para a mais antiga (data de criação da sessão)
        const grupo = grupos.get(sessaoId);
        if (item.dataHora && (!grupo.dataHora || item.dataHora < grupo.dataHora)) {
            grupo.dataHora = item.dataHora;
        }
        
        grupo.resultados.push(item);
    });
    
    // Converte para array e ordena cada grupo por pontuação
    const gruposArray = Array.from(grupos.values());
    gruposArray.forEach(grupo => {
        grupo.resultados.sort((a, b) => {
            // Primeiro por pontuação (maior primeiro)
            if (b.pontuacaoTotal !== a.pontuacaoTotal) {
                return b.pontuacaoTotal - a.pontuacaoTotal;
            }
            // Empate: menor tempo primeiro
            return a.tempoTotal - b.tempoTotal;
        });
    });
    
    // Ordena grupos pela data mais recente primeiro
    gruposArray.sort((a, b) => {
        if (a.dataHora && b.dataHora) {
            return new Date(b.dataHora) - new Date(a.dataHora);
        }
        // Grupos sem data vão para o final
        if (!a.dataHora) return 1;
        if (!b.dataHora) return -1;
        return 0;
    });
    
    return gruposArray;
}

async function mostrarRankingGlobal() {
    const ranking = await rankingManager.obterRankingGlobal();
    
    elementos.rankingGlobalBody.innerHTML = '';
    
    if (ranking.length === 0) {
        elementos.rankingGlobalBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #9ca3af;">
                    Nenhum resultado ainda
                </td>
            </tr>
        `;
    } else {
        // Agrupa por sessão
        const grupos = agruparPorSessao(ranking);
        
        grupos.forEach((grupo, grupoIndex) => {
            // Linha de cabeçalho do grupo (sessão)
            const trHeader = document.createElement('tr');
            trHeader.className = 'grupo-sessao-header';
            
            const temParticipantes = grupo.resultados.length > 1;
            const icone = temParticipantes ? '⚔️' : '🎮';
            const participantesText = `${grupo.resultados.length} jogador${grupo.resultados.length > 1 ? 'es' : ''}`;
            
            // Formata a data da sessão
            let dataText = '';
            if (grupo.dataHora) {
                const data = new Date(grupo.dataHora);
                dataText = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            }
            
            // Verifica se o jogador atual pode desafiar este grupo
            const jaJogou = rankingManager.jaJogouSessao(grupo.sessaoId);
            const jogadorNoGrupo = grupo.resultados.some(r => r.jogador === estado.jogador);
            const podeDesafiar = !jaJogou && !jogadorNoGrupo && grupo.perguntasIds && grupo.perguntasIds.length > 0;
            
            let btnDesafiarGrupoHtml = '';
            if (jaJogou || jogadorNoGrupo) {
                // Já jogou esta sessão (seja como criador ou desafiante)
                btnDesafiarGrupoHtml = `<span class="badge-jogado">✓ Jogado</span>`;
            } else if (podeDesafiar) {
                btnDesafiarGrupoHtml = `<button class="btn-desafiar btn-desafiar-grupo" data-grupo="${grupoIndex}">⚔️ Entrar</button>`;
            } else {
                // Sessão antiga sem perguntasIds
                btnDesafiarGrupoHtml = `<span class="badge-antigo">—</span>`;
            }
            
            trHeader.innerHTML = `
                <td class="grupo-col-icone">${icone}</td>
                <td class="grupo-col-info" colspan="3">
                    <strong>${grupo.descricao}</strong>
                    <span class="grupo-meta">${participantesText}${dataText ? ' • ' + dataText : ''}</span>
                </td>
                <td></td>
                <td class="grupo-col-acao">${btnDesafiarGrupoHtml}</td>
            `;
            elementos.rankingGlobalBody.appendChild(trHeader);
            
            // Linhas dos resultados do grupo
            grupo.resultados.forEach((item, posicao) => {
                const isJogadorAtual = item.jogador === estado.jogador;
                const tr = document.createElement('tr');
                tr.className = `grupo-sessao-item${isJogadorAtual ? ' destaque' : ''}`;
                
                // Medalha para os 3 primeiros do grupo
                let medalha = '';
                if (posicao === 0) medalha = '🥇';
                else if (posicao === 1) medalha = '🥈';
                else if (posicao === 2) medalha = '🥉';
                else medalha = `${posicao + 1}º`;
                
                tr.innerHTML = `
                    <td class="posicao-grupo">${medalha}</td>
                    <td>${item.jogador}${isJogadorAtual ? ' <span class="tag-voce">(você)</span>' : ''}</td>
                    <td>${item.pontuacaoTotal} pts</td>
                    <td>${item.acertos}/${item.totalPerguntas || 10}</td>
                    <td>${rankingManager.formatarTempo(item.tempoTotal)}</td>
                    <td></td>
                `;
                elementos.rankingGlobalBody.appendChild(tr);
            });
        });
        
        // Event listeners para botões de desafiar grupo
        elementos.rankingGlobalBody.querySelectorAll('.btn-desafiar-grupo').forEach(btn => {
            btn.addEventListener('click', () => {
                const grupoIndex = parseInt(btn.dataset.grupo);
                const grupo = grupos[grupoIndex];
                // Usa o primeiro resultado do grupo como base para o desafio
                iniciarDesafio(grupo.resultados[0]);
            });
        });
    }
    
    abrirModal(elementos.modalRanking, elementos.btnVerRankingSalas);
}

/**
 * Mostra o ranking geral - lista simples ordenada por pontuação
 */
// Estado da ordenação do ranking geral
let rankingGeralDados = [];
let ordenacaoAtual = { campo: 'pontuacaoTotal', ordem: 'desc' };

async function mostrarRankingGeral() {
    rankingGeralDados = await rankingManager.obterRankingGlobal(100);
    
    renderizarRankingGeral();
    
    // Configura os event listeners para ordenação (apenas uma vez)
    configurarOrdenacaoRankingGeral();
    
    abrirModal(elementos.modalRankingGeral, elementos.btnVerRankingGeral);
}

function configurarOrdenacaoRankingGeral() {
    const headers = elementos.modalRankingGeral.querySelectorAll('.th-ordenavel');
    
    headers.forEach(th => {
        // Remove listener antigo se existir
        th.removeEventListener('click', th._clickHandler);
        
        // Cria novo handler
        th._clickHandler = () => {
            const campo = th.dataset.sort;
            
            // Se clicar no mesmo campo, inverte a ordem
            if (ordenacaoAtual.campo === campo) {
                ordenacaoAtual.ordem = ordenacaoAtual.ordem === 'asc' ? 'desc' : 'asc';
            } else {
                ordenacaoAtual.campo = campo;
                // Ordem padrão por campo
                ordenacaoAtual.ordem = (campo === 'tempoTotal') ? 'asc' : 'desc';
            }
            
            // Atualiza visual dos headers
            headers.forEach(h => {
                h.classList.remove('th-ativo');
                const baseName = h.textContent.replace(/[▲▼⇅]/g, '').trim();
                h.textContent = baseName + ' ⇅';
            });
            
            th.classList.add('th-ativo');
            const baseName = th.textContent.replace(/[▲▼⇅]/g, '').trim();
            th.textContent = baseName + (ordenacaoAtual.ordem === 'desc' ? ' ▼' : ' ▲');
            
            renderizarRankingGeral();
        };
        
        th.addEventListener('click', th._clickHandler);
    });
}

function renderizarRankingGeral() {
    elementos.rankingGeralBody.innerHTML = '';
    
    if (rankingGeralDados.length === 0) {
        elementos.rankingGeralBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #9ca3af;">
                    Nenhum resultado ainda
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordena os dados
    const rankingOrdenado = [...rankingGeralDados].sort((a, b) => {
        let valorA = a[ordenacaoAtual.campo];
        let valorB = b[ordenacaoAtual.campo];
        
        // Tratamento especial para strings
        if (typeof valorA === 'string') {
            valorA = valorA.toLowerCase();
            valorB = valorB.toLowerCase();
        }
        
        // Tratamento para datas
        if (ordenacaoAtual.campo === 'dataHora') {
            valorA = new Date(valorA).getTime();
            valorB = new Date(valorB).getTime();
        }
        
        let resultado = 0;
        if (valorA < valorB) resultado = -1;
        else if (valorA > valorB) resultado = 1;
        
        // Inverte se ordem for descendente
        return ordenacaoAtual.ordem === 'desc' ? -resultado : resultado;
    });
    
    rankingOrdenado.forEach((item, index) => {
        const isJogadorAtual = item.jogador === estado.jogador;
        const tr = document.createElement('tr');
        tr.className = isJogadorAtual ? 'destaque' : '';
        
        const temasDisplay = rankingManager.formatarTemas(item.temasNomes || item.temas);
        
        // Medalhas para top 3 (apenas se ordenado por pontuação desc)
        let posicao = `${index + 1}º`;
        if (ordenacaoAtual.campo === 'pontuacaoTotal' && ordenacaoAtual.ordem === 'desc') {
            if (index === 0) posicao = '🥇';
            else if (index === 1) posicao = '🥈';
            else if (index === 2) posicao = '🥉';
        }
        
        // Formata a data
        const dataFormatada = rankingManager.formatarData(item.dataHora);
        
        // Determina se pode desafiar esta partida
        const sessaoId = item.sessaoOriginalId || item.sessaoId;
        const jaJogou = sessaoId ? rankingManager.jaJogouSessao(sessaoId) : true;
        const temPerguntasIds = item.perguntasIds && item.perguntasIds.length > 0;
        
        let btnDesafiarHtml = '';
        if (temPerguntasIds) {
            if (isJogadorAtual || jaJogou) {
                btnDesafiarHtml = `<button class="btn-desafiar disabled" disabled title="Você já jogou este desafio">✓ Jogado</button>`;
            } else {
                btnDesafiarHtml = `<button class="btn-desafiar" data-index="${index}" title="Jogar com as mesmas perguntas">⚔️ Desafiar</button>`;
            }
        } else {
            btnDesafiarHtml = `<span class="desafiar-info">—</span>`;
        }
        
        tr.innerHTML = `
            <td>${posicao}</td>
            <td>${item.jogador}${isJogadorAtual ? ' <span class="tag-voce">(você)</span>' : ''}</td>
            <td>${temasDisplay}</td>
            <td>${item.pontuacaoTotal}</td>
            <td>${item.acertos}/${item.totalPerguntas || 10}</td>
            <td>${rankingManager.formatarTempo(item.tempoTotal)}</td>
            <td>${dataFormatada}</td>
            <td class="td-desafiar">${btnDesafiarHtml}</td>
        `;
        
        elementos.rankingGeralBody.appendChild(tr);
    });
    
    // Adiciona event listeners para os botões de desafio
    elementos.rankingGeralBody.querySelectorAll('.btn-desafiar:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            fecharModal(elementos.modalRankingGeral);
            iniciarDesafio(rankingOrdenado[index]);
        });
    });
}

/**
 * Mostra o modal de ajuda / como jogar
 */
function mostrarModalAjuda() {
    abrirModal(elementos.modalAjuda, elementos.btnAjuda);
}

function inicializarModal() {
    // Modal Ranking por Sala
    elementos.modalFechar.addEventListener('click', () => {
        fecharModal(elementos.modalRanking);
    });
    
    elementos.modalRanking.addEventListener('click', (e) => {
        if (e.target === elementos.modalRanking) {
            fecharModal(elementos.modalRanking);
        }
    });
    
    // Modal Ranking Geral
    elementos.modalFecharGeral.addEventListener('click', () => {
        fecharModal(elementos.modalRankingGeral);
    });
    
    elementos.modalRankingGeral.addEventListener('click', (e) => {
        if (e.target === elementos.modalRankingGeral) {
            fecharModal(elementos.modalRankingGeral);
        }
    });
    
    // Ativa ESC para fechar modais
    NavegacaoTeclado.ativarEscParaFechar(() => {
        if (!elementos.modalRanking.classList.contains('oculto')) {
            fecharModal(elementos.modalRanking);
            return true;
        }
        if (!elementos.modalRankingGeral.classList.contains('oculto')) {
            fecharModal(elementos.modalRankingGeral);
            return true;
        }
        if (elementos.modalAjuda && !elementos.modalAjuda.classList.contains('oculto')) {
            fecharModal(elementos.modalAjuda);
            return true;
        }
        return false;
    });
}

/**
 * Abre um modal com focus trap para acessibilidade
 * @param {HTMLElement} modal - Elemento do modal
 * @param {HTMLElement} botaoAbertura - Botão que abriu o modal (para retorno do foco)
 */
function abrirModal(modal, botaoAbertura) {
    modal.classList.remove('oculto');
    
    // Ativa focus trap
    GerenciadorFoco.ativarFocusTrap(modal);
    
    // Move foco para o modal
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.focus();
    }
    
    // Salva referência do botão para retornar foco ao fechar
    modal.dataset.botaoOrigem = botaoAbertura ? botaoAbertura.id : '';
    
    Anunciador.anunciar('Modal de ranking aberto. Pressione Escape para fechar.');
}

/**
 * Fecha um modal e retorna o foco
 * @param {HTMLElement} modal - Elemento do modal
 */
function fecharModal(modal) {
    modal.classList.add('oculto');
    
    // Desativa focus trap
    GerenciadorFoco.desativarFocusTrap();
    
    // Retorna foco ao botão que abriu
    const botaoOrigemId = modal.dataset.botaoOrigem;
    if (botaoOrigemId) {
        const botaoOrigem = document.getElementById(botaoOrigemId);
        if (botaoOrigem) {
            botaoOrigem.focus();
        }
    }
    
    Anunciador.anunciar('Modal fechado.');
}

// ========================================
// INICIALIZAÇÃO
// ========================================
async function init() {
    console.log('🏰 Quizlândia - Iniciando...');
    
    // Inicializa módulos (login primeiro pois pode fazer auto-login)
    await inicializarLogin();
    inicializarTemas();
    inicializarResultado();
    inicializarModal();
    inicializarFaseLeitura();
    inicializarAjudas();
    inicializarBotaoDesistir();
    
    console.log('✅ Quizlândia - Pronto!');
}

/**
 * Inicializa evento de clique para pular fase de leitura
 */
function inicializarFaseLeitura() {
    elementos.faseLeitura.addEventListener('click', () => {
        if (quizEngine) {
            quizEngine.pularLeitura();
        }
    });
    
    // Adiciona cursor pointer para indicar que é clicável
    elementos.faseLeitura.style.cursor = 'pointer';
}

/**
 * Inicializa o botão de desistir
 */
function inicializarBotaoDesistir() {
    elementos.btnDesistir.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja desistir?\n\nAs perguntas restantes serão marcadas como erradas.')) {
            quizEngine.desistir();
        }
    });
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
