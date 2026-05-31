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
}