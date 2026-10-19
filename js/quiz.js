// ========================================
// QUIZ.JS - Mecânica do Jogo
// ========================================

import { Anunciador } from './acessibilidade.js';

/**
 * Classe que gerencia a mecânica do quiz
 */
export class QuizEngine {
    constructor() {
        this.perguntaAtual = 0;
        this.pontuacaoTotal = 0;
        this.perguntas = [];
        this.temasSelecionados = [];
        this.temasNomes = [];
        this.modoAleatorio = false;
        this.descricaoTemas = '';
        this.respostas = []; // Armazena detalhes de cada resposta
        this.tempoInicio = null;
        this.tempoAdicional = 0; // Tempo extra adicionado via ajuda
        this.timerLeitura = null;
        this.timerCronometro = null;
        this.cronometroSegundos = 0;
        this.respondeu = false;
        this.sessaoId = null;
        
        // Propriedades para modo Desafio
        this.modoDesafio = false;
        this.sessaoOriginalId = null; // ID da sessão que está sendo desafiada
        this.jogadorDesafiado = null; // Nome do jogador que criou a partida original
        
        // Configurações do quiz
        this.config = {
            tempoPergunta: 10,
            ajudaTempo: true,
            tempoExtra: 10,
            ajudaEliminar: true,
            ajudaPular: false
        };
        
        // Estado das ajudas na partida (nova estrutura com quantidade e multiplicador)
        // Cada ajuda: { disponivel: N, usado: 0, multiplicador: M }
        this.ajudas = {
            tempo: { disponivel: 1, usado: 0, multiplicador: 1 },
            eliminar: { disponivel: 1, usado: 0, multiplicador: 1 },
            pular: { disponivel: 1, usado: 0, multiplicador: 1 }
        };
        
        // Mantém compatibilidade com código antigo (será removido futuramente)
        this.ajudasUsadas = {
            tempo: false,
            eliminar: false,
            pular: false
        };
        
        // Callbacks
        this.onPerguntaCarregada = null;
        this.onFaseLeitura = null;
        this.onFaseResposta = null;
        this.onRespostaProcessada = null;
        this.onQuizFinalizado = null;
        this.onPontuacaoAtualizada = null;
    }

    /**
     * Calcula o bônus de velocidade baseado no tempo de resposta
     * @param {number} tempo - Tempo em segundos
     * @returns {number} - Bônus de pontos
     */
    calcularBonus(tempo) {
        if (tempo <= 1) return 5;
        if (tempo <= 2) return 3;
        if (tempo <= 3) return 2;
        if (tempo <= 4) return 1;
        return 0;
    }

    /**
     * Inicia o quiz com perguntas e configuração de temas
     * @param {Array} perguntas - Array de perguntas do Firebase
     * @param {Object} configTemas - Configuração dos temas selecionados
     * @param {Object} configGlobal - Configurações globais do quiz
     */
    iniciar(perguntas, configTemas = {}, configGlobal = {}) {
        this.perguntas = [...perguntas];
        this.temasSelecionados = configTemas.temas || [];
        this.temasNomes = configTemas.temasNomes || [];
        this.modoAleatorio = configTemas.modoAleatorio || false;
        this.descricaoTemas = configTemas.descricao || 'Quiz';
        this.sessaoId = this.gerarSessaoId();
        
        // Configuração de desafio
        this.modoDesafio = configTemas.modoDesafio || false;
        this.sessaoOriginalId = configTemas.sessaoOriginalId || this.sessaoId;
        this.jogadorDesafiado = configTemas.jogadorDesafiado || null;
        
        // Aplica configurações globais
        if (configGlobal) {
            this.config = {
                tempoPergunta: configGlobal.tempoPergunta || 10,
                ajudaTempo: configGlobal.ajudaTempo !== false,
                tempoExtra: configGlobal.tempoExtra || 10,
                ajudaEliminar: configGlobal.ajudaEliminar !== false,
                ajudaPular: configGlobal.ajudaPular || false
            };
        }
        
        // Reseta estado das ajudas (nova estrutura)
        this.ajudas = configGlobal.ajudas || {
            tempo: { disponivel: 1, usado: 0, multiplicador: 1 },
            eliminar: { disponivel: 1, usado: 0, multiplicador: 1 },
            pular: { disponivel: 1, usado: 0, multiplicador: 1 }
        };
        
        // Mantém compatibilidade com código antigo
        this.ajudasUsadas = {
            tempo: this.ajudas.tempo.usado >= this.ajudas.tempo.disponivel,
            eliminar: this.ajudas.eliminar.usado >= this.ajudas.eliminar.disponivel,
            pular: this.ajudas.pular.usado >= this.ajudas.pular.disponivel
        };
        
        this.perguntaAtual = 0;
        this.pontuacaoTotal = 0;
        this.respostas = [];
        this.respondeu = false;
        
        const tipoPartida = this.modoDesafio ? 'Desafio' : 'Quiz';
        console.log(`🎮 ${tipoPartida} iniciado: ${this.descricaoTemas} (${this.perguntas.length} perguntas, ${this.config.tempoPergunta}s por pergunta)`);
        
        this.carregarPergunta();
    }

