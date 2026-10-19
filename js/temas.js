// ========================================
// TEMAS.JS - Gerenciador de Seleção de Temas
// ========================================

import { 
    TEMAS_DISPONIVEIS, 
    buscarTemas, 
    buscarPerguntasPorTemas, 
    buscarPerguntasAleatorias,
    buscarTemaPorId,
    obterTodosIdsTema
} from './firebase-config.js';

/**
 * Classe que gerencia a seleção de temas do quiz
 */
export class TemasManager {
    constructor() {
        this.temas = [];
        this.temasSelecionados = new Set();
        this.subtemasSelecionados = new Set(); // Novo: subtemas selecionados individualmente
        this.modoAleatorio = false;
        this.carregando = false;
        
        // Callbacks
        this.onTemasCarregados = null;
        this.onSelecaoAlterada = null;
        this.onPerguntasCarregadas = null;
        this.onErro = null;
    }

    /**
     * Carrega os temas disponíveis do Firebase
     */
    async carregarTemas() {
        this.carregando = true;
        
        try {
            this.temas = await buscarTemas();
            
            if (this.onTemasCarregados) {
                this.onTemasCarregados(this.temas);
            }
            
            console.log(`✅ ${this.temas.length} temas carregados`);
            return this.temas;
        } catch (error) {
            console.error('Erro ao carregar temas:', error);
            // Fallback para temas estáticos
            this.temas = TEMAS_DISPONIVEIS.map(t => ({ ...t, totalPerguntas: 0 }));
            
            if (this.onErro) {
                this.onErro('Não foi possível carregar a contagem de perguntas');
            }
            
            return this.temas;
        } finally {
            this.carregando = false;
        }
    }

    /**
     * Retorna os temas disponíveis
     */
    obterTemas() {
        return this.temas;
    }

    /**
     * Retorna um tema específico por ID (busca também nos subtemas)
     */
    obterTemaPorId(temaId) {
        // Primeiro busca nos temas principais
        const temaPrincipal = this.temas.find(t => t.id === temaId);
        if (temaPrincipal) return temaPrincipal;
        
        // Se não encontrou, busca nos subtemas dos temas carregados
        for (const tema of this.temas) {
            if (tema.subtemas) {
                const subtema = tema.subtemas.find(s => s.id === temaId);
                if (subtema) return { ...subtema, temaPai: tema.id, temaPaiNome: tema.nome, temaPaiIcone: tema.icone };
            }
        }
        
        // Fallback para o array estático
        return buscarTemaPorId(temaId);
    }

    /**
     * Alterna a seleção de um tema (principal ou subtema)
     * @param {string} temaId - ID do tema
     * @param {boolean} isSubtema - Se é um subtema
     */
    alternarTema(temaId, isSubtema = false) {
        // Verifica se é a primeira seleção (para mostrar dica)
        const primeiraSelecao = this.temasSelecionados.size === 0 && 
                                this.subtemasSelecionados.size === 0 && 
                                !this.modoAleatorio;
        
        // Se estava em modo aleatório, desativa
        if (this.modoAleatorio) {
            this.modoAleatorio = false;
        }
        
        if (isSubtema) {
            // Gerencia subtema
            if (this.subtemasSelecionados.has(temaId)) {
                this.subtemasSelecionados.delete(temaId);
            } else {
                this.subtemasSelecionados.add(temaId);
            }
            
            // Remove o tema pai da seleção se estiver (usuário quer só subtemas específicos)
            const temaPai = this._encontrarTemaPai(temaId);
            if (temaPai && this.temasSelecionados.has(temaPai.id)) {
                this.temasSelecionados.delete(temaPai.id);
                // Adiciona os outros subtemas que estavam implicitamente selecionados
                temaPai.subtemas.forEach(s => {
                    if (s.id !== temaId) {
                        this.subtemasSelecionados.add(s.id);
                    }
                });
            }
        } else {
            // Gerencia tema principal
            if (this.temasSelecionados.has(temaId)) {
                this.temasSelecionados.delete(temaId);
                // Também remove subtemas desse tema se houver
                const tema = this.obterTemaPorId(temaId);
                if (tema && tema.subtemas) {
                    tema.subtemas.forEach(s => this.subtemasSelecionados.delete(s.id));
                }
            } else {
                this.temasSelecionados.add(temaId);
                // Se tem subtemas, limpa seleção individual de subtemas
                const tema = this.obterTemaPorId(temaId);
                if (tema && tema.subtemas) {
                    tema.subtemas.forEach(s => this.subtemasSelecionados.delete(s.id));
                }
            }
        }
        
        this.notificarSelecaoAlterada();
        
        // Mostra dica na primeira seleção
        if (primeiraSelecao && (this.temasSelecionados.size > 0 || this.subtemasSelecionados.size > 0)) {
            this.mostrarDicaPrimeiraSelecao();
        } else if (!primeiraSelecao) {
            // Se não é primeira seleção, cancela o auto-start (usuário está selecionando mais)
            this.cancelarAutoStart();
        }
    }

