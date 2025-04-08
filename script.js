document.addEventListener('DOMContentLoaded', () => {
    let scene, camera, renderer, impossibleBox;
    let rotationSpeed = 0.005;
    let isRotating = false;
    
    let synth, zoomSynth;
    let lastZoomLevel = 5;
    let lastRotationAngle = 0;

    let hammer;
    let currentRotationX = 0;
    let currentRotationY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let zoomLevel = 5;
    let minZoom = 2;
    let maxZoom = 10;

    init();
    animate();

    function init() {
        initThree();

        initTone();

        initTouchControls();

        setTimeout(() => {
            document.getElementById('loading').style.opacity = 0;
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
            }, 500);
        }, 1000);
    }

    function initThree() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = zoomLevel;

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        createImpossibleBox();

        window.addEventListener('resize', onWindowResize);
    }

    function createImpossibleBox() {
        impossibleBox = new THREE.Group();

        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        createBoxEdge(-1, -1, 1, 2, 0, 0, edgeMaterial); // bottom edge
        createBoxEdge(-1, 1, 1, 2, 0, 0, edgeMaterial);  // top edge
        createBoxEdge(-1, -1, 1, 0, 2, 0, edgeMaterial); // left edge
        createBoxEdge(1, -1, 1, 0, 2, 0, edgeMaterial);  // right edge

        createBoxEdge(-1, -1, -1, 2, 0, 0, edgeMaterial); // bottom edge
        createBoxEdge(-1, 1, -1, 2, 0, 0, edgeMaterial);  // top edge
        createBoxEdge(-1, -1, -1, 0, 2, 0, edgeMaterial); // left edge
        createBoxEdge(1, -1, -1, 0, 2, 0, edgeMaterial);  // right edge

        createBoxEdge(-1, -1, 1, 0, 0, -1.5, edgeMaterial); // bottom-left
        createBoxEdge(1, -1, 1, 0, 0, -1.5, edgeMaterial);  // bottom-right
        createBoxEdge(-1, 1, 1, 0, 0, -1.5, edgeMaterial);  // top-left
        createBoxEdge(1, 1, 1, 0, 0, -1.5, edgeMaterial);   // top-right

        createBoxEdge(-1, -1, -0.5, 0, 0, 1.5, edgeMaterial); // additional edge
        createBoxEdge(1, -1, -0.5, 0, 0, 1.5, edgeMaterial);  // additional edge

        scene.add(impossibleBox);
    }

    function createBoxEdge(x, y, z, width, height, depth, material) {
        const geometry = new THREE.BoxGeometry(
            width || 0.1, 
            height || 0.1, 
            depth || 0.1
        );
        const edge = new THREE.Mesh(geometry, material);
        edge.position.set(x, y, z);
        impossibleBox.add(edge);
        return edge;
    }

    function initTone() {
        synth = new Tone.Synth({
            oscillator: {
                type: 'sine'
            },
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.5,
                release: 0.1
            }
        }).toDestination();
        synth.volume.value = -20;

        zoomSynth = new Tone.Synth({
            oscillator: {
                type: 'triangle'
            },
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.3,
                release: 0.1
            }
        }).toDestination();
        zoomSynth.volume.value = -20;
    }

    function initTouchControls() {
        const element = renderer.domElement;
        hammer = new Hammer(element);

        hammer.get('pinch').set({ enable: true });
        hammer.get('rotate').set({ enable: true });
        hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        hammer.on('panstart', () => {
            isRotating = true;
        });
        
        hammer.on('pan', (event) => {
            if (isRotating) {
                targetRotationY += event.velocityX * 0.3;
                targetRotationX += event.velocityY * 0.3;

                playRotationSound();

                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }
        });
        
        hammer.on('panend', () => {
            isRotating = false;
        });

        hammer.on('pinch', (event) => {
            const zoomChange = (1 - event.scale) * 0.5;
            zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel + zoomChange));

            camera.position.z = zoomLevel;

            playZoomSound();

            if (navigator.vibrate) {
                navigator.vibrate(15);
            }
        });

        hammer.on('doubletap', () => {
            resetView();
        });
    }

    function playRotationSound() {
        const rotationDiff = Math.abs(targetRotationX - currentRotationX) + 
                            Math.abs(targetRotationY - currentRotationY);

        if (rotationDiff > 0.01) {
            const frequency = 220 + rotationDiff * 100;

            if (Tone.context.state === 'running') {
                synth.triggerAttackRelease(frequency, '0.05');
            } else {
                Tone.start();
            }
        }
    }

    function playZoomSound() {
        if (Math.abs(zoomLevel - lastZoomLevel) > 0.1) {
            const frequency = 440 + (maxZoom - zoomLevel) * 50;

            if (Tone.context.state === 'running') {
                zoomSynth.triggerAttackRelease(frequency, '0.1');
            } else {
                Tone.start();
            }

            lastZoomLevel = zoomLevel;
        }
    }

    function resetView() {
        targetRotationX = 0;
        targetRotationY = 0;
        zoomLevel = 5;
        camera.position.z = zoomLevel;

        if (navigator.vibrate) {
            navigator.vibrate([30, 30, 30]);
        }
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);

        currentRotationX += (targetRotationX - currentRotationX) * 0.1;
        currentRotationY += (targetRotationY - currentRotationY) * 0.1;

        impossibleBox.rotation.x = currentRotationX;
        impossibleBox.rotation.y = currentRotationY;

        if (!isRotating) {
            impossibleBox.rotation.y += rotationSpeed;
            targetRotationY += rotationSpeed;
        }

        renderer.render(scene, camera);
    }
});
