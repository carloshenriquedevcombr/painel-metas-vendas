# seed_demo.py
# Preenche os bancos com dados FICTÍCIOS para demonstração do painel.
# Nenhum nome, número ou valor aqui corresponde a pessoas ou vendas reais.
#
# Uso:  python seed_demo.py
# Atenção: apaga as vendas e metas existentes antes de inserir os dados de demo.

import os
import random
import secrets
from datetime import date, timedelta

from werkzeug.security import generate_password_hash

import app as painel  # cria as tabelas vazias (init_dbs) ao importar

random.seed(42)  # dados reproduzíveis

# Consultores fictícios
CONSULTORES = [
    ("ana.exemplo", "Ana Exemplo", "Consultor(a) Sênior"),
    ("bruno.ficticio", "Bruno Fictício", "Consultor(a) Pleno"),
    ("carla.demo", "Carla Demo", "Consultor(a) Pleno"),
    ("diego.teste", "Diego Teste", "Consultor(a) Júnior"),
    ("elisa.modelo", "Elisa Modelo", "Consultor(a) Júnior"),
    ("fabio.amostra", "Fábio Amostra", "Consultor(a) Sênior"),
]

# Perfil de desempenho de cada um (multiplicador sobre a média), para o ranking ficar interessante
PERFIL = {"Ana Exemplo": 1.35, "Bruno Fictício": 1.1, "Carla Demo": 1.0,
          "Diego Teste": 0.75, "Elisa Modelo": 0.9, "Fábio Amostra": 1.2}

STATUS = ["Concluido"] * 8 + ["Tramitando", "Pre-Tramite"]


def dias_uteis(inicio, fim):
    d = inicio
    while d <= fim:
        if d.weekday() < 5:
            yield d
        d += timedelta(days=1)


def criar_usuarios():
    senha = os.environ.get("DEMO_SENHA") or secrets.token_urlsafe(9)
    conn = painel.get_db(painel.DB_USERS); cur = conn.cursor()
    for username, nome, cargo in CONSULTORES:
        cur.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
        if not cur.fetchone():
            cur.execute("INSERT INTO usuarios (username, password_hash, nome_completo, cargo, role, ultimo_login, ativo, excluido) VALUES (?, ?, ?, ?, 'consultor', 'Nunca', 1, 0)",
                        (username, generate_password_hash(senha), nome, cargo))
    conn.commit(); conn.close()
    if not os.environ.get("DEMO_SENHA"):
        print(f"[INFO] Senha dos consultores de demonstração (ex.: ana.exemplo): {senha}")


def criar_vendas():
    hoje = date.today()
    inicio = (hoje.replace(day=1) - timedelta(days=1)).replace(day=1)  # mês anterior
    conn = painel.get_db(painel.DB_SALES); cur = conn.cursor()
    cur.execute("DELETE FROM resultados")
    total = 0
    for dia in dias_uteis(inicio, hoje):
        for _, nome, _ in CONSULTORES:
            for _ in range(random.randint(1, 3)):
                fator = PERFIL[nome]
                receita = round(random.uniform(60, 220) * fator, 2)
                cur.execute('''INSERT INTO resultados (consultor, data_venda, receita, mig_fixa_bl, mig_movel, altas_portin, bl, aparelhos, status, produtos_rs, cortesia)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                            (nome, dia.strftime("%Y-%m-%d"), receita,
                             random.randint(0, 2), random.randint(0, 4), random.randint(0, 1), random.randint(0, 1),
                             round(random.choice([0, 0, 0, 899.9, 1499.0, 2299.0]) * fator, 2),
                             random.choice(STATUS),
                             round(random.choice([0, 0, 49.9, 89.9, 129.9]), 2),
                             random.choice([0, 0, 0, 10.0])))
                total += 1
    conn.commit(); conn.close()
    print(f"[OK] {total} vendas fictícias inseridas.")


def criar_metas():
    hoje = date.today()
    conn = painel.get_db(painel.DB_METAS); cur = conn.cursor()
    cur.execute("DELETE FROM metas")
    cur.execute("DELETE FROM metas_semestrais_config")

    # Faixas de comissão do mês atual (mesmos valores padrão da tela de metas)
    faixas = [("Bronze", 200, 20, 30, 2, 1, 3000, 400), ("Prata", 300, 30, 40, 3, 2, 8000, 500),
              ("Ouro", 400, 40, 50, 4, 3, 10000, 600), ("Esmeralda", 1000, 10, 101, 10, 2, 30000, 1000),
              ("Diamante", 2000, 20, 180, 15, 3, 40000, 3000), ("Perola", 3000, 30, 210, 20, 4, 60000, 4400),
              ("Platinum", 4000, 40, 240, 25, 5, 70000, 5500)]
    mes_ref = hoje.strftime("%m/%Y")
    for f in faixas:
        cur.execute('''INSERT INTO metas (nome_categoria, receita, mig_fixa_bl, mig_movel, altas_portin, bl, aparelhos, bonus, mes_referencia, criado_por, data_criacao)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed_demo', ?)''', f + (mes_ref, hoje.strftime("%d/%m/%Y")))

    # Meta semestral global (o painel usa 1/6 dela como meta do mês)
    semestre = f"{1 if hoje.month <= 6 else 2}-{hoje.year}"
    cur.execute('''INSERT INTO metas_semestrais_config (semestre, nivel, total_receita, total_aparelhos, total_bl, total_dados_avancados, total_voz_avancada, total_licencas_office, total_servicos_tech, ultima_atualizacao)
                   VALUES (?, 'GLOBAL', ?, ?, ?, ?, ?, ?, ?, ?)''',
                (semestre, 180000.0, 600000.0, 120, 300, 200, 150, 40000.0, hoje.strftime("%d/%m/%Y")))

    cur.execute("INSERT OR REPLACE INTO config_sistema (chave, valor) VALUES ('dias_uteis', '22')")
    conn.commit(); conn.close()
    print(f"[OK] Metas fictícias criadas para {mes_ref} e semestre {semestre}.")


if __name__ == "__main__":
    criar_usuarios()
    criar_vendas()
    criar_metas()
    print("Pronto! Rode 'python app.py' e acesse http://localhost:5000")
