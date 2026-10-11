document.addEventListener('DOMContentLoaded', () => {
    carregarDadosPainel();
    
    // NOVA CHAMADA: Carrega os cálculos avançados do Cérebro (Python)
    carregarInteligenciaBI();
    
    // Tenta carregar usuários (Se não for admin, a função trata o erro silenciosamente)
    if(typeof carregarUsuarios === 'function') carregarUsuarios(); 

    // Define a data atual como padrão nos novos campos dinâmicos
    setupDatasIniciais();

    // Carrega a meta do mês atual ao abrir a tela
    if(document.getElementById('tabela-metas')) carregarMetas();

    // --- 1. Evento de Salvar Lançamento ---
    const form = document.getElementById('form-resultados');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.btn-save');
            const txtOriginal = btn.innerText;
            btn.innerText = 'Salvando...'; 
            btn.disabled = true;

            const dados = {
                consultor: document.getElementById('consultor').value,
                data_venda: document.getElementById('data_venda') ? document.getElementById('data_venda').value : new Date().toISOString().split('T')[0],
                status: document.getElementById('status-pedido').value,
                receita: parseFloat(document.getElementById('receita').value) || 0,
                mig_fixa_bl: parseInt(document.getElementById('mig_fixa').value) || 0, 
                mig_movel: parseInt(document.getElementById('mig_movel').value) || 0,
                altas_portin: parseInt(document.getElementById('altas_portin').value) || 0, 
                bl: parseInt(document.getElementById('bl').value) || 0, 
                aparelhos: parseFloat(document.getElementById('aparelhos').value) || 0,
                produtos_rs: parseFloat(document.getElementById('produtos_rs') ? document.getElementById('produtos_rs').value : 0) || 0 
            };

            const idInput = document.getElementById('lancamento-id');
            if (idInput && idInput.value) dados.id = idInput.value;

            try {
                const response = await fetch('/api/salvar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                if (response.ok) {
                    alert('Salvo com sucesso!');
                    form.reset();
                    if (document.getElementById('data_venda')) {
                        document.getElementById('data_venda').value = new Date().toISOString().split('T')[0];
                    }
                    if (document.getElementById('lancamento-id')) document.getElementById('lancamento-id').value = '';
                    
                    // Atualiza as duas visões após salvar
                    carregarDadosPainel();
                    carregarInteligenciaBI(); 
                    
                } else { 
                    alert('Erro ao salvar. Verifique se você tem permissão.'); 
                }
            } catch (error) { 
                console.error(error); 
                alert('Erro de conexão.');
            } finally { 
                btn.innerText = txtOriginal; 
                btn.disabled = false; 
            }
        });
    }

    // --- 2. Evento Novo Usuário ---
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
                const response = await fetch('/api/usuarios/novo', {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(dados)
                });
                if(response.ok) { 
                    alert('Usuário criado com sucesso!'); 
                    formUser.reset(); 
                    carregarUsuarios(); 
                } else {
                    alert('Erro ao criar usuário.');
                }
            } catch (error) { console.error(error); }
        });
    }
});

// ========================================================
// NOVA FUNÇÃO DO CÉREBRO BI (Consome a API /api/bi/performance)
// ========================================================
async function carregarInteligenciaBI() {
    try {
        const res = await fetch('/api/bi/performance');
        if(!res.ok) return;
        const bi = await res.json();

        // Atalho para formatar Moeda
        const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

        // 1. Atualiza Card do PACE (Termômetro)
        const elPaceValor = document.getElementById('bi-pace-valor');
        const elPaceStatus = document.getElementById('bi-pace-status');
        const cardPace = document.getElementById('card-pace');
        
        if(elPaceValor && bi.termometro_pace) {
            elPaceValor.innerText = bi.termometro_pace.indice.toFixed(2);
            elPaceStatus.innerText = bi.termometro_pace.status;
            elPaceStatus.style.background = bi.termometro_pace.cor;
            cardPace.style.borderLeft = `5px solid ${bi.termometro_pace.cor}`;
        }

        // 2. Atualiza Card de Atingimento e GAP
        if(document.getElementById('bi-atingimento')) {
            document.getElementById('bi-atingimento').innerText = `${bi.atingimento_pct.toFixed(1)}%`;
            document.getElementById('bi-gap').innerText = fmt(bi.gap);
        }

        // 3. Atualiza Meta Dinâmica e Fixa
        if(document.getElementById('bi-meta-dinamica')) {
            document.getElementById('bi-meta-dinamica').innerText = fmt(bi.meta_diaria_necessaria);
            document.getElementById('bi-meta-fixa').innerText = fmt(bi.meta_diaria_fixa);
        }

        // 4. Atualiza Projeção e Ritmo Atual
        if(document.getElementById('bi-projecao')) {
            document.getElementById('bi-projecao').innerText = fmt(bi.projecao_fim_mes);
            document.getElementById('bi-runrate').innerText = fmt(bi.run_rate);
        }

    } catch (error) {
        console.error("Erro ao carregar a Inteligência de BI:", error);
    }
}


