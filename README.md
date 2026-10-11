# Painel de Metas de Vendas

Painel web para acompanhar, **durante o mês**, se a equipe de vendas vai bater a meta.

> Todos os dados deste repositório são **fictícios**. Os consultores ("Ana Exemplo", "Bruno Fictício"...) e os valores são gerados pelo script `seed_demo.py`.

## O problema

As vendas eram lançadas em planilhas e o resultado só aparecia no fechamento. No meio do mês ninguém sabia responder com segurança:

- Já batemos quanto da meta?
- Quanto falta?
- Quanto precisamos vender **por dia útil** daqui até o fim do mês?
- No ritmo atual, vamos chegar lá?

Este painel responde essas perguntas em tempo real, para a equipe toda e para cada consultor.

## O que o painel mostra

- **Atingimento (%)**: quanto da meta do mês já foi realizado.
- **Quanto falta (gap)**: valor que ainda precisa ser vendido.
- **Meta diária necessária**: quanto vender por dia útil restante para fechar a meta.
- **Ritmo / pace**: compara a % da meta atingida com a % do mês já passada, com farol verde, amarelo ou vermelho.
- **Projeção de fechamento**: como o mês termina se o ritmo atual for mantido.
- Ranking de consultores, funil por status da venda e evolução diária.
- Cadastro de vendas, metas mensais por faixa de premiação e metas semestrais.
- Controle de usuários com perfis (admin, editor, consultor): o consultor vê apenas os próprios números.
- Log de ações, backup dos bancos e exportação/importação em Excel.

Os cálculos ficam isolados em `core/calculos.py` (funções simples e testáveis).

## Stack

- **Backend:** Python 3, Flask, Flask-Login, SQLite
- **Frontend:** HTML (Jinja2), CSS, JavaScript, Chart.js, SweetAlert2, jsPDF
- **Planilhas:** openpyxl
- **Deploy:** Docker / Docker Compose

## Como rodar localmente

```bash
python -m venv venv
source venv/bin/activate        # no Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edite os valores
export $(grep -v '^#' .env | xargs)   # carrega as variáveis (Linux/macOS)

python seed_demo.py             # cria os bancos e preenche com dados fictícios
python app.py                   # abre em http://localhost:5000
```

Entre com o usuário definido em `ADMIN_USUARIO` / `ADMIN_SENHA`. Os consultores de demonstração usam a senha de `DEMO_SENHA` (se não for definida, o `seed_demo.py` gera uma e mostra no terminal).

As tabelas do SQLite são criadas automaticamente e vazias na primeira execução. Se `ADMIN_SENHA` não estiver definida, uma senha aleatória para o admin é gerada e exibida uma única vez no terminal.

## Como rodar com Docker

```bash
cp .env.example .env            # edite os valores
docker compose up -d --build
docker compose exec painel-metas python seed_demo.py   # opcional: dados de demonstração
```

Acesse http://localhost:5000. Os bancos ficam na pasta `data_db/` (volume), fora da imagem.

## Variáveis de ambiente

| Variável        | Para que serve                                                   |
|-----------------|------------------------------------------------------------------|
| `SECRET_KEY`    | Chave de sessão do Flask                                         |
| `ADMIN_USUARIO` | Login do administrador inicial (padrão: `admin`)                 |
| `ADMIN_SENHA`   | Senha do administrador inicial                                   |
| `SENHA_PADRAO`  | Senha aplicada ao criar usuário sem senha ou ao resetar senha    |
| `DEMO_SENHA`    | Senha dos consultores fictícios criados pelo `seed_demo.py`      |
| `DATA_DIR`      | Pasta dos arquivos `.db` (padrão: pasta do projeto)              |

## Licença

MIT. Veja [LICENSE](LICENSE).
