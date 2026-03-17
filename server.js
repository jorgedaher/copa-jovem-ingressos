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

// QR Code PIX customizado (você pode atualizar via /api/admin/update-pix-qr)
let customPixQR = null;

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
    const merchantName = 'JOAO PEDRO ZENDRON';
    const merchantCity = 'GOIANIA';
    const pixKey = '62999646263'; // Sua chave PIX
    
    // Formato EMV PIX correto
    let pixData = '';
    
    // Payload Format Indicator
    pixData += '000201';
    
    // Point of Initiation Method (01 = estático, 12 = dinâmico)
    pixData += '010211';
    
    // Merchant Account Information (26 = PIX)
    const pixKeyFormatted = `0014br.gov.bcb.pix01${pixKey.length.toString().padStart(2, '0')}${pixKey}`;
    pixData += `26${pixKeyFormatted.length.toString().padStart(2, '0')}${pixKeyFormatted}`;
    
    // Merchant Category Code
    pixData += '52040000';
    
    // Transaction Currency (986 = BRL)
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
    
    // Additional Data Field Template (txid)
    if (description) {
        const txid = description.replace(/\s+/g, '').substring(0, 25);
        const additionalInfo = `05${txid.length.toString().padStart(2, '0')}${txid}`;
        pixData += `62${additionalInfo.length.toString().padStart(2, '0')}${additionalInfo}`;
    }
    
    // CRC16 (deve ser calculado sem o CRC)
    const pixDataForCRC = pixData + '6304';
    const crcCode = crc16(pixDataForCRC);
    pixData += '6304' + crcCode;
    
    return pixData;
}

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função para enviar WhatsApp (usando API do WhatsApp Business)
async function sendWhatsApp(phone, message) {
    // Aqui você pode integrar com WhatsApp Business API
    // Por enquanto, apenas log para demonstração
    console.log(`WhatsApp para ${phone}: ${message}`);
    return { success: true };
}

// Função para enviar Email
async function sendEmail(email, subject, message) {
    // Aqui você pode integrar com SendGrid, Nodemailer, etc.
    // Por enquanto, apenas log para demonstração
    console.log(`Email para ${email}: ${subject}\n${message}`);
    return { success: true };
}

