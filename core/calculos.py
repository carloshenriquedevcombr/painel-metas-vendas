# core/calculos.py

def calcular_atingimento(realizado: float, meta: float) -> float:
    """Calcula o % de atingimento da meta."""
    if meta <= 0:
        return 100.0 if realizado > 0 else 0.0
    return round((realizado / meta) * 100, 2)

def calcular_gap(realizado: float, meta: float) -> float:
    """Calcula quanto falta para bater a meta (Gap). Retorna 0 se já bateu."""
    gap = meta - realizado
    return round(gap, 2) if gap > 0 else 0.0

def calcular_run_rate(realizado: float, dias_passados: int) -> float:
    """Calcula o ritmo médio de vendas por dia útil já trabalhado."""
    if dias_passados <= 0:
        return 0.0
    return round(realizado / dias_passados, 2)

def calcular_projecao(run_rate_diario: float, dias_totais_mes: int) -> float:
    """Projeta como o mês vai fechar se mantiver o ritmo atual."""
    return round(run_rate_diario * dias_totais_mes, 2)

def calcular_meta_diaria_dinamica(gap: float, dias_restantes: int) -> float:
    """
    O 'Fantasma' do consultor: Quanto ele PRECISA vender por dia 
    nos dias que restam para conseguir bater a meta no último dia.
    """
    if dias_restantes <= 0:
        return gap # Se não tem mais dias, a meta diária é o próprio gap
    return round(gap / dias_restantes, 2)

def calcular_meta_diaria_fixa(meta_total: float, dias_totais: int) -> float:
    """A meta diária teórica (dividida igualmente no início do mês)."""
    if dias_totais <= 0:
        return 0.0
    return round(meta_total / dias_totais, 2)

def calcular_pace(realizado: float, meta: float, dias_passados: int, dias_totais: int) -> dict:
    """
    O termômetro do BI. Compara a % de meta batida com a % de tempo gasto.
    Retorna o índice e a cor do farol (Verde, Amarelo, Vermelho).
    """
    if meta <= 0 or dias_totais <= 0:
        return {"indice": 0.0, "status": "neutro", "cor": "#95a5a6"}
    
    pct_meta = realizado / meta
    pct_tempo = dias_passados / dias_totais

    if pct_tempo == 0:
        pace = 1.0 if pct_meta > 0 else 0.0
    else:
        pace = pct_meta / pct_tempo

    pace = round(pace, 2)

    # Lógica do Farol de BI
    if pace >= 1.0:
        status, cor = "Excelente", "#2ecc71" # Verde
    elif pace >= 0.85:
        status, cor = "Atenção", "#f1c40f"   # Amarelo
    else:
        status, cor = "Crítico", "#e74c3c"   # Vermelho

    return {
        "indice": pace,
        "status": status,
        "cor": cor
    }

def analisar_performance_consultor(nome_consultor: str, realizado: float, meta: float, dias_passados: int, dias_restantes: int) -> dict:
    """
    Função Mestra de BI: Junta todos os cálculos para gerar o Dossiê completo
    de um consultor ou da equipe em um único pacote de dados.
    """
    dias_totais = dias_passados + dias_restantes
    gap = calcular_gap(realizado, meta)
    run_rate = calcular_run_rate(realizado, dias_passados)

    return {
        "nome": nome_consultor,
        "meta_total": meta,
        "realizado": realizado,
        "atingimento_pct": calcular_atingimento(realizado, meta),
        "gap": gap,
        "run_rate": run_rate,
        "projecao_fim_mes": calcular_projecao(run_rate, dias_totais),
        "meta_diaria_fixa": calcular_meta_diaria_fixa(meta, dias_totais),
        "meta_diaria_necessaria": calcular_meta_diaria_dinamica(gap, dias_restantes),
        "termometro_pace": calcular_pace(realizado, meta, dias_passados, dias_totais)
    }