// === CONFIGURAÇÃO INICIAL DAS DATAS LIVRES ===
function setupDatasIniciais() {
    const hoje = new Date();
    
    // Filtro de Meta Mensal Livre (Input type month: formato YYYY-MM)
    const elMesAno = document.getElementById('filtro-mes-ano');
    if (elMesAno) {
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        elMesAno.value = `${hoje.getFullYear()}-${mes}`;
    }

    // Filtros de Meta Semestral Livre
    const elSemestre = document.getElementById('filtro-semestre');
    const elAnoSemestre = document.getElementById('filtro-ano-semestre');
    if (elSemestre && elAnoSemestre) {
        // Se for mês menor que Julho (0-5), é semestre 1, se não, semestre 2
        elSemestre.value = hoje.getMonth() < 6 ? "1" : "2";
        elAnoSemestre.value = hoje.getFullYear();
    }
}

async function carregarDadosPainel() {
    try {
        const [resDados, resMetas] = await Promise.all([
            fetch('/api/dados'),
            fetch('/api/metas')
        ]);
        
        if(!resDados.ok || !resMetas.ok) return;

        const dados = await resDados.json();
        const metas = await resMetas.json();

        // ATUALIZA TABELA MATRIZ/PRODUTIVIDADE DA EQUIPE
        const tbodyMatriz = document.querySelector('#tabela-matriz-produtos tbody');
        if(tbodyMatriz) {
            tbodyMatriz.innerHTML = '';
            const porConsultor = {};
            
            dados.forEach(d => {
                if(d.status === 'Concluido') {
                    if(!porConsultor[d.consultor]) porConsultor[d.consultor] = {altas:0, movel:0, fixa:0, bl:0, apa:0, total:0};
                    porConsultor[d.consultor].altas += d.altas_portin; 
                    porConsultor[d.consultor].movel += d.mig_movel; 
                    porConsultor[d.consultor].fixa += d.mig_fixa_bl;
                    porConsultor[d.consultor].bl += d.bl; 
                    porConsultor[d.consultor].apa += d.aparelhos; 
                    porConsultor[d.consultor].total += d.receita;
                }
            });

            const fmt = (v) => v.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
            Object.keys(porConsultor).sort((a,b) => porConsultor[b].total - porConsultor[a].total).forEach(nome => {
                const c = porConsultor[nome];
                tbodyMatriz.innerHTML += `<tr><td>${nome}</td><td>${c.altas}</td><td>${c.movel}</td><td>${c.fixa}</td><td>${c.bl}</td><td>${fmt(c.apa)}</td><td style="font-weight:bold; color:var(--title-color)">${fmt(c.total)}</td></tr>`;
            });
        }
        
    } catch (error) {
        console.error("Erro ao carregar painel matriz:", error);
    }
}

// === ABAS DE METAS E SALVAMENTO MANUAL E DINÂMICO ===
function alternarAbaMetas(aba) {
    const abaMensal = document.getElementById('aba-meta-mensal');
    const abaSemestral = document.getElementById('aba-meta-semestral');
    const btnMensal = document.getElementById('btn-aba-mensal');
    const btnSemestral = document.getElementById('btn-aba-semestral');

    if(aba === 'mensal') {
        abaMensal.style.display = 'block';
        abaSemestral.style.display = 'none';
        btnMensal.className = 'btn-primary';
        btnMensal.style.background = 'var(--title-color)';
        btnMensal.style.color = 'white';
        btnSemestral.className = 'btn-cancel';
        btnSemestral.style.background = '#ccc';
        btnSemestral.style.color = '#333';
        carregarMetas();
    } else {
        abaMensal.style.display = 'none';
        abaSemestral.style.display = 'block';
        btnSemestral.className = 'btn-primary';
        btnSemestral.style.background = 'var(--title-color)';
        btnSemestral.style.color = 'white';
        btnMensal.className = 'btn-cancel';
        btnMensal.style.background = '#ccc';
        btnMensal.style.color = '#333';
        carregarMetaSemestral();
    }
}

