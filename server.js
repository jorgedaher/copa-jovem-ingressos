const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conectar ao MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/copa-jovem';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => {
  console.error('Erro ao conectar MongoDB:', err);
  // Continua funcionando mesmo sem MongoDB para desenvolvimento
});

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('Erro na conexão MongoDB:', err);
});
db.once('open', () => {
  console.log('✅ Conectado ao MongoDB');
});

// Tratamento de erro para produção
process.on('unhandledRejection', (err) => {
  console.log('Unhandled rejection:', err);
});

// Importar routes
const ticketRoutes = require('./routes/tickets');
const paymentRoutes = require('./routes/payments');
const validationRoutes = require('./routes/validation');

// Usar routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/validation', validationRoutes);

// Rota para servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/moderador', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'moderador.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});