// Gerar QR Code do ticket
async function generateTicketQR(ticketData) {
    const ticketInfo = {
        id: ticketData.ticketId,
        nome: ticketData.customerName,
        evento: 'Copa Jovem 2026',
        valor: 'R$ 15,00',
        data: new Date().toISOString(),
        valido: true
    };
    
    const qrData = JSON.stringify(ticketInfo);
    return await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
            dark: '#1e40af',
            light: '#ffffff'
        }
    });
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
        
        // Usar QR Code PIX real fornecido ou gerar um novo
        let pixQrImagePath;
        try {
            // Verificar se o arquivo QR Code existe
            const fs = require('fs');
            const qrPath = path.join(__dirname, 'public', 'images', 'QRCODE.jpg');
            if (fs.existsSync(qrPath)) {
                pixQrImagePath = '/images/QRCODE.jpg';
            } else {
                // Fallback: gerar QR Code
                const qrCodeDataURL = await QRCode.toDataURL(pixCode, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });
                pixQrImagePath = qrCodeDataURL;
            }
        } catch (error) {
            // Em caso de erro, gerar QR Code
            const qrCodeDataURL = await QRCode.toDataURL(pixCode, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            pixQrImagePath = qrCodeDataURL;
        }
        
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
        payments.set(ticketId, { 
            status: 'pending', 
            createdAt: new Date(),
            pixCode: pixCode,
            amount: 15.00
        });
        
        // Aguardar confirmação REAL do pagamento
        // Remover simulação automática - agora depende de confirmação externa
        
        res.json({
            ticketId,
            pixCode,
            pixQrCode: pixQrImagePath,
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

// Confirmar pagamento PIX (rota para webhook ou confirmação manual)
app.post('/api/payments/confirm-payment/:ticketId', async (req, res) => {
    const { ticketId } = req.params;
    const { transactionId, amount } = req.body;
    
    const payment = payments.get(ticketId);
    if (!payment) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    if (payment.status === 'paid') {
        return res.json({ success: true, message: 'Pagamento já confirmado' });
    }
    
    // Confirmar pagamento
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.transactionId = transactionId;
    
    const ticket = tickets.get(ticketId);
    if (ticket) {
        ticket.status = 'paid';
        ticket.paidAt = new Date().toISOString();
        
        // Gerar QR Code do ingresso
        const ticketQRCode = await generateTicketQR(ticket);
        ticket.qrCode = ticketQRCode;
        
        // Enviar por WhatsApp
        const whatsappMessage = `🎫 *COPA JOVEM - INGRESSO CONFIRMADO*\n\n` +
                               `Olá ${ticket.customerName}!\n\n` +
                               `Seu pagamento foi confirmado!\n` +
                               `Valor: R$ 15,00\n` +
                               `Ticket ID: ${ticket.ticketId}\n\n` +
                               `⚠️ *IMPORTANTE:*\n` +
                               `• Apresente o QR Code na entrada\n` +
                               `• Válido apenas uma vez\n` +
                               `• Guarde bem este código\n\n` +
                               `Nos vemos na Copa Jovem! ⚽`;
        
        await sendWhatsApp(ticket.customerPhone, whatsappMessage);
        
        // Enviar por Email
        const emailMessage = `<h2>🎫 Copa Jovem - Ingresso Confirmado!</h2>\n` +
                            `<p><strong>Olá ${ticket.customerName}!</strong></p>\n` +
                            `<p>Seu pagamento foi confirmado com sucesso!</p>\n` +
                            `<ul>\n` +
                            `<li>Valor: R$ 15,00</li>\n` +
                            `<li>Ticket ID: ${ticket.ticketId}</li>\n` +
                            `<li>Data: ${new Date().toLocaleDateString('pt-BR')}</li>\n` +
                            `</ul>\n` +
                            `<h3>⚠️ IMPORTANTE:</h3>\n` +
                            `<ul>\n` +
                            `<li>Apresente o QR Code na entrada</li>\n` +
                            `<li>Válido apenas uma vez</li>\n` +
                            `<li>Guarde bem este código</li>\n` +
                            `</ul>\n` +
                            `<p>Nos vemos na Copa Jovem! ⚽</p>`;
        
        await sendEmail(ticket.customerEmail, 'Copa Jovem - Seu Ingresso', emailMessage);
    }
    
    res.json({ 
        success: true, 
        status: 'paid',
        ticketQRCode: ticket.qrCode
    });
});

// Rota para confirmação manual (para o organizador)
app.post('/api/admin/confirm-payment/:ticketId', async (req, res) => {
    return await app._router.handle({
        method: 'POST',
        url: `/api/payments/confirm-payment/${req.params.ticketId}`,
        body: req.body
    }, res);
});

// Webhook PIX (para integração com bancos)
app.post('/api/webhook/pix', async (req, res) => {
    try {
        // Aqui você processaria o webhook do seu provedor PIX
        const { pixKey, amount, transactionId, endToEndId } = req.body;
        
        // Encontrar pagamento correspondente
        for (const [ticketId, payment] of payments.entries()) {
            if (payment.status === 'pending' && 
                payment.pixCode && 
                payment.amount === amount) {
                
                // Confirmar pagamento
                await app._router.handle({
                    method: 'POST',
                    url: `/api/payments/confirm-payment/${ticketId}`,
                    body: { transactionId, amount }
                }, res);
                
                return;
            }
        }
        
        res.status(404).json({ error: 'Pagamento não encontrado' });
    } catch (error) {
        console.error('Erro no webhook PIX:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Buscar ticket
app.get('/api/tickets/:ticketId', async (req, res) => {
    const { ticketId } = req.params;
    
    const ticket = tickets.get(ticketId);
    if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    // Se o ticket foi pago mas não tem QR Code, gerar
    if (ticket.status === 'paid' && !ticket.qrCode) {
        ticket.qrCode = await generateTicketQR(ticket);
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

// Página do admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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

// Teste de imagem
app.get('/test-image', (req, res) => {
    const fs = require('fs');
    const imagePath = path.join(__dirname, 'public', 'images', 'logo.png');
    
    if (fs.existsSync(imagePath)) {
        const stats = fs.statSync(imagePath);
        res.json({
            exists: true,
            size: stats.size,
            path: '/images/logo.png'
        });
    } else {
        res.json({ exists: false });
    }
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