// ========================================================
// lancamentos.js - Motor da Página de Lançar Vendas
// ========================================================

let vendasGlobais = [];
let consultoresGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarConsultores();
    carregarVendas();

    // Evento de Salvar Nova Venda
    const formNovo = document.getElementById('form-resultados');
    if (formNovo) formNovo.addEventListener('submit', salvarVenda);

    // Evento de Salvar Edição (No Popup)
    const formEditar = document.getElementById('form-editar-venda');
    if (formEditar) formEditar.addEventListener('submit', salvarEdicao);
    
    // Configura datas padrão no Modal de PDF
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    document.getElementById('export-data-fim').value = hoje.toISOString().split('T')[0];
    document.getElementById('export-data-inicio').value = trintaDiasAtras.toISOString().split('T')[0];
});

// --- CARREGAR DADOS DA BASE DE DADOS ---

async function carregarConsultores() {
    try {
        const res = await fetch('/api/lista_consultores');
        if (res.ok) {
            consultoresGlobais = await res.json();
            
            const select = document.getElementById('consultor');
            select.innerHTML = '<option value="">Selecione o Consultor...</option>';
            
            if (typeof USER_ROLE !== 'undefined' && USER_ROLE === 'consultor') {
                select.innerHTML = `<option value="${USER_NAME}">${USER_NAME}</option>`;
                select.value = USER_NAME;
                select.disabled = true;
            } else {
                consultoresGlobais.forEach(c => { select.innerHTML += `<option value="${c}">${c}</option>`; });
            }
            
            const listaExport = document.getElementById('lista-usuarios-export');
            if(listaExport) {
                listaExport.innerHTML = '';
                consultoresGlobais.forEach(c => {
                    listaExport.innerHTML += `
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding: 5px; border-radius: 5px;">
                            <input type="checkbox" class="chk-export-consultor" value="${c}" checked style="width: 16px; height: 16px;">
                            ${c}
                        </label>
                    `;
                });
            }
        }
    } catch (e) { console.error("Erro ao carregar consultores", e); }
}

async function carregarVendas() {
    try {
        const res = await fetch('/api/dados?excluidos=false');
        if (res.ok) {
            vendasGlobais = await res.json();
            renderizarTabelas();
        }
    } catch (e) { console.error("Erro ao carregar vendas", e); }
}

// --- SALVAR (NOVO) E EDITAR (POPUP) ---

async function salvarVenda(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-venda');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    const payload = {
        consultor: (typeof USER_ROLE !== 'undefined' && USER_ROLE === 'consultor') ? USER_NAME : document.getElementById('consultor').value,
        data_venda: document.getElementById('data_venda').value,
        status: document.getElementById('status-pedido').value,
        receita: parseFloat(document.getElementById('receita').value) || 0,
        altas_portin: parseInt(document.getElementById('altas_portin').value) || 0,
        mig_movel: parseInt(document.getElementById('mig_movel').value) || 0,
        mig_fixa_bl: parseInt(document.getElementById('mig_fixa').value) || 0,
        bl: parseInt(document.getElementById('bl').value) || 0,
        aparelhos: parseFloat(document.getElementById('aparelhos').value) || 0,
        produtos_rs: parseFloat(document.getElementById('produtos_rs').value) || 0,
        cortesia: parseFloat(document.getElementById('cortesia').value) || 0
    };

    try {
        const res = await fetch('/api/salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Venda guardada.', timer: 1500, showConfirmButton: false });
            limparFormulario();
            carregarVendas();
        } else { Swal.fire('Erro', 'Falha ao salvar a venda.', 'error'); }
    } catch (error) { Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'); } 
    finally { btn.innerHTML = '<i class="fa-solid fa-check"></i> Registrar Venda'; btn.disabled = false; }
}

window.editarVenda = function(id) {
    const venda = vendasGlobais.find(v => v.id === id);
    if (!venda) return;

    // Puxa os dados para o POPUP de edição
    document.getElementById('edit-lancamento-id').value = venda.id;
    document.getElementById('edit-consultor').value = venda.consultor;
    document.getElementById('edit-data_venda').value = venda.data_venda;
    document.getElementById('edit-status-pedido').value = venda.status;
    document.getElementById('edit-receita').value = venda.receita || '';
    document.getElementById('edit-altas_portin').value = venda.altas_portin || '';
    document.getElementById('edit-mig_movel').value = venda.mig_movel || '';
    document.getElementById('edit-mig_fixa').value = venda.mig_fixa_bl || '';
    document.getElementById('edit-bl').value = venda.bl || '';
    document.getElementById('edit-aparelhos').value = venda.aparelhos || '';
    document.getElementById('edit-produtos_rs').value = venda.produtos_rs || '';
    document.getElementById('edit-cortesia').value = venda.cortesia || ''; 

    // ABRE O POPUP
    const modal = document.getElementById('modal-editar-venda');
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('active'); }, 10);
}

