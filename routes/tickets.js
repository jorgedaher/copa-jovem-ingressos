const express = require('express');

const router = express.Router();

// Buscar ticket por ID (usando dados do payments.js)
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Como estamos usando armazenamento temporário, vamos buscar nos dados do payments
    // Em produção, isso viria do MongoDB
    
    res.json({
      ticketId: ticketId,
      message: 'Para buscar ticket completo, use a API de payments'
    });

  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;