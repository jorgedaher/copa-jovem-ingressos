// Variáveis globais
let currentTicketId = null;
let paymentTimer = null;
let pixCode = '';

// Verificar se logo existe ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    const logoImg = document.getElementById('logoImg');
    const logoPlaceholder = document.getElementById('logoPlaceholder');
    
    // Tentar carregar a logo
    logoImg.onload = function() {
        logoImg.style.display = 'block';
        logoPlaceholder.style.display = 'none';
    };
    
    logoImg.onerror = function() {
        logoImg.style.display = 'none';
        logoPlaceholder.style.display = 'block';
    };
    
    // Máscara para telefone
    document.getElementById('phone').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 11) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 6) {
            value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
        } else if (value.length >= 2) {
            value = value.replace(/(\d{2})(\d+)/, '($1) $2');
        }
        e.target.value = value;
    });
});

// Formulário de compra
document.getElementById('ticketForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.replace(/\D/g, '');
    
    // Validações
    if (name.length < 3) {
        showError('Nome deve ter pelo menos 3 caracteres');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('E-mail inválido');
        return;
    }
    
    if (phone.length < 10) {
        showError('Telefone deve ter pelo menos 10 dígitos');
        return;
    }
    
    // Mostrar loading
    showSection('loadingSection');
    
    try {
        const response = await fetch('/api/payments/generate-pix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerName: name,
                customerEmail: email,
                customerPhone: phone
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao gerar PIX');
        }
        
        currentTicketId = data.ticketId;
        pixCode = data.pixCode;
        
        // Mostrar seção PIX
        document.getElementById('pixQrImage').src = data.pixQrCode;
        document.getElementById('pixCodeText').textContent = data.pixCode;
        
        showSection('pixSection');
        startPaymentTimer(30 * 60); // 30 minutos
        
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao gerar PIX: ' + error.message);
        showSection('formSection');
    }
});

// Timer de pagamento
function startPaymentTimer(seconds) {
    const timerElement = document.getElementById('paymentTimer');
    
    paymentTimer = setInterval(() => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        timerElement.textContent = `⏰ Tempo para pagamento: ${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        if (seconds <= 0) {
            clearInterval(paymentTimer);
            timerElement.textContent = '⏰ Tempo expirado';
            timerElement.style.color = '#dc3545';
            document.getElementById('checkBtn').disabled = true;
        }
        
        seconds--;
    }, 1000);
}

// Copiar código PIX
function copyPixCode() {
    navigator.clipboard.writeText(pixCode).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copiado!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = pixCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Copiado!';
        setTimeout(() => {
            btn.textContent = '📋 Copiar Código';
        }, 2000);
    });
}

// Verificar status do pagamento
async function checkPaymentStatus() {
    if (!currentTicketId) return;
    
    const checkBtn = document.getElementById('checkBtn');
    checkBtn.disabled = true;
    checkBtn.textContent = '🔄 Verificando...';
    
    try {
        const response = await fetch(`/api/payments/status/${currentTicketId}`);
        const data = await response.json();
        
        if (data.paymentStatus === 'paid') {
            // Buscar dados completos do ticket
            const ticketResponse = await fetch(`/api/tickets/${currentTicketId}`);
            const ticketData = await ticketResponse.json();
            
            // Mostrar sucesso
            document.getElementById('ticketCustomerName').textContent = ticketData.customerName;
            document.getElementById('ticketId').textContent = ticketData.ticketId;
            document.getElementById('ticketQrImage').src = ticketData.qrCode;
            
            clearInterval(paymentTimer);
            showSection('successSection');
            
        } else if (data.isExpired) {
            showError('Pagamento expirado. Gere um novo PIX.');
            clearInterval(paymentTimer);
            
        } else {
            showError('Pagamento ainda não confirmado. Tente novamente em alguns segundos.');
        }
        
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        showError('Erro ao verificar pagamento');
    }
    
    checkBtn.disabled = false;
    checkBtn.textContent = '🔄 Verificar Pagamento';
}

// Baixar ingresso
function downloadTicket() {
    const ticketQr = document.getElementById('ticketQrImage');
    const customerName = document.getElementById('ticketCustomerName').textContent;
    
    // Criar canvas para adicionar informações ao QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        canvas.width = 400;
        canvas.height = 500;
        
        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Título
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 28px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COPA JOVEM 2026', canvas.width/2, 50);
        
        // Nome
        ctx.font = '18px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText(customerName, canvas.width/2, 80);
        
        // QR Code
        ctx.drawImage(img, 100, 120, 200, 200);
        
        // Instruções
        ctx.font = '12px Arial';
        ctx.fillText('Apresente este QR Code na entrada', canvas.width/2, 360);
        ctx.fillText('Válido apenas uma vez', canvas.width/2, 380);
        ctx.fillText(`Ticket ID: ${currentTicketId}`, canvas.width/2, 420);
        ctx.fillText('Copa Jovem - Campeonato de Futebol', canvas.width/2, 460);
        
        // Download
        const link = document.createElement('a');
        link.download = `ingresso-copa-jovem-${currentTicketId}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };
    
    img.src = ticketQr.src;
}

// Novo ingresso
function newTicket() {
    currentTicketId = null;
    pixCode = '';
    clearInterval(paymentTimer);
    
    // Limpar formulário
    document.getElementById('ticketForm').reset();
    
    showSection('formSection');
}

// Funções auxiliares
function showSection(sectionId) {
    // Esconder todas as seções
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('pixSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'none';
    
    // Mostrar seção específica
    document.getElementById(sectionId).style.display = 'block';
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Auto verificação de pagamento a cada 10 segundos
setInterval(() => {
    if (currentTicketId && document.getElementById('pixSection').style.display === 'block') {
        checkPaymentStatus();
    }
}, 10000);