const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Uydu pozisyonları
const satellitePositions = [
    [5950.9, 3729.9, 662.9],
    [6000.0, 3700.0, 700.0],
    // ... diğer pozisyonlar
];

// Yörüngeyi çiz
drawOrbit(satellitePositions);

// Uydu modelini oluştur (bir küp)
const satelliteGeometry = new THREE.BoxGeometry(10, 10, 10);
const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);

// Uydunun sahnede görünmesi için ekle
scene.add(satellite);

// Kamera ayarla
camera.position.z = 10000;

let positionIndex = 0;

// Animasyon fonksiyonu
function animate() {
    requestAnimationFrame(animate);

    // Uyduyu yörüngede hareket ettir
    if (positionIndex < satellitePositions.length) {
        const pos = satellitePositions[positionIndex];
        satellite.position.set(pos[0], pos[1], pos[2]);
        positionIndex++;
    }

    renderer.render(scene, camera);
}

animate();
