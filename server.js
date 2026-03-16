const express = require('express');
const path = require('path');
const QRCode = require('qrcode');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Armazenamento em memória para demonstração
const tickets = new Map();
const payments = new Map();

// Função para calcular CRC16 (para PIX)
function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >> 1) ^ 0x8408;
            } else {
                crc = crc >> 1;
            }
        }
    }
    crc = (~crc) & 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Gerar código PIX
function generatePixCode(amount = 15.00, description = 'Copa Jovem Ingresso') {
    const merchantName = 'RAFAEL SILVA';
    const merchantCity = 'GOIANIA';
    const pixKey = '62999646263'; // Sua chave PIX
    
    // Formato EMV PIX
    let pixData = '';
    
    // Payload Format Indicator
    pixData += '000201';
    
    // Point of Initiation Method
    pixData += '010212';
    
    // Merchant Account Information
    const merchantInfo = `0014br.gov.bcb.pix01${pixKey.length.toString().padStart(2, '0')}${pixKey}`;
    pixData += `26${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`;
    
    // Merchant Category Code
    pixData += '52040000';
    
    // Transaction Currency
    pixData += '5303986';
    
    // Transaction Amount
    const amountStr = amount.toFixed(2);
    pixData += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
    
    // Country Code
    pixData += '5802BR';
    
    // Merchant Name
    pixData += `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`;
    
    // Merchant City
    pixData += `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`;
    
    // Additional Data Field Template
    if (description) {
        const additionalInfo = `05${description.length.toString().padStart(2, '0')}${description}`;
        pixData += `62${additionalInfo.length.toString().padStart(2, '0')}${additionalInfo}`;
    }
    
    // CRC16
    pixData += '6304';
    const crcCode = crc16(pixData);
    pixData += crcCode;
    
    return pixData;
}

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Rota para gerar PIX
app.post('/api/payments/generate-pix', async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone } = req.body;
        
        if (!customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }
        
        const ticketId = generateId();
        const pixCode = generatePixCode(15.00, `Copa Jovem ${ticketId.substr(-6)}`);
        
        // Gerar QR Code
        const qrCodeDataURL = await QRCode.toDataURL(pixCode, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        
        // Salvar ticket
        const ticket = {
            ticketId,
            customerName,
            customerEmail,
            customerPhone,
            amount: 15.00,
            pixCode,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        tickets.set(ticketId, ticket);
        payments.set(ticketId, { status: 'pending', createdAt: new Date() });
        
        // Simular pagamento após 15 segundos
        setTimeout(() => {
            const payment = payments.get(ticketId);
            if (payment && payment.status === 'pending') {
                payment.status = 'paid';
                payment.paidAt = new Date();
                
                const ticketData = tickets.get(ticketId);
                if (ticketData) {
                    ticketData.status = 'paid';
                    ticketData.paidAt = new Date().toISOString();
                }
            }
        }, 15000);
        
        res.json({
            ticketId,
            pixCode,
            pixQrCode: qrCodeDataURL,
            customerName,
            amount: 15.00
        });
        
    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar status do pagamento
app.get('/api/payments/status/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    
    const payment = payments.get(ticketId);
    if (!payment) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    res.json({
        ticketId,
        paymentStatus: payment.status,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt || null
    });
});

// Simular pagamento (para testes)
app.post('/api/payments/simulate-payment/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    
    const payment = payments.get(ticketId);
    if (!payment) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    payment.status = 'paid';
    payment.paidAt = new Date();
    
    const ticket = tickets.get(ticketId);
    if (ticket) {
        ticket.status = 'paid';
        ticket.paidAt = new Date().toISOString();
    }
    
    res.json({ success: true, status: 'paid' });
});

// Buscar ticket
app.get('/api/tickets/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    
    const ticket = tickets.get(ticketId);
    if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    res.json(ticket);
});

// Validar ticket (para moderador)
app.post('/api/tickets/validate/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    
    const ticket = tickets.get(ticketId);
    if (!ticket) {
        return res.status(404).json({ 
            valid: false, 
            error: 'Ticket não encontrado' 
        });
    }
    
    if (ticket.status !== 'paid') {
        return res.json({ 
            valid: false, 
            error: 'Ticket não foi pago' 
        });
    }
    
    if (ticket.used) {
        return res.json({ 
            valid: false, 
            error: 'Ticket já foi usado' 
        });
    }
    
    // Marcar como usado
    ticket.used = true;
    ticket.usedAt = new Date().toISOString();
    
    res.json({ 
        valid: true, 
        customer: ticket.customerName,
        ticketId: ticket.ticketId,
        usedAt: ticket.usedAt
    });
});

// Listar tickets (para moderador)
app.get('/api/admin/tickets', (req, res) => {
    const ticketList = Array.from(tickets.values()).map(ticket => ({
        ticketId: ticket.ticketId,
        customerName: ticket.customerName,
        customerEmail: ticket.customerEmail,
        amount: ticket.amount,
        status: ticket.status,
        used: ticket.used || false,
        createdAt: ticket.createdAt,
        paidAt: ticket.paidAt,
        usedAt: ticket.usedAt
    }));
    
    res.json({
        total: ticketList.length,
        paid: ticketList.filter(t => t.status === 'paid').length,
        used: ticketList.filter(t => t.used).length,
        tickets: ticketList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
});

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página do moderador
app.get('/moderador', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'moderador.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        tickets: tickets.size,
        payments: payments.size
    });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Middleware 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log(`PIX configurado para: 62999646263`);
});

module.exports = app;