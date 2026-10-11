# Usa uma imagem leve do Python
FROM python:3.12-slim

# Define a pasta de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias (opcional, mas bom para garantir)
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*

# Configura o fuso horário para Brasil/São Paulo
ENV TZ=America/Sao_Paulo

# Copia o arquivo de requisitos e instala as bibliotecas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código do projeto para dentro do container
COPY . .

# Os bancos SQLite ficam em /app/db (montado como volume)
ENV DATA_DIR=/app/db

# Expõe a porta 5000 (padrão do Flask)
EXPOSE 5000

# Comando para iniciar o app
CMD ["python", "app.py"]