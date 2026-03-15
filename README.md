# 🏆 Copa Jovem - Sistema de Ingressos

Sistema completo de venda de ingressos via PIX com validação por QR Code para o campeonato de futebol **Copa Jovem**.

## 🎯 Funcionalidades

### 🎫 Para Compradores
- **Compra online** com formulário simples
- **Pagamento via PIX** (R$ 15,00 por ingresso)
- **QR Code PIX** gerado automaticamente
- **Ingresso digital** com QR Code único
- **Download do ingresso** em PNG
- **Timer de pagamento** (30 minutos)

### 📱 Para Moderadores
- **Scanner de QR Code** em tempo real
- **Validação instantânea** de ingressos
- **Prevenção de entrada dupla**
- **Log completo** de validações
- **Estatísticas em tempo real**
- **Exportação de dados** para CSV
- **Múltiplas câmeras** suportadas

## 🛠️ Tecnologias

- **Backend:** Node.js, Express.js
- **Banco de dados:** MongoDB
- **Frontend:** HTML5, CSS3, JavaScript
- **QR Code:** jsQR, qrcode
- **Pagamentos:** PIX (padrão brasileiro)

## 🚀 Instalação

### Pré-requisitos

- Node.js 16+ 
- MongoDB (local ou MongoDB Atlas)
- Git

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd SITECOPA
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/copa-jovem

# Servidor
PORT=3000

# Configurações PIX
PIX_CHAVE=62999646263
PIX_BENEFICIARIO=Copa Jovem
PIX_CIDADE=Campo Grande

# Segurança
JWT_SECRET=sua_chave_secreta_super_segura_aqui

# Ambiente
NODE_ENV=development
```

### 4. Adicione a logo

Coloque o arquivo `logo.png` na pasta `public/images/`

### 5. Inicie o MongoDB

**MongoDB local:**
```bash
mongod
```

**Ou use MongoDB Atlas** (nuvem) - configure a URL no `.env`

### 6. Execute o sistema

```bash
# Desenvolvimento (com auto-restart)
npm run dev

# Produção
npm start
```

## 🌐 Acesso

### Compradores (Clientes)
```
http://localhost:3000
```

### Moderadores (Validação)
```
http://localhost:3000/moderador
```

## 📖 Como Usar

### 💳 Compra de Ingressos

1. Acesse `http://localhost:3000`
2. Preencha **nome, email e telefone**
3. Clique em "Comprar Ingresso via PIX"
4. **Escaneie o QR Code** ou copie o código PIX
5. Realize o pagamento no seu banco (R$ 15,00)
6. Clique em "Verificar Pagamento"
7. **Download do ingresso** com QR Code

### 🔍 Validação no Evento

1. Acesse `http://localhost:3000/moderador`
2. Clique em **"Iniciar Câmera"**
3. **Aponte a câmera** para o QR Code do ingresso
4. Sistema valida automaticamente:
   - ✅ **Verde:** Ingresso válido (entrada liberada)
   - ❌ **Vermelho:** Ingresso inválido
   - ⚠️ **Amarelo:** Ingresso já usado

### 📊 Funcionalidades do Moderador

- **Log completo:** Histórico de todas as validações
- **Estatísticas:** Ingressos válidos, inválidos, duplicados
- **Exportar dados:** Download do relatório em CSV
- **Múltiplas câmeras:** Troca entre câmeras disponíveis
- **Upload manual:** Validação por foto do QR Code

## ⚙️ API Endpoints

### Pagamentos
```
POST /api/payments/generate-pix    # Gerar PIX
POST /api/payments/confirm-payment # Confirmar pagamento
GET  /api/payments/status/:id      # Status do pagamento
```

### Ingressos
```
POST /api/tickets/                 # Criar ingresso
GET  /api/tickets/:id             # Buscar ingresso
```

### Validação
```
POST /api/validation/validate     # Validar ingresso
POST /api/validation/check        # Verificar status
```