async function carregarMetas() {
    const mesAno = document.getElementById('filtro-mes-ano')?.value; // Formato do HTML5: YYYY-MM
    let queryString = '';
    
    if(mesAno) {
        const [ano, mes] = mesAno.split('-'); // Separa em Ano e Mês
        queryString = `?mes=${mes}/${ano}`;   // Converte para o padrão MM/YYYY que o Python já espera
    }

    try {
        const res = await fetch(`/api/metas${queryString}`);
        if(!res.ok) return;
        const dados = await res.json();
        const tbody = document.querySelector('#tabela-metas tbody');
        if(tbody) {
            tbody.innerHTML = '';
            dados.forEach(m => {
                tbody.innerHTML += `<tr><td style="font-weight:bold; color:var(--title-color)">${m.categoria}</td><td>R$ ${m.receita}</td><td>${m.mig_fixa_bl}</td><td>${m.mig_movel}</td><td>${m.altas_portin}</td><td>${m.bl}</td><td>R$ ${m.aparelhos}</td><td style="color:var(--status-verde)">R$ ${m.bonus}</td></tr>`;
            });
        }
    } catch(e){}
}

async function salvarMeta() {
    const mesAno = document.getElementById('filtro-mes-ano').value;
    if(!mesAno) return alert('Selecione o mês e ano para a meta.');
    
    const [ano, mes] = mesAno.split('-');
    const mes_referencia = `${mes}/${ano}`;

    const dados = {
        categoria: document.getElementById('meta-cat').value,
        receita: parseFloat(document.getElementById('meta-rec').value) || 0,
        mig_fixa_bl: parseInt(document.getElementById('meta-fixa').value) || 0,
        mig_movel: parseInt(document.getElementById('meta-mov').value) || 0,
        altas_portin: parseInt(document.getElementById('meta-altas').value) || 0,
        bl: parseInt(document.getElementById('meta-bl').value) || 0,
        aparelhos: parseFloat(document.getElementById('meta-apa').value) || 0,
        bonus: parseFloat(document.getElementById('meta-bonus').value) || 0,
        mes_referencia: mes_referencia
    };
    try {
        const res = await fetch('/api/metas/salvar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados) });
        if(res.ok) { alert('Meta Mensal salva!'); carregarMetas(); } else alert('Erro');
    } catch(e) {}
}

async function carregarMetaSemestral() {
    const semestre = document.getElementById('filtro-semestre').value;
    const ano = document.getElementById('filtro-ano-semestre').value;
    if(!ano) return;

    const semestreStr = `${semestre}-${ano}`; // Ex: "1-2026"

    try {
        const res = await fetch(`/api/semestral/dados?semestre=${semestreStr}`);
        if(!res.ok) return;
        const dados = await res.json();
        
        document.getElementById('ouro-receita').value = dados.meta_total || 0;
        document.getElementById('ouro-aparelhos').value = dados.meta_aparelhos || 0;
        document.getElementById('ouro-banda-larga').value = dados.meta_bl || 0;
        document.getElementById('ouro-dados-avancados').value = dados.meta_dados_avancados || 0;
        document.getElementById('ouro-voz-avancada').value = dados.meta_voz_avancada || 0;
        document.getElementById('ouro-licencas-office').value = dados.meta_licencas_office || 0;
        document.getElementById('ouro-servicos-tech').value = dados.meta_servicos_tech || 0;
    } catch(e) { console.error("Erro ao carregar semestral", e); }
}

async function salvarMetaSemestral() {
    const semestre = document.getElementById('filtro-semestre').value;
    const ano = document.getElementById('filtro-ano-semestre').value;
    if(!ano) return alert("Digite o ano!");

    const semestreStr = `${semestre}-${ano}`;

    const dados = {
        semestre: semestreStr,
        meta_receita: parseFloat(document.getElementById('ouro-receita').value) || 0,
        meta_aparelhos: parseFloat(document.getElementById('ouro-aparelhos').value) || 0,
        meta_bl: parseFloat(document.getElementById('ouro-banda-larga').value) || 0, 
        meta_dados_avancados: parseFloat(document.getElementById('ouro-dados-avancados').value) || 0,
        meta_voz_avancada: parseFloat(document.getElementById('ouro-voz-avancada').value) || 0,
        meta_licencas_office: parseFloat(document.getElementById('ouro-licencas-office').value) || 0,
        meta_servicos_tech: parseFloat(document.getElementById('ouro-servicos-tech').value) || 0
    };
    try {
        const res = await fetch('/api/semestral/salvar', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(dados) 
        });
        if(res.ok) { 
            alert('Meta Semestral Rumo ao Ouro atualizada!'); 
        } else { alert('Erro ao salvar meta semestral.'); }
    } catch(e) {}
}