window.fecharModalEditar = function() {
    const modal = document.getElementById('modal-editar-venda');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

async function salvarEdicao(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-atualizar-venda');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
    btn.disabled = true;

    const payload = {
        id: parseInt(document.getElementById('edit-lancamento-id').value),
        consultor: document.getElementById('edit-consultor').value,
        data_venda: document.getElementById('edit-data_venda').value,
        status: document.getElementById('edit-status-pedido').value,
        receita: parseFloat(document.getElementById('edit-receita').value) || 0,
        altas_portin: parseInt(document.getElementById('edit-altas_portin').value) || 0,
        mig_movel: parseInt(document.getElementById('edit-mig_movel').value) || 0,
        mig_fixa_bl: parseInt(document.getElementById('edit-mig_fixa').value) || 0,
        bl: parseInt(document.getElementById('edit-bl').value) || 0,
        aparelhos: parseFloat(document.getElementById('edit-aparelhos').value) || 0,
        produtos_rs: parseFloat(document.getElementById('edit-produtos_rs').value) || 0,
        cortesia: parseFloat(document.getElementById('edit-cortesia').value) || 0
    };

    try {
        const res = await fetch('/api/salvar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Atualizado!', text: 'Venda modificada.', timer: 1500, showConfirmButton: false });
            fecharModalEditar();
            carregarVendas();
        } else { Swal.fire('Erro', 'Falha ao atualizar.', 'error'); }
    } catch (error) { Swal.fire('Erro', 'Falha na comunicação.', 'error'); } 
    finally { btn.innerHTML = txtOriginal; btn.disabled = false; }
}

window.excluirVenda = async function(id) {
    const result = await Swal.fire({
        title: 'Excluir Venda?', text: "Deseja remover este lançamento?", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Sim, Excluir'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/excluir_venda/${id}`, { method: 'DELETE' });
            if (res.ok) { Swal.fire('Excluído!', 'Removido.', 'success'); carregarVendas(); }
        } catch (e) { Swal.fire('Erro', 'Falha na comunicação.', 'error'); }
    }
}

window.limparFormulario = function() {
    document.getElementById('form-resultados').reset();
    if(typeof USER_ROLE !== 'undefined' && USER_ROLE === 'consultor') document.getElementById('consultor').value = USER_NAME;
}

// --- RENDERIZAR TABELAS (AGRUPADAS POR CONSULTOR) ---

window.filtrarTabelasConsultores = function() { renderizarTabelas(); }

