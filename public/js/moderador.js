// Variáveis globais
let video = null;
let canvas = null;
let context = null;
let scanning = false;
let currentStream = null;
let cameras = [];
let currentCameraIndex = 0;
let validationLog = [];
let stats = {
    totalValidated: 0,
    totalInvalid: 0,
    totalDuplicated: 0,
    totalRevenue: 0
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    
    // Verificar se logo existe
    const logoImg = document.getElementById('logoImg');
    const logoPlaceholder = document.getElementById('logoPlaceholder');
    
    logoImg.onload = function() {
        logoImg.style.display = 'block';
        logoPlaceholder.style.display = 'none';
    };
    
    logoImg.onerror = function() {
        logoImg.style.display = 'none';
        logoPlaceholder.style.display = 'block';
    };
    
    // Detectar câmeras disponíveis
    detectCameras();
    
    // Atualizar estatísticas
    updateStats();
});

// Detectar câmeras disponíveis
async function detectCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras = devices.filter(device => device.kind === 'videoinput');
        
        if (cameras.length > 1) {
            document.getElementById('switchCameraBtn').style.display = 'inline-block';
        }
        
        console.log(`${cameras.length} câmera(s) detectada(s)`);
    } catch (error) {
        console.error('Erro ao detectar câmeras:', error);
    }
}

// Iniciar câmera
async function startCamera() {
    try {
        if (currentStream) {
            stopCamera();
        }
        
        const constraints = {
            video: {
                facingMode: cameras.length > 0 ? undefined : 'environment',
                deviceId: cameras.length > 0 ? cameras[currentCameraIndex].deviceId : undefined,
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            startScanning();
        };
        
        // Atualizar botões
        document.getElementById('startScanBtn').style.display = 'none';
        document.getElementById('stopScanBtn').style.display = 'inline-block';
        if (cameras.length > 1) {
            document.getElementById('switchCameraBtn').style.display = 'inline-block';
        }
        
        updateSystemStatus('🟢 Câmera ativa');
        
    } catch (error) {
        console.error('Erro ao iniciar câmera:', error);
        alert('Erro ao acessar a câmera. Verifique as permissões.');
        updateSystemStatus('🔴 Erro na câmera');
    }
}

// Parar câmera
function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    video.srcObject = null;
    scanning = false;
    
    // Atualizar botões
    document.getElementById('startScanBtn').style.display = 'inline-block';
    document.getElementById('stopScanBtn').style.display = 'none';
    document.getElementById('switchCameraBtn').style.display = 'none';
    
    updateSystemStatus('🟢 Online');
}

// Trocar câmera
function switchCamera() {
    if (cameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        startCamera();
    }
}

// Iniciar escaneamento
function startScanning() {
    scanning = true;
    requestAnimationFrame(scanQRCode);
}

// Escanear QR Code
function scanQRCode() {
    if (!scanning || !video.videoWidth || !video.videoHeight) {
        if (scanning) {
            requestAnimationFrame(scanQRCode);
        }
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
        console.log('QR Code detectado:', code.data);
        processQRCode(code.data);
        return; // Para de escanear após detectar um código
    }
    
    if (scanning) {
        requestAnimationFrame(scanQRCode);
    }
}

// Upload de QR Code
function uploadQrCode(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const tempCanvas = document.createElement('canvas');
            const tempContext = tempCanvas.getContext('2d');
            
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            tempContext.drawImage(img, 0, 0);
            
            const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                processQRCode(code.data);
            } else {
                showResult({
                    icon: '❌',
                    title: 'QR Code não detectado',
                    message: 'Não foi possível ler o QR Code da imagem.',
                    type: 'invalid'
                });
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Limpar input
    event.target.value = '';
}

// Processar QR Code
async function processQRCode(qrData) {
    showResult({
        icon: '⏳',
        title: 'Validando ingresso...',
        message: 'Aguarde a verificação.',
        type: 'processing'
    });
    
    try {
        const response = await fetch('/api/validation/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrData })
        });
        
        const data = await response.json();
        
        if (data.isValid) {
            // Ingresso válido
            showResult({
                icon: '✅',
                title: 'Ingresso Válido!',
                message: 'Entrada liberada.',
                type: 'valid',
                ticketData: data.ticket
            });
            
            stats.totalValidated++;
            stats.totalRevenue += data.ticket.price;
            
            addToLog({
                type: 'valid',
                customer: data.ticket.customerName,
                ticketId: data.ticket.ticketId,
                time: new Date()
            });
            
        } else {
            // Ingresso inválido
            let resultType = 'invalid';
            let icon = '❌';
            let title = 'Ingresso Inválido';
            
            if (data.error.includes('já foi utilizado')) {
                resultType = 'used';
                icon = '⚠️';
                title = 'Ingresso Já Utilizado';
                stats.totalDuplicated++;
            } else {
                stats.totalInvalid++;
            }
            
            showResult({
                icon,
                title,
                message: data.error,
                type: resultType
            });
            
            addToLog({
                type: resultType,
                error: data.error,
                time: new Date()
            });
        }
        
        updateStats();
        
    } catch (error) {
        console.error('Erro ao validar ingresso:', error);
        showResult({
            icon: '❌',
            title: 'Erro de Sistema',
            message: 'Não foi possível validar o ingresso. Tente novamente.',
            type: 'invalid'
        });
    }
    
    // Pausar escaneamento por 3 segundos
    scanning = false;
    setTimeout(() => {
        if (currentStream) {
            startScanning();
        }
    }, 3000);
}

