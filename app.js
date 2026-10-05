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

// 9. Supabase Integration for Appointment & Requirement Form
const SUPABASE_URL = 'https://sdeixeeducyszrhscgcv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F7igwHsJ7A2Rf86tNONBRw_Nz_-gKHD';

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Supabase client initialized successfully.");
        } catch (err) {
            console.error("Error creating Supabase client:", err);
        }
    }
    return supabaseClient;
}

document.addEventListener('DOMContentLoaded', () => {
    // Connect button action in scroll steps if needed
    const preorderBtn = document.getElementById('btn-step-action-1');
    if (preorderBtn) {
        preorderBtn.addEventListener('click', () => {
            const contactSec = document.getElementById('contact');
            if (contactSec) contactSec.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const form = document.getElementById('appointment-form');
    const feedbackEl = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('submit-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name')?.value?.trim();
            const company = document.getElementById('company')?.value?.trim();
            const email = document.getElementById('email')?.value?.trim();
            const phone = document.getElementById('phone')?.value?.trim();
            const requirement = document.getElementById('requirement')?.value?.trim();

            if (!name || (!email && !phone)) {
                showFeedback('Please fill out your name and at least an email address or phone number.', 'error');
                return;
            }

            // Set button state to sending
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="inline-flex items-center justify-center gap-2"><span class="animate-spin text-lg">↻</span> SUBMITTING...</span>';
            }

            const payload = {
                name: name,
                company: company || null,
                email: email || null,
                phone: phone || null,
                requirement: requirement || null,
                created_at: new Date().toISOString()
            };

            const client = getSupabaseClient();
            let isSaved = false;
            let lastError = null;

            if (client) {
                // List of common table names to attempt saving to
                const targetTables = ['appointments', 'contacts', 'requirements', 'leads', 'messages', 'queries'];

                for (const tableName of targetTables) {
                    try {
                        const { data, error } = await client.from(tableName).insert([payload]);
                        if (!error) {
                            isSaved = true;
                            console.log(`Saved successfully to Supabase table: ${tableName}`);
                            break;
                        } else {
                            lastError = error;
                            console.warn(`Table '${tableName}' check:`, error.message);
                        }
                    } catch (err) {
                        lastError = err;
                    }
                }
            } else {
                lastError = new Error("Supabase SDK initialization failed");
            }

            if (isSaved) {
                showFeedback('✓ Thank you! Your appointment booking details have been saved to Supabase successfully.', 'success');
                form.reset();
            } else {
                console.error("Supabase Error Details:", lastError);
                let userFriendlyMsg = lastError?.message || 'Could not connect to Supabase table.';
                if (userFriendlyMsg.includes('schema cache') || userFriendlyMsg.includes('Could not find the table')) {
                    userFriendlyMsg = "⚠️ Table 'appointments' not found in Supabase. Please create the table in your Supabase Dashboard using the SQL query provided below.";
                }
                showFeedback(userFriendlyMsg, 'error');
            }

            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = 'SEND MESSAGE';
            }
        });
    }
});

function showFeedback(msg, type) {
    const feedbackEl = document.getElementById('form-feedback');
    if (!feedbackEl) return;

    feedbackEl.className = 'p-4 rounded-xl text-center font-body-md text-sm transition-all duration-300';

    if (type === 'success') {
        feedbackEl.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border', 'border-emerald-500/30');
    } else if (type === 'error') {
        feedbackEl.classList.add('bg-rose-500/20', 'text-rose-400', 'border', 'border-rose-500/30');
    } else {
        feedbackEl.classList.add('bg-amber-500/20', 'text-amber-400', 'border', 'border-amber-500/30');
    }

    feedbackEl.innerText = msg;
    feedbackEl.classList.remove('hidden');
}

