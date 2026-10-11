document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupDatasIniciais();
    
    // Carregamento Inicial
    atualizarDashboardBI(); 
    
    // Carrega Consultores
    carregarSelectConsultores(); 
    
    // Carregamentos secundários
    if(document.getElementById('tabela-metas')) carregarMetas();
    if(document.getElementById('tabela-usuarios')) carregarUsuarios();

    // Botão de Tema
    const themeBtn = document.getElementById('theme-toggle');
    if(themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Salvar Venda
    const form = document.getElementById('form-resultados');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.btn-save');
            const txtOriginal = btn.innerText;
            btn.innerText = 'Salvando...'; btn.disabled = true;

            const dados = {
                id: document.getElementById('lancamento-id').value || null,
                consultor: document.getElementById('consultor').value,
                data_venda: document.getElementById('data_venda').value, // NOVO CAMPO
                status: document.getElementById('status-pedido').value,
                receita: parseFloat(document.getElementById('receita').value) || 0,
                mig_fixa_bl: parseInt(document.getElementById('mig_fixa').value) || 0,
                mig_movel: parseInt(document.getElementById('mig_movel').value) || 0,
                altas_portin: parseInt(document.getElementById('altas_portin').value) || 0,
                bl: parseInt(document.getElementById('bl').value) || 0,
                aparelhos: parseFloat(document.getElementById('aparelhos').value) || 0,
                produtos_rs: parseFloat(document.getElementById('produtos_rs').value) || 0 // NOVO CAMPO
            };

            try {
                const response = await fetch('/api/salvar', {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados)
                });
                if (response.ok) {
                    alert('Lançamento salvo!');
                    limparFormulario();
                    atualizarDashboardBI();
                } else { alert('Erro ao salvar.'); }
            } catch (error) { console.error(error); } 
            finally { btn.innerText = txtOriginal; btn.disabled = false; }
        });
    }

    // Novo Usuário
    const formUser = document.getElementById('form-novo-usuario');
    if (formUser) {
        formUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                nome: document.getElementById('user-nome').value,
                cargo: document.getElementById('user-cargo').value,
                username: document.getElementById('user-login').value,
                password: document.getElementById('user-pass').value,
                role: document.getElementById('user-role').value
            };
            try {
                const res = await fetch('/api/usuarios/novo', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados)});
                if(res.ok) { alert('Criado!'); formUser.reset(); carregarUsuarios(); } else alert('Erro.');
            } catch(e){}
        });
    }
});

function setupDatasIniciais() {
    const hoje = new Date();
    const dia1 = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const diaUltimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const hojeStr = hoje.toISOString().split('T')[0];
    
    // Filtros Dashboard Principal
    const elInicio = document.getElementById('filtro-data-inicio');
    const elFim = document.getElementById('filtro-data-fim');
    if(elInicio && elFim) {
        elInicio.value = dia1.toISOString().split('T')[0];
        elFim.value = diaUltimo.toISOString().split('T')[0];
    }
    
    // Filtros de Meta
    const elMes = document.getElementById('filtro-mes');
    const elAno = document.getElementById('filtro-ano');
    if (elMes && elAno) {
        elMes.value = String(hoje.getMonth() + 1).padStart(2, '0');
        elAno.value = hoje.getFullYear();
    }
    
    // Filtros da Aba Premiação
    const iniPremio = document.getElementById('filtro-premio-inicio');
    const fimPremio = document.getElementById('filtro-premio-fim');
    if(iniPremio && fimPremio) {
        iniPremio.value = dia1.toISOString().split('T')[0];
        fimPremio.value = diaUltimo.toISOString().split('T')[0];
    }

    // Setar a data de hoje no campo do novo lançamento
    const elDataVenda = document.getElementById('data_venda');
    if (elDataVenda) {
        elDataVenda.value = hojeStr;
    }
}

// --- LÓGICA BI ---
let dadosGlobais = []; 