    /**
     * Encontra o tema pai de um subtema
     * @param {string} subtemaId - ID do subtema
     * @returns {Object|null}
     */
    _encontrarTemaPai(subtemaId) {
        return this.temas.find(t => 
            t.subtemas && t.subtemas.some(s => s.id === subtemaId)
        );
    }

    /**
     * Seleciona um tema específico
     * @param {string} temaId - ID do tema
     */
    selecionarTema(temaId) {
        if (this.modoAleatorio) {
            this.modoAleatorio = false;
        }
        
        this.temasSelecionados.add(temaId);
        this.notificarSelecaoAlterada();
    }
    
    /**
     * Mostra dica para novos usuários na primeira seleção de tema
     * Com auto-start após 5 segundos
     */
    mostrarDicaPrimeiraSelecao() {
        // Evita mostrar se já existe uma dica na tela
        if (document.querySelector('.dica-selecao-overlay')) return;
        
        // Cria elemento da dica - overlay com fundo
        const dica = document.createElement('div');
        dica.className = 'dica-selecao-overlay';
        
        let segundosRestantes = 5;
        
        dica.innerHTML = `
            <div class="dica-backdrop"></div>
            <div class="dica-card">
                <span class="dica-linha1">Selecione mais temas</span>
                <span class="dica-linha2">ou iniciando em <span class="dica-countdown">${segundosRestantes}</span>s...</span>
            </div>
        `;
        
        const countdownSpan = dica.querySelector('.dica-countdown');
        
        // Timer de countdown
        const countdownInterval = setInterval(() => {
            segundosRestantes--;
            if (countdownSpan) {
                countdownSpan.textContent = segundosRestantes;
            }
            
            if (segundosRestantes <= 0) {
                clearInterval(countdownInterval);
                dica.remove();
                // Simula clique no botão Jogar
                const btnJogar = document.getElementById('btn-jogar');
                if (btnJogar && !btnJogar.disabled) {
                    btnJogar.click();
                }
            }
        }, 1000);
        
        // Guarda referência do timer para poder cancelar
        dica.dataset.timerId = countdownInterval;
        
        // Fecha ao clicar (cancela auto-start)
        dica.addEventListener('click', () => {
            clearInterval(countdownInterval);
            dica.classList.add('dica-saindo');
            setTimeout(() => dica.remove(), 300);
        });
        
        // Insere no body para garantir que fique por cima de tudo
        document.body.appendChild(dica);
    }
    
    /**
     * Cancela o auto-start se o usuário selecionar outro tema
     */
    cancelarAutoStart() {
        const dica = document.querySelector('.dica-selecao-overlay');
        if (dica) {
            const timerId = dica.dataset.timerId;
            if (timerId) {
                clearInterval(parseInt(timerId));
            }
            dica.classList.add('dica-saindo');
            setTimeout(() => dica.remove(), 300);
        }
    }

    /**
     * Remove a seleção de um tema
     * @param {string} temaId - ID do tema
     */
    deselecionarTema(temaId) {
        this.temasSelecionados.delete(temaId);
        this.notificarSelecaoAlterada();
    }

    /**
     * Ativa/desativa o modo aleatório
     */
    alternarModoAleatorio() {
        this.modoAleatorio = !this.modoAleatorio;
        
        if (this.modoAleatorio) {
            // Limpa seleções específicas quando ativa aleatório
            this.temasSelecionados.clear();
        }
        
        this.notificarSelecaoAlterada();
    }

