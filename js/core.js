/**
 * core.js — Arquivo central de processamento de dados.
 * Responsável por: fetch do CSV, parse, processamento e cache via localStorage.
 * Usado por: dataset.js (index.html) e sobre.js (sobre.html)
 */

const PRF_CORE = (() => {
    const URL_DATA = 'https://raw.githubusercontent.com/isaquexxz/projeto-extracao-de-dados/refs/heads/main/Dados_limpos.csv';

    // Versão do cache (incrementar aqui sempre que o dataset mudar)
    const CACHE_VERSION = '1';
    const CACHE_KEY     = 'prf_cache_v' + CACHE_VERSION;

    // Campos numéricos: excluídos do mapa de recorrência (são contínuos e não têm valor semântico de categoria)
    const CAMPOS_NUMERICOS = new Set(['mortos', 'feridos_graves', 'feridos_leves', 'ilesos', 'idade']);

    // ─── API pública ────────────────────────────────────────────────────────────

    /**
     * Carrega e processa o dataset.
     * Retorna uma Promise que resolve com { base, mapasRecorrencia, kpis }.
     * 
     * @param {object} callbacks
     * @param {function} callbacks.onProgress  (loaded, total) => void
     * @param {function} callbacks.onReady     ({ base, mapasRecorrencia, kpis }) => void
     * @param {function} callbacks.onError     (err) => void
     */
    function carregar({ onProgress, onReady, onError } = {}) {

        // Tenta cache primeiro
        const cached = _lerCache();
        if (cached) {
            // Cache não tem a base completa (muito grande pra localStorage),
            // apenas mapasRecorrencia e kpis. Base é reparseada se necessário.
            if (cached.base) {
                onReady && onReady(cached);
                return;
            }
        }

        Papa.parse(URL_DATA, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete(res) {
                const base = _normalizar(res.data);
                _processarAsync(base, { onProgress, onReady, onError });
            },
            error(err) {
                onError && onError(err);
            }
        });
    }

    /**
     * Lê apenas o mapa de recorrência e KPIs do cache (para sobre.html).
     * Retorna null se não houver cache.
     */
    function lerCacheResumido() {
        return _lerCache();
    }

    // Verifica se existe cache válido.
    function temCache() {
        return !!_lerCache();
    }

    // ─── Internos ───────────────────────────────────────────────────────────────
    // Metodo para normalizar e converter tipos da base original (tudo string) para tipos adequados.
    function _normalizar(data) {
        return data.map(d => ({
            ...d,
            feridos_graves: d.feridos_graves ? parseInt(d.feridos_graves, 10) : 0,
            feridos_leves:  d.feridos_leves  ? parseInt(d.feridos_leves,  10) : 0,
            mortos:         d.mortos         ? parseInt(d.mortos,         10) : 0,
            ilesos:         d.ilesos         ? parseInt(d.ilesos,         10) : 0,
            idade:          d.idade          ? parseFloat(d.idade)            : null,
            classe_acc:     d.classe_acc || d.classificacao_accidente || d.classificacao_acidente || 'Não Especificado'
        }));
    }

    // Metodo para processar a base em lotes assíncronos, evitando travar a UI.
    function _processarAsync(base, { onProgress, onReady, onError }) {
        let mortos = 0, graves = 0, leves = 0, ilesos = 0;
        const totalData = base.length;

        // Inicializa somente campos categóricos no mapa
        const mapasRecorrencia = {};
        if (totalData > 0) {
            Object.keys(base[0]).forEach(chave => {
                if (!CAMPOS_NUMERICOS.has(chave)) {
                    mapasRecorrencia[chave] = {};
                }
            });
        }

        let index = 0;
        const LOTE = 2000;

        // Metodo recursivo para processar um lote de dados e agendar o próximo, até completar toda a base.
        function processarLote() {
            const fim = Math.min(index + LOTE, totalData);

            for (let i = index; i < fim; i++) {
                const d = base[i];

                mortos += d.mortos;
                graves += d.feridos_graves;
                leves  += d.feridos_leves;
                ilesos += d.ilesos;

                for (const chave in mapasRecorrencia) {
                    const valor = (d[chave] !== undefined && d[chave] !== '')
                        ? String(d[chave]).trim()
                        : 'NÃO INFORMADO';
                    mapasRecorrencia[chave][valor] = (mapasRecorrencia[chave][valor] || 0) + 1;
                }
            }

            index = fim;
            onProgress && onProgress(index, totalData);

            if (index < totalData) {
                setTimeout(processarLote, 0);
            } else {
                // Processamento concluído — monta resultado
                const kpis = { mortos, graves, leves, ilesos, total: totalData };

                // Salva cache (sem a base — muito grande)
                _salvarCache({ mapasRecorrencia, kpis });

                onReady && onReady({ base, mapasRecorrencia, kpis });
            }
        }

        if (totalData > 0) {
            processarLote();
        } else {
            onError && onError(new Error('Dataset vazio'));
        }
    }

    // Metodo para leitura do cache do localStorage.
    function _lerCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    // Metodo para salvar o cache no localStorage.
    function _salvarCache(dados) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(dados));
            // Limpa versões antigas do cache
            _limparCacheAntigo();
        } catch (e) {
            // localStorage cheio — ignora silenciosamente
            console.warn('PRF Core: não foi possível salvar cache.', e.message);
        }
    }

    // Metodo para limpar caches antigos (de versões anteriores do dataset).
    function _limparCacheAntigo() {
        const keysParaRemover = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('prf_cache_v') && key !== CACHE_KEY) {
                keysParaRemover.push(key);
            }
        }
        keysParaRemover.forEach(k => localStorage.removeItem(k));

        // Remove chave legada do projeto anterior
        localStorage.removeItem('mapasRecorrencia');
    }

    return { carregar, lerCacheResumido, temCache };
})();