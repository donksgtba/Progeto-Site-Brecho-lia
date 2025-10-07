# LIA BRECHÓ

Site de brechó online com frontend estático e backend em Node.js + Express + SQLite. Layout e paleta seguindo as telas fornecidas.

## Requisitos
- Node.js 18+

## Instalação
```bash
npm install
```

## Executar
```bash
npm start
```
Abra: http://localhost:3000

## Área Administrativa
- Login: http://localhost:3000/login
- Usuário admin padrão: `admin@liabrecho.com`
- Senha: `admin123`

Após o login você será redirecionado para `/admin` onde é possível cadastrar, listar e excluir produtos. Categorias iniciais: Calças, Blusas, Vestidos, Sapatos, Acessórios.

## Proprietário (programador)
- Painel: http://localhost:3000/owner
- Senha padrão do proprietário: `owner123` (altere via painel ou variável de ambiente `OWNER_PASSWORD`)
- Ajustes disponíveis: status do site (`ativo`, `trial`, `inadimplente`, `vitalicio`) e WhatsApp de suporte (usado no botão flutuante das páginas e nas mensagens de bloqueio).

Quando o status estiver como `inadimplente`, a vitrine da Home exibirá um overlay de bloqueio com link para WhatsApp.

## API (resumo)
- `POST /api/auth/login` { email, password }
- `POST /api/owner/login` { password }
- `GET /api/settings` (público)
- `PUT /api/settings` (Bearer token do owner)
- `GET /api/categories`
- `POST /api/categories` (Bearer token)
- `GET /api/products?categoryId=<id>`
- `POST /api/products` (Bearer token)
- `PUT /api/products/:id` (Bearer token)
- `DELETE /api/products/:id` (Bearer token)

## Observações
- Banco: arquivo `lia_brecho.json` (LowDB) criado automaticamente ao iniciar.
- Cores e tipografia foram ajustadas para o visual das imagens (fundo rosa queimado e elementos em creme). Se quiser ajustar tons exatos, edite as variáveis CSS em `public/styles.css`.
- Botão de WhatsApp flutuante aparece em todas as páginas públicas e administrativas. Edite o número no painel do proprietário.

## Deploy gratuito (Render)
Você pode hospedar o backend+frontend no mesmo serviço gratuito.

1. Crie um repositório Git e envie os arquivos do projeto.
2. Acesse https://render.com, crie uma conta e clique em "New +" > "Web Service".
3. Conecte seu GitHub e selecione o repositório do projeto.
4. Configure:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: adicione `OWNER_PASSWORD` (opcional para definir uma senha do proprietário diferente de `owner123`).
5. Deploy. Após subir, Render fornecerá uma URL pública (ex: `https://lia-brecho.onrender.com`).

Rotas públicas na nuvem:
- Home: `/`
- Login admin: `/login`
- Admin: `/admin`
- Proprietário: `/owner`

## Teste rápido
1. Inicie o servidor: `npm start`
2. Acesse a home e veja as categorias e cards de produtos.
3. Faça login em `/login` com as credenciais acima.
4. Cadastre um novo item na área administrativa e verifique-o na home.