function renderizarTabelas() {
    const container = document.getElementById('container-tabelas-consultores');
    if(!container) return;
    container.innerHTML = '';

    const termo = document.getElementById('busca-tabela-consultor')?.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") || '';
    const apenas30Dias = document.getElementById('filtro-30dias')?.checked;
    
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const vendasAgrupadas = {};
    vendasGlobais.forEach(v => {
        if(apenas30Dias) {
            const dataVenda = new Date(v.data_venda + 'T12:00:00');
            if(dataVenda < trintaDiasAtras) return;
        }
        if(!vendasAgrupadas[v.consultor]) vendasAgrupadas[v.consultor] = [];
        vendasAgrupadas[v.consultor].push(v);
    });

    const consultoresAtivos = Object.keys(vendasAgrupadas).sort();

    if(consultoresAtivos.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color: #888; background: #fff; border-radius: 15px;">Nenhuma venda encontrada com os filtros atuais.</div>';
        return;
    }

    consultoresAtivos.forEach(consultor => {
        const consultorStr = consultor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        if (termo && !consultorStr.includes(termo)) return;

        const vendasConsultor = vendasAgrupadas[consultor].sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
        
        let trHtml = '';
        vendasConsultor.forEach(v => {
            const dataFormatada = v.data_venda.split('-').reverse().join('/');
            
            let statusBadge = '';
            if(v.status === 'Concluido') statusBadge = '<span style="background:#2ecc71; color:white; padding:4px 8px; border-radius:10px; font-size:0.75rem;">Concluída</span>';
            else if(v.status === 'Tramitando') statusBadge = '<span style="background:#f39c12; color:white; padding:4px 8px; border-radius:10px; font-size:0.75rem;">Tramitando</span>';
            else statusBadge = '<span style="background:#34495e; color:white; padding:4px 8px; border-radius:10px; font-size:0.75rem;">Pré-Trâmite</span>';

            trHtml += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:12px; font-size:0.9rem;">${dataFormatada}</td>
                    <td style="padding:12px;">${statusBadge}</td>
                    <td style="padding:12px; font-weight:bold; color:var(--cor-primaria);">R$ ${(v.receita||0).toFixed(2)}</td>
                    <td style="padding:12px; text-align:center;">${v.altas_portin||0}</td>
                    <td style="padding:12px; text-align:center;">${v.mig_movel||0}</td>
                    <td style="padding:12px; text-align:center;">${v.mig_fixa_bl||0}</td>
                    <td style="padding:12px; text-align:center;">${v.bl||0}</td>
                    <td style="padding:12px;">R$ ${(v.aparelhos||0).toFixed(2)}</td>
                    <td style="padding:12px;">R$ ${(v.produtos_rs||0).toFixed(2)}</td>
                    <td style="padding:12px; color:#e74c3c;">R$ ${(v.cortesia||0).toFixed(2)}</td>
                    <td style="padding:12px; text-align:right;">
                        <button onclick="editarVenda(${v.id})" title="Editar" style="color:#f39c12; background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:10px;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="excluirVenda(${v.id})" title="Excluir" style="color:#e74c3c; background:none; border:none; cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        });

        // CORREÇÃO DE PADDING E LAYOUT AQUI (A tabela já não toca nas bermas do cartão)
        const cardHtml = `
            <div class="card-consultor-tabela" style="background: var(--glass-bg); border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); overflow: hidden; margin-bottom: 20px;">
                <div class="card-header-consultor" style="padding: 20px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="color: var(--cor-primaria); margin:0; display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-user-tie"></i> ${consultor}
                    </h3>
                    <span style="background: rgba(30, 64, 175, 0.1); color: var(--cor-primaria); padding: 5px 15px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">
                        ${vendasConsultor.length} Lançamentos
                    </span>
                </div>
                <div class="scroll-table" style="padding: 10px 20px 20px 20px;">
                    <table style="width: 100%; min-width: 900px; font-size: 0.9rem; border-collapse: collapse;">
                        <thead style="background: rgba(0,0,0,0.02);">
                            <tr>
                                <th style="padding: 15px 12px; text-align:left;">Data</th>
                                <th style="padding: 15px 12px; text-align:left;">Status</th>
                                <th style="padding: 15px 12px; text-align:left;">Receita</th>
                                <th style="padding: 15px 12px; text-align:center;">Altas/PN</th>
                                <th style="padding: 15px 12px; text-align:center;">Móvel</th>
                                <th style="padding: 15px 12px; text-align:center;">Mig BL</th>
                                <th style="padding: 15px 12px; text-align:center;">Fibra</th>
                                <th style="padding: 15px 12px; text-align:left;">Aparelho</th>
                                <th style="padding: 15px 12px; text-align:left;">Produtos R$</th>
                                <th style="padding: 15px 12px; color:#e74c3c; text-align:left;">Cortesia</th>
                                <th style="padding: 15px 12px; text-align:right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>${trHtml}</tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// --- MOTOR DO HISTÓRICO (LOGS ESPECÍFICO PARA VENDAS) ---

window.verLogs = async function(filtroContexto = null) {
    const modal = document.getElementById('modal-logs');
    const tbody = document.querySelector('#tabela-logs-conteudo tbody');
    if (!modal || !tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando Histórico...</td></tr>';
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('active'); }, 10);
    
    try {
        const response = await fetch('/api/logs');
        if (response.ok) {
            const logs = await response.json();
            tbody.innerHTML = '';
            
            // FILTRA APENAS LOGS DE VENDAS
            const logsFiltrados = logs.filter(log => {
                if (!filtroContexto || filtroContexto === 'todos') return true;
                if (filtroContexto === 'venda') return ['NOVA_VENDA', 'ATUALIZAR_VENDA', 'EXCLUSAO_VENDA'].includes(log.acao);
                return true;
            });
            
            if(logsFiltrados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhum histórico de vendas encontrado.</td></tr>';
                return;
            }
            
            logsFiltrados.forEach(log => {
                let cor = '#333';
                if(log.acao.includes('NOVA_VENDA')) cor = '#2ecc71';
                if(log.acao.includes('ATUALIZAR')) cor = '#3498db';
                if(log.acao.includes('EXCLUSAO')) cor = '#e74c3c';
                
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #eee; font-size: 0.95rem;">
                        <td style="padding:15px 10px; color:#555;">${log.data}</td>
                        <td style="padding:15px 10px; font-weight:bold;">${log.responsavel}</td>
                        <td style="padding:15px 10px;"><span style="background: ${cor}20; color: ${cor}; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${log.acao}</span></td>
                        <td style="padding:15px 10px; color:#666;">${log.detalhes}</td>
                    </tr>
                `;
            });
        }
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#e74c3c;">Erro ao carregar o histórico.</td></tr>'; }
}

window.fecharModalLogs = function() {
    const modal = document.getElementById('modal-logs');
    if(modal) {
        modal.classList.remove('active');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

window.filtrarTabelaLogs = function() {
    const termo = document.getElementById('filtro-log-interno').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const linhas = document.querySelectorAll('#tabela-logs-conteudo tbody tr');
    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        linha.style.display = texto.includes(termo) ? '' : 'none';
    });
}

// --- MODAL E EXPORTAÇÃO PDF INTELIGENTE ---

window.abrirModalExportar = function() {
    document.getElementById('modal-exportar').style.display = 'flex';
    setTimeout(() => { document.getElementById('modal-exportar').classList.add('active'); }, 10);
}

window.fecharModalExportar = function() {
    document.getElementById('modal-exportar').classList.remove('active');
    setTimeout(() => { document.getElementById('modal-exportar').style.display = 'none'; }, 300);
}

window.alternarTodosExport = function() {
    const chkTodos = document.getElementById('chk-export-todos').checked;
    const checkboxes = document.querySelectorAll('.chk-export-consultor');
    checkboxes.forEach(chk => chk.checked = chkTodos);
}

window.setExportDates = function(dias) {
    const hoje = new Date();
    document.getElementById('export-data-fim').value = hoje.toISOString().split('T')[0];

    if (dias === 'hoje') {
        document.getElementById('export-data-inicio').value = hoje.toISOString().split('T')[0];
    } else {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(dias));
        document.getElementById('export-data-inicio').value = d.toISOString().split('T')[0];
    }
}

