const URL_DATA = 'https://raw.githubusercontent.com/isaquexxz/projeto-extracao-de-dados/refs/heads/main/Dados_limpos.csv';
let BASE_PROCESSED = [];
let CURRENT_SUBSET = [];
const sample = 10000; // Define o tamanho da amostra para os gráficos

document.getElementById('withData').style.display = 'none';
document.getElementById('noData').style.display = 'block';

Papa.parse(URL_DATA, {
    download: true, header: true, skipEmptyLines: true,
    complete: function (res) {
        BASE_PROCESSED = res.data.map(d => ({
            ...d,
            feridos_graves: d.feridos_graves ? parseInt(d.feridos_graves, 10) : 0,
            feridos_leves: d.feridos_leves ? parseInt(d.feridos_leves, 10) : 0,
            mortos: d.mortos ? parseInt(d.mortos, 10) : 0,
            ilesos: d.ilesos ? parseInt(d.ilesos, 10) : 0,
            idade: d.idade ? parseFloat(d.idade) : null,
            classe_acc: d.classe_acc || d.classificacao_accidente || d.classificacao_acidente || 'Não Especificado'
        }));

        document.getElementById('withData').style.display = 'block';
        document.getElementById('noData').style.display = 'none';

        Estatisticas(BASE_PROCESSED);
    }
});

function Estatisticas(dataset) {
    let mortos = 0, graves = 0, leves = 0, ilesos = 0;
    let somaIdades = 0, idadesValidas = 0;

    const mapasRecorrenciaGlobais = {};
    if (dataset.length > 0) {
        Object.keys(dataset[0]).forEach(chave => {
            mapasRecorrenciaGlobais[chave] = {};
        });
    }

    const totalData = dataset.length;
    document.getElementById('totalData').innerText = totalData.toLocaleString('pt-BR');

    let index = 0;
    const tamanhoLote = 2000;
    function processarLote() {
        const fim = Math.min(index + tamanhoLote, totalData);

        for (let i = index; i < fim; i++) {
            const d = dataset[i];

            mortos += d.mortos;
            graves += d.feridos_graves;
            leves += d.feridos_leves;
            ilesos += d.ilesos;

            for (let chave in mapasRecorrenciaGlobais) {
                let valor = d[chave] !== undefined && d[chave] !== "" ? d[chave] : "NÃO INFORMADO";
                mapasRecorrenciaGlobais[chave][valor] = (mapasRecorrenciaGlobais[chave][valor] || 0) + 1;
            }

            let id = parseInt(d.idade, 10);
            if (!isNaN(id) && id > 0 && id < 110) {
                somaIdades += id;
                idadesValidas++;
            }
        }

        index = fim;
        // Atualiza o contador na tela
        document.getElementById('loadingData').innerText = index.toLocaleString('pt-BR');

        // Calcule o percentual atual (garantindo que não divida por zero)
        const percentual = totalData > 0 ? Math.round((index / totalData) * 100) : 0;

        // Capture o elemento da barra de progresso
        const progressBar = document.getElementById('progressbar');
        if (progressBar) {
            progressBar.style.width = `${percentual}%`;
            progressBar.setAttribute('aria-valuenow', percentual);
            progressBar.innerText = `${percentual}%`;
        }

        if (index < totalData) {
            // Se ainda não terminou, joga o próximo lote para a próxima brecha do navegador
            setTimeout(processarLote, 0);
        } else {
            // Quando termina tudo, atualiza os KPIs finais
            document.getElementById('kpi-mortos').innerText = mortos.toLocaleString('pt-BR');
            document.getElementById('kpi-graves').innerText = graves.toLocaleString('pt-BR');
            document.getElementById('kpi-leves').innerText = leves.toLocaleString('pt-BR');
            document.getElementById('kpi-ilesos').innerText = ilesos.toLocaleString('pt-BR');

            // libera o conteúdo principal
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block'

            document.getElementById('reg-count').innerText = totalData.toLocaleString('pt-BR');

            // Para ativar os gráficos, chame-os aqui:
            iniciarGraficos(BASE_PROCESSED.slice(0, 10000)); // Passa uma amostra para os gráficos, para não sobrecarregar a renderização inicial

            document.getElementById('sample-select').addEventListener('change', function () {
                const val = this.value;
                const subset = val === 'all' ? BASE_PROCESSED : BASE_PROCESSED.slice(0, parseInt(val));
                iniciarGraficos(subset);
            });
        }
    }

    if (totalData > 0) {
        processarLote();
    } else {
        document.getElementById('loadingData').innerText = "0";
    }
};