    /**
     * Define o modo aleatório
     * @param {boolean} ativo - Se deve ativar o modo aleatório
     */
    setModoAleatorio(ativo) {
        this.modoAleatorio = ativo;
        
        if (ativo) {
            this.temasSelecionados.clear();
        }
        
        this.notificarSelecaoAlterada();
    }

    /**
     * Verifica se um tema está selecionado
     * @param {string} temaId - ID do tema
     * @param {boolean} isSubtema - Se é um subtema
     * @returns {boolean}
     */
    temaSelecionado(temaId, isSubtema = false) {
        if (isSubtema) {
            // Subtema está selecionado se está na lista OU se o tema pai está selecionado
            if (this.subtemasSelecionados.has(temaId)) return true;
            const temaPai = this._encontrarTemaPai(temaId);
            return temaPai ? this.temasSelecionados.has(temaPai.id) : false;
        }
        return this.temasSelecionados.has(temaId);
    }

    /**
     * Verifica se um tema pai tem pelo menos um subtema selecionado (parcialmente selecionado)
     * @param {string} temaId - ID do tema pai
     * @returns {boolean}
     */
    temaParcialmenteSelecionado(temaId) {
        const tema = this.obterTemaPorId(temaId);
        if (!tema || !tema.subtemas) return false;
        
        // Não está parcialmente selecionado se o tema pai já está selecionado
        if (this.temasSelecionados.has(temaId)) return false;
        
        // Verifica se algum subtema está selecionado
        return tema.subtemas.some(s => this.subtemasSelecionados.has(s.id));
    }

    /**
     * Verifica se o modo aleatório está ativo
     * @returns {boolean}
     */
    isModoAleatorio() {
        return this.modoAleatorio;
    }

    /**
     * Retorna os IDs dos temas selecionados (para buscar perguntas)
     * Inclui o tema pai + todos subtemas quando tema pai selecionado
     * Ou só os subtemas individuais selecionados
     * @returns {Array}
     */
    obterTemasSelecionados() {
        const ids = new Set();
        
        // Adiciona temas principais e seus subtemas
        this.temasSelecionados.forEach(temaId => {
            ids.add(temaId);
            const tema = this.obterTemaPorId(temaId);
            if (tema && tema.subtemas) {
                tema.subtemas.forEach(s => ids.add(s.id));
            }
        });
        
        // Adiciona subtemas selecionados individualmente
        this.subtemasSelecionados.forEach(subtemaId => ids.add(subtemaId));
        
        return [...ids];
    }

    /**
     * Retorna apenas os IDs dos temas principais selecionados (para exibição)
     * @returns {Array}
     */
    obterTemasPrincipaisSelecionados() {
        return [...this.temasSelecionados];
    }

    /**
     * Retorna os objetos dos temas selecionados (temas principais)
     * @returns {Array}
     */
    obterTemasObjetos() {
        const objetos = [];
        
        // Adiciona temas principais selecionados
        this.temas.forEach(t => {
            if (this.temasSelecionados.has(t.id)) {
                objetos.push(t);
            }
        });
        
        // Adiciona subtemas selecionados individualmente (com nome do tema pai)
        this.subtemasSelecionados.forEach(subtemaId => {
            const temaPai = this._encontrarTemaPai(subtemaId);
            if (temaPai && !this.temasSelecionados.has(temaPai.id)) {
                const subtema = temaPai.subtemas.find(s => s.id === subtemaId);
                if (subtema) {
                    objetos.push({ ...subtema, temaPaiNome: temaPai.nome });
                }
            }
        });
        
        return objetos;
    }

    /**
     * Limpa todas as seleções
     */
    limparSelecao() {
        this.temasSelecionados.clear();
        this.subtemasSelecionados.clear();
        this.modoAleatorio = false;
        this.notificarSelecaoAlterada();
    }

    /**
     * Verifica se pode iniciar o quiz (tem algo selecionado)
     * @returns {boolean}
     */
    podeIniciar() {
        return this.modoAleatorio || this.temasSelecionados.size > 0 || this.subtemasSelecionados.size > 0;
    }