    /**
     * Gera um ID único para a sessão
     */
    gerarSessaoId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `quiz_${timestamp}_${random}`;
    }

    /**
     * Carrega a pergunta atual e inicia a fase de leitura
     */
    carregarPergunta() {
        if (this.perguntaAtual >= this.perguntas.length) {
            this.finalizar();
            return;
        }

        // Limpa timers anteriores antes de iniciar nova pergunta
        clearInterval(this.timerLeitura);
        clearInterval(this.timerCronometro);

        const pergunta = this.perguntas[this.perguntaAtual];
        this.respondeu = false;
        
        // Anuncia a pergunta para leitores de tela
        const temaNome = this.obterNomeTema(pergunta.tema);
        try {
            Anunciador.anunciarPergunta(
                this.perguntaAtual + 1, 
                this.perguntas.length, 
                pergunta.enunciado,
                temaNome
            );
        } catch (e) {
            // Silencia erros de acessibilidade
        }
        
        // Notifica que uma pergunta foi carregada
        if (this.onPerguntaCarregada) {
            this.onPerguntaCarregada({
                numero: this.perguntaAtual + 1,
                total: this.perguntas.length,
                pergunta: pergunta,
                tema: pergunta.tema || null
            });
        }

        // Inicia a fase de leitura (3 segundos)
        this.iniciarFaseLeitura();
    }
    
    /**
     * Obtém o nome legível do tema
     */
    obterNomeTema(temaId) {
        const nomes = {
            'geografia': 'Geografia',
            'historia': 'História',
            'ciencia': 'Ciência',
            'arte': 'Arte',
            'literatura': 'Literatura',
            'cinema-series': 'Cinema e Séries',
            'musica': 'Música',
            'games': 'Games',
            'mitos-verdades': 'Mitos e Verdades',
            'comidas-bebidas': 'Comidas e Bebidas',
            'nostalgia': 'Nostalgia',
            'esportes': 'Esportes',
            'curiosidades': 'Curiosidades'
        };
        return nomes[temaId] || temaId || 'Geral';
    }

    /**
     * Inicia a fase de leitura com countdown dinâmico
     * Perguntas muito grandes (>150 caracteres) = 7 segundos
     * Perguntas grandes (>90 caracteres) = 5 segundos
     * Perguntas normais = 3 segundos
     */
    iniciarFaseLeitura() {
        const pergunta = this.perguntas[this.perguntaAtual];
        const tamanhoEnunciado = pergunta.enunciado ? pergunta.enunciado.length : 0;
        
        // Perguntas grandes têm mais tempo para leitura
        let contador = tamanhoEnunciado > 150 ? 7 : tamanhoEnunciado > 90 ? 5 : 3;
        
        // Anuncia início da contagem
        try {
            Anunciador.anunciarInicioContagem(10);
        } catch (e) {
            // Silencia erros de acessibilidade
        }
        
        if (this.onFaseLeitura) {
            this.onFaseLeitura({ segundos: contador, ativa: true });
        }

        this.timerLeitura = setInterval(() => {
            contador--;
            
            if (this.onFaseLeitura) {
                this.onFaseLeitura({ segundos: contador, ativa: true });
            }

            if (contador <= 0) {
                clearInterval(this.timerLeitura);
                this.iniciarFaseResposta();
            }
        }, 1000);
    }

    /**
     * Pula a fase de leitura e vai direto para responder
     */
    pularLeitura() {
        if (this.timerLeitura) {
            clearInterval(this.timerLeitura);
            this.timerLeitura = null;
            this.iniciarFaseResposta();
        }
    }

    /**
     * Inicia a fase de resposta com cronômetro
     */
    iniciarFaseResposta() {
        // Limpa timer anterior se existir
        clearInterval(this.timerCronometro);
        
        this.tempoInicio = Date.now();
        this.tempoAdicional = 0; // Reseta tempo adicional para nova pergunta
        this.cronometroSegundos = 0;
        this._ultimoAnuncioTempo = 10; // Para controlar anúncios de tempo
        
        // Verifica se as alternativas são longas e adiciona tempo extra
        const pergunta = this.perguntas[this.perguntaAtual];
        if (pergunta && pergunta.alternativas) {
            const totalCaracteres = pergunta.alternativas.reduce((sum, alt) => sum + (alt?.length || 0), 0);
            if (totalCaracteres > 200) {
                this.tempoAdicional = 10; // Adiciona 10 segundos para alternativas longas
            }
        }
        
        // Notifica início da fase de resposta
        if (this.onFaseResposta) {
            this.onFaseResposta({ ativa: true, tempo: 0 });
        }

        // Inicia cronômetro que atualiza a cada 100ms
        this.timerCronometro = setInterval(() => {
            try {
                this.cronometroSegundos = (Date.now() - this.tempoInicio) / 1000;
                // Tempo limite inclui tempo adicional da ajuda
                const tempoLimite = this.config.tempoPergunta + this.tempoAdicional;
                
                // Anuncia tempo restante em momentos críticos
                const tempoRestante = Math.ceil(tempoLimite - this.cronometroSegundos);
                if (tempoRestante !== this._ultimoAnuncioTempo && tempoRestante > 0) {
                    this._ultimoAnuncioTempo = tempoRestante;
                    try {
                        Anunciador.anunciarTempoRestante(tempoRestante);
                    } catch (e) {
                        // Silencia erros de acessibilidade
                    }
                }
                
                if (this.onFaseResposta) {
                    this.onFaseResposta({ 
                        ativa: true, 
                        tempo: this.cronometroSegundos,
                        tempoLimite: tempoLimite
                    });
                }
                
                // Tempo esgotado após o limite configurado (incluindo tempo adicional)
                if (this.cronometroSegundos >= tempoLimite && !this.respondeu) {
                    this.tempoEsgotado();
                }
            } catch (error) {
                console.error('Erro no cronômetro:', error);
            }
        }, 100);
        
        // Anuncia que alternativas estão disponíveis (após iniciar o timer)
        try {
            const pergunta = this.perguntas[this.perguntaAtual];
            Anunciador.anunciarAlternativasDisponiveis(pergunta.alternativas.length);
        } catch (e) {
            // Silencia erros de acessibilidade
        }
    }

    /**
     * Chamado quando o tempo de resposta esgota (10 segundos)
     */
    tempoEsgotado() {
        if (this.respondeu) return;
        
        this.respondeu = true;
        
        // Para o cronômetro
        clearInterval(this.timerCronometro);
        
        const tempoResposta = 10; // Tempo máximo
        const pergunta = this.perguntas[this.perguntaAtual];
        
        // Anuncia tempo esgotado com resposta correta
        const respostaCorreta = pergunta.alternativas[pergunta.correta];
        try {
            Anunciador.anunciarTempoEsgotado(respostaCorreta);
        } catch (e) {
            // Silencia erros de acessibilidade
        }
        
        // Registra a resposta como erro (sem resposta)
        const detalheResposta = {
            perguntaId: pergunta.id,
            tema: pergunta.tema || null,
            enunciado: pergunta.enunciado,
            alternativas: pergunta.alternativas,
            tempo: tempoResposta,
            correto: false,
            pontosBase: 0,
            bonus: 0,
            pontosTotais: 0,
            respostaEscolhida: -1, // -1 indica que não respondeu
            respostaCorreta: pergunta.correta,
            tempoEsgotado: true
        };
        
        this.respostas.push(detalheResposta);
        
        // Notifica que a resposta foi processada (tempo esgotado)
        if (this.onRespostaProcessada) {
            this.onRespostaProcessada({
                correta: false,
                indiceCorreto: pergunta.correta,
                indiceEscolhido: -1,
                tempo: tempoResposta,
                pontosBase: 0,
                bonus: 0,
                pontosGanhos: 0,
                pontuacaoTotal: this.pontuacaoTotal,
                tempoEsgotado: true
            });
        }
    }

    /**
     * Processa a resposta do jogador
     * @param {number} indiceEscolhido - Índice da alternativa escolhida
     */
    responder(indiceEscolhido) {
        if (this.respondeu) return;
        
        this.respondeu = true;
        
        // Para o cronômetro
        clearInterval(this.timerCronometro);
        
        const tempoResposta = (Date.now() - this.tempoInicio) / 1000;
        const pergunta = this.perguntas[this.perguntaAtual];
        const estaCorreta = indiceEscolhido === pergunta.correta;
        
        // Calcula pontuação
        let pontosBase = 0;
        let bonus = 0;
        
        if (estaCorreta) {
            pontosBase = 10;
            bonus = this.calcularBonus(tempoResposta);
            // Anuncia resposta correta
            try {
                Anunciador.anunciarRespostaCorreta(pontosBase + bonus, bonus);
            } catch (e) {
                // Silencia erros de acessibilidade
            }
        } else {
            // Anuncia resposta errada com a alternativa correta
            const respostaCorreta = pergunta.alternativas[pergunta.correta];
            try {
                Anunciador.anunciarRespostaErrada(respostaCorreta);
            } catch (e) {
                // Silencia erros de acessibilidade
            }
        }
        
        const pontosGanhos = pontosBase + bonus;
        this.pontuacaoTotal += pontosGanhos;
        
        // Registra a resposta
        const detalheResposta = {
            perguntaId: pergunta.id,
            tema: pergunta.tema || null,
            enunciado: pergunta.enunciado,
            alternativas: pergunta.alternativas,
            tempo: Math.round(tempoResposta * 10) / 10, // Arredonda para 1 casa decimal
            correto: estaCorreta,
            pontosBase: pontosBase,
            bonus: bonus,
            pontosTotais: pontosGanhos,
            respostaEscolhida: indiceEscolhido,
            respostaCorreta: pergunta.correta
        };
        
        this.respostas.push(detalheResposta);
        
        // Notifica atualização de pontuação
        if (this.onPontuacaoAtualizada) {
            this.onPontuacaoAtualizada(this.pontuacaoTotal);
        }
        
        // Notifica que a resposta foi processada
        if (this.onRespostaProcessada) {
            this.onRespostaProcessada({
                correta: estaCorreta,
                indiceCorreto: pergunta.correta,
                indiceEscolhido: indiceEscolhido,
                tempo: tempoResposta,
                pontosBase: pontosBase,
                bonus: bonus,
                pontosGanhos: pontosGanhos,
                pontuacaoTotal: this.pontuacaoTotal
            });
        }
    }

    /**
     * Avança para a próxima pergunta
     */
    proximaPergunta() {
        this.perguntaAtual++;
        this.carregarPergunta();
    }

    /**
     * Finaliza o quiz e prepara o resultado
     */
    finalizar() {
        // Limpa timers
        clearInterval(this.timerLeitura);
        clearInterval(this.timerCronometro);
        
        // Calcula estatísticas finais
        const acertos = this.respostas.filter(r => r.correto).length;
        const tempoTotal = this.respostas.reduce((acc, r) => acc + r.tempo, 0);
        
        // Anuncia fim da partida
        try {
            Anunciador.anunciarFimPartida(this.pontuacaoTotal, acertos, this.perguntas.length);
        } catch (e) {
            // Silencia erros de acessibilidade
        }
        
        // Calcula temas das perguntas respondidas
        const temasRespondidos = [...new Set(this.respostas.map(r => r.tema).filter(Boolean))];
        
        // Extrai IDs das perguntas para permitir desafios
        const perguntasIds = this.perguntas.map(p => p.id);
        
        const resultado = {
            jogador: '', // Será preenchido pelo app.js
            sessaoId: this.sessaoId,
            sessaoOriginalId: this.sessaoOriginalId, // ID da sessão original (para agrupar desafios)
            dataHora: new Date().toISOString(), // Data/hora da partida
            // IDs das perguntas (para permitir desafios)
            perguntasIds: perguntasIds,
            // Informações dos temas
            temas: this.temasSelecionados,
            temasNomes: this.temasNomes,
            temasRespondidos: temasRespondidos,
            modoAleatorio: this.modoAleatorio,
            descricaoTemas: this.descricaoTemas,
            // Informações de desafio
            modoDesafio: this.modoDesafio,
            jogadorDesafiado: this.jogadorDesafiado,
            // Pontuação
            pontuacaoTotal: this.pontuacaoTotal,
            acertos: acertos,
            totalPerguntas: this.perguntas.length,
            tempoTotal: Math.round(tempoTotal * 10) / 10,
            // Detalhes
            detalhes: this.respostas
        };
        
        if (this.onQuizFinalizado) {
            this.onQuizFinalizado(resultado);
        }
        
        return resultado;
    }

    /**
     * Desiste do quiz - marca perguntas restantes como erradas e finaliza
     */
    desistir() {
        // Limpa timers
        clearInterval(this.timerLeitura);
        clearInterval(this.timerCronometro);
        
        // Marca a pergunta atual (se ainda não respondeu) e todas as restantes como erradas
        const perguntasRestantes = this.perguntas.slice(this.perguntaAtual);
        
        for (const pergunta of perguntasRestantes) {
            // Encontra a alternativa correta
            const indiceCorreto = pergunta.alternativas.findIndex(a => a.correta);
            
            this.respostas.push({
                perguntaId: pergunta.id,
                tema: pergunta.tema,
                enunciado: pergunta.enunciado,
                respostaEscolhida: null, // Não respondeu
                respostaCorreta: indiceCorreto,
                correto: false,
                tempo: 0, // Não gastou tempo
                pontos: 0,
                desistiu: true // Marca que desistiu
            });
        }
        
        // Atualiza índice para o final
        this.perguntaAtual = this.perguntas.length;
        
        // Finaliza normalmente
        return this.finalizar();
    }

    /**
     * Reseta o estado do quiz
     */
    resetar() {
        clearInterval(this.timerLeitura);
        clearInterval(this.timerCronometro);
        
        this.perguntaAtual = 0;
        this.pontuacaoTotal = 0;
        this.perguntas = [];
        this.temasSelecionados = [];
        this.temasNomes = [];
        this.modoAleatorio = false;
        this.descricaoTemas = '';
        this.respostas = [];
        this.tempoInicio = null;
        this.tempoAdicional = 0;
        this.cronometroSegundos = 0;
        this.respondeu = false;
        this.sessaoId = null;
        this.modoDesafio = false;
        this.sessaoOriginalId = null;
        this.jogadorDesafiado = null;
    }

    /**
     * Retorna o progresso atual do quiz
     */
    obterProgresso() {
        return {
            atual: this.perguntaAtual + 1,
            total: this.perguntas.length,
            porcentagem: Math.round(((this.perguntaAtual + 1) / this.perguntas.length) * 100)
        };
    }

    /**
     * Retorna estatísticas parciais do quiz
     */
    obterEstatisticasParciais() {
        const acertos = this.respostas.filter(r => r.correto).length;
        const tempoTotal = this.respostas.reduce((acc, r) => acc + r.tempo, 0);
        
        return {
            acertos: acertos,
            erros: this.respostas.length - acertos,
            pontuacaoTotal: this.pontuacaoTotal,
            tempoTotal: tempoTotal,
            tempoMedio: this.respostas.length > 0 ? tempoTotal / this.respostas.length : 0
        };
    }
    
    /**
     * Verifica se uma ajuda está disponível para uso
     * @param {string} tipo - Tipo da ajuda: 'tempo', 'eliminar', 'pular'
     * @returns {boolean}
     */
    ajudaDisponivel(tipo) {
        const ajuda = this.ajudas[tipo];
        if (!ajuda) return false;
        return ajuda.usado < ajuda.disponivel;
    }
    
    /**
     * Usa uma ajuda e retorna o multiplicador
     * @param {string} tipo - Tipo da ajuda: 'tempo', 'eliminar', 'pular'
     * @returns {{ sucesso: boolean, multiplicador: number, restante: number }}
     */
    usarAjuda(tipo) {
        const ajuda = this.ajudas[tipo];
        if (!ajuda || ajuda.usado >= ajuda.disponivel) {
            return { sucesso: false, multiplicador: 1, restante: 0 };
        }
        
        ajuda.usado++;
        
        // Atualiza compatibilidade com código antigo
        if (ajuda.usado >= ajuda.disponivel) {
            this.ajudasUsadas[tipo] = true;
        }
        
        return { 
            sucesso: true, 
            multiplicador: ajuda.multiplicador,
            restante: ajuda.disponivel - ajuda.usado
        };
    }
    
    /**
     * Retorna quantas ajudas restam de um tipo
     * @param {string} tipo - Tipo da ajuda
     * @returns {number}
     */
    ajudasRestantes(tipo) {
        const ajuda = this.ajudas[tipo];
        if (!ajuda) return 0;
        return ajuda.disponivel - ajuda.usado;
    }
}