// Mostrar resultado
function showResult(result) {
    const resultSection = document.getElementById('resultSection');
    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const ticketInfo = document.getElementById('ticketInfo');
    
    // Limpar classes anteriores
    resultCard.className = 'card result-card';
    
    // Definir conteúdo
    resultIcon.textContent = result.icon;
    resultTitle.textContent = result.title;
    resultMessage.textContent = result.message;
    
    // Aplicar estilo baseado no tipo
    resultCard.classList.add(`result-${result.type}`);
    
    // Mostrar informações do ticket se disponível
    if (result.ticketData) {
        document.getElementById('customerName').textContent = result.ticketData.customerName;
        document.getElementById('ticketId').textContent = result.ticketData.ticketId;
        document.getElementById('ticketPrice').textContent = `R$ ${result.ticketData.price.toFixed(2)}`;
        document.getElementById('validatedAt').textContent = new Date(result.ticketData.usedAt).toLocaleString('pt-BR');
        ticketInfo.style.display = 'block';
    } else {
        ticketInfo.style.display = 'none';
    }
    
    resultSection.style.display = 'block';
    
    // Auto-ocultar após 5 segundos para resultados inválidos
    if (result.type === 'invalid' || result.type === 'used') {
        setTimeout(() => {
            resultSection.style.display = 'none';
        }, 5000);
    }
}

// Atualizar status do sistema
function updateSystemStatus(status) {
    document.getElementById('systemStatus').textContent = status;
}

// Adicionar ao log
function addToLog(entry) {
    validationLog.unshift(entry);
    
    // Manter apenas as últimas 50 entradas
    if (validationLog.length > 50) {
        validationLog.pop();
    }
    
    updateLogDisplay();
}

// Atualizar display do log
function updateLogDisplay() {
    const logContainer = document.getElementById('logContainer');
    
    if (validationLog.length === 0) {
        logContainer.innerHTML = '<div class="log-empty">Nenhuma validação registrada</div>';
        return;
    }
    
    const logHtml = validationLog.map(entry => {
        const time = entry.time.toLocaleTimeString('pt-BR');
        let statusClass = '';
        let statusText = '';
        let details = '';
        
        switch (entry.type) {
            case 'valid':
                statusClass = 'success';
                statusText = '✅ Válido';
                details = `${entry.customer} - ${entry.ticketId}`;
                break;
            case 'used':
                statusClass = 'warning';
                statusText = '⚠️ Usado';
                details = entry.error;
                break;
            case 'invalid':
                statusClass = 'error';
                statusText = '❌ Inválido';
                details = entry.error;
                break;
        }
        
        return `
            <div class="log-item">
                <div>
                    <span class="${statusClass}">${statusText}</span>
                    <br>
                    <small>${details}</small>
                </div>
                <div class="log-time">${time}</div>
            </div>
        `;
    }).join('');
    
    logContainer.innerHTML = logHtml;
}

// Limpar log
function clearLog() {
    if (confirm('Deseja realmente limpar o log de validações?')) {
        validationLog = [];
        updateLogDisplay();
    }
}

// Exportar log
function exportLog() {
    if (validationLog.length === 0) {
        alert('Nenhum dado para exportar');
        return;
    }
    
    const csvData = [
        ['Hora', 'Tipo', 'Cliente', 'Ticket ID', 'Erro/Observação'],
        ...validationLog.map(entry => [
            entry.time.toLocaleString('pt-BR'),
            entry.type,
            entry.customer || '',
            entry.ticketId || '',
            entry.error || ''
        ])
    ];
    
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `copa-jovem-validacoes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Atualizar estatísticas
function updateStats() {
    document.getElementById('validatedCount').textContent = stats.totalValidated;
    document.getElementById('totalValidated').textContent = stats.totalValidated;
    document.getElementById('totalInvalid').textContent = stats.totalInvalid;
    document.getElementById('totalDuplicated').textContent = stats.totalDuplicated;
    document.getElementById('totalRevenue').textContent = `R$ ${stats.totalRevenue.toFixed(2)}`;
}

// Atalhos de teclado
document.addEventListener('keydown', function(e) {
    switch(e.key) {
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (!currentStream) {
                startCamera();
            }
            break;
        case 'Escape':
            e.preventDefault();
            if (currentStream) {
                stopCamera();
            }
            break;
        case 'c':
        case 'C':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (cameras.length > 1) {
                    switchCamera();
                }
            }
            break;
    }
});

// Detectar visibilidade da página
document.addEventListener('visibilitychange', function() {
    if (document.hidden && currentStream) {
        scanning = false;
    } else if (!document.hidden && currentStream) {
        startScanning();
    }
});