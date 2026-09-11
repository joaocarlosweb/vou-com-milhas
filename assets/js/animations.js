// GSAP Animations - Vou com Milhas
document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Lenis Smooth Scroll - com suporte touch Android (Letra B)
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothTouch: true,
      touchMultiplier: 1.8,
      gestureOrientation: 'vertical',
      lerp: 0.08
    });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    document.documentElement.classList.add('lenis','lenis-smooth');
  }

  // Hero Vou com Milhas - timeline premium full-bleed + filtro abaixo (sem badge/plane removidos)
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .from('.hero-title span', { y: 70, opacity: 0, duration: 0.85, stagger: 0.07, ease: 'power3.out' }, 0.18)
    .from('.hero-subtitle', { y: 16, opacity: 0, duration: 0.6 }, 0.65)
    .from('#barra-busca', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.75)
    .from('.hero-stats', { y: 12, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.95);

  // B GSAP Pin - vídeo/imagem fixa, divs sobem em camadas
  const heroSection = document.querySelector('.hero-section');
  const heroBgFixed = document.querySelector('.hero-bg-fixed');
  const heroVideo = document.getElementById('hero-video');
  const heroFallbackImg = document.getElementById('hero-fallback-img');
  const heroBgImg = document.querySelector('.hero-bg-fixed img') || document.querySelector('.hero-section img.object-cover');
  const heroContent = document.querySelector('.hero-content');
  const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  const heroBgForParallax = heroBgFixed || heroVideo || heroBgImg;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Video autoplay handling + fallback (usa variáveis já declaradas heroVideo/heroFallbackImg)
  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    heroVideo.loop = true;
    // garante que fallback começa escondido e vídeo visível
    if (heroFallbackImg) heroFallbackImg.style.display = 'none';
    heroVideo.style.display = 'block';
    const tryPlay = () => heroVideo.play().then(()=>{
      console.log('[Hero] vídeo autoplay OK');
      if (heroFallbackImg) heroFallbackImg.style.display='none';
    }).catch((e)=>{
      console.warn('[Hero] autoplay bloqueado', e);
      // mantém botão escondido conforme solicitado
    });
    // tenta autoplay após um pequeno delay para garantir layout
    setTimeout(tryPlay, 300);
    // clique no hero também tenta tocar
    heroVideo.addEventListener('click', tryPlay);
    document.querySelector('.hero-section')?.addEventListener('click', ()=>{
      if(heroVideo.paused) tryPlay();
    });
    heroVideo.addEventListener('error', (e) => {
      console.error('[Hero] video error', e);
      heroVideo.style.display = 'none';
      if (heroFallbackImg) { heroFallbackImg.classList.remove('hidden'); heroFallbackImg.style.display='block'; }
    });
    heroVideo.addEventListener('loadeddata', ()=> console.log('[Hero] vídeo carregado', heroVideo.videoWidth+'x'+heroVideo.videoHeight));
    // pausa quando fora do viewport para economizar
    ScrollTrigger.create({
      trigger: '.hero-section',
      start: 'bottom top',
      end: 'bottom -10%',
      onEnter: () => { if(!heroVideo.paused) heroVideo.pause(); },
      onLeaveBack: () => tryPlay()
    });
    // botão toggle mantido escondido conforme solicitação (vídeo segue em loop silencioso)
    const toggleBtn = document.getElementById('hero-video-toggle');
    if (toggleBtn) {
      toggleBtn.classList.add('hidden');
      // sem listener, vídeo apenas em autoplay loop
    }
    if (prefersReduced) {
      heroVideo.pause();
      // mantém vídeo visível mas pausado, não esconde
    }
  }

  if (heroSection) {
    // Pin hero - vídeo fixo enquanto conteúdo sobe (mobile e desktop) - Letra A com end adaptativo
    const pinEnd = isMobile ? '+=600' : '+=750';
    ScrollTrigger.create({
      trigger: '.hero-section',
      start: 'top top',
      end: pinEnd,
      pin: true,
      pinSpacing: false,
      anticipatePin: 1
    });
    // Camadas parallax: bg lento, conteúdo rápido
    if (heroBgFixed) {
      gsap.to(heroBgFixed, {
        yPercent: isMobile ? 12 : 14,
        ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: pinEnd, scrub: 1 }
      });
    } else if (heroBgForParallax) {
      gsap.to(heroBgForParallax, {
        yPercent: isMobile ? -12 : 14,
        ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: pinEnd, scrub: 1 }
      });
    }
    if (heroContent) {
      gsap.to(heroContent, {
        yPercent: isMobile ? -6 : -18,
        opacity: isMobile ? 0.95 : 0.88,
        ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: pinEnd, scrub: 1 }
      });
    }

    gsap.to('#hero-trail', {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: { trigger: '.hero-section', start: 'top top', end: pinEnd, scrub: 1 }
    });
    // Lenis sync já feito no topo (evita duplicar Forced reflow)
  }
  // Trail SVG dash anim (sempre)
  const trail = document.getElementById('hero-trail');
  if (trail) {
    const len = trail.getTotalLength ? trail.getTotalLength() : 400;
    gsap.set(trail, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(trail, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.out', delay: 0.7 });
  }
  // Ken-burns suave no avião bg/video
  const kbTarget = document.getElementById('hero-video') || heroBgImg;
  if (kbTarget) gsap.to(kbTarget, { scale: 1.04, duration: 8, ease: 'power1.inOut', yoyo: true, repeat: -1, transformOrigin: 'center center' });

  // Cards stagger on scroll - SAFE: garante opacity 1 fallback
  try {
    ScrollTrigger.batch('.card-viagem', {
      onEnter: batch => {
        batch.forEach(el => el.style.opacity = '1');
        gsap.from(batch, { y: 24, duration: 0.5, stagger: 0.07, ease: 'power2.out', overwrite:'auto', clearProps:'transform' });
      },
      start: 'top 92%',
      once: true,
      invalidateOnRefresh: true
    });
    // fallback: se batch nao disparar em 800ms, força visibilidade
    setTimeout(() => {
      document.querySelectorAll('.card-viagem').forEach(el => {
        if (getComputedStyle(el).opacity === '0') el.style.opacity = '1';
      });
      ScrollTrigger.refresh();
    }, 800);
  } catch(e) { console.warn('ScrollTrigger batch falhou', e); document.querySelectorAll('.card-viagem').forEach(el=> el.style.opacity='1'); }

  // Detalhes Executivo Dark animations
  if (document.querySelector('.detalhes-hero')) {
    gsap.from('.detalhes-hero', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' });
    gsap.from('.detalhes-hero img', { scale: 1.06, duration: 1.2, ease: 'power2.out' }, 0.1);
    gsap.from('.mapa-container', { y: 30, opacity: 0, duration: 0.7, delay: 0.25, ease: 'power3.out' });
    gsap.from('.resumo-card', { y: 20, opacity: 0, duration: 0.6, delay: 0.4, ease: 'power3.out' });
    // stagger assentos quando entram
    ScrollTrigger.batch('#mapa-assentos .assento', {
      onEnter: batch => gsap.from(batch, { scale: 0.85, opacity: 0, duration: 0.4, stagger: 0.015, ease: 'back.out(1.4)', overwrite:'auto' }),
      start: 'top 88%',
      once: true
    });
    // brilho corredor
    gsap.to('.mapa-container', { boxShadow: '0 24px 64px rgba(0,0,0,0.3)', duration: 0.8, delay: 0.6 });
  }

  // Hover micro-interaction for cards - guard para Text nodes (fix TypeError)
  document.addEventListener('mouseenter', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const card = t.closest('.card-viagem');
    if (card && !card.classList.contains('animating')) {
      gsap.to(card, { y: -6, duration: 0.3, ease: 'power2.out' });
    }
  }, true);
  document.addEventListener('mouseleave', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const card = t.closest('.card-viagem');
    if (card) gsap.to(card, { y: 0, duration: 0.3, ease: 'power2.out' });
  }, true);
});