// === USUÁRIOS E LOGS ===
async function carregarUsuarios() {
    try {
        const res = await fetch('/api/usuarios');
        if(!res.ok) return; 

        const usuarios = await res.json();
        const tbody = document.querySelector('#tabela-usuarios tbody');
        
        if(tbody) {
            tbody.innerHTML = '';
            usuarios.forEach(u => {
                const rowOpacity = u.ativo === 0 ? '0.5' : '1';
                const statusIcon = u.ativo === 1 ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-ban"></i>';
                const statusColor = u.ativo === 1 ? '#2ecc71' : '#e74c3c';
                const lockIcon = u.ativo === 1 ? 'fa-lock-open' : 'fa-lock';
                const lockBtnColor = u.ativo === 1 ? '#95a5a6' : '#e74c3c';
                
                const badgeColor = u.role === 'admin' ? '#1e40af' : (u.role === 'consultor' ? '#3498db' : '#22c55e'); 
                
                const tr = document.createElement('tr');
                tr.style.opacity = rowOpacity;
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:bold; color:#2c3e50">${u.nome}</div>
                        <small style="color:#888;">Acesso: ${u.ultimo_login || 'Nunca'}</small>
                    </td>
                    <td>${u.username}</td>
                    <td style="font-weight:600; color:#1e40af">${u.cargo || '-'}</td>
                    <td><span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:10px; font-size:0.7rem;">${u.role.toUpperCase()}</span></td>
                    <td style="color:${statusColor}; font-weight:bold; text-align:center;">${statusIcon}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button onclick="toggleStatus(${u.id})" type="button" class="btn-primary" style="padding:5px 10px; width:auto; background:${lockBtnColor};"><i class="fa-solid ${lockIcon}"></i></button>
                            <button onclick="deletarUsuario(${u.id})" type="button" class="btn-cancel" style="padding:5px 10px; width:auto;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(e) {}
}

function filtrarUsuarios() {
    const input = document.getElementById('busca-usuario');
    const filter = input.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const table = document.getElementById("tabela-usuarios");
    const tr = table.getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        const linhaTexto = tr[i].textContent || tr[i].innerText;
        const textoNormalizado = linhaTexto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        tr[i].style.display = textoNormalizado.indexOf(filter) > -1 ? "" : "none";
    }
}

async function toggleStatus(id) {
    if(confirm('Alterar status deste usuário?')) {
        const res = await fetch(`/api/usuarios/toggle_status/${id}`, {method:'POST'});
        if(res.ok) carregarUsuarios(); 
    }
}

async function deletarUsuario(id) {
    if(confirm('Tem certeza que deseja EXCLUIR este usuário?')) {
        const res = await fetch(`/api/usuarios/deletar/${id}`, {method:'DELETE'});
        if(res.ok) carregarUsuarios();
    }
}

async function verAuditoria() {
    const modal = document.getElementById('modal-logs');
    if(modal) modal.style.display = 'flex';
    const tbody = document.querySelector('#tabela-logs-conteudo tbody');
    if(tbody) {
        tbody.innerHTML = '<tr><td colspan="4">Carregando logs...</td></tr>';
        try {
            const res = await fetch('/api/logs');
            const logs = await res.json();
            tbody.innerHTML = '';
            logs.forEach(log => {
                let corAcao = '#333';
                if(log.acao.includes('EXCLUIR')) corAcao = '#e74c3c';
                if(log.acao.includes('CRIAR') || log.acao.includes('VENDA')) corAcao = '#27ae60';
                tbody.innerHTML += `<tr><td>${log.data}</td><td><strong>${log.responsavel}</strong></td><td style="color:${corAcao}; font-weight:bold;">${log.acao}</td><td>${log.detalhes}</td></tr>`;
            });
        } catch(e) {}
    }
}