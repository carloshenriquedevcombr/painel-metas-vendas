// ========================================================
// dashboard.js - Motor Analítico do Dashboard BI (Blindado)
// ========================================================

let chartGauge, chartDonutStatus, chartLinhaEvolucao;
let dadosGlobais = [];
let metaMensalGeral = 50000; // Valor padrão de segurança

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Configura as Datas (Primeiro dia do mês até Hoje)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    // Formata YYYY-MM-DD garantindo 2 dígitos
    const formatarData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    document.getElementById('filtro-data-inicio').value = formatarData(primeiroDia);
    document.getElementById('filtro-data-fim').value = formatarData(hoje);

    // 2. Carrega a lista de Consultores
    await carregarListaConsultores();

    // 3. Tenta buscar a Meta configurada
    try {
        const resMeta = await fetch('/api/bi/performance');
        if (resMeta.ok) {
            const biData = await resMeta.json();
            if (biData.meta > 0) metaMensalGeral = biData.meta;
        }
    } catch (e) { console.log("Usando meta padrão no painel."); }

    // 4. Inicia a puxar as vendas
    await carregarDashboardBI();
});

async function carregarListaConsultores() {
    try {
        const res = await fetch('/api/lista_consultores');
        if (res.ok) {
            const consultores = await res.json();
            const select = document.getElementById('filtro-bi-consultor');
            
            // Tranca no nome do consultor se não for Admin
            if (typeof USER_ROLE !== 'undefined' && USER_ROLE === 'consultor') {
                select.innerHTML = `<option value="${USER_NAME}">${USER_NAME}</option>`;
                select.disabled = true;
            } else {
                consultores.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
            }
        }
    } catch (e) { console.error(e); }
}

async function carregarDashboardBI() {
    try {
        const res = await fetch('/api/dados?excluidos=false');
        if (res.ok) {
            dadosGlobais = await res.json();
            processarDadosBI(); // Chama o motor matemático
        }
    } catch (e) {
        console.error("Erro ao puxar vendas da base:", e);
    }
}