async function atualizarDashboardBI() {
    try {
        const res = await fetch('/api/dados');
        if(!res.ok) return;
        dadosGlobais = await res.json();

        const selConsultor = document.getElementById('filtro-bi-consultor');
        if(selConsultor && selConsultor.options.length === 1) {
            const unicos = [...new Set(dadosGlobais.map(d => d.consultor))].sort();
            unicos.forEach(c => { selConsultor.innerHTML += `<option value="${c}">${c}</option>`; });
        }
        aplicarFiltrosECalcular();
        
        // Inicia Aba Premiação
        carregarDadosPremiacao();
        
    } catch(e) { console.error("Erro BI:", e); }
}

function aplicarFiltrosECalcular() {
    const consultorFiltro = document.getElementById('filtro-bi-consultor').value;
    const dataInicioInput = document.getElementById('filtro-data-inicio').value;
    const dataFimInput = document.getElementById('filtro-data-fim').value;

    if(!dataInicioInput || !dataFimInput) return; 

    const dataInicio = new Date(dataInicioInput + 'T00:00:00');
    const dataFim = new Date(dataFimInput + 'T23:59:59');

    // Período Anterior
    const diffTime = Math.abs(dataFim - dataInicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const dataFimAnt = new Date(dataInicio); dataFimAnt.setDate(dataFimAnt.getDate() - 1); dataFimAnt.setHours(23,59,59);
    const dataInicioAnt = new Date(dataFimAnt); dataInicioAnt.setDate(dataInicioAnt.getDate() - diffDays); dataInicioAnt.setHours(0,0,0);

    // Filtros
    let dadosFiltrados = dadosGlobais;
    if(consultorFiltro !== 'todos') {
        dadosFiltrados = dadosGlobais.filter(d => d.consultor === consultorFiltro);
    }

    const dadosAtual = dadosFiltrados.filter(d => {
        const dataVenda = new Date(d.data_venda + 'T12:00:00'); 
        return dataVenda >= dataInicio && dataVenda <= dataFim;
    });

    const dadosAnt = dadosFiltrados.filter(d => {
        const dataVenda = new Date(d.data_venda + 'T12:00:00');
        return dataVenda >= dataInicioAnt && dataVenda <= dataFimAnt;
    });

    // Atualiza Interface Principal
    atualizarCardKPI('receita', dadosAtual, dadosAnt, 'receita', true);
    atualizarCardKPI('altas', dadosAtual, dadosAnt, 'altas_portin');
    atualizarCardKPI('movel', dadosAtual, dadosAnt, 'mig_movel');
    atualizarCardKPI('fixa', dadosAtual, dadosAnt, 'mig_fixa_bl');
    atualizarCardKPI('aparelho', dadosAtual, dadosAnt, 'aparelhos', true);

    gerarAnaliseProdutos(dadosAtual);
    gerarMatrizConsultores(dadosAtual);
    gerarComparativoHistorico(dadosFiltrados);
    filtrarTabelasConsultores(dadosAtual);
}

// --- FUNÇÕES UTILITÁRIAS ---
function somarPropriedade(lista, prop) { return lista.reduce((acc, item) => acc + (item[prop] || 0), 0); }
function fmtMoeda(v) { return v ? v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00'; }
function resetStats() { return {rec:0, fixa:0, movel:0, altas:0, bl:0, apa:0}; }

function atualizarCardKPI(id, listaAtual, listaAnt, prop, isMoeda=false) {
    const valorAtual = somarPropriedade(listaAtual, prop);
    const valorAnt = somarPropriedade(listaAnt, prop);
    const elValor = document.getElementById(`kpi-${id}-valor`);
    if(elValor) elValor.innerText = isMoeda ? fmtMoeda(valorAtual) : valorAtual;
    
    const elTrend = document.getElementById(`kpi-${id}-trend`);
    const card = document.getElementById(`card-${id}`);
    if(elTrend && card) {
        let diff = valorAtual - valorAnt;
        let pct = valorAnt > 0 ? ((diff / valorAnt) * 100).toFixed(1) : (valorAtual > 0 ? 100 : 0);
        let icone = diff > 0 ? '<i class="fa-solid fa-arrow-up"></i>' : (diff < 0 ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-minus"></i>');
        elTrend.className = 'trend-badge'; card.style.borderLeft = ''; 
        if (valorAtual > valorAnt) {
            elTrend.innerHTML = `${icone} +${pct}%`; elTrend.classList.add('trend-up'); card.style.borderLeft = '5px solid #2ecc71'; 
        } else if (valorAtual < valorAnt) {
            elTrend.innerHTML = `${icone} ${pct}%`; elTrend.classList.add('trend-down'); card.style.borderLeft = '5px solid #e74c3c';
        } else {
            elTrend.innerHTML = `${icone} -`; elTrend.classList.add('trend-neutral'); card.style.borderLeft = '5px solid #f1c40f';
        }
    }
}

// --- FUNÇÕES DE NAVEGAÇÃO ---
function mostrarSecao(id) {
    document.querySelectorAll('section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('aside nav li').forEach(li => li.classList.remove('active'));
    document.getElementById('sec-' + id).style.display = 'block';
    
    const navItems = document.querySelectorAll('aside nav li');
    navItems.forEach(li => {
        if(li.getAttribute('onclick') && li.getAttribute('onclick').includes("'" + id + "'")) {
            li.classList.add('active');
        }
    });
}

function limparFormulario() { 
    document.getElementById('form-resultados').reset(); 
    document.getElementById('lancamento-id').value=''; 
    document.getElementById('titulo-lancamento').innerText="Nova Venda"; 
    
    // Restaura a data de hoje ao limpar
    const elDataVenda = document.getElementById('data_venda');
    if (elDataVenda) elDataVenda.value = new Date().toISOString().split('T')[0];
}

function abrirModalSenha(){document.getElementById('modal-senha').style.display='flex'}
function fecharModalSenha(){document.getElementById('modal-senha').style.display='none'}
function fecharModalLogs(){document.getElementById('modal-logs').style.display='none'}

function exportarDashboard(tipo) { 
    // Exportação genérica do Dashboard Principal
    if(tipo === 'excel') {
        const ini = document.getElementById('filtro-data-inicio').value;
        const fim = document.getElementById('filtro-data-fim').value;
        window.location.href = `/api/exportar/excel?inicio=${ini}&fim=${fim}&consultor=todos`;
    }
}

function exportarPremiacaoExcel() {
    // Exportação específica da aba Premiação
    const inicio = document.getElementById('filtro-premio-inicio').value;
    const fim = document.getElementById('filtro-premio-fim').value;
    const consultor = document.getElementById('filtro-premio-consultor').value;

    if(!inicio || !fim) {
        alert("Por favor, selecione as datas de início e fim.");
        return;
    }

    const url = `/api/exportar/excel?inicio=${inicio}&fim=${fim}&consultor=${consultor}`;
    window.location.href = url;
}

// --- GERENCIADORES (USUÁRIOS, METAS, LOGS) ---
async function carregarSelectConsultores() {
    const selectVenda = document.getElementById('consultor');
    const selectFiltro = document.getElementById('filtro-premio-consultor');

    try {
        const response = await fetch('/api/lista_consultores');
        if (response.ok) {
            const nomes = await response.json();
            
            if (selectVenda) {
                selectVenda.innerHTML = '<option value="">Selecione...</option>';
                nomes.forEach(nome => selectVenda.innerHTML += `<option value="${nome}">${nome}</option>`);
            }
            if (selectFiltro) {
                selectFiltro.innerHTML = '<option value="todos">Todos da Equipe</option>';
                nomes.forEach(nome => selectFiltro.innerHTML += `<option value="${nome}">${nome}</option>`);
            }
        }
    } catch (error) { console.error("Erro:", error); }
}

async function carregarUsuarios() {
    const tbody = document.querySelector('#tabela-usuarios tbody');
    if (!tbody) return;
    try {
        const response = await fetch('/api/usuarios');
        if (response.ok) {
            const usuarios = await response.json();
            tbody.innerHTML = '';
            usuarios.forEach(u => {
                const statusTexto = u.ativo === 1 ? 'Ativo' : 'Bloqueado';
                const statusCor = u.ativo === 1 ? '#2ecc71' : '#e74c3c';
                const iconBloqueio = u.ativo === 1 ? 'fa-lock-open' : 'fa-lock';
                const corBtnBloqueio = u.ativo === 1 ? '#e74c3c' : '#2ecc71';
                const row = `<tr style="border-bottom: 1px solid #eee;"><td style="padding:12px;"><strong>${u.nome}</strong></td><td style="padding:12px;">${u.username}</td><td style="padding:12px;">${u.cargo}</td><td style="padding:12px;"><span style="background:#eee; padding:2px 8px; border-radius:4px; font-size:0.8rem;">${u.role}</span></td><td style="padding:12px; color:${statusCor}; font-weight:bold;">${statusTexto}</td><td style="padding:12px;"><div style="display:flex; gap: 5px;"><button onclick="toggleStatusUsuario(${u.id})" style="background:${corBtnBloqueio}; color:white; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:5px;"><i class="fa-solid ${iconBloqueio}"></i></button><button onclick="resetarSenhaAdmin(${u.id}, '${u.nome}')" style="background:#f39c12; color:white; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:5px;"><i class="fa-solid fa-key"></i></button><button onclick="deletarUsuario(${u.id})" style="background:#c0392b; color:white; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:5px;"><i class="fa-solid fa-trash"></i></button></div></td></tr>`;
                tbody.innerHTML += row;
            });
        }
    } catch (e) { console.error(e); }
}

async function toggleStatusUsuario(id) {
    if(!confirm('Deseja alterar o status?')) return;
    try { await fetch(`/api/usuarios/toggle_status/${id}`, { method: 'POST' }); carregarUsuarios(); } catch(e) {}
}
async function deletarUsuario(id) {
    if(!confirm('Excluir usuário?')) return;
    try { await fetch(`/api/usuarios/deletar/${id}`, { method: 'DELETE' }); carregarUsuarios(); } catch(e) {}
}
async function resetarSenhaAdmin(id, nome) {
    if(!confirm(`Resetar senha de ${nome} para a senha padrão do sistema?`)) return;
    try { await fetch(`/api/admin/resetar_senha/${id}`, { method: 'POST' }); alert('Senha resetada!'); } catch(e) {}
}
function filtrarUsuarios() {
    const termo = document.getElementById('busca-usuario').value.toLowerCase();
    const linhas = document.querySelectorAll('#tabela-usuarios tbody tr');
    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? '' : 'none';
    });
}

// --- METAS ---
async function carregarMetas() {
    const mes = document.getElementById('filtro-mes')?.value;
    const ano = document.getElementById('filtro-ano')?.value;
    const queryString = mes && ano ? `?mes=${mes}/${ano}` : '';
    try {
        const res = await fetch(`/api/metas${queryString}`);
        if(!res.ok) return;
        const dados = await res.json();
        const tbody = document.querySelector('#tabela-metas tbody');
        if(tbody) {
            tbody.innerHTML = '';
            dados.forEach(m => {
                tbody.innerHTML += `<tr><td style="font-weight:bold; color:var(--title-color)">${m.categoria}</td><td>${fmtMoeda(m.receita)}</td><td>${m.mig_fixa_bl}</td><td>${m.mig_movel}</td><td>${m.altas_portin}</td><td>${m.bl}</td><td>${fmtMoeda(m.aparelhos)}</td><td style="color:var(--status-verde)">${fmtMoeda(m.bonus)}</td></tr>`;
            });
        }
    } catch(e){}
}

async function salvarMeta() {
    const dados = {
        categoria: document.getElementById('meta-cat').value,
        receita: parseFloat(document.getElementById('meta-rec').value) || 0,
        mig_fixa_bl: parseInt(document.getElementById('meta-fixa').value) || 0,
        mig_movel: parseInt(document.getElementById('meta-mov').value) || 0,
        altas_portin: parseInt(document.getElementById('meta-altas').value) || 0,
        bl: parseInt(document.getElementById('meta-bl').value) || 0,
        aparelhos: parseFloat(document.getElementById('meta-apa').value) || 0,
        bonus: parseFloat(document.getElementById('meta-bonus').value) || 0,
        mes_referencia: `${document.getElementById('filtro-mes').value}/${document.getElementById('filtro-ano').value}`
    };
    try {
        const res = await fetch('/api/metas/salvar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
        if(res.ok) { alert('Meta salva!'); carregarMetas(); } else alert('Erro');
    } catch(e) {}
}

// --- LOGS ---
async function verLogs(filtroContexto = null) {
    const modal = document.getElementById('modal-logs');
    const tbody = document.querySelector('#tabela-logs-conteudo tbody');
    if (!modal || !tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';
    modal.style.display = 'flex';
    try {
        const response = await fetch('/api/logs');
        if (response.ok) {
            const logs = await response.json();
            tbody.innerHTML = '';
            const logsFiltrados = logs.filter(log => {
                if (!filtroContexto || filtroContexto === 'todos') return true;
                if (filtroContexto === 'meta') return log.acao === 'META';
                if (filtroContexto === 'usuario') return ['CRIAR_USUARIO', 'BLOQUEIO', 'EXCLUSAO', 'RESET_SENHA'].includes(log.acao);
                if (filtroContexto === 'venda') return ['NOVA_VENDA', 'ATUALIZAR_VENDA'].includes(log.acao);
                return true;
            });
            if(logsFiltrados.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Vazio.</td></tr>';
            logsFiltrados.forEach(log => {
                let cor = '#333';
                if(log.acao.includes('VENDA')) cor = '#2ecc71';
                if(log.acao.includes('META')) cor = '#f39c12';
                if(log.acao.includes('BLOQUEIO')) cor = '#e74c3c';
                tbody.innerHTML += `<tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;"><td style="padding:10px;">${log.data}</td><td style="padding:10px;">${log.responsavel}</td><td style="padding:10px; color:${cor}; font-weight:bold;">${log.acao}</td><td style="padding:10px;">${log.detalhes}</td></tr>`;
            });
        }
    } catch (e) {}
}
function filtrarTabelaLogs() {
    const termo = document.getElementById('filtro-log-interno').value.toLowerCase();
    const linhas = document.querySelectorAll('#tabela-logs-conteudo tbody tr');
    linhas.forEach(linha => { linha.style.display = linha.innerText.toLowerCase().includes(termo) ? '' : 'none'; });
}

async function salvarNovaSenha(){
    const pwd = document.getElementById('nova-senha-usuario').value;
    if(!pwd) return alert('Senha vazia');
    const res = await fetch('/api/minha_senha',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nova_senha:pwd})});
    if(res.ok){ alert('Sucesso!'); fecharModalSenha(); } else alert('Erro');
}

// --- TABELAS DINÂMICAS ---
function gerarAnaliseProdutos(dados) {
    const totais = { 'Altas/Portin': somarPropriedade(dados, 'altas_portin'), 'Mig. Móvel': somarPropriedade(dados, 'mig_movel'), 'Mig. Fixa': somarPropriedade(dados, 'mig_fixa_bl'), 'BL': somarPropriedade(dados, 'bl') };
    const ranking = Object.entries(totais).sort((a,b) => b[1] - a[1]);
    const totalGeral = ranking.reduce((acc, item) => acc + item[1], 0);
    document.getElementById('produto-mais-vendido').innerText = ranking[0][1] > 0 ? ranking[0][0] : '-';
    document.getElementById('produto-menos-vendido').innerText = totalGeral > 0 ? ranking[ranking.length-1][0] : '-';
    const tbody = document.querySelector('#tabela-ranking-produtos tbody');
    if(tbody) {
        tbody.innerHTML = '';
        ranking.forEach(([prod, qtd]) => {
            const pct = totalGeral > 0 ? ((qtd / totalGeral) * 100).toFixed(1) : 0;
            const barra = `<div style="background:#eee; height:6px; width:100%; border-radius:3px; margin-top:5px;"><div style="background:var(--title-color); width:${pct}%; height:100%; border-radius:3px;"></div></div>`;
            tbody.innerHTML += `<tr><td>${prod}</td><td style="text-align:center;">${qtd}</td><td style="text-align:right;">${pct}% ${barra}</td></tr>`;
        });
    }
}

function gerarMatrizConsultores(dados) {
    const porConsultor = {};
    dados.forEach(d => {
        if(!porConsultor[d.consultor]) porConsultor[d.consultor] = {altas:0, movel:0, fixa:0, bl:0, apa:0, total:0};
        porConsultor[d.consultor].altas += d.altas_portin; porConsultor[d.consultor].movel += d.mig_movel; porConsultor[d.consultor].fixa += d.mig_fixa_bl;
        porConsultor[d.consultor].bl += d.bl; porConsultor[d.consultor].apa += d.aparelhos; porConsultor[d.consultor].total += d.receita;
    });
    const tbody = document.querySelector('#tabela-matriz-produtos tbody');
    if(tbody) {
        tbody.innerHTML = '';
        Object.keys(porConsultor).sort((a,b) => porConsultor[b].total - porConsultor[a].total).forEach(nome => {
            const c = porConsultor[nome];
            tbody.innerHTML += `<tr><td>${nome}</td><td>${c.altas}</td><td>${c.movel}</td><td>${c.fixa}</td><td>${c.bl}</td><td>${fmtMoeda(c.apa)}</td><td style="font-weight:bold; color:var(--title-color)">${fmtMoeda(c.total)}</td></tr>`;
        });
    }
}

function gerarComparativoHistorico(todosDados) {
    const anoAtual = new Date().getFullYear(); const anos = [anoAtual, anoAtual-1, anoAtual-2];
    const statsAno = {}; anos.forEach(a => statsAno[a] = {receita:0});
    todosDados.forEach(d => { const a = parseInt(d.data_venda.split('-')[0]); if(statsAno[a]) statsAno[a].receita += d.receita; });
    const tbody = document.querySelector('#tabela-comparativo-bi tbody');
    if(tbody) {
        tbody.innerHTML = `<tr><td style="text-align:left;">Receita Total</td><td>${fmtMoeda(statsAno[anos[0]].receita)}</td><td>${fmtMoeda(statsAno[anos[1]].receita)}</td><td>${fmtMoeda(statsAno[anos[2]].receita)}</td><td>-</td></tr>`;
    }
}

function filtrarTabelasConsultores(dados) {
    const container = document.getElementById('container-tabelas-consultores');
    if(!container) return;
    container.innerHTML = '';
    const termo = document.getElementById('busca-tabela-consultor')?.value.toLowerCase() || '';
    const porConsultor = {};
    dados.forEach(d => { if(!porConsultor[d.consultor]) porConsultor[d.consultor]=[]; porConsultor[d.consultor].push(d); });
    
    Object.keys(porConsultor).sort().forEach(nome => {
        if(termo && !nome.toLowerCase().includes(termo)) return;
        const vendas = porConsultor[nome];
        let total = 0;
        let linhasHTML = '';
        vendas.sort((a,b) => new Date(b.data_venda) - new Date(a.data_venda)).forEach(v => {
            if(v.status === 'Concluido') {
                total += (v.receita || 0) + (v.aparelhos || 0);
            }
            linhasHTML += `<tr>
                <td>${v.data_venda.split('-').reverse().join('/')}</td>
                <td>${v.status}</td>
                <td>${fmtMoeda(v.receita)}</td>
                <td>${v.mig_fixa_bl}</td>
                <td>${v.mig_movel}</td>
                <td>${v.altas_portin}</td>
                <td>${v.bl}</td>
                <td>${fmtMoeda(v.aparelhos)}</td>
                <td style="text-align:right;">
                    <button onclick="editarLinha(${v.id})" style="color:#f39c12; background:transparent; border:none; cursor:pointer; font-size:1.1rem;">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>`;
        });
        const idDetalhes = `detalhes-${nome.replace(/\s+/g, '')}`;
        container.innerHTML += `<div class="card-consultor-tabela"><div style="padding:10px; background:linear-gradient(90deg, #333, #555); color:white; display:flex; justify-content:space-between; align-items:center;"><b>${nome}</b><div><span style="margin-right:15px;color:#f1c40f;">Total: ${fmtMoeda(total)}</span><button onclick="document.getElementById('${idDetalhes}').style.display = 'block'" style="background:#f39c12; color:white; border:none; padding:5px 15px; border-radius:20px; font-size:0.8rem; cursor:pointer;"><i class="fa-solid fa-list-check"></i></button></div></div><div id="${idDetalhes}" style="display:none; padding:10px;"><div style="display:flex; justify-content:flex-end;"><button onclick="document.getElementById('${idDetalhes}').style.display='none'" style="background:#ccc; border:none; padding:2px 10px; cursor:pointer;">Fechar</button></div><table style="width:100%;"><thead><tr><th>Data</th><th>Status</th><th>Receita</th><th>Fixa</th><th>Movel</th><th>Altas</th><th>BL</th><th>Aparelho</th><th>Ação</th></tr></thead><tbody>${linhasHTML}</tbody></table></div></div>`;
    });
}

function editarLinha(id) {
    const venda = dadosGlobais.find(item => item.id === id);
    if (!venda) { alert("Erro: Venda não encontrada."); return; }

    document.getElementById('lancamento-id').value = venda.id;
    
    const titulo = document.getElementById('titulo-lancamento');
    if(titulo) titulo.innerText = "EDITAR VENDA - " + venda.consultor;
    
    const btn = document.querySelector('#form-resultados .btn-save');
    if(btn) btn.innerText = "Salvar Alterações";

    if(document.getElementById('consultor')) document.getElementById('consultor').value = venda.consultor;
    // PREENCHE A DATA CORRETA
    if(document.getElementById('data_venda')) document.getElementById('data_venda').value = venda.data_venda; 
    if(document.getElementById('status-pedido')) document.getElementById('status-pedido').value = venda.status;
    if(document.getElementById('receita')) document.getElementById('receita').value = venda.receita;
    if(document.getElementById('mig_fixa')) document.getElementById('mig_fixa').value = venda.mig_fixa_bl;
    if(document.getElementById('mig_movel')) document.getElementById('mig_movel').value = venda.mig_movel;
    if(document.getElementById('altas_portin')) document.getElementById('altas_portin').value = venda.altas_portin;
    if(document.getElementById('bl')) document.getElementById('bl').value = venda.bl;
    if(document.getElementById('aparelhos')) document.getElementById('aparelhos').value = venda.aparelhos;
    // PREENCHE OS PRODUTOS SE EXISTIR NO BANCO
    if(document.getElementById('produtos_rs')) document.getElementById('produtos_rs').value = venda.produtos_rs || 0; 

    const formSection = document.getElementById('sec-lancamentos');
    if(formSection.style.display === 'none') mostrarSecao('lancamentos');
    document.getElementById('form-resultados').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initTheme(){ if(localStorage.getItem('theme')==='dark') { document.body.setAttribute('data-theme','dark'); } }
function toggleTheme(){ 
    if(document.body.hasAttribute('data-theme')){ document.body.removeAttribute('data-theme'); localStorage.setItem('theme','light'); } 
    else { document.body.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); } 
}

// ============================================================
// --- LÓGICA DO PAINEL DE PREMIAÇÃO (4 GRÁFICOS NEON) ---
// ============================================================

let chartStatusDonut = null;
let chartConcluidoInstance = null;
let chartEstimativaInstance = null;
let chartEvolucaoInstance = null;

async function carregarDadosPremiacao() {
    if(!dadosGlobais || dadosGlobais.length === 0) {
        try {
            const res = await fetch('/api/dados');
            dadosGlobais = await res.json();
        } catch(e) { return; }
    }
    
    const inicio = document.getElementById('filtro-premio-inicio').value;
    const fim = document.getElementById('filtro-premio-fim').value;
    const consultor = document.getElementById('filtro-premio-consultor').value;

    if(!inicio || !fim) return;

    const dInicio = new Date(inicio + 'T00:00:00');
    const dFim = new Date(fim + 'T23:59:59');

    const dadosFiltrados = dadosGlobais.filter(d => {
        const dVenda = new Date(d.data_venda + 'T12:00:00');
        const dataOk = dVenda >= dInicio && dVenda <= dFim;
        const consultorOk = (consultor === 'todos') || (d.consultor === consultor);
        return dataOk && consultorOk;
    });

    atualizarGraficosPremiacao(dadosFiltrados);
}

function atualizarGraficosPremiacao(dados) {
    const performance = {};
    const statusCount = { 'Concluido': 0, 'Tramitando': 0, 'Pre-Tramite': 0 };
    const evolucaoDiaria = {};
    let totalGeralItens = 0;

    dados.forEach(d => {
        if (statusCount[d.status] !== undefined) statusCount[d.status]++;
        totalGeralItens++;

        if (!performance[d.consultor]) performance[d.consultor] = { concluido: 0, estimado: 0 };
        
        if (d.status === 'Concluido') {
            performance[d.consultor].concluido += d.receita;
            
            const dataFmt = d.data_venda.split('-').reverse().join('/');
            if(!evolucaoDiaria[dataFmt]) evolucaoDiaria[dataFmt] = 0;
            evolucaoDiaria[dataFmt] += d.receita;

        } else {
            performance[d.consultor].estimado += d.receita;
        }
    });

    const consultores = Object.keys(performance).sort();
    const valoresConcluido = consultores.map(c => performance[c].concluido);
    const valoresEstimado = consultores.map(c => performance[c].estimado);

    const totalConcluido = valoresConcluido.reduce((a, b) => a + b, 0);
    const totalEstimado = valoresEstimado.reduce((a, b) => a + b, 0);
    const mediaConcluido = consultores.length > 0 ? (totalConcluido / consultores.length) : 0;

    if(document.getElementById('premio-total-concluido')) {
        document.getElementById('premio-total-concluido').innerText = fmtMoeda(totalConcluido);
        document.getElementById('premio-media-concluido').innerText = fmtMoeda(mediaConcluido);
        document.getElementById('premio-total-estimado').innerText = fmtMoeda(totalEstimado);
    }

    if(document.getElementById('valor-centro-donut')) {
        document.getElementById('valor-centro-donut').innerText = totalGeralItens;
    }

    Chart.defaults.color = '#ccc';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';

    // 1. DONUT
    const ctxDonut = document.getElementById('chart-mix-produtos');
    if (ctxDonut) {
        if (chartStatusDonut) chartStatusDonut.destroy();
        chartStatusDonut = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Concluído', 'Tramitando', 'Pré-Trâmite'],
                datasets: [{
                    data: [statusCount['Concluido'], statusCount['Tramitando'], statusCount['Pre-Tramite']],
                    backgroundColor: ['#2ecc71', '#f1c40f', '#3498db'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, cutout: '75%', plugins: { legend: { position: 'right' } } }
        });
    }

    // 2. RANKING
    const ctxConcluido = document.getElementById('chart-concluido');
    if (ctxConcluido) {
        if (chartConcluidoInstance) chartConcluidoInstance.destroy();
        chartConcluidoInstance = new Chart(ctxConcluido, {
            type: 'bar',
            data: {
                labels: consultores,
                datasets: [
                    { label: 'Média', data: Array(consultores.length).fill(mediaConcluido), type:'line', borderColor: '#9b59b6', borderWidth: 2, borderDash:[5,5], pointRadius:0 },
                    { label: 'Vendido (R$)', data: valoresConcluido, backgroundColor: '#2ecc71', borderRadius: 5 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }
        });
    }

    // 3. PIPELINE
    const ctxEstimativa = document.getElementById('chart-estimativa');
    if (ctxEstimativa) {
        if (chartEstimativaInstance) chartEstimativaInstance.destroy();
        chartEstimativaInstance = new Chart(ctxEstimativa, {
            type: 'line',
            data: {
                labels: consultores,
                datasets: [{ label: 'Estimado (R$)', data: valoresEstimado, borderColor: '#f1c40f', backgroundColor: 'rgba(241, 196, 15, 0.1)', fill: true, tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }
        });
    }

    // 4. EVOLUÇÃO
    const ctxEvo = document.getElementById('chart-evolucao-temporal');
    if (ctxEvo) {
        if (chartEvolucaoInstance) chartEvolucaoInstance.destroy();
        const datasOrdenadas = Object.keys(evolucaoDiaria).sort((a,b) => {
            const da = a.split('/').reverse().join(''); const db = b.split('/').reverse().join(''); return da.localeCompare(db);
        });
        const valoresEvo = datasOrdenadas.map(d => evolucaoDiaria[d]);
        chartEvolucaoInstance = new Chart(ctxEvo, {
            type: 'line',
            data: {
                labels: datasOrdenadas,
                datasets: [{ label: 'Vendas no Dia (R$)', data: valoresEvo, borderColor: '#e91e63', backgroundColor: 'rgba(233, 30, 99, 0.1)', fill: true, tension: 0.3 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }
        });
    }
}