## 🔧 Configuração do PIX

O sistema usa o **padrão PIX brasileiro** (EMV). Configure no `.env`:

```env
PIX_CHAVE=62999646263              # Sua chave PIX
PIX_BENEFICIARIO=Copa Jovem        # Nome do beneficiário
PIX_CIDADE=Campo Grande            # Cidade
```

**Tipos de chave PIX aceitos:**
- CPF/CNPJ
- E-mail
- Telefone
- Chave aleatória

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Dispositivos
- **Desktop:** Windows, macOS, Linux
- **Mobile:** iOS 11+, Android 7+
- **Tablets:** iPadOS, Android tablets

### Câmeras
- **Webcam** integrada ou USB
- **Smartphone** (câmeras frontal/traseira)
- **Tablet** (câmeras integradas)

## 🛡️ Segurança

- **Validação dupla:** Backend + Frontend
- **Tokens únicos:** UUID para cada ingresso
- **Prevenção de fraude:** QR Codes criptografados
- **Log auditável:** Todas as operações registradas
- **Timeout de pagamento:** 30 minutos para evitar abusos

## 📊 Estrutura do Banco

### Collection: tickets
```javascript
{
  ticketId: String,      // UUID único
  customerName: String,  // Nome do comprador
  customerEmail: String, // E-mail
  customerPhone: String, // Telefone
  price: Number,         // Preço (15.00)
  qrCode: String,       // QR Code do ingresso
  paymentStatus: String, // pending|paid|expired
  isUsed: Boolean,      // Se foi usado na entrada
  usedAt: Date,         // Quando foi usado
  createdAt: Date,      // Data de criação
  expiresAt: Date       // Expiração do pagamento
}
```

## 🔄 Scripts NPM

```bash
npm start          # Iniciar em produção
npm run dev        # Desenvolvimento (nodemon)
npm test          # Executar testes (futuro)
```

## 📂 Estrutura do Projeto

```
SITECOPA/
├── models/           # Modelos do banco (Mongoose)
├── routes/           # Rotas da API
├── public/           # Frontend
│   ├── css/         # Estilos
│   ├── js/          # JavaScript
│   ├── images/      # Logo e imagens
│   ├── index.html   # Página de compra
│   └── moderador.html # Painel do moderador
├── server.js         # Servidor principal
├── package.json      # Dependências
├── .env             # Configurações
└── README.md        # Documentação
```

## 🆘 Solução de Problemas

### MongoDB não conecta
```bash
# Verificar se MongoDB está rodando
mongosh
# ou
mongo
```

### Câmera não funciona
- Verificar **permissões do navegador**
- Usar **HTTPS** em produção
- Testar em **diferentes navegadores**

### PIX não gera
- Verificar **chave PIX** no `.env`
- Confirmar **formato da chave**
- Testar **conexão com internet**

### Pagamento não confirma
- **Simulação:** Use `/api/payments/confirm-payment`
- Em produção: Integrar **webhook do banco**

## 🚀 Deploy em Produção

### 1. Servidor (Ubuntu/CentOS)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar projeto
git clone <repositorio>
cd SITECOPA

# Instalar dependências
npm install --production

# Configurar PM2
sudo npm install -g pm2
pm2 start server.js --name "copa-jovem"
pm2 startup
pm2 save
```

### 2. MongoDB Atlas (Nuvem)

1. Criar conta no [MongoDB Atlas](https://cloud.mongodb.com)
2. Criar cluster gratuito
3. Obter string de conexão
4. Configurar no `.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/copa-jovem
```

### 3. HTTPS (Nginx)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📞 Suporte

Para dúvidas ou problemas:

1. **Issues:** Abra uma issue no GitHub
2. **E-mail:** contato@copajovem.com
3. **WhatsApp:** (62) 98401-6464 (Rafael)

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

---

**Copa Jovem** - Campeonato de Futebol
Desenvolvido com ❤️ para a comunidade esportiva