function processarDadosBI() {
    // Pega as strings diretas YYYY-MM-DD para não errar no Fuso Horário
    const valInicio = document.getElementById('filtro-data-inicio').value; 
    const valFim = document.getElementById('filtro-data-fim').value;
    const consultorFiltro = document.getElementById('filtro-bi-consultor').value;

    // FILTRO: Corta apenas o que importa (Data e Pessoa)
    const dadosFiltrados = dadosGlobais.filter(d => {
        // A data_venda já vem como YYYY-MM-DD do banco
        const bateData = d.data_venda >= valInicio && d.data_venda <= valFim;
        const bateConsultor = consultorFiltro === 'todos' || d.consultor === consultorFiltro;
        return bateData && bateConsultor;
    });

    // =======================================
    // VARIÁVEIS DE MATEMÁTICA PURA
    // =======================================
    let fatConcluido = 0; // SÓ DINHEIRO CONCLUÍDO
    let fatTotal = 0;     // TODO O DINHEIRO (Pipeline total)
    
    let statusCount = { 'Concluido': 0, 'Tramitando': 0, 'Pre-Tramite': 0 };
    let consultoresFat = {};
    let produtosVol = { 'Altas/PN': 0, 'Mig Móvel': 0, 'Mig Fixa': 0, 'Banda Larga': 0 };
    let vendasPorDia = {};

    dadosFiltrados.forEach(v => {
        // Força os valores a serem números (evita o erro NaN)
        const receita = parseFloat(v.receita) || 0;
        const aparelhos = parseFloat(v.aparelhos) || 0;
        const produtos_rs = parseFloat(v.produtos_rs) || 0;
        
        const valorVenda = receita + aparelhos + produtos_rs;
        const status = v.status || 'Concluido';

        // 1. SOMA NO TOTAL DO PIPELINE
        fatTotal += valorVenda;
        
        if (!statusCount[status]) statusCount[status] = 0;
        statusCount[status] += valorVenda;

        // 2. REGRAS EXCLUSIVAS PARA "CONCLUÍDO"
        if (status === 'Concluido') {
            fatConcluido += valorVenda;
            
            // Agrupa ranking de pessoas (Apenas o que já fecharam de verdade)
            if (!consultoresFat[v.consultor]) consultoresFat[v.consultor] = 0;
            consultoresFat[v.consultor] += valorVenda;

            // Agrupa ranking de produtos
            produtosVol['Altas/PN'] += (parseInt(v.altas_portin) || 0);
            produtosVol['Mig Móvel'] += (parseInt(v.mig_movel) || 0);
            produtosVol['Mig Fixa'] += (parseInt(v.mig_fixa_bl) || 0);
            produtosVol['Banda Larga'] += (parseInt(v.bl) || 0);
        }

        // 3. SEPARAÇÃO PARA O GRÁFICO DE LINHA (Por dia)
        // Converte YYYY-MM-DD para DD/MM/YYYY para o gráfico ficar bonito
        const dataPtBR = v.data_venda.split('-').reverse().join('/');
        
        if (!vendasPorDia[dataPtBR]) vendasPorDia[dataPtBR] = { concluido: 0, total: 0 };
        
        vendasPorDia[dataPtBR].total += valorVenda; // Linha Tracejada
        if (status === 'Concluido') {
            vendasPorDia[dataPtBR].concluido += valorVenda; // Linha Sólida
        }
    });

    // =======================================
    // INJETAR VALORES ESCRITOS NO ECRÃ
    // =======================================
    const formataRS = (valor) => valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    
    document.getElementById('bi-fat-concluido').innerText = formataRS(fatConcluido);
    document.getElementById('bi-fat-total').innerText = formataRS(fatTotal);

    // Estimativas Exatas Baseadas nos dias filtrados
    const dInicio = new Date(valInicio + 'T00:00:00');
    const dFim = new Date(valFim + 'T00:00:00');
    let diasPassados = Math.ceil(Math.abs(dFim - dInicio) / (1000 * 60 * 60 * 24)) + 1;
    if (diasPassados < 1) diasPassados = 1;

    const mediaDiaria = fatConcluido / diasPassados;

    document.getElementById('bi-proj-dia').innerText = formataRS(mediaDiaria);
    document.getElementById('bi-proj-semana').innerText = formataRS(mediaDiaria * 7);
    document.getElementById('bi-proj-mes').innerText = formataRS(mediaDiaria * 30);

    // Ranking Destaque e Pior
    const ranking = Object.keys(consultoresFat).map(nome => ({ nome, valor: consultoresFat[nome] })).sort((a, b) => b.valor - a.valor);
    if (ranking.length > 0) {
        document.getElementById('bi-top-consultor').innerText = `${ranking[0].nome} (${formataRS(ranking[0].valor)})`;
        document.getElementById('bi-bottom-consultor').innerText = `${ranking[ranking.length-1].nome} (${formataRS(ranking[ranking.length-1].valor)})`;
    } else {
        document.getElementById('bi-top-consultor').innerText = "Sem vendas";
        document.getElementById('bi-bottom-consultor').innerText = "Sem vendas";
    }

    if (consultorFiltro !== 'todos') document.getElementById('card-ranking-equipe').style.display = 'none';
    else document.getElementById('card-ranking-equipe').style.display = 'flex';

    // Ranking Produtos
    const rankingProd = Object.keys(produtosVol).map(nome => ({ nome, qtd: produtosVol[nome] })).sort((a, b) => b.qtd - a.qtd);
    if (rankingProd[0].qtd > 0) {
        document.getElementById('bi-top-produto').innerText = `${rankingProd[0].nome} (${rankingProd[0].qtd} un)`;
        document.getElementById('bi-bottom-produto').innerText = `${rankingProd[rankingProd.length-1].nome} (${rankingProd[rankingProd.length-1].qtd} un)`;
    } else {
        document.getElementById('bi-top-produto').innerText = "-";
        document.getElementById('bi-bottom-produto').innerText = "-";
    }

    // =======================================
    // PINTAR OS GRÁFICOS SOLICITADOS
    // =======================================
    desenharGraficos(fatConcluido, statusCount, vendasPorDia);
}

