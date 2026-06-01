/**
 * sobre.js — Controla sobre.html
 * Depende de: core.js (deve ser carregado antes), PapaParse, Bootstrap
 *
 * Funciona de duas formas:
 *  1. Cache disponível  → renderiza imediatamente
 *  2. Sem cache         → baixa o dataset, processa e renderiza
 */

const container   = document.getElementById('sobre-container');
const semDados    = document.getElementById('sem-dados');
const searchInput = document.getElementById('search-input');

// ── Ponto de entrada ──────────────────────────────────────────────────────────

const cache = PRF_CORE.lerCacheResumido();

if (cache && cache.mapasRecorrencia) {
    renderizarTudo(cache.mapasRecorrencia);
    iniciarControles();
} else {
    // Sem cache — precisa baixar o dataset
    _mostrarLoadingInline();

    PRF_CORE.carregar({
        onProgress(loaded, total) {
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            const bar = document.getElementById('loading-bar-sobre');
            const lbl = document.getElementById('loading-label-sobre');
            if (bar) {
                bar.style.width = `${pct}%`;
                bar.innerText   = `${pct}%`;
            }
            if (lbl) lbl.innerText = `${loaded.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros processados`;
        },

        onReady({ mapasRecorrencia }) {
            renderizarTudo(mapasRecorrencia);
            iniciarControles();
        },

        onError(err) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    Erro ao carregar o dataset: ${err.message || err}<br>
                    <a href="index.html" class="alert-link">Volte à página inicial</a> e tente novamente.
                </div>`;
        }
    });
}

// ── Loading inline (sem precisar do index.html) ───────────────────────────────

function _mostrarLoadingInline() {
    container.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-3 py-5">
            <div class="spinner-border text-info" role="status"></div>
            <div id="loading-label-sobre" class="text-muted">Carregando dataset...</div>
            <div class="w-100" style="max-width: 400px;">
                <div class="progress" style="height: 18px;">
                    <div id="loading-bar-sobre"
                         class="progress-bar bg-info text-dark fw-bold"
                         role="progressbar"
                         style="width: 0%;">0%</div>
                </div>
            </div>
        </div>`;
}

// ── Renderização principal ────────────────────────────────────────────────────

function renderizarTudo(mapas) {
    container.innerHTML = '';

    const campos = Object.entries(mapas);
    if (campos.length === 0) {
        semDados.classList.remove('d-none');
        return;
    }

    const frag = document.createDocumentFragment();
    campos.forEach(([campo, recorrencias], idx) => {
        frag.appendChild(criarBloco(campo, recorrencias, idx));
    });
    container.appendChild(frag);
}

function criarBloco(campo, recorrencias, idx) {
    const collapseId = `collapse-${idx}`;

    const ordenado  = Object.entries(recorrencias).sort((a, b) => b[1] - a[1]);
    const total     = ordenado.reduce((acc, [, v]) => acc + v, 0);
    const distintos = ordenado.length;

    const wrapper = document.createElement('div');
    wrapper.className    = 'campo-bloco mb-3';
    wrapper.dataset.campo = campo.toLowerCase();

    wrapper.innerHTML = `
        <div class="campo-header d-flex align-items-center gap-2 p-3 rounded-3 bg-body-tertiary border border-secondary"
             data-bs-toggle="collapse"
             data-bs-target="#${collapseId}"
             aria-expanded="false"
             aria-controls="${collapseId}">
            <span class="collapse-icon text-muted">▼</span>
            <span class="campo-titulo text-info fw-semibold text-uppercase" style="font-size: 0.85rem; letter-spacing: 0.05em;">${campo}</span>
            <span class="ms-auto d-flex gap-2 align-items-center">
                <span class="badge bg-secondary badge-total">${distintos} valor${distintos !== 1 ? 'es' : ''} distinto${distintos !== 1 ? 's' : ''}</span>
                <span class="badge bg-body-secondary text-muted badge-total">${total.toLocaleString('pt-BR')} registros</span>
            </span>
        </div>

        <div class="collapse" id="${collapseId}">
            <div class="pt-2 pb-3 px-1">
                ${ordenado.map(([valor, count]) => criarLinhaValor(valor, count, total)).join('')}
            </div>
        </div>`;

    // Ícone de colapso
    const header     = wrapper.querySelector('.campo-header');
    const collapseEl = wrapper.querySelector(`#${collapseId}`);

    collapseEl.addEventListener('show.bs.collapse', () => header.classList.remove('collapsed'));
    collapseEl.addEventListener('hide.bs.collapse', () => header.classList.add('collapsed'));
    header.classList.add('collapsed');

    return wrapper;
}

function criarLinhaValor(valor, count, total) {
    const pct       = ((count / total) * 100).toFixed(1);
    const isNaoInfo = valor === 'NÃO INFORMADO';
    const tagClass  = isNaoInfo ? 'tag-nao-informado' : '';

    return `
        <div class="d-flex align-items-center gap-3 py-1 px-2 rounded hover-row ${tagClass}">
            <div class="valor-label text-light" title="${valor}">${valor}</div>
            <div class="flex-grow-1">
                <div class="progress" style="height: 10px;">
                    <div class="progress-bar bg-info" style="width: ${pct}%; opacity: ${isNaoInfo ? 0.35 : 0.85};"></div>
                </div>
            </div>
            <div class="count-label text-muted text-end" style="min-width: 120px;">
                <span class="text-light fw-semibold">${count.toLocaleString('pt-BR')}</span>
                <span class="text-muted"> · ${pct}%</span>
            </div>
        </div>`;
}

// ── Busca e controles ─────────────────────────────────────────────────────────

function iniciarControles() {
    searchInput.addEventListener('input', () => {
        const termo = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('.campo-bloco').forEach(bloco => {
            bloco.style.display = bloco.dataset.campo.includes(termo) ? '' : 'none';
        });
    });

    document.getElementById('btn-expand-all').addEventListener('click', () => {
        document.querySelectorAll('.campo-bloco .collapse').forEach(el =>
            bootstrap.Collapse.getOrCreateInstance(el).show()
        );
    });

    document.getElementById('btn-collapse-all').addEventListener('click', () => {
        document.querySelectorAll('.campo-bloco .collapse').forEach(el =>
            bootstrap.Collapse.getOrCreateInstance(el).hide()
        );
    });
}