/**
 * dataset.js — Controla index.html
 * Depende de: core.js (deve ser carregado antes), Vega-Lite, PapaParse
 */

// Referências das views do Vega para atualização sem re-render
const _vegaViews = {};

// ─── Inicialização ────────────────────────────────────────────────────────────

document.getElementById('withData').style.display = 'none';
document.getElementById('noData').style.display = 'block';

PRF_CORE.carregar({
    onProgress(loaded, total) {
        if (loaded === 1) {
            // Primeira chamada — exibe o progresso detalhado
            document.getElementById('withData').style.display = 'block';
            document.getElementById('noData').style.display = 'none';
            document.getElementById('totalData').innerText = total.toLocaleString('pt-BR');
        }

        document.getElementById('loadingData').innerText = loaded.toLocaleString('pt-BR');

        const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
        const bar = document.getElementById('progressbar');
        if (bar) {
            bar.style.width = `${pct}%`;
            bar.setAttribute('aria-valuenow', pct);
            bar.innerText = `${pct}%`;
        }
    },

    onReady({ base, kpis }) {
        // KPIs
        document.getElementById('kpi-mortos').innerText = kpis.mortos.toLocaleString('pt-BR');
        document.getElementById('kpi-graves').innerText = kpis.graves.toLocaleString('pt-BR');
        document.getElementById('kpi-leves').innerText  = kpis.leves.toLocaleString('pt-BR');
        document.getElementById('kpi-ilesos').innerText = kpis.ilesos.toLocaleString('pt-BR');

        // Exibe conteúdo principal
        document.getElementById('loading').style.display      = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('reg-count').innerText        = kpis.total.toLocaleString('pt-BR');

        // Renderiza gráficos com amostra inicial
        const amostraInicial = base.slice(0, 10000);
        iniciarGraficos(amostraInicial);

        // Troca de amostra — atualiza dados sem recriar os gráficos
        document.getElementById('sample-select').addEventListener('change', function () {
            const val    = this.value;
            const subset = val === 'all' ? base : base.slice(0, parseInt(val));
            atualizarDadosGraficos(subset);
        });
    },

    onError(err) {
        document.getElementById('loading').innerHTML = `
            <div class="alert alert-danger text-center">
                Erro ao carregar o dataset. Verifique sua conexão e recarregue a página.<br>
                <small class="text-muted">${err.message || err}</small>
            </div>`;
    }
});

// ─── Configuração de tema ─────────────────────────────────────────────────────

const CONFIG_DARK = {
    background: 'transparent',
    view: { stroke: 'transparent' },
    axis: {
        domainColor: '#555', gridColor: '#333', tickColor: '#555',
        labelColor: '#aaa', titleColor: '#ccc',
        labelFont: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif',
        titleFontSize: 12, labelFontSize: 11
    },
    legend: {
        labelColor: '#aaa', titleColor: '#ccc',
        labelFont: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif',
        titleFontSize: 12, labelFontSize: 11
    },
    title: {
        color: '#e0e0e0', subtitleColor: '#aaa',
        font: 'system-ui, sans-serif', fontSize: 14, fontWeight: 'bold'
    },
    mark: { tooltip: true },
    point: { filled: true },
    range: {
        category:  ['#38bdf8','#fb923c','#a78bfa','#34d399','#f472b6','#facc15','#60a5fa','#f87171'],
        diverging: ['#f87171','#fb923c','#facc15','#34d399','#38bdf8','#a78bfa'],
        heatmap:   ['#1e3a5f','#1e6091','#1a759f','#168aad','#34a0a4','#52b69a','#76c893','#99d98c']
    }
};

// ─── Specs dos gráficos ───────────────────────────────────────────────────────

