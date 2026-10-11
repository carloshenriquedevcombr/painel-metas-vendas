// ========================================================
// usuarios.js - Gestão de Acessos com Edição e Logs
// ========================================================

let usuariosGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarUsuarios();

    // Evento de Salvar/Editar Usuário
    const form = document.getElementById('form-novo-usuario');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-salvar-usuario');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            btn.disabled = true;

            const userId = document.getElementById('user-id').value;
            const payload = {
                id: userId || null,
                nome: document.getElementById('user-nome').value,
                cargo: document.getElementById('user-cargo').value,
                username: document.getElementById('user-login').value,
                role: document.getElementById('user-role').value,
                password: document.getElementById('user-pass').value
            };
            
            try {
                const res = await fetch('/api/usuarios/salvar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    Swal.fire({icon: 'success', title: 'Sucesso!', text: 'Usuário guardado no sistema.', timer: 2000, showConfirmButton: false});
                    fecharModalUsuario();
                    carregarUsuarios();
                } else {
                    const err = await res.json();
                    Swal.fire('Erro', err.error || 'Não foi possível salvar o usuário.', 'error');
                }
            } catch(error) {
                Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Usuário';
                btn.disabled = false;
            }
        });
    }
});

// ========================================================
// CONTROLE DO MODAL DE USUÁRIO (CRIAR E EDITAR)
// ========================================================
window.abrirModalUsuario = function(id = null) {
    limparFormUsuario();
    const modal = document.getElementById('modal-usuario');
    const titulo = document.getElementById('titulo-form-usuario');
    const passInput = document.getElementById('user-pass');
    
    if(id) {
        // MODO EDIÇÃO
        titulo.innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Usuário';
        passInput.required = false; // Não obriga a trocar a senha ao editar
        
        const user = usuariosGlobais.find(u => u.id === id);
        if(user) {
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-nome').value = user.nome;
            document.getElementById('user-cargo').value = user.cargo;
            document.getElementById('user-login').value = user.username;
            
            let roleVal = user.role.toLowerCase();
            if(!['consultor', 'editor', 'admin'].includes(roleVal)) roleVal = 'consultor';
            document.getElementById('user-role').value = roleVal;
        }
    } else {
        // MODO CRIAÇÃO
        titulo.innerHTML = '<i class="fa-solid fa-user-plus"></i> Cadastrar Usuário';
        passInput.required = true; 
    }
    
    modal.classList.add('active');
    modal.style.display = 'flex';
}

window.fecharModalUsuario = function() {
    const modal = document.getElementById('modal-usuario');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    limparFormUsuario();
}

window.limparFormUsuario = function() {
    document.getElementById('form-novo-usuario').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-pass').required = false;
}

// ========================================================
// RENDERIZAÇÃO DA TABELA
// ========================================================
async function carregarUsuarios() {
    try {
        const res = await fetch('/api/usuarios');
        if (res.ok) {
            usuariosGlobais = await res.json();
            renderizarTabelaUsuarios();
        }
    } catch (e) {
        console.error("Erro ao carregar usuários", e);
    }
}