function desenharGraficos(fatConcluido, statusCount, vendasPorDia) {
    Chart.defaults.font.family = "'Nunito', sans-serif";

    // 1. GRÁFICO CONTAGIRO (GAUGE)
    const ctxGauge = document.getElementById('chart-gauge');
    if (chartGauge) chartGauge.destroy();
    
    let percentualPace = ((fatConcluido / metaMensalGeral) * 100).toFixed(1);
    if (isNaN(percentualPace) || !isFinite(percentualPace)) percentualPace = 0;
    
    document.getElementById('texto-gauge-percent').innerText = `${percentualPace}%`;
    let corGauge = percentualPace >= 100 ? '#2ecc71' : (percentualPace >= 70 ? '#f39c12' : '#e74c3c');

    chartGauge = new Chart(ctxGauge, {
        type: 'doughnut',
        data: {
            labels: ['Concluído R$', 'Falta p/ Meta Mensal'],
            datasets: [{
                data: [fatConcluido, Math.max(0, metaMensalGeral - fatConcluido)],
                backgroundColor: [corGauge, '#ecf0f1'],
                borderWidth: 0, cutout: '75%', circumference: 180, rotation: 270 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });

    // 2. GRÁFICO DE DISCO (Pipeline Status)
    const ctxDonut = document.getElementById('chart-donut-status');
    if (chartDonutStatus) chartDonutStatus.destroy();
    
    chartDonutStatus = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Concluído', 'Tramitando', 'Pré-Trâmite'],
            datasets: [{
                data: [statusCount['Concluido']||0, statusCount['Tramitando']||0, statusCount['Pre-Tramite']||0],
                backgroundColor: ['#2ecc71', '#f39c12', '#34495e'],
                borderWidth: 2, hoverOffset: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' } } }
    });

    // 3. GRÁFICO DE LINHA (Concluído vs Total)
    const ctxLinha = document.getElementById('chart-linha-evolucao');
    if (chartLinhaEvolucao) chartLinhaEvolucao.destroy();

    // Ordena as datas de forma perfeita (transforma DD/MM/YYYY em YYYYMMDD para ordenar)
    const diasOrdenados = Object.keys(vendasPorDia).sort((a,b) => {
        const dateA = a.split('/').reverse().join(''); 
        const dateB = b.split('/').reverse().join(''); 
        return dateA.localeCompare(dateB);
    });

    const dataConcluido = diasOrdenados.map(d => vendasPorDia[d].concluido);
    const dataTotal = diasOrdenados.map(d => vendasPorDia[d].total);

    chartLinhaEvolucao = new Chart(ctxLinha, {
        type: 'line',
        data: {
            labels: diasOrdenados,
            datasets: [
                {
                    label: 'Concluído (Real)', data: dataConcluido,
                    borderColor: '#1e40af', backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.3, pointRadius: 4
                },
                {
                    label: 'Total Movimentado (Pipeline)', data: dataTotal,
                    borderColor: '#bdc3c7', borderDash: [5, 5],
                    borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// =======================================
// EXPORTAÇÃO PDF DO PAINEL
// =======================================
window.exportarDashboardPDF = function() {
    const btn = document.querySelector('.btn-primary[onclick="exportarDashboardPDF()"]');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
    btn.disabled = true;

    const painel = document.getElementById('painel-dashboard-bi');
    
    html2canvas(painel, { scale: 2, backgroundColor: '#fdfbfd' }).then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new window.jspdf.jsPDF('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Dashboard_BI_Evolucao_${new Date().getTime()}.pdf`);
        
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    }).catch(err => {
        console.error(err);
        Swal.fire('Erro', 'Falha ao gerar o PDF.', 'error');
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    });
}