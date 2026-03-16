const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Armazenamento temporário em memória (para teste sem MongoDB)
let tempTickets = {};

// Gerar PIX para pagamento
router.post('/generate-pix', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone } = req.body;

    // Validações básicas
    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ 
        error: 'Nome, email e telefone são obrigatórios' 
      });
    }

    // Gerar ID único do ticket
    const ticketId = uuidv4();
    
    // Valor fixo do ingresso
    const amount = 15.00;
    
    // Dados PIX - configuráveis via .env
    const pixKey = process.env.PIX_CHAVE || '62999646263';
    const beneficiaryName = process.env.PIX_BENEFICIARIO || 'Copa Jovem';
    const city = process.env.PIX_CIDADE || 'Campo Grande';
    
    // Gerar código PIX (formato padrão brasileiro)
    const pixCode = generatePixCode({
      pixKey,
      beneficiaryName,
      city,
      amount,
      identifier: ticketId
    });

    // Gerar QR Code do PIX
    const pixQrCode = await QRCode.toDataURL(pixCode);

    // Criar ticket em memória (temporário)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
    tempTickets[ticketId] = {
      ticketId,
      customerName,
      customerEmail,
      customerPhone,
      price: amount,
      qrCode: '', // Será preenchido após confirmação do pagamento
      paymentStatus: 'pending',
      isUsed: false,
      usedAt: null,
      createdAt: new Date(),
      expiresAt
    };

    console.log('Ticket criado:', ticketId);

    res.json({
      ticketId,
      pixCode,
      pixQrCode,
      amount,
      customerName,
      expiresAt,
      message: 'PIX gerado com sucesso! Realize o pagamento para confirmar seu ingresso.'
    });

  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Confirmar pagamento PIX (simulação - em produção seria webhook do banco)
router.post('/confirm-payment', async (req, res) => {
  try {
    const { ticketId, transactionId } = req.body;

    if (!ticketId) {
      return res.status(400).json({ error: 'ID do ticket é obrigatório' });
    }

    const ticket = tempTickets[ticketId];
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    if (ticket.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Pagamento já confirmado' });
    }

    if (ticket.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Pagamento expirado' });
    }

    // Gerar QR Code do ingresso
    const ticketQrData = JSON.stringify({
      ticketId: ticket.ticketId,
      customerName: ticket.customerName,
      price: ticket.price,
      issuedAt: new Date().toISOString(),
      event: 'Copa Jovem'
    });

    const ticketQrCode = await QRCode.toDataURL(ticketQrData);

    // Atualizar status do ticket
    ticket.paymentStatus = 'paid';
    ticket.qrCode = ticketQrCode;

    console.log('Pagamento confirmado para:', ticketId);

    res.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        customerName: ticket.customerName,
        qrCode: ticketQrCode,
        price: ticket.price
      },
      message: 'Pagamento confirmado! Seu ingresso está pronto.'
    });

  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status do pagamento
router.get('/status/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = tempTickets[ticketId];
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    res.json({
      ticketId: ticket.ticketId,
      paymentStatus: ticket.paymentStatus,
      isExpired: ticket.expiresAt < new Date(),
      expiresAt: ticket.expiresAt
    });

  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Simulador de pagamento (para teste)
router.post('/simulate-payment/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Simular confirmação automática após 5 segundos
    setTimeout(async () => {
      const ticket = tempTickets[ticketId];
      if (ticket && ticket.paymentStatus === 'pending') {
        // Confirmar pagamento automaticamente
        const confirmRes = await fetch(`${req.protocol}://${req.get('host')}/api/payments/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, transactionId: 'SIM_' + Date.now() })
        });
        console.log('Pagamento simulado para:', ticketId);
      }
    }, 5000);

    res.json({ message: 'Simulação de pagamento iniciada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro na simulação' });
  }
});

// Função para gerar código PIX (padrão brasileiro)
function generatePixCode({ pixKey, beneficiaryName, city, amount, identifier }) {
  // Implementação simplificada do PIX EMV
  // Em produção, use uma biblioteca específica como pix-utils
  
  const formattedAmount = amount.toFixed(2);
  
  // Estrutura básica do código PIX
  let pixString = '';
  
  // Payload Format Indicator
  pixString += '000201';
  
  // Point of Initiation Method
  pixString += '010212';
  
  // Merchant Account Information
  pixString += '26' + (pixKey.length + 4).toString().padStart(2, '0');
  pixString += '0014BR.GOV.BCB.PIX01' + pixKey.length.toString().padStart(2, '0') + pixKey;
  
  // Merchant Category Code
  pixString += '52040000';
  
  // Transaction Currency (BRL)
  pixString += '5303986';
  
  // Transaction Amount
  pixString += '54' + formattedAmount.length.toString().padStart(2, '0') + formattedAmount;
  
  // Country Code
  pixString += '5802BR';
  
  // Merchant Name
  pixString += '59' + beneficiaryName.length.toString().padStart(2, '0') + beneficiaryName;
  
  // Merchant City
  pixString += '60' + city.length.toString().padStart(2, '0') + city;
  
  // Additional Data Field Template (Transaction ID)
  if (identifier) {
    pixString += '62' + (identifier.length + 4).toString().padStart(2, '0');
    pixString += '05' + identifier.length.toString().padStart(2, '0') + identifier;
  }
  
  // CRC16
  pixString += '6304';
  
  // Calcular CRC16 (implementação simplificada)
  const crc = calculateCRC16(pixString);
  pixString += crc.toString(16).toUpperCase().padStart(4, '0');
  
  return pixString;
}

// Função CRC16 simplificada para PIX
function calculateCRC16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
    }
  }
  
  return crc & 0xFFFF;
}

module.exports = router;