window.renderizarTabelaUsuarios = function() {
    const tbody = document.querySelector('#tabela-usuarios tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const termo = document.getElementById('busca-usuario')?.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") || '';

    usuariosGlobais.forEach(u => {
        const nomeStr = u.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const loginStr = u.username.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        
        if (termo && !nomeStr.includes(termo) && !loginStr.includes(termo)) return;

        const statusBadge = u.ativo === 1 
            ? '<span style="background:#2ecc71; color:white; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Ativo</span>'
            : '<span style="background:#e74c3c; color:white; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Bloqueado</span>';

        const iconeStatus = u.ativo === 1 ? 'fa-lock' : 'fa-lock-open';
        const corStatusBtn = u.ativo === 1 ? '#e74c3c' : '#2ecc71';
        const titleStatusBtn = u.ativo === 1 ? 'Bloquear Acesso' : 'Desbloquear Acesso';

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:15px 10px; font-weight:bold; color:var(--cor-primaria);"><i class="fa-solid fa-user-tie" style="margin-right:8px;"></i> ${u.nome}</td>
                <td style="padding:15px 10px; color:#555;">${u.username}</td>
                <td style="padding:15px 10px;">${u.cargo}</td>
                <td style="padding:15px 10px; text-transform:capitalize;">${u.role}</td>
                <td style="padding:15px 10px; text-align: center;">${statusBadge}</td>
                <td style="padding:15px 10px; text-align:right;">
                    <button onclick="abrirModalUsuario(${u.id})" title="Editar Usuário" style="color:#f39c12; background:transparent; border:none; cursor:pointer; font-size:1.2rem; margin-right:12px;"><i class="fa-solid fa-pen-to-square"></i></button>
                    
                    <button onclick="resetarSenha(${u.id})" title="Resetar Senha (padrão definido em SENHA_PADRAO)" style="color:#3498db; background:transparent; border:none; cursor:pointer; font-size:1.2rem; margin-right:12px;"><i class="fa-solid fa-key"></i></button>
                    
                    <button onclick="toggleStatus(${u.id}, ${u.ativo}, '${u.nome}')" title="${titleStatusBtn}" style="color:${corStatusBtn}; background:transparent; border:none; cursor:pointer; font-size:1.2rem; margin-right:12px;"><i class="fa-solid ${iconeStatus}"></i></button>
                    
                    <button onclick="excluirUsuario(${u.id})" title="Excluir Definitivamente" style="color:#c0392b; background:transparent; border:none; cursor:pointer; font-size:1.2rem;"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}

window.filtrarUsuarios = function() { renderizarTabelaUsuarios(); }

// ========================================================
// AÇÕES NA TABELA: POPUPS E CONFIRMAÇÕES (SWEETALERT2)
// ========================================================

window.toggleStatus = async function(id, statusAtual, nome) {
    const acao = statusAtual === 1 ? 'bloquear' : 'desbloquear';
    const result = await Swal.fire({
        title: `${acao.charAt(0).toUpperCase() + acao.slice(1)} Acesso?`,
        text: `Tem certeza que deseja ${acao} o acesso de ${nome}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: statusAtual === 1 ? '#e74c3c' : '#2ecc71',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: `Sim, ${acao}!`
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/usuarios/toggle_status/${id}`, { method: 'POST' });
            if(res.ok) {
                Swal.fire('Sucesso!', `O acesso foi ${acao === 'bloquear' ? 'bloqueado' : 'desbloqueado'}.`, 'success');
                carregarUsuarios();
            }
        } catch(e) { Swal.fire('Erro', 'Falha na comunicação.', 'error'); }
    }
}

window.excluirUsuario = async function(id) {
    const result = await Swal.fire({
        title: 'Excluir usuário?',
        text: "O usuário não poderá mais acessar o sistema.",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#c0392b',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Sim, Excluir!'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/usuarios/deletar/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Excluído!', 'O usuário foi removido.', 'success');
                carregarUsuarios();
            } else {
                Swal.fire('Erro', 'Não é possível excluir o seu próprio usuário.', 'error');
            }
        } catch(e) { Swal.fire('Erro', 'Falha na comunicação.', 'error'); }
    }
}

window.resetarSenha = async function(id) {
    const result = await Swal.fire({
        title: 'Resetar Senha?',
        text: "A senha deste usuário voltará para a senha padrão do sistema (SENHA_PADRAO).",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3498db',
        confirmButtonText: 'Sim, Resetar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/admin/resetar_senha/${id}`, { method: 'POST' });
            if (res.ok) { Swal.fire('Sucesso!', 'Senha redefinida para a senha padrão do sistema.', 'success'); }
        } catch(e) { Swal.fire('Erro', 'Falha na comunicação.', 'error'); }
    }
}

// ========================================================
// MOTOR DO HISTÓRICO (LOGS ESPECÍFICOS DE USUÁRIOS)
// ========================================================
window.verLogs = async function(filtroContexto = null) {
    const modal = document.getElementById('modal-logs');
    const tbody = document.querySelector('#tabela-logs-conteudo tbody');
    if (!modal || !tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando Histórico...</td></tr>';
    modal.style.display = 'flex';
    modal.classList.add('active'); 
    
    try {
        const response = await fetch('/api/logs');
        if (response.ok) {
            const logs = await response.json();
            tbody.innerHTML = '';
            
            // FILTRA APENAS LOGS RELACIONADOS A USUÁRIOS
            const logsFiltrados = logs.filter(log => {
                if (!filtroContexto || filtroContexto === 'todos') return true;
                if (filtroContexto === 'usuario') return ['CRIAR_USUARIO', 'ATUALIZAR_USUARIO', 'BLOQUEIO', 'EXCLUSAO', 'RESET_SENHA', 'LOGIN', 'LOGOUT'].includes(log.acao);
                return true;
            });
            
            if(logsFiltrados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhum histórico encontrado para este módulo.</td></tr>';
                return;
            }
            
            logsFiltrados.forEach(log => {
                let cor = '#333';
                if(log.acao.includes('LOGIN') || log.acao.includes('CRIAR')) cor = '#2ecc71';
                if(log.acao.includes('ATUALIZAR') || log.acao.includes('RESET')) cor = '#3498db';
                if(log.acao.includes('BLOQUEIO') || log.acao.includes('EXCLUSAO') || log.acao.includes('LOGOUT')) cor = '#e74c3c';
                
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
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#e74c3c;">Erro ao carregar o histórico.</td></tr>';
    }
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