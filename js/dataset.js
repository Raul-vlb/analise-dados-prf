const URL_DATA = 'https://raw.githubusercontent.com/isaquexxz/projeto-extracao-de-dados/refs/heads/main/Dados_limpos.csv';
let BASE_PROCESSED = [];
let CURRENT_SUBSET = [];

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
            
            // Para ativar os gráficos, chame-os aqui:
            // if (document.getElementById('tab-vega-charts').classList.contains('active')) {
            //     renderizarDezGraficosVega(dataset);
            // }
        }
    }

    if (totalData > 0) {
        processarLote();
    } else {
        document.getElementById('loadingData').innerText = "0";
    }
};