function buildSpecs(data) {
    const base = { config: CONFIG_DARK, width: 'container', height: 280 };

    return [
        // 1 — Pirâmide Etária vs Gravidade
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [{ filter: 'datum.idade > 0 && datum.idade < 95' }],
            mark: 'bar',
            encoding: {
                x: { field: 'idade', type: 'quantitative', bin: { maxbins: 15 }, title: 'Idade Correlacionada' },
                y: { aggregate: 'count', type: 'quantitative', title: 'Registros de Envolvidos' },
                color: { field: 'estado_fisico', type: 'nominal', scale: { scheme: 'category10' }, title: 'Condição' }
            }
        },

        // 2 — Gênero vs Severidade
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [{ filter: "datum.sexo === 'Masculino' || datum.sexo === 'Feminino'" }],
            mark: 'bar',
            encoding: {
                x: { field: 'sexo', type: 'nominal', title: 'Gênero Informado' },
                y: { aggregate: 'count', type: 'quantitative', title: 'Total Envolvidos' },
                color: { field: 'classe_acc', type: 'nominal', scale: { scheme: 'accent' }, title: 'Gravidade' }
            }
        },

        // 3 — Top 10 Causas com Maior Índice de Óbitos
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [
                { filter: "datum.causa_acidente !== 'NÃO INFORMADO' && datum.causa_acidente !== ''" },
                { aggregate: [{ op: 'sum', field: 'mortos', as: 'total_mortos' }], groupby: ['causa_acidente'] },
                { window: [{ op: 'row_number', as: 'rank' }], sort: [{ field: 'total_mortos', order: 'descending' }] },
                { filter: 'datum.rank <= 10' }
            ],
            mark: { type: 'bar', cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
            encoding: {
                x: { field: 'causa_acidente', type: 'nominal', title: 'Top 10 Causas Principais', sort: '-y', axis: { labelAngle: -25, labelLimit: 120 } },
                y: { field: 'total_mortos', type: 'quantitative', title: 'Soma Absoluta de Óbitos' },
                color: { value: '#ef4444' }
            }
        },

        // 4 — Vítimas por Tipo de Pista
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            mark: 'bar',
            encoding: {
                x: { field: 'tipo_pista', type: 'nominal', title: 'Pista', axis: { labelAngle: 0 } },
                y: { aggregate: 'sum', field: 'feridos_graves', type: 'quantitative', title: 'Feridos Graves' },
                color: { value: '#f59e0b' }
            }
        },

        // 5 — Impacto do Desenho Geométrico (Traçado da Via)
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [
                { filter: "datum.tracado_via !== 'Não Informado' && datum.tracado_via !== '' && datum.tracado_via !== null" },
                { aggregate: [{ op: 'count', as: 'total_ocorrencias' }], groupby: ['tracado_via', 'classe_acc'] },
                { joinaggregate: [{ op: 'sum', field: 'total_ocorrencias', as: 'total_por_tracado' }], groupby: ['tracado_via'] },
                { window: [{ op: 'dense_rank', as: 'ranking_posicao' }], sort: [{ field: 'total_por_tracado', order: 'descending' }] },
                { calculate: "datum.ranking_posicao <= 7 ? datum.tracado_via : 'Outros Layouts'", as: 'tracado_agrupado' }
            ],
            mark: { type: 'bar', cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
            encoding: {
                x: { field: 'tracado_agrupado', type: 'nominal', title: 'Configuração Geométrica da Via', sort: '-y', axis: { labelAngle: 0, labelOverlap: 'hide', labelLimit: 110 } },
                y: { field: 'total_ocorrencias', type: 'quantitative', aggregate: 'sum', title: 'Quantidade de Ocorrências' },
                color: { field: 'classe_acc', type: 'nominal', scale: { scheme: 'tableau10' }, title: 'Gravidade' }
            }
        },

        // 6 — Densidade Espacial por Fase do Dia e UF
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            mark: 'rect',
            encoding: {
                x: { field: 'uf', type: 'nominal', title: 'Estado (UF)' },
                y: { field: 'fase_dia', type: 'nominal', title: 'Fase Luminosa' },
                color: { aggregate: 'count', type: 'quantitative', scale: { scheme: 'viridis' }, title: 'Sinistros' }
            }
        },

        // 7 — Sazonalidade Semanal
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            mark: { type: 'line', point: true },
            encoding: {
                x: { field: 'dia_semana', type: 'nominal', title: 'Dia da Semana', sort: ['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'] },
                y: { aggregate: 'count', type: 'quantitative', title: 'Volume de Acidentes' },
                color: { value: '#38bdf8' }
            }
        },

        // 8 — Meteorologia vs Tipo de Incidente
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [{ filter: "datum.condicao_metereologica !== 'Não Informado' && datum.tipo_acidente !== ''" }],
            mark: 'circle',
            encoding: {
                x: { field: 'condicao_metereologica', type: 'nominal', title: 'Fator Climático', axis: { labelAngle: -20 } },
                y: { field: 'tipo_acidente', type: 'nominal', title: 'Natureza do Sinistro' },
                size: { aggregate: 'count', type: 'quantitative', title: 'Frequência' },
                color: { value: '#10b981' }
            }
        },

        // 9 — Distribuição por Tipo de Veículo
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [{ filter: "datum.tipo_veiculo !== ''" }],
            mark: 'bar',
            encoding: {
                y: { field: 'tipo_veiculo', type: 'nominal', title: 'Modais de Transporte', sort: '-x' },
                x: { aggregate: 'count', type: 'quantitative', title: 'Frota Envolvida (Casos)' },
                color: { value: '#2e3f59' }
            }
        },

        // 10 — Volumetria por Superintendência Regional
        {
            ...base,
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: { values: data },
            transform: [{ filter: "datum.regional !== ''" }],
            mark: 'bar',
            encoding: {
                x: { field: 'regional', type: 'nominal', title: 'Superintendência Regional', sort: '-y', axis: { labelAngle: -45 } },
                y: { aggregate: 'count', type: 'quantitative', title: 'Atendimentos Executados' },
                color: { field: 'regional', type: 'nominal', legend: null }
            }
        }
    ];
}

// ─── Renderização e atualização ───────────────────────────────────────────────

async function iniciarGraficos(data) {
    const specs = buildSpecs(data);

    // Renderiza todos em paralelo
    const promises = specs.map((spec, i) => {
        const id = `#v-chart-${i + 1}`;
        return vegaEmbed(id, spec, { actions: false })
            .then(result => { _vegaViews[i] = result.view; })
            .catch(err => console.error(`Erro no gráfico ${i + 1}:`, err));
    });

    await Promise.all(promises);
}

function atualizarDadosGraficos(novosDados) {
    // Se as views já existem, atualiza apenas os dados sem re-renderizar
    const ids = Object.keys(_vegaViews);

    if (ids.length === 0) {
        // Fallback: primeira renderização ainda não ocorreu
        iniciarGraficos(novosDados);
        return;
    }

    ids.forEach(i => {
        const view = _vegaViews[i];
        if (!view) return;
        try {
            view.change('source_0',
                vega.changeset()
                    .remove(() => true)
                    .insert(novosDados)
            ).run();
        } catch {
            // Gráfico com transform complexo pode não suportar changeset — re-renderiza só esse
            const specs = buildSpecs(novosDados);
            vegaEmbed(`#v-chart-${parseInt(i) + 1}`, specs[i], { actions: false })
                .then(r => { _vegaViews[i] = r.view; });
        }
    });
}