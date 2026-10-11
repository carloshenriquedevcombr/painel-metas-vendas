// ========================================================
// metas.js - Motor da Página de Gestão de Metas
// ========================================================

let metasAtuais = []; // Guarda as metas carregadas na tela

// TABELA PADRÃO DE METAS (Injeta automaticamente se o mês estiver vazio)
const METAS_PADRAO = [
  {
    nome_categoria: "Bronze",
    receita: 200.0,
    mig_fixa_bl: 20,
    mig_movel: 30,
    altas_portin: 2,
    bl: 1,
    aparelhos: 3000.0,
    bonus: 400.0,
  },
  {
    nome_categoria: "Prata",
    receita: 300.0,
    mig_fixa_bl: 30,
    mig_movel: 40,
    altas_portin: 3,
    bl: 2,
    aparelhos: 8000.0,
    bonus: 500.0,
  },
  {
    nome_categoria: "Ouro",
    receita: 400.0,
    mig_fixa_bl: 40,
    mig_movel: 50,
    altas_portin: 4,
    bl: 3,
    aparelhos: 10000.0,
    bonus: 600.0,
  },
  {
    nome_categoria: "Esmeralda",
    receita: 1000.0,
    mig_fixa_bl: 10,
    mig_movel: 101,
    altas_portin: 10,
    bl: 2,
    aparelhos: 30000.0,
    bonus: 1000.0,
  },
  {
    nome_categoria: "Diamante",
    receita: 2000.0,
    mig_fixa_bl: 20,
    mig_movel: 180,
    altas_portin: 15,
    bl: 3,
    aparelhos: 40000.0,
    bonus: 3000.0,
  },
  {
    nome_categoria: "Perola",
    receita: 3000.0,
    mig_fixa_bl: 30,
    mig_movel: 210,
    altas_portin: 20,
    bl: 4,
    aparelhos: 60000.0,
    bonus: 4400.0,
  },
  {
    nome_categoria: "Platinum",
    receita: 4000.0,
    mig_fixa_bl: 40,
    mig_movel: 240,
    altas_portin: 25,
    bl: 5,
    aparelhos: 70000.0,
    bonus: 5500.0,
  },
];

document.addEventListener("DOMContentLoaded", () => {
  // 1. Configura a Data de Hoje nos Filtros
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("filtro-mes-ano").value = mesAtual;

  document.getElementById("filtro-ano-semestre").value = hoje.getFullYear();
  document.getElementById("filtro-semestre").value =
    hoje.getMonth() < 6 ? "1" : "2";

  // 2. Carrega as tabelas
  carregarMetas();
  carregarMetaSemestral();

  // 3. Evento de Salvar Edição de Meta Mensal
  const formEditarMeta = document.getElementById("form-editar-meta");
  if (formEditarMeta) {
    formEditarMeta.addEventListener("submit", salvarMeta);
  }
});

// ==========================================
// ABA 1: METAS MENSAIS (COMISSÕES)
// ==========================================

