
// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set camera position
camera.position.set(0, 0, 700); // X, Y, Z konumunu ayarla
camera.lookAt(0, 0, 0); // Kamerayı modelin merkezine odakla

// 3D sahneye ışık ekleyin
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Ortam ışığı
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Beyaz ışık
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);


// DOM elements
const dataMonitor = document.getElementById('data-monitor'); // Data monitor
const progressBar = document.getElementById('progress-bar'); // Progress bar
const loadingMessage = document.getElementById('loading-message'); // Loading message display
const processingMonitor = document.getElementById('processing-monitor'); // Processing monitor
const dataOutput = document.getElementById('data-output'); // To display coordinates

// GLTF Loader
const loader = new THREE.GLTFLoader();

function addDebugCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0); // Ortaya yerleştir
    scene.add(cube);
}



let earth; // Global değişken olarak Dünya modelini saklayacağız

async function load3DModel() {
    return new Promise((resolve, reject) => {
        loader.load('/static/models/earth.glb', (gltf) => {
            console.log('Model yüklendi:', gltf);
            scene.add(gltf.scene);

            // Modelin boyutunu al
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());

            camera.lookAt(center);

            // Dünya modelini eksen eğikliği ile döndür
            gltf.scene.rotation.x = THREE.MathUtils.degToRad(23.5); // 23.5 derece eğiklik

            // Başarılı yükleme bildirimi
            const notification = document.createElement('div');
            notification.innerText = 'Dünya modeli başarıyla yüklendi!';
            notification.style.position = 'absolute';
            notification.style.top = '10px';
            notification.style.left = '10px';
            notification.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
            notification.style.color = '#fff';
            notification.style.padding = '10px';
            notification.style.borderRadius = '5px';
            document.body.appendChild(notification);

            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);

            resolve();
        }, undefined, (error) => {
            console.error('Error loading model:', error);
            reject(error);
        });
    });
}


async function loadOEMFiles(filePaths) {
    const allPositions = [];
    const totalFiles = filePaths.length;

    // Show loading
    document.getElementById('loading').style.display = 'block';

    for (let i = 0; i < totalFiles; i++) {
        const filePath = filePaths[i];
        try {
            const response = await fetch(filePath);
            const text = await response.text();
            console.log(`Loaded file: ${filePath}\nContent:\n${text}`);  // Log file content for debugging

            // Update loading log
            dataMonitor.innerText = `Loading ${filePath}...`;

            const positions = parseOEMData(text);

            if (positions && positions.length > 0) {
                allPositions.push(...positions);
                console.log(`${filePath}: ${positions.length} positions found`);
                dataMonitor.innerText = `Loaded ${positions.length} positions from ${filePath}`; // Update

                // Update processing monitor
                processingMonitor.innerText += `\nProcessed ${positions.length} positions from ${filePath}`;

                // Update coordinates
                updateDataOutput(positions);
            } else {
                console.warn(`${filePath}: No valid positions found`);
                dataMonitor.innerText += `\n${filePath}: No valid positions found`;
            }
        } catch (error) {
            console.error(`Failed to load ${filePath}:`, error);
            dataMonitor.innerText += `\nFailed to load ${filePath}: ${error.message}`;
        }

        // Update progress bar
        const progressPercentage = ((i + 1) / totalFiles) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }

    // Hide loading when complete
    document.getElementById('loading').style.display = 'none';

    // Show loading result
    loadingMessage.innerText = `${totalFiles} files loaded successfully!`;

    return allPositions;
}

function updateDataOutput(positions) {
    // Display last three positions
    const lastPositions = positions.slice(-3); // Last 3 positions
    dataOutput.innerHTML = 'Processed Coordinates:<br>'; // Initial message

    lastPositions.forEach(pos => {
        // Check structure of pos object
        if (pos && typeof pos.position === 'object' && pos.position.length >= 3) {
            // If pos is an object, get position value
            dataOutput.innerHTML += `X: ${pos.position[0].toFixed(2)}, Y: ${pos.position[1].toFixed(2)}, Z: ${pos.position[2].toFixed(2)}<br>`;
        } else if (Array.isArray(pos) && pos.length >= 3) {
            // If pos is an array, get x, y, z values
            dataOutput.innerHTML += `X: ${pos[0].toFixed(2)}, Y: ${pos[1].toFixed(2)}, Z: ${pos[2].toFixed(2)}<br>`;
        } else {
            console.warn('Invalid position data:', pos);
            dataOutput.innerHTML += 'Invalid position data<br>';
        }
    });
}

function parseOEMData(data) {
    const lines = data.split('\n');
    const positions = []; // Array to store positions
    let readCovariance = true; // COVARIANCE_START control

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (trimmedLine === '') {
            continue;
        }

        // COVARIANCE_START check
        if (trimmedLine === 'COVARIANCE_START') {
            readCovariance = false; // Stop reading covariance
            continue; // Skip COVARIANCE_START
        }

        // Continue if covariance is being read
        if (!readCovariance) {
            continue; // Skip lines after COVARIANCE_START
        }

        // Check data lines
        const parts = trimmedLine.split(/\s+/); // Split by whitespace
        if (parts.length >= 7) {
            const epoch = parts[0]; // Timestamp
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

            // NaN check
            if (!position.includes(NaN) && !velocity.includes(NaN)) {
                positions.push({ epoch, position, velocity }); // Store position and timestamp
                console.log("Parsed position:", { epoch, position, velocity }); // Log parsed data
            } else {
                console.error("Invalid position or velocity data found:", position, velocity);
            }
        } else {
            console.log("Ignoring line (not enough parts):", trimmedLine); // Log ignored lines
        }
    }

    console.log('Parsed positions:', positions); // Check positions
    return positions; // Return positions
}

async function init() {
    const loadingElement = document.getElementById('loading'); // Loading message DOM element
    loadingElement.style.display = 'block'; // Show loading message

    const filePaths = await fetch('/api/oem-files')
        .then(response => response.json())
        .then(files => files.map(file => `/static/oem_files/${file}`));

    const positions = await loadOEMFiles(filePaths); // Load files

    // Load the 3D model after loading OEM files
    await load3DModel();

    // When loading is complete
    loadingElement.style.display = 'none'; // Hide loading message

    // Create orbit and rendering here
    createOrbit(positions);
}


function createOrbit(positions) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // Add positions to vertex array
    for (const { position } of positions) {
        vertices.push(...position); // Add X, Y, Z values
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    // Create point material
    const material = new THREE.PointsMaterial({ color: 0xff0000, size: 1 });
    const points = new THREE.Points(geometry, material);

    // Add points to scene
    scene.add(points);

    // Render the scene
    animate();
}



// Call init function
init();


function animate() {
    requestAnimationFrame(animate);

    // Doğru modelin döndürülmesi
    scene.traverse((child) => {
        if (child.isMesh && child.name === 'Earth') { // Modelin adını kontrol et
            child.rotation.y += 0.01; // Y ekseninde döndür
        }
    });

    renderer.render(scene, camera);
}
