/* ============================================
   BAKHTIAR ALAM — PORTFOLIO SITE
   JavaScript: Animations & Interactions
   ============================================ */

'use strict';

/* ============================================
   HERO CANVAS — PARTICLE NETWORK
   ============================================ */
(function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const PARTICLE_COUNT = 70;
    const MAX_DISTANCE    = 160;
    const PARTICLE_SPEED  = 0.25;
    const BASE_OPACITY    = 0.35;

    let W, H, particles = [], animId;

    function resize() {
        W = canvas.width  = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }

    function Particle() {
        this.x  = Math.random() * W;
        this.y  = Math.random() * H;
        this.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
        this.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
        this.r  = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.4 + 0.15;
        // Colour variation — mostly blue/navy
        const hues = [220, 225, 230, 215];
        this.hue = hues[Math.floor(Math.random() * hues.length)];
        this.sat = 60 + Math.random() * 30;
        this.lum = 55 + Math.random() * 20;
    }

    Particle.prototype.update = function () {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
    };

    Particle.prototype.draw = function () {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, ${this.sat}%, ${this.lum}%, ${this.alpha})`;
        ctx.fill();
    };

    function init() {
        resize();
        particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx   = particles[i].x - particles[j].x;
                const dy   = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DISTANCE) {
                    const alpha = BASE_OPACITY * (1 - dist / MAX_DISTANCE) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
                    ctx.lineWidth   = 0.6;
                    ctx.stroke();
                }
            }
        }
    }

    function loop() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        animId = requestAnimationFrame(loop);
    }

    // Pause when not visible to save resources
    const heroSection = document.getElementById('hero');
    const visObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            if (!animId) loop();
        } else {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }, { threshold: 0 });
    visObs.observe(heroSection);

    init();
    loop();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { resize(); }, 150);
    });
}());


/* ============================================
   TYPEWRITER EFFECT — HERO SUBTITLE
   ============================================ */
(function initTypewriter() {
    const el = document.getElementById('typewriter-text');
    if (!el) return;

    const phrases = [
        'Performance & Lifecycle Marketing',
        'Paid Media  ·  CRM Strategy',
        'Salesforce Marketing Cloud'
    ];

    let phraseIdx = 0;
    let charIdx   = 0;
    let deleting  = false;
    let pauseTimer = null;

    function type() {
        const current = phrases[phraseIdx];

        if (deleting) {
            charIdx--;
        } else {
            charIdx++;
        }

        el.textContent = current.slice(0, charIdx);

        let delay = deleting ? 35 : 60;

        if (!deleting && charIdx === current.length) {
            // Pause before deleting
            clearTimeout(pauseTimer);
            pauseTimer = setTimeout(() => {
                deleting = true;
                type();
            }, 2800);
            return;
        }

        if (deleting && charIdx === 0) {
            deleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            delay = 400;
        }

        setTimeout(type, delay);
    }

    // Start after hero animation settles
    setTimeout(type, 1000);
}());


/* ============================================
   NAVBAR — SCROLL BEHAVIOUR + MOBILE MENU
   ============================================ */
(function initNav() {
    const navbar    = document.getElementById('navbar');
    const toggle    = document.getElementById('navToggle');
    const mobile    = document.getElementById('navMobile');
    const allLinks  = document.querySelectorAll('#navbar a, .nav-mobile a');

    // Scroll state
    function handleScroll() {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Mobile toggle
    if (toggle && mobile) {
        toggle.addEventListener('click', () => {
            const open = mobile.classList.toggle('open');
            toggle.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', open);
        });
    }

    // Close mobile menu on link click
    allLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobile) mobile.classList.remove('open');
            if (toggle) {
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Smooth scroll for anchor links (fallback for browsers)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 70; // navbar height
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}());


/* ============================================
   SCROLL ANIMATIONS — FADE UP
   ============================================ */
(function initScrollAnimations() {
    const elements = document.querySelectorAll('.fade-up');
    if (!elements.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Once visible, no need to keep observing
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    elements.forEach(el => observer.observe(el));
}());


/* ============================================
   METRIC COUNT-UP ANIMATION
   ============================================ */
(function initCountUp() {
    const metricEls = document.querySelectorAll('.metric-number[data-target]');
    if (!metricEls.length) return;

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function formatNumber(value, el) {
        const prefix   = el.dataset.prefix || '';
        const suffix   = el.dataset.suffix || '';
        const decimals = parseInt(el.dataset.decimals, 10) || 0;
        const format   = el.dataset.format || '';

        let formatted;
        if (format === 'comma') {
            formatted = Math.round(value).toLocaleString('en-AU');
        } else if (decimals > 0) {
            formatted = value.toFixed(decimals);
        } else {
            formatted = Math.round(value).toString();
        }

        return prefix + formatted + suffix;
    }

    function animateCount(el) {
        const target   = parseFloat(el.dataset.target);
        const duration = 1800; // ms
        let start      = null;
        el.textContent = formatNumber(0, el);

        function step(ts) {
            if (!start) start = ts;
            const elapsed  = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = easeOutExpo(progress);
            const current  = eased * target;
            el.textContent = formatNumber(current, el);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = formatNumber(target, el);
            }
        }

        requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    metricEls.forEach(el => observer.observe(el));
}());


/* ============================================
   REDUCED MOTION — RESPECT PREFERS
   ============================================ */
(function respectReducedMotion() {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
        // Immediately show all fade-up elements
        document.querySelectorAll('.fade-up, .fade-in-up').forEach(el => {
            el.style.opacity    = '1';
            el.style.transform  = 'none';
            el.style.animation  = 'none';
            el.style.transition = 'none';
        });
        // Stop canvas animation
        const canvas = document.getElementById('heroCanvas');
        if (canvas) canvas.style.display = 'none';
        // Freeze typer cursor
        const cursor = document.getElementById('typerCursor');
        if (cursor) cursor.style.animation = 'none';
    }
}());
