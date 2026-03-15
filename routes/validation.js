const express = require('express');
const Ticket = require('../models/Ticket');

const router = express.Router();

// Validar ingresso por QR Code
router.post('/validate', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ 
        error: 'Dados do QR Code são obrigatórios' 
      });
    }

    let ticketData;
    try {
      ticketData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ 
        error: 'QR Code inválido - formato incorreto' 
      });
    }

    const { ticketId } = ticketData;

    if (!ticketId) {
      return res.status(400).json({ 
        error: 'QR Code inválido - ID do ticket não encontrado' 
      });
    }

    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({ 
        error: 'Ingresso não encontrado',
        isValid: false 
      });
    }

    // Verificar se o pagamento foi confirmado
    if (ticket.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        error: 'Ingresso não pago',
        isValid: false,
        status: ticket.paymentStatus
      });
    }

    // Verificar se já foi usado
    if (ticket.isUsed) {
      return res.status(400).json({ 
        error: 'Ingresso já foi utilizado',
        isValid: false,
        usedAt: ticket.usedAt
      });
    }

    // Marcar como usado
    ticket.isUsed = true;
    ticket.usedAt = new Date();
    await ticket.save();

    res.json({
      isValid: true,
      message: 'Ingresso válido! Entrada liberada.',
      ticket: {
        customerName: ticket.customerName,
        ticketId: ticket.ticketId,
        price: ticket.price,
        usedAt: ticket.usedAt
      }
    });

  } catch (error) {
    console.error('Erro ao validar ingresso:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      isValid: false 
    });
  }
});

// Verificar status do ingresso sem marcar como usado
router.post('/check', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'Dados do QR Code são obrigatórios' });
    }

    let ticketData;
    try {
      ticketData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ error: 'QR Code inválido' });
    }

    const { ticketId } = ticketData;
    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({ 
        error: 'Ingresso não encontrado',
        isValid: false 
      });
    }

    res.json({
      ticketId: ticket.ticketId,
      customerName: ticket.customerName,
      paymentStatus: ticket.paymentStatus,
      isUsed: ticket.isUsed,
      usedAt: ticket.usedAt,
      isValid: ticket.paymentStatus === 'paid' && !ticket.isUsed
    });

  } catch (error) {
    console.error('Erro ao verificar ingresso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;