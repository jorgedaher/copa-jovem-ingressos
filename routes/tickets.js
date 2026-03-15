const express = require('express');
const Ticket = require('../models/Ticket');

const router = express.Router();

// Criar novo ticket (rota básica)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone } = req.body;

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ 
        error: 'Nome, email e telefone são obrigatórios' 
      });
    }

    res.redirect(307, '/api/payments/generate-pix');
    
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar ticket por ID
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findOne({ ticketId });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    res.json({
      ticketId: ticket.ticketId,
      customerName: ticket.customerName,
      price: ticket.price,
      paymentStatus: ticket.paymentStatus,
      isUsed: ticket.isUsed,
      qrCode: ticket.paymentStatus === 'paid' ? ticket.qrCode : null,
      createdAt: ticket.createdAt
    });

  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;