    /**
     * Retorna o total de perguntas disponíveis para a seleção atual
     * @returns {number}
     */
    totalPerguntasDisponiveis() {
        if (this.modoAleatorio) {
            return this.temas.reduce((acc, t) => acc + (t.totalPerguntas || 0), 0);
        }
        
        let total = 0;
        const contados = new Set(); // Evita contar duplicado
        
        // Conta perguntas dos temas principais selecionados
        this.temas.forEach(tema => {
            if (this.temasSelecionados.has(tema.id)) {
                total += tema.totalPerguntas || 0;
                contados.add(tema.id);
                // Marca subtemas como contados
                if (tema.subtemas) {
                    tema.subtemas.forEach(s => contados.add(s.id));
                }
            }
        });
        
        // Conta perguntas dos subtemas selecionados individualmente
        this.subtemasSelecionados.forEach(subtemaId => {
            if (!contados.has(subtemaId)) {
                const temaPai = this._encontrarTemaPai(subtemaId);
                if (temaPai) {
                    const subtema = temaPai.subtemas.find(s => s.id === subtemaId);
                    if (subtema) {
                        total += subtema.totalPerguntas || 0;
                    }
                }
            }
        });
        
        return total;
    }

    /**
     * Busca as perguntas para o quiz baseado na seleção
     * @param {number} quantidade - Quantidade de perguntas
     * @param {string} jogador - Nome do jogador (para evitar repetição)
     * @param {number} evitarRepeticao - Quantidade de perguntas recentes a evitar
     * @returns {Promise<Array>}
     */
    async buscarPerguntas(quantidade = 10, jogador = null, evitarRepeticao = 0) {
        this.carregando = true;
        
        try {
            let perguntas;
            
            if (this.modoAleatorio) {
                perguntas = await buscarPerguntasAleatorias(quantidade, jogador, evitarRepeticao);
            } else {
                const temas = this.obterTemasSelecionados();
                perguntas = await buscarPerguntasPorTemas(temas, quantidade, jogador, evitarRepeticao);
            }
            
            if (this.onPerguntasCarregadas) {
                this.onPerguntasCarregadas(perguntas);
            }
            
            return perguntas;
        } catch (error) {
            console.error('Erro ao buscar perguntas:', error);
            
            if (this.onErro) {
                this.onErro('Não foi possível carregar as perguntas');
            }
            
            return [];
        } finally {
            this.carregando = false;
        }
    }

    /**
     * Gera uma descrição textual da seleção atual
     * @returns {string}
     */
    gerarDescricaoSelecao() {
        if (this.modoAleatorio) {
            return 'Temas Aleatórios';
        }
        
        const temasObjs = this.obterTemasObjetos();
        
        if (temasObjs.length === 0) {
            return 'Nenhum tema selecionado';
        }
        
        // Função para formatar nome do tema (inclui tema pai se for subtema)
        const formatarNome = (t) => t.temaPaiNome ? `${t.temaPaiNome}: ${t.nome}` : t.nome;
        
        if (temasObjs.length === 1) {
            return formatarNome(temasObjs[0]);
        }
        
        if (temasObjs.length <= 3) {
            return temasObjs.map(formatarNome).join(', ');
        }
        
        return `${temasObjs.length} temas selecionados`;
    }

    /**
     * Gera um ID único para a sessão de quiz
     * @returns {string}
     */
    gerarSessaoId() {
        const temas = this.modoAleatorio ? 'aleatorio' : this.obterTemasSelecionados().sort().join('-');
        const timestamp = Date.now();
        return `quiz_${temas}_${timestamp}`;
    }

    /**
     * Notifica sobre alteração na seleção
     */
    notificarSelecaoAlterada() {
        if (this.onSelecaoAlterada) {
            this.onSelecaoAlterada({
                temasSelecionados: this.obterTemasSelecionados(),
                modoAleatorio: this.modoAleatorio,
                podeIniciar: this.podeIniciar(),
                totalPerguntas: this.totalPerguntasDisponiveis(),
                descricao: this.gerarDescricaoSelecao()
            });
        }
    }

