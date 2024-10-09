const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Kamera pozisyonu
camera.position.z = 700; // Dünyadan biraz uzaklaştır

const dataMonitor = document.getElementById('data-monitor'); // Veri monitörü
const progressBar = document.getElementById('progress-bar'); // İlerleme çubuğu
const loadingMessage = document.getElementById('loading-message'); // Yükleme sonucunu göstermek için
const processingMonitor = document.getElementById('processing-monitor'); // İşleme monitörü
const dataOutput = document.getElementById('data-output'); // Koordinatları gösterecek monitör

async function loadOEMFiles(filePaths) {
    const allPositions = [];
    const totalFiles = filePaths.length;

    // Göster Loading
    document.getElementById('loading').style.display = 'block';

    for (let i = 0; i < totalFiles; i++) {
        const filePath = filePaths[i];
        try {
            const response = await fetch(filePath);
            const text = await response.text();
            console.log(`Loaded file: ${filePath}\nContent:\n${text}`);  // Log file content for debugging
            
            // Yükleme logunu güncelle
            dataMonitor.innerText = `Loading ${filePath}...`;

            const positions = parseOEMData(text);

            if (positions && positions.length > 0) {
                allPositions.push(...positions);
                console.log(`${filePath}: ${positions.length} positions found`);
                dataMonitor.innerText = `Loaded ${positions.length} positions from ${filePath}`; // Güncelle

                // İşleme monitörünü güncelle
                processingMonitor.innerText += `\nProcessed ${positions.length} positions from ${filePath}`; 

                // Koordinatları güncelle
                updateDataOutput(positions);
            } else {
                console.warn(`${filePath}: No valid positions found`);
                dataMonitor.innerText += `\n${filePath}: No valid positions found`;
            }
        } catch (error) {
            console.error(`Failed to load ${filePath}:`, error);
            dataMonitor.innerText += `\nFailed to load ${filePath}: ${error.message}`;
        }

        // Progress bar update
        const progressPercentage = ((i + 1) / totalFiles) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }

    // Yükleme tamamlandığında loading mesajını gizle
    document.getElementById('loading').style.display = 'none';

    // Yükleme sonucunu göster
    loadingMessage.innerText = `${totalFiles} files loaded successfully!`; 

    return allPositions;
}

function updateDataOutput(positions) {
    // Son üç pozisyonu gösterecek şekilde güncelle
    const lastPositions = positions.slice(-3); // Son 3 pozisyon
    dataOutput.innerHTML = 'Processed Coordinates:<br>'; // Başlangıç mesajı

    lastPositions.forEach(pos => {
        // pos nesnesinin yapısını kontrol et
        if (pos && typeof pos.position === 'object' && pos.position.length >= 3) {
            // Eğer pos bir nesne ise ve position değerini al
            dataOutput.innerHTML += `X: ${pos.position[0].toFixed(2)}, Y: ${pos.position[1].toFixed(2)}, Z: ${pos.position[2].toFixed(2)}<br>`;
        } else if (Array.isArray(pos) && pos.length >= 3) {
            // Eğer pos bir dizi ise, x, y, z değerlerini al
            dataOutput.innerHTML += `X: ${pos[0].toFixed(2)}, Y: ${pos[1].toFixed(2)}, Z: ${pos[2].toFixed(2)}<br>`;
        } else {
            console.warn('Invalid position data:', pos);
            dataOutput.innerHTML += 'Invalid position data<br>';
        }
    });
}


function parseOEMData(data) {
    const lines = data.split('\n');
    const positions = []; // Pozisyonları saklamak için bir dizi
    let readCovariance = true; // COVARIANCE_START kontrolü

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Boş satırları atla
        if (trimmedLine === '') {
            continue;
        }

        // COVARIANCE_START kontrolü
        if (trimmedLine === 'COVARIANCE_START') {
            readCovariance = false; // Covariance okumayı durdur
            continue; // COVARIANCE_START'ı atla
        }

        // Eğer covariance okunuyorsa, işlemeye devam et
        if (!readCovariance) {
            continue; // COVARIANCE_START'tan sonraki satırları atla
        }

        // Veri satırlarını kontrol et
        const parts = trimmedLine.split(/\s+/); // Boşluklarla ayır
        if (parts.length >= 7) {
            const epoch = parts[0]; // Zaman damgası
            const position = [
                parseFloat(parts[1]), // X
                parseFloat(parts[2]), // Y
                parseFloat(parts[3])  // Z
            ];
            const velocity = [
                parseFloat(parts[4]), // Vx
                parseFloat(parts[5]), // Vy
                parseFloat(parts[6])  // Vz
            ];

            // NaN kontrolü
            if (!position.includes(NaN) && !velocity.includes(NaN)) {
                positions.push({ epoch, position, velocity }); // Pozisyon ve zaman damgasını saklayın
                console.log("Parsed position:", { epoch, position, velocity }); // Parse edilen veriyi logla
            } else {
                console.error("Invalid position or velocity data found:", position, velocity);
            }
        } else {
            console.log("Ignoring line (not enough parts):", trimmedLine); // Ignored satırları logla
        }
    }

    console.log('Parsed positions:', positions); // Pozisyonları kontrol et
    return positions; // Pozisyonları döndür
}


async function init() {
    const loadingElement = document.getElementById('loading'); // Yükleme mesajı için bir DOM öğesi
    loadingElement.style.display = 'block'; // Yükleme mesajını göster

    const filePaths = await fetch('/api/oem-files')
        .then(response => response.json())
        .then(files => files.map(file => `/static/oem_files/${file}`));

    const positions = await loadOEMFiles(filePaths); // Dosyaları yükle

    // Yükleme tamamlandığında
    loadingElement.style.display = 'none'; // Yükleme mesajını gizle

    // Yörüngeyi oluşturma ve render işlemlerini burada yapın
    createOrbit(positions);
}
function createOrbit(positions) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // Pozisyonları vertex dizisine ekle
    for (const { position } of positions) {
        vertices.push(...position); // X, Y, Z değerlerini ekle
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    // Nokta materyali oluştur
    const material = new THREE.PointsMaterial({ color: 0xff0000, size: 1 });
    const points = new THREE.Points(geometry, material);

    // Sahneye noktaları ekle
    scene.add(points);

    // Render işlemi
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Init fonksiyonunu çağır
init();
