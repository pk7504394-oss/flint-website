// Constants and Configuration
const TOTAL_FRAMES = 210;
const images = [];
let loadedCount = 0;

// DOM Elements
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('scroll-animation-container');

// Text Overlay Steps Definitions
const steps = [
    { el: document.getElementById('step-1'), start: 0.05, end: 0.25 },
    { el: document.getElementById('step-2'), start: 0.30, end: 0.50 },
    { el: document.getElementById('step-3'), start: 0.55, end: 0.75 },
    { el: document.getElementById('step-4'), start: 0.80, end: 0.98 }
];

// Easing variables (LERP)
let targetScrollFraction = 0;
let currentScrollFraction = 0;
const LERP_EASING = 0.08; // Buttery smooth easing factor

// 1. Preload all frame images
function preloadImages() {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        // Pad the file index to 3 digits (e.g., 001, 002... 210)
        const frameNum = String(i).padStart(3, '0');
        img.src = `assets/frames/ezgif-frame-${frameNum}.jpg`;
        
        img.onload = () => {
            handleImageLoad();
        };
        img.onerror = () => {
            console.error(`Failed to load frame assets/frames/ezgif-frame-${frameNum}.jpg`);
            // Increment anyway to prevent preloader from getting stuck
            handleImageLoad();
        };
        images.push(img);
    }
}

function handleImageLoad() {
    loadedCount++;
    const percentage = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    
    // Update loading UI
    progressBar.style.width = `${percentage}%`;
    progressText.innerText = `Loading: ${percentage}%`;
    
    if (loadedCount === TOTAL_FRAMES) {
        setTimeout(initializeLandingPage, 500); // Small pause for visual completion
    }
}

// 2. Initialize Page
function initializeLandingPage() {
    // Fade out preloader
    preloader.style.opacity = '0';
    preloader.style.visibility = 'hidden';
    
    // Initial draw
    resizeCanvas();
    drawFrame(0);
    
    // Start Animation Render Loop
    requestAnimationFrame(updateLoop);
}

// 3. Perfect Object-Fit Cover drawing logic on Canvas
function drawImageProp(ctx, img, x = 0, y = 0, w = ctx.canvas.width, h = ctx.canvas.height, offsetX = 0.5, offsetY = 0.5) {
    const iw = img.width;
    const ih = img.height;
    const r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let ar = 1;

    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    let cw = iw / (nw / w);
    let ch = ih / (nh / h);

    let cx = (iw - cw) * offsetX;
    let cy = (ih - ch) * offsetY;

    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
}

function drawFrame(index) {
    const img = images[index];
    if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawImageProp(ctx, img, 0, 0, canvas.width, canvas.height);
    }
}

// 4. Responsive Canvas Sizing
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(1, 1);
    
    // Re-draw current frame immediately on resize
    const frameIndex = Math.floor(currentScrollFraction * (TOTAL_FRAMES - 1));
    drawFrame(frameIndex);
}

window.addEventListener('resize', resizeCanvas);

// 5. Scroll fraction tracking
window.addEventListener('scroll', () => {
    const rect = container.getBoundingClientRect();
    const scrolled = -rect.top;
    const totalScrollable = container.offsetHeight - window.innerHeight;
    
    let fraction = scrolled / totalScrollable;
    fraction = Math.max(0, Math.min(1, fraction));
    targetScrollFraction = fraction;
});

// 6. Text overlay update based on fraction
function updateTextOverlays(fraction) {
    steps.forEach(step => {
        if (fraction >= step.start && fraction <= step.end) {
            step.el.classList.add('active');
        } else {
            step.el.classList.remove('active');
        }
    });
}

// 7. Core RequestAnimationFrame Loop
function updateLoop() {
    // Easing formula
    const diff = targetScrollFraction - currentScrollFraction;
    
    if (Math.abs(diff) > 0.0001) {
        currentScrollFraction += diff * LERP_EASING;
    } else {
        currentScrollFraction = targetScrollFraction;
    }
    
    const frameIndex = Math.floor(currentScrollFraction * (TOTAL_FRAMES - 1));
    drawFrame(frameIndex);
    
    updateTextOverlays(currentScrollFraction);
    
    requestAnimationFrame(updateLoop);
}

// 8. Navbar Scroll Visual state toggle
const navHeader = document.getElementById('navbar');
if (navHeader) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navHeader.classList.add('bg-background/80', 'backdrop-blur-xl', 'border-b', 'border-outline-variant/20', 'py-4');
            navHeader.classList.remove('py-6');
        } else {
            navHeader.classList.remove('bg-background/80', 'backdrop-blur-xl', 'border-b', 'border-outline-variant/20', 'py-4');
            navHeader.classList.add('py-6');
        }
    });
}

// Start preloading
preloadImages();