    /**
     * Serializa o estado atual para salvar junto com o resultado
     * @returns {Object}
     */
    serializarParaResultado() {
        const temasObjs = this.modoAleatorio ? [] : this.obterTemasObjetos();
        
        // Gera nomes dos temas, adicionando prefixo do tema pai para subtemas escolares
        const temasNomes = this.modoAleatorio 
            ? ['Aleatório'] 
            : temasObjs.map(t => {
                // Se é subtema e tem tema pai, adiciona prefixo
                if (t.temaPaiNome) {
                    return `${t.temaPaiNome}: ${t.nome}`;
                }
                return t.nome;
            });
        
        return {
            temas: this.modoAleatorio ? ['aleatorio'] : this.obterTemasSelecionados(),
            temasNomes: temasNomes,
            modoAleatorio: this.modoAleatorio,
            descricao: this.gerarDescricaoSelecao()
        };
    }

    /**
     * Extrai as séries escolares disponíveis a partir dos subtemas
     * Procura padrões como -6ano, -7ano, -1em, etc.
     * @returns {Array<{id: string, nome: string, icone: string, subtemas: Array}>}
     */
    obterSeriesDisponiveis() {
        const seriesMap = new Map();
        
        // Padrões de séries conhecidos
        const padroesSeries = [
            { sufixo: '-6ano', nome: '6º Ano', icone: '6️⃣', ordem: 1 },
            { sufixo: '-7ano', nome: '7º Ano', icone: '7️⃣', ordem: 2 },
            { sufixo: '-8ano', nome: '8º Ano', icone: '8️⃣', ordem: 3 },
            { sufixo: '-9ano', nome: '9º Ano', icone: '9️⃣', ordem: 4 },
            { sufixo: '-1em', nome: '1º Ano EM', icone: '🔟', ordem: 5 },
            { sufixo: '-2em', nome: '2º Ano EM', icone: '🔢', ordem: 6 },
            { sufixo: '-3em', nome: '3º Ano EM', icone: '🎓', ordem: 7 }
        ];
        
        // Percorre todos os temas e subtemas
        this.temas.forEach(tema => {
            if (tema.subtemas) {
                tema.subtemas.forEach(subtema => {
                    // Verifica se o subtema pertence a alguma série
                    padroesSeries.forEach(padrao => {
                        if (subtema.id.endsWith(padrao.sufixo)) {
                            if (!seriesMap.has(padrao.sufixo)) {
                                seriesMap.set(padrao.sufixo, {
                                    id: padrao.sufixo,
                                    nome: padrao.nome,
                                    icone: padrao.icone,
                                    ordem: padrao.ordem,
                                    subtemas: []
                                });
                            }
                            seriesMap.get(padrao.sufixo).subtemas.push({
                                ...subtema,
                                temaPaiId: tema.id,
                                temaPaiNome: tema.nome
                            });
                        }
                    });
                });
            }
        });
        
        // Converte para array e ordena
        return [...seriesMap.values()]
            .filter(serie => serie.subtemas.length > 0)
            .sort((a, b) => a.ordem - b.ordem);
    }

    /**
     * Seleciona todos os subtemas de uma série específica
     * @param {string} serieId - ID da série (ex: '-6ano', '-7ano')
     */
    selecionarPorSerie(serieId) {
        // Limpa seleções anteriores
        this.limparSelecao();
        
        // Busca todos os subtemas dessa série
        this.temas.forEach(tema => {
            if (tema.subtemas) {
                tema.subtemas.forEach(subtema => {
                    if (subtema.id.endsWith(serieId)) {
                        this.subtemasSelecionados.add(subtema.id);
                    }
                });
            }
        });
        
        this.notificarSelecaoAlterada();
    }

    /**
     * Verifica se uma série está selecionada (todos os subtemas dela)
     * @param {string} serieId - ID da série
     * @returns {boolean}
     */
    serieSelecionada(serieId) {
        const series = this.obterSeriesDisponiveis();
        const serie = series.find(s => s.id === serieId);
        if (!serie || serie.subtemas.length === 0) return false;
        
        // Verifica se todos os subtemas dessa série estão selecionados
        return serie.subtemas.every(subtema => 
            this.subtemasSelecionados.has(subtema.id) || 
            this.temasSelecionados.has(subtema.temaPaiId)
        );
    }
}