function iniciarGraficos(sampleData) {
    // Aqui ocorre a construção dos specs dos gráficos usando o sampleData, 
    // e depois a renderização com vegaEmbed.

    // Configuração de tema escuro para os gráficos Vega-Lite
    const configTemaDark = {
        background: "transparent",
        view: { stroke: "transparent" },
        axis: {
            domainColor: "#555",
            gridColor: "#333",
            tickColor: "#555",
            labelColor: "#aaa",
            titleColor: "#ccc",
            labelFont: "system-ui, sans-serif",
            titleFont: "system-ui, sans-serif",
            titleFontSize: 12,
            labelFontSize: 11
        },
        legend: {
            labelColor: "#aaa",
            titleColor: "#ccc",
            labelFont: "system-ui, sans-serif",
            titleFont: "system-ui, sans-serif",
            titleFontSize: 12,
            labelFontSize: 11
        },
        title: {
            color: "#e0e0e0",
            subtitleColor: "#aaa",
            font: "system-ui, sans-serif",
            fontSize: 14,
            fontWeight: "bold"
        },
        mark: { tooltip: true },
        point: { filled: true },
        range: {
            category: ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#60a5fa", "#f87171"],
            diverging: ["#f87171", "#fb923c", "#facc15", "#34d399", "#38bdf8", "#a78bfa"],
            heatmap: ["#1e3a5f", "#1e6091", "#1a759f", "#168aad", "#34a0a4", "#52b69a", "#76c893", "#99d98c"]
        }
    };

    // Exemplo para o primeiro gráfico:
    const specGrafico1 = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: sampleData },
        config: configTemaDark,
        width: "container", height: 280,
        transform: [{ filter: "datum.idade > 0 && datum.idade < 95" }],
        mark: "bar",
        encoding: {
            x: { field: "idade", type: "quantitative", bin: { maxbins: 15 }, title: "Idade Correlacionada" },
            y: { aggregate: "count", type: "quantitative", title: "Registros de Envolvidos" },
            color: { field: "estado_fisico", type: "nominal", scale: { scheme: "category10" }, title: "Condição" }
        }
    };

    // Renderiza o gráfico no elemento com id "v-chart-1"
    vegaEmbed("#v-chart-1", specGrafico1, { actions: false });

    // Top 10 Causas com Maior Índice de Óbitos
    const specGrafico3 = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: sampleData },
        config: configTemaDark,
        width: "container", height: 280,
        transform: [
            { filter: "datum.causa_acidente !== 'NÃO INFORMADO' && datum.causa_acidente !== ''" },
            {
                aggregate: [{ op: "sum", field: "mortos", as: "total_mortos" }],
                groupby: ["causa_acidente"]
            },
            {
                window: [{ op: "row_number", as: "rank" }],
                sort: [{ field: "total_mortos", order: "descending" }]
            },
            { filter: "datum.rank <= 10" }
        ],
        mark: { type: "bar", cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
        encoding: {
            x: { field: "causa_acidente", type: "nominal", title: "Top 10 Causas Principais", sort: "-y", axis: { labelAngle: -25, labelLimit: 120 } },
            y: { field: "total_mortos", type: "quantitative", title: "Soma Absoluta de Óbitos" },
            color: { value: "#ef4444" }
        }
    };

    // Renderiza o gráfico no elemento com id "v-chart-3"
    vegaEmbed("#v-chart-3", specGrafico3, { actions: false });

    // Vítimas por Tipo de Pista
    const specGrafico4 = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: sampleData },
        config: configTemaDark,
        width: "container", height: 280,
        mark: "bar",
        encoding: {
            x: { field: "tipo_pista", type: "nominal", title: "Pista", axis: { labelAngle: 0 } },
            y: { aggregate: "sum", field: "feridos_graves", type: "quantitative", title: "Feridos Graves" },
            color: { value: "#f59e0b" }
        }
    };

    // Renderiza o gráfico no elemento com id "v-chart-4"
    vegaEmbed("#v-chart-4", specGrafico4, { actions: false });

    // Impacto do Desenho Geométrico (Traçado da Via)
    const specGrafico5 = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: sampleData },
        config: configTemaDark,
        width: "container", height: 280,
        transform: [
            { filter: "datum.tracado_via !== 'Não Informado' && datum.tracado_via !== '' && datum.tracado_via !== null" },
            { aggregate: [{ op: "count", as: "total_ocorrencias" }], groupby: ["tracado_via", "classe_acc"] },
            { joinaggregate: [{ op: "sum", field: "total_ocorrencias", as: "total_por_tracado" }], groupby: ["tracado_via"] },
            { window: [{ op: "dense_rank", as: "ranking_posicao" }], sort: [{ field: "total_por_tracado", order: "descending" }] },
            { calculate: "datum.ranking_posicao <= 7 ? datum.tracado_via : 'Outros Layouts'", as: "tracado_agrupado" }
        ],
        mark: { type: "bar", cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
        encoding: {
            x: {
                field: "tracado_agrupado", type: "nominal", title: "Configuração Geométrica da Via", sort: "-y",
                axis: { labelAngle: 0, labelOverlap: "hide", labelLimit: 110 }
            },
            y: { field: "total_ocorrencias", type: "quantitative", aggregate: "sum", title: "Quantidade de Ocorrências" },
            color: { field: "classe_acc", type: "nominal", scale: { scheme: "tableau10" }, title: "Gravidade" }
        }
    };

    // Renderiza o gráfico no elemento com id "v-chart-5"
    vegaEmbed("#v-chart-5", specGrafico5, { actions: false });

    // Densidade Espacial por Fase do Dia e UF
    const specGrafico6 = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: sampleData },
        config: configTemaDark,
        width: "container", height: 280,
        mark: "rect",
        encoding: {
            x: { field: "uf", type: "nominal", title: "Estado (UF)" },
            y: { field: "fase_dia", type: "nominal", title: "Fase Luminosa" },
            color: { aggregate: "count", type: "quantitative", scale: { scheme: "viridis" }, title: "Sinistros" }
        }
    };

    // Renderiza o gráfico no elemento com id "v-chart-6"
    vegaEmbed("#v-chart-6", specGrafico6, { actions: false });

    // Sazonalidade Semanal
    const specGrafico7 = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: sampleData },
        config: configTemaDark,
        width: "container", height: 280,
        mark: { type: "line", point: true },
        encoding: {
            x: { field: "dia_semana", type: "nominal", title: "Dia da Semana", sort: ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"] },
            y: { aggregate: "count", type: "quantitative", title: "Volume de Acidentes" },
            color: { value: "#38bdf8" }
        }
    };

    // Renderiza o gráfico no elemento com id "v-chart-7"
    vegaEmbed("#v-chart-7", specGrafico7, { actions: false });
}