window.executarExportacaoPDF = function() {
    const dataInicio = new Date(document.getElementById('export-data-inicio').value + 'T00:00:00');
    const dataFim = new Date(document.getElementById('export-data-fim').value + 'T23:59:59');
    const statusFiltro = document.getElementById('export-status').value;
    
    const checkboxes = document.querySelectorAll('.chk-export-consultor:checked');
    const consultoresSelecionados = Array.from(checkboxes).map(chk => chk.value);

    if(consultoresSelecionados.length === 0) return Swal.fire('Atenção', 'Selecione pelo menos um consultor.', 'warning');

    const vendasFiltradas = vendasGlobais.filter(v => {
        const dataVenda = new Date(v.data_venda + 'T12:00:00');
        const bateData = dataVenda >= dataInicio && dataVenda <= dataFim;
        const bateConsultor = consultoresSelecionados.includes(v.consultor);
        const bateStatus = (statusFiltro === 'Total' || v.status === statusFiltro);
        return bateData && bateConsultor && bateStatus;
    });

    if(vendasFiltradas.length === 0) return Swal.fire('Atenção', 'Nenhuma venda encontrada para os filtros.', 'warning');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); 
    
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text('Relatório Analítico de Vendas', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const textoStatus = statusFiltro === 'Total' ? 'Todos os Lançamentos' : statusFiltro;
    doc.text(`Período: ${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')} | Status: ${textoStatus}`, 14, 28);
    
    vendasFiltradas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));

    const tableCols = ["Consultor", "Data", "Status", "Receita", "Aparelho", "Produtos", "Cortesia", "Altas", "Móvel", "M.BL", "Fibra"];
    const tableRows = vendasFiltradas.map(v => [
        v.consultor,
        v.data_venda.split('-').reverse().join('/'),
        v.status,
        (v.receita||0).toFixed(2),
        (v.aparelhos||0).toFixed(2),
        (v.produtos_rs||0).toFixed(2),
        (v.cortesia||0).toFixed(2),
        v.altas_portin||0,
        v.mig_movel||0,
        v.mig_fixa_bl||0,
        v.bl||0
    ]);

    doc.autoTable({
        startY: 35, head: [tableCols], body: tableRows, theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 }, alternateRowStyles: { fillColor: [245, 245, 250] }
    });

    doc.save(`Relatorio_Vendas_${new Date().getTime()}.pdf`);
    fecharModalExportar();
}