async function carregarMetas() {
  const valMes = document.getElementById("filtro-mes-ano").value;
  if (!valMes) return;

  const [ano, mes] = valMes.split("-");
  const mesParam = `${mes}/${ano}`;

  try {
    const res = await fetch(`/api/metas?mes=${mesParam}`);
    const metasDB = await res.json();

    metasAtuais = [];
    const tbody = document.querySelector("#tabela-metas tbody");
    tbody.innerHTML = "";

    // Mescla as metas do Banco de Dados com as Metas Padrão
    METAS_PADRAO.forEach((padrao) => {
      const dbMeta = metasDB.find(
        (m) => m.nome_categoria === padrao.nome_categoria,
      );
      const metaFinal = dbMeta || padrao; // Se não tiver na DB, usa a Tabela Exata de Janeiro/Fev

      metasAtuais.push(metaFinal); // Salva na memória da tela

      // Define Ícone por Categoria
      let corIcone = "#888";
      if (metaFinal.nome_categoria === "Bronze") corIcone = "#cd7f32";
      if (metaFinal.nome_categoria === "Prata") corIcone = "#bdc3c7";
      if (metaFinal.nome_categoria === "Ouro") corIcone = "#f1c40f";
      if (metaFinal.nome_categoria === "Esmeralda") corIcone = "#2ecc71";
      if (metaFinal.nome_categoria === "Diamante") corIcone = "#00e5ff";
      if (metaFinal.nome_categoria === "Perola") corIcone = "#ff9ff3";
      if (metaFinal.nome_categoria === "Platinum") corIcone = "#2c3e50";

      tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee; transition: 0.2s;">
                    <td style="font-weight:800; color:var(--cor-primaria); text-align: left; padding: 15px;">
                        <i class="fa-solid fa-medal" style="color: ${corIcone}; margin-right: 8px; font-size: 1.2rem;"></i> ${metaFinal.nome_categoria}
                    </td>
                    <td>R$ ${parseFloat(metaFinal.receita).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td>${metaFinal.mig_fixa_bl}</td>
                    <td>${metaFinal.mig_movel}</td>
                    <td>${metaFinal.altas_portin}</td>
                    <td>${metaFinal.bl}</td>
                    <td>R$ ${parseFloat(metaFinal.aparelhos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td style="color:#27ae60; font-weight: 800; background: rgba(46, 204, 113, 0.05);">R$ ${parseFloat(metaFinal.bonus).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right; padding: 15px;">
                        <button onclick="editarMetaLinha('${metaFinal.nome_categoria}')" title="Editar ${metaFinal.nome_categoria}" style="color:#f39c12; background:none; border:none; cursor:pointer; font-size:1.3rem;">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </td>
                </tr>
            `;
    });
  } catch (e) {
    console.error("Erro ao carregar metas mensais:", e);
  }
}

// ABRIR POPUP DE EDIÇÃO DA LINHA
window.editarMetaLinha = function (categoria) {
  const meta = metasAtuais.find((m) => m.nome_categoria === categoria);
  if (!meta) return;

  document.getElementById("meta-cat").value = meta.nome_categoria;
  document.getElementById("span-categoria-nome").innerText =
    meta.nome_categoria;

  document.getElementById("meta-rec").value = meta.receita;
  document.getElementById("meta-fixa").value = meta.mig_fixa_bl;
  document.getElementById("meta-mov").value = meta.mig_movel;
  document.getElementById("meta-altas").value = meta.altas_portin;
  document.getElementById("meta-bl").value = meta.bl;
  document.getElementById("meta-apa").value = meta.aparelhos;
  document.getElementById("meta-bonus").value = meta.bonus;

  const modal = document.getElementById("modal-editar-meta");
  modal.style.display = "flex";
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);
};

window.fecharModalEditarMeta = function () {
  const modal = document.getElementById("modal-editar-meta");
  modal.classList.remove("active");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
};

// SALVAR META EDITADA NO BANCO DE DADOS
async function salvarMeta(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-meta");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  const valMes = document.getElementById("filtro-mes-ano").value;
  const [ano, mes] = valMes.split("-");

  const payload = {
    categoria: document.getElementById("meta-cat").value, // O backend ainda procura por 'categoria' no JSON
    mes_referencia: `${mes}/${ano}`,
    receita: parseFloat(document.getElementById("meta-rec").value) || 0,
    mig_fixa_bl: parseInt(document.getElementById("meta-fixa").value) || 0,
    mig_movel: parseInt(document.getElementById("meta-mov").value) || 0,
    altas_portin: parseInt(document.getElementById("meta-altas").value) || 0,
    bl: parseInt(document.getElementById("meta-bl").value) || 0,
    aparelhos: parseFloat(document.getElementById("meta-apa").value) || 0,
    bonus: parseFloat(document.getElementById("meta-bonus").value) || 0,
  };

  try {
    const res = await fetch("/api/metas/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Atualizado!",
        text: `${payload.categoria} salva para ${payload.mes_referencia}`,
        timer: 1500,
        showConfirmButton: false,
      });
      fecharModalEditarMeta();
      carregarMetas();
    } else {
      Swal.fire("Erro", "Falha ao atualizar a meta.", "error");
    }
  } catch (e) {
    Swal.fire("Erro", "Falha na comunicação.", "error");
  } finally {
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
}

// ==========================================
// ABA 2: METAS SEMESTRAIS (RUMO AO OURO)
// ==========================================

async function carregarMetaSemestral() {
  const sem = document.getElementById("filtro-semestre").value;
  const ano = document.getElementById("filtro-ano-semestre").value;
  const semestreReq = `${sem}-${ano}`;

  try {
    const res = await fetch(`/api/semestral/dados?semestre=${semestreReq}`);
    if (res.ok) {
      const dados = await res.json();
      document.getElementById("ouro-receita").value = dados.meta_total || "";
      document.getElementById("ouro-aparelhos").value =
        dados.meta_aparelhos || "";
      document.getElementById("ouro-banda-larga").value = dados.meta_bl || "";
      document.getElementById("ouro-dados-avancados").value =
        dados.meta_dados_avancados || "";
      document.getElementById("ouro-voz-avancada").value =
        dados.meta_voz_avancada || "";
      document.getElementById("ouro-licencas-office").value =
        dados.meta_licencas_office || "";
      document.getElementById("ouro-servicos-tech").value =
        dados.meta_servicos_tech || "";
    }
  } catch (e) {
    console.error(e);
  }
}

window.salvarMetaSemestral = async function () {
  const btn = document.querySelector("#aba-meta-semestral .btn-save");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  const sem = document.getElementById("filtro-semestre").value;
  const ano = document.getElementById("filtro-ano-semestre").value;

  const payload = {
    semestre: `${sem}-${ano}`,
    meta_receita:
      parseFloat(document.getElementById("ouro-receita").value) || 0,
    meta_aparelhos:
      parseFloat(document.getElementById("ouro-aparelhos").value) || 0,
    meta_bl: parseFloat(document.getElementById("ouro-banda-larga").value) || 0,
    meta_dados_avancados:
      parseFloat(document.getElementById("ouro-dados-avancados").value) || 0,
    meta_voz_avancada:
      parseFloat(document.getElementById("ouro-voz-avancada").value) || 0,
    meta_licencas_office:
      parseFloat(document.getElementById("ouro-licencas-office").value) || 0,
    meta_servicos_tech:
      parseFloat(document.getElementById("ouro-servicos-tech").value) || 0,
  };

  try {
    const res = await fetch("/api/semestral/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Rumo ao Ouro Salvo!",
        text: `Metas do ${sem}º Semestre de ${ano} atualizadas.`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  } catch (e) {
    Swal.fire("Erro", "Falha na comunicação.", "error");
  } finally {
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
};

window.alternarAbaMetas = function (aba) {
  document.getElementById("aba-meta-mensal").style.display =
    aba === "mensal" ? "block" : "none";
  document.getElementById("aba-meta-semestral").style.display =
    aba === "semestral" ? "block" : "none";

  document.getElementById("btn-aba-mensal").className =
    aba === "mensal" ? "btn-primary" : "btn-cancel";
  document.getElementById("btn-aba-mensal").style.background =
    aba === "mensal" ? "var(--title-color)" : "";
  document.getElementById("btn-aba-mensal").style.color =
    aba === "mensal" ? "white" : "";

  document.getElementById("btn-aba-semestral").className =
    aba === "semestral" ? "btn-primary" : "btn-cancel";
  document.getElementById("btn-aba-semestral").style.background =
    aba === "semestral" ? "var(--title-color)" : "";
  document.getElementById("btn-aba-semestral").style.color =
    aba === "semestral" ? "white" : "";
};

// ==========================================
// HISTÓRICO DE AÇÕES (LOGS)
// ==========================================

window.verLogs = async function (filtroContexto = null) {
  const modal = document.getElementById("modal-logs");
  const tbody = document.querySelector("#tabela-logs-conteudo tbody");
  if (!modal || !tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="4" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando Histórico...</td></tr>';
  modal.style.display = "flex";
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);

  try {
    const response = await fetch("/api/logs");
    if (response.ok) {
      const logs = await response.json();
      tbody.innerHTML = "";

      const logsFiltrados = logs.filter((log) => {
        if (!filtroContexto || filtroContexto === "todos") return true;
        if (filtroContexto === "meta")
          return ["META_MENSAL", "META_SEMESTRAL"].includes(log.acao);
        return true;
      });

      if (logsFiltrados.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhum histórico encontrado.</td></tr>';
        return;
      }

      logsFiltrados.forEach((log) => {
        tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #eee; font-size: 0.95rem;">
                        <td style="padding:15px 10px; color:#555;">${log.data}</td>
                        <td style="padding:15px 10px; font-weight:bold;">${log.responsavel}</td>
                        <td style="padding:15px 10px;"><span style="background: #f39c1220; color: #f39c12; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${log.acao}</span></td>
                        <td style="padding:15px 10px; color:#666;">${log.detalhes}</td>
                    </tr>
                `;
      });
    }
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; color:#e74c3c;">Erro ao carregar o histórico.</td></tr>';
  }
};

window.fecharModalLogs = function () {
  const modal = document.getElementById("modal-logs");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
};

window.filtrarTabelaLogs = function () {
  const termo = document
    .getElementById("filtro-log-interno")
    .value.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const linhas = document.querySelectorAll("#tabela-logs-conteudo tbody tr");
  linhas.forEach((linha) => {
    const texto = linha.innerText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    linha.style.display = texto.includes(termo) ? "" : "none";
  });
};

// ==========================================
// EXPORTAÇÃO PDF AVANÇADA
// ==========================================

window.abrirModalExportar = function () {
  document.getElementById("modal-exportar").style.display = "flex";
  setTimeout(() => {
    document.getElementById("modal-exportar").classList.add("active");
  }, 10);
};

window.fecharModalExportar = function () {
  const modal = document.getElementById("modal-exportar");
  modal.classList.remove("active");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
};

window.exportarMetasPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape"); // Relatório horizontal para caber todas as colunas

  const valMes = document.getElementById("filtro-mes-ano").value;
  const [ano, mes] = valMes.split("-");

  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text("Relatório de Metas e Comissionamento", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Mês de Referência: ${mes}/${ano}`, 14, 28);

  const tableCols = [
    "Categoria",
    "Receita (R$)",
    "Fixa",
    "Móvel",
    "Altas/PN",
    "Banda Larga",
    "Aparelho (R$)",
    "Bônus Pago (R$)",
  ];
  const tableRows = metasAtuais.map((m) => [
    m.nome_categoria,
    parseFloat(m.receita).toFixed(2),
    m.mig_fixa_bl,
    m.mig_movel,
    m.altas_portin,
    m.bl,
    parseFloat(m.aparelhos).toFixed(2),
    parseFloat(m.bonus).toFixed(2),
  ]);

  doc.autoTable({
    startY: 35,
    head: [tableCols],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3, halign: "center" },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      7: { textColor: [39, 174, 96], fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  });

  doc.save(`Tabela_Comissoes_${mes}_${ano}.pdf`);
  fecharModalExportar();
};
