// Variables globales
let particles = [];
let backgroundParticles = []; // Particules de fond aléatoires
let textPoints = [];
let flowField = [];
let cols, rows;
let scale = 20;
let zoff = 0;
let titlePoints = [];
let subtitlePoints = [];
let parasiteParticles = [];
let scrollForce = 0;
let lastScrollForce = 0; // Pour détecter la direction du scroll

let font;
let isMobile = false;
let performanceMode = 'auto'; // 'auto', 'low', 'high'


// Détection mobile/performance
function detectPerformance() {
  const ua = navigator.userAgent.toLowerCase();
  isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // Détection performance basique
  const isLowEnd = isMobile || window.innerWidth < 768;
  
  return {
    isMobile,
    isLowEnd,
    particleCount: isLowEnd ? { title: 1600, subtitle: 800, parasites: 600 } : { title: 2800, subtitle: 1600, parasites: 800 },
    pixelDensity: isLowEnd ? 1 : Math.min(window.devicePixelRatio, 2),
    flowFieldScale: isLowEnd ? 30 : 20,
    updateInterval: isLowEnd ? 2 : 1 // Update every N frames
  };
}

const perf = detectPerformance();
let frameCounter = 0;

function preload() {
  // Option sans preload - utilise une police système
}

function setup() {
  const parent = document.getElementById('app');
  
  let c = createCanvas(
    parent.offsetWidth,
    parent.offsetHeight
  );
  c.parent(parent);
  
  pixelDensity(perf.pixelDensity);
  
  // Police par défaut
  textFont('Playfair Display, Georgia, serif');
  
  scale = perf.flowFieldScale;
  cols = floor(width / scale);
  rows = floor(height / scale);
  
  // Stocker les dimensions initiales
  lastWidth = width;
  lastHeight = height;
  
  // Extraire les points du texte
  extractTextPoints();
  
  // Créer les particules
  createParticles();
  createBackgroundParticles();
  createParasites();
  updateGrid();
}

function updateGrid() {
  cols = floor(width / scale);
  rows = floor(height / scale);
  flowField = new Array(cols * rows);
}

function draw() {
  frameCounter++;
  
  // Sur mobile, skip frames pour améliorer performance
  if (perf.isLowEnd && frameCounter % perf.updateInterval !== 0) {
    return;
  }
  
  background('#0f0f0f');
  
  // Calculer le flow field avec Perlin noise
  updateFlowField();
  
  // Dessiner les particules de fond d'abord
  updateBackgroundParticles();
  
  // Mettre à jour et dessiner les particules
  updateParticles();
  
  // Incrémenter le temps pour l'animation
  zoff += 0.005;
  
  updateParasites();
  
  // Stocker la force de scroll pour la prochaine frame
  lastScrollForce = scrollForce;
}

function updateParasites() {
  noStroke();
  
  // Batch drawing pour performance
  const visibleParasites = [];
  
  for (let p of parasiteParticles) {
    // Skip particles hors écran
    if (p.pos.x < -50 || p.pos.x > width + 50 || p.pos.y < -50 || p.pos.y > height + 50) {
      continue;
    }
    
    let dx = noise(p.nx + zoff) * 2 - 1;
    let dy = noise(p.ny + zoff) * 2 - 1;
    
    p.pos.x += dx * 0.6;
    p.pos.y += dy * 0.8;
    
    // Ajout de la force de dispersion au scroll
    if (scrollForce > 0) {
      let angle = noise(
        p.pos.x * 0.008,
        p.pos.y * 0.008,
        zoff + p.nx
      ) * TWO_PI * 2;
      
      let disperse = p5.Vector.fromAngle(angle);
      disperse.mult(scrollForce * 2.5);
      
      p.pos.x += disperse.x;
      p.pos.y += disperse.y;
    }
    
    p.nx += 0.01;
    p.ny += 0.01;
    p.life--;
    
    // Réduction de vie beaucoup plus agressive au scroll
    p.life -= scrollForce * scrollForce * 20;
    p.pos.y -= scrollForce * random(1.5, 3.5);
    
    visibleParasites.push(p);
  }
  
  // Draw all visible parasites at once
  for (let p of visibleParasites) {
    let alpha = map(p.life, 0, 200, 0, 80, true);
    fill(220, alpha);
    circle(p.pos.x, p.pos.y, p.size);
    
    // régénération (seulement si scroll faible)
    if (p.life <= 0 && scrollForce < 0.5) {
      let pt = random(titlePoints);
      if (pt) {
        p.pos = pt.copy().add(
          randomGaussian() * 20,
          randomGaussian() * 20
        );
        p.life = random(200, 600);
      }
    }
  }
}

function createParasites() {
  parasiteParticles = [];
  
  let sourcePoints = titlePoints.concat(subtitlePoints);
  
  // Calculer le centre de la zone du texte (en haut)
  let textCenterY = 0;
  let textCenterX = width / 2;
  
  if (titlePoints.length > 0) {
    let sumY = 0;
    for (let pt of titlePoints) {
      sumY += pt.y;
    }
    textCenterY = sumY / titlePoints.length;
  }
  
  for (let i = 0; i < perf.particleCount.parasites; i++) {
    let pt = random(sourcePoints);
    if (!pt) continue;
    
    // Calculer distance au centre du texte
    let distToCenter = dist(pt.x, pt.y, textCenterX, textCenterY);
    let maxDist = width * 0.4;
    let normalizedDist = constrain(distToCenter / maxDist, 0, 1);
    
    let keepProbability = map(normalizedDist, 0, 1, 1, 0.35);
    
    if (random() > keepProbability) {
      continue;
    }
    
    let dispersionAmount = map(normalizedDist, 0, 1, 70, 25);
    
    parasiteParticles.push({
      pos: pt.copy().add(
        randomGaussian() * dispersionAmount,
        randomGaussian() * dispersionAmount
      ),
      vel: createVector(),
      acc: createVector(),
      nx: random(1000),
      ny: random(1000),
      life: random(200, 800),
      size: random(0.6, 2.4) * (perf.isLowEnd ? 0.6 : 1),
      distToCenter: normalizedDist
    });
  }
  
  console.log('Parasites created:', parasiteParticles.length);
}

function createBackgroundParticles() {
  backgroundParticles = [];
  
  // Centre de référence pour les particules de fond (zone du texte)
  const centerX = width / 2;
  const centerY = height * 0.15; // Zone du haut
  
  // BEAUCOUP plus de particules de fond pour un effet organique dense
  const numBackgroundParticles = perf.isLowEnd ? 1200 : 2400;
  
  for (let i = 0; i < numBackgroundParticles; i++) {
    // Distribution organique : plus dense autour des lettres, moins dense loin
    let angle = random(TWO_PI);
    let radiusVariation = random(1);
    
    // Distribution en "anneaux" autour du centre avec variation organique
    let baseRadius = pow(radiusVariation, 0.6) * min(width, height) * 0.5;
    let noiseOffset = noise(i * 0.01, angle) * 150;
    let radius = baseRadius + noiseOffset;
    
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius * 0.6; // Compression verticale
    
    // Calculer distance au centre pour l'opacité
    let distToCenter = dist(x, y, centerX, centerY);
    let maxDist = width * 0.4;
    let normalizedDist = constrain(distToCenter / maxDist, 0, 1);
    
    // Taille variable selon la distance (plus petit au centre)
    let sizeMultiplier = map(normalizedDist, 0, 1, 0.7, 1.3);
    
    backgroundParticles.push({
      pos: createVector(x, y),
      vel: createVector(),
      acc: createVector(),
      target: createVector(x, y), // Position originale comme target
      originalPos: createVector(x, y), // Pour le réassemblage
      maxSpeed: 1.8,
      maxForce: 0.25,
      distToCenter: normalizedDist,
      size: random(0.6, 1.8) * sizeMultiplier * (perf.isLowEnd ? 0.5 : 1),
      baseAlpha: map(normalizedDist, 0, 1, 60, 30), // Plus visible au centre
      floatOffset: random(1000),
      dispersionLevel: 0 // Niveau de dispersion comme les particules principales
    });
  }
  
  console.log('Background particles created:', backgroundParticles.length);
}

function updateBackgroundParticles() {
  noStroke();
  
  for (let part of backgroundParticles) {
    // NE PLUS SKIP - on garde toutes les particules pour un fond dense
    
    // GESTION DU NIVEAU DE DISPERSION (synchronisé avec les lettres)
    if (scrollForce > 0.2) {
      part.dispersionLevel = min(1, part.dispersionLevel + 0.04);
    } else if (scrollForce < 0.05) {
      part.dispersionLevel = max(0, part.dispersionLevel - 0.015);
    }
    
    let dispersedWeight = part.dispersionLevel;
    let assembledWeight = 1 - part.dispersionLevel;
    
    // === MODE DISPERSÉ : Distribution organique sur tout l'écran ===
    if (dispersedWeight > 0.1) {
      // Flow field fort pour mouvement organique
      let x = floor(part.pos.x / scale);
      let y = floor(part.pos.y / scale);
      let index = constrain(x + y * cols, 0, flowField.length - 1);
      
      if (flowField[index]) {
        let force = flowField[index].copy();
        force.mult(0.4 * dispersedWeight); // Plus fort que avant
        part.acc.add(force);
      }
      
      // Mouvement brownien pour distribution organique
      let brownian = createVector(
        (noise(part.pos.x * 0.003 + part.floatOffset, zoff) - 0.5) * 0.8,
        (noise(part.pos.y * 0.003 + part.floatOffset, zoff + 100) - 0.5) * 0.8
      );
      brownian.mult(dispersedWeight);
      part.acc.add(brownian);
      
      // Force de dispersion au scroll actif
      if (scrollForce > 0.2) {
        let angle = noise(
          part.pos.x * 0.008,
          part.pos.y * 0.008,
          zoff + part.floatOffset
        ) * TWO_PI * 3;
        
        let disperse = p5.Vector.fromAngle(angle);
        disperse.mult(scrollForce * 0.6 * dispersedWeight);
        part.acc.add(disperse);
      }
      
      // Légère répulsion depuis le centre pour mieux répartir
      let fromCenter = createVector(part.pos.x - width / 2, part.pos.y - height * 0.15);
      fromCenter.normalize();
      fromCenter.mult(0.15 * dispersedWeight);
      part.acc.add(fromCenter);
      
      // Attraction douce vers les bords de la zone visible (distribution uniforme)
      let edgeForce = createVector(0, 0);
      let margin = width * 0.1;
      
      if (part.pos.x < margin) {
        edgeForce.x = map(part.pos.x, 0, margin, 0.2, 0);
      } else if (part.pos.x > width - margin) {
        edgeForce.x = map(part.pos.x, width - margin, width, 0, -0.2);
      }
      
      if (part.pos.y < margin) {
        edgeForce.y = map(part.pos.y, 0, margin, 0.2, 0);
      } else if (part.pos.y > height - margin) {
        edgeForce.y = map(part.pos.y, height - margin, height, 0, -0.2);
      }
      
      edgeForce.mult(dispersedWeight);
      part.acc.add(edgeForce);
    }
    
    // === MODE ASSEMBLÉ : Retour vers position originale ===
    if (assembledWeight > 0.1) {
      let toTarget = p5.Vector.sub(part.originalPos, part.pos);
      let d = toTarget.mag();
      
      toTarget.normalize();
      
      if (d < 50) {
        let m = map(d, 0, 50, 0, part.maxSpeed);
        toTarget.mult(m);
      } else {
        toTarget.mult(part.maxSpeed);
      }
      
      let steer = p5.Vector.sub(toTarget, part.vel);
      steer.limit(part.maxForce);
      steer.mult(assembledWeight * 1.5);
      part.acc.add(steer);
      
      // Flow field subtil en mode assemblé
      let x = floor(part.pos.x / scale);
      let y = floor(part.pos.y / scale);
      let index = constrain(x + y * cols, 0, flowField.length - 1);
      
      if (flowField[index]) {
        let force = flowField[index].copy();
        force.mult(0.2 * assembledWeight);
        part.acc.add(force);
      }
    }
    
    // Appliquer la physique
    part.vel.add(part.acc);
    
    let maxVel = lerp(part.maxSpeed, 2.5, dispersedWeight);
    part.vel.limit(maxVel);
    
    part.pos.add(part.vel);
    part.acc.mult(0);
    
    // Dessiner avec alpha variable selon dispersion
    let centerFade = map(part.distToCenter, 0, 1, 1, 0.5);
    let baseAlpha = part.baseAlpha * centerFade;
    
    // Alpha augmente légèrement en mode dispersé (fond plus visible)
    let alpha = lerp(baseAlpha, baseAlpha * 1.3, dispersedWeight * 0.5);
    
    fill(200, alpha);
    circle(part.pos.x, part.pos.y, part.size);
  }
}


function extractTextPoints() {
  titlePoints = [];
  subtitlePoints = [];
  
  let pg = createGraphics(width, height);
  pg.pixelDensity(1);
  pg.background('#0f0f0f');
  pg.fill('#e0e8ee');
  pg.noStroke();
  pg.textAlign(CENTER, CENTER);
  
  pg.textFont('Playfair Display, Georgia, serif');
  
  const titleSize = min(width * 0.7, 100);
  const subtitleSize = min(width * 0.035, 40);
  
  // Position en haut du canvas avec marge
  const topMargin = titleSize * 0.6; // Marge depuis le haut
  
  // Layout différent selon mobile/desktop
  if (!isMobile || !width < 768) {
    const spacing = titleSize * 0.6;
    
    pg.textSize(titleSize);
    pg.text('LIMINAL', width / 2, topMargin * 0.3);
    pg.text('JOY', width / 2, topMargin + spacing);
  } else {
    // DESKTOP : LIMINAL JOY sur une ligne en haut
    pg.textSize(titleSize);
    pg.text('LIMINAL JOY', width / 2, topMargin);
  }
  
  pg.loadPixels();
  
  // Sampling plus espacé sur mobile pour réduire les points
  const step = perf.isLowEnd ? 3 : 2;
  
  for (let y = 0; y < pg.height; y += step) {
    for (let x = 0; x < pg.width; x += step) {
      let idx = (x + y * pg.width) * 4;
      let r = pg.pixels[idx];
      
      if (r > 220) {
        // Tout va dans titlePoints puisqu'on n'a qu'un texte
        titlePoints.push(createVector(x, y));
      }
    }
  }
  
  console.log(
    'Title:', titlePoints.length,
    'Performance mode:', perf.isLowEnd ? 'LOW' : 'HIGH',
    'Layout:', isMobile ? 'MOBILE (stacked)' : 'DESKTOP (inline)',
    'Position: TOP'
  );
}

function createParticles() {
  particles = [];
  
  // Calculer le centre de la zone du texte
  let textCenterX = width / 2;
  let textCenterY = 0;
  
  if (titlePoints.length > 0) {
    let sumY = 0;
    for (let pt of titlePoints) {
      sumY += pt.y;
    }
    textCenterY = sumY / titlePoints.length;
  }
  
  // TITRE - Réduit drastiquement sur mobile avec concentration au centre du texte
  for (let i = 0; i < perf.particleCount.title; i++) {
    let pt = random(titlePoints);
    if (!pt) continue;
    
    // Calculer la distance du point au centre du texte (normalisée)
    let distToCenter = dist(pt.x, pt.y, textCenterX, textCenterY);
    let maxDist = width * 0.3;
    let normalizedDist = constrain(distToCenter / maxDist, 0, 1);
    
    let keepProbability = map(normalizedDist, 0, 1, 1, 0.4);
    
    if (random() > keepProbability) {
      continue;
    }
    
    // Dispersion initiale plus grande au centre, plus petite aux bords
    let dispersionAmount = map(normalizedDist, 0, 1, 80, 30);
    
    particles.push({
      pos: pt.copy().add(
        randomGaussian() * dispersionAmount,
        randomGaussian() * dispersionAmount
      ),
      vel: createVector(),
      acc: createVector(),
      target: pt.copy(),
      maxSpeed: 3,
      maxForce: 0.3,
      type: 'title',
      distToCenter: normalizedDist,
      isDispersed: false, // État de dispersion
      dispersionLevel: 0, // Niveau de dispersion (0-1)
      floatOffset: random(1000) // Offset pour le mouvement de flottement
    });
  }
  
  console.log('Particles created:', particles.length);
}

function updateFlowField() {
  let yoff = 0;
  
  for (let y = 0; y < rows; y++) {
    let xoff = 0;
    
    for (let x = 0; x < cols; x++) {
      // Générer un angle avec Perlin noise
      let angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
      
      // Créer un vecteur à partir de cet angle
      let v = p5.Vector.fromAngle(angle);
      v.setMag(0.5);
      
      let index = x + y * cols;
      flowField[index] = v;
      
      xoff += 0.1;
    }
    yoff += 0.1;
  }
}

function updateParticles() {
  noStroke();
  
  for (let part of particles) {
    // NE PLUS SKIP les particules hors écran - elles restent dispersées
    
    // Calculer la distance à la cible
    let toTarget = p5.Vector.sub(part.target, part.pos);
    let d = toTarget.mag();
    
    // GESTION DU NIVEAU DE DISPERSION (progressif)
    // Scroll down = augmente dispersion, Scroll up = diminue dispersion
    if (scrollForce > 0.2) {
      // Scroll DOWN : dispersion progressive
      part.dispersionLevel = min(1, part.dispersionLevel + 0.05);
      part.isDispersed = part.dispersionLevel > 0.3;
    } else if (scrollForce < 0.05) {
      // Scroll UP ou arrêt : retour progressif
      part.dispersionLevel = max(0, part.dispersionLevel - 0.02);
      part.isDispersed = part.dispersionLevel > 0.3;
    }
    
    // FORCES selon le niveau de dispersion
    let dispersedWeight = part.dispersionLevel;
    let assembledWeight = 1 - part.dispersionLevel;
    
    // === FORCES DE DISPERSION (actives quand dispersé) ===
    if (scrollForce > 0.2) {
      // Force explosive au scroll
      let angle = noise(
        part.pos.x * 0.01,
        part.pos.y * 0.01,
        zoff + part.floatOffset
      ) * TWO_PI * 2;
      
      let disperse = p5.Vector.fromAngle(angle);
      disperse.mult(scrollForce * 1.2 * dispersedWeight);
      part.acc.add(disperse);
    }
    
    // === FORCES DE FLOTTEMENT (actives quand dispersé et scroll faible) ===
    if (part.dispersionLevel > 0.1) {
      // Flow field pour le flottement organique
      let x = floor(part.pos.x / scale);
      let y = floor(part.pos.y / scale);
      let index = constrain(x + y * cols, 0, flowField.length - 1);
      
      if (flowField[index]) {
        let force = flowField[index].copy();
        force.mult(0.5 * dispersedWeight); // Proportionnel au niveau de dispersion
        part.acc.add(force);
      }
      
      // Mouvement brownien (flottement aléatoire)
      let brownian = createVector(
        (noise(part.pos.x * 0.005 + part.floatOffset, zoff) - 0.5) * 0.6,
        (noise(part.pos.y * 0.005 + part.floatOffset, zoff + 100) - 0.5) * 0.6
      );
      brownian.mult(dispersedWeight);
      part.acc.add(brownian);
      
      // Légère attraction vers le centre horizontal
      let distFromCenter = abs(part.pos.x - width / 2);
      if (distFromCenter > width * 0.45) {
        let toCenter = createVector(width / 2 - part.pos.x, 0);
        toCenter.normalize();
        toCenter.mult(0.1 * dispersedWeight);
        part.acc.add(toCenter);
      }
    }
    
    // === FORCES DE RETOUR (actives quand assemblé ou en réassemblage) ===
    if (assembledWeight > 0.1) {
      toTarget.normalize();
      
      // Ralentir en approchant de la cible
      if (d < 100) {
        let m = map(d, 0, 100, 0, part.maxSpeed);
        toTarget.mult(m);
      } else {
        toTarget.mult(part.maxSpeed);
      }
      
      let steer = p5.Vector.sub(toTarget, part.vel);
      steer.limit(part.maxForce);
      steer.mult(assembledWeight * 2); // Force de retour proportionnelle
      part.acc.add(steer);
      
      // Flow field subtil en mode assemblé
      let x = floor(part.pos.x / scale);
      let y = floor(part.pos.y / scale);
      let index = constrain(x + y * cols, 0, flowField.length - 1);
      
      if (flowField[index]) {
        let force = flowField[index].copy();
        force.mult(0.3 * assembledWeight);
        part.acc.add(force);
      }
      
      // Contrainte de distance maximale en mode assemblé
      let maxDist = part.type === 'title' ? 240 : 140;
      let offset = p5.Vector.sub(part.pos, part.target);
      
      if (offset.mag() > maxDist && assembledWeight > 0.5) {
        offset.setMag(maxDist);
        part.pos = p5.Vector.add(part.target, offset);
        part.vel.mult(0.4);
      }
    }
    
    // Appliquer la physique
    part.vel.add(part.acc);
    
    // Vitesse maximale selon le mode (blend entre les deux)
    let maxVel = lerp(part.maxSpeed, 2, dispersedWeight);
    part.vel.limit(maxVel);
    
    part.pos.add(part.vel);
    part.acc.mult(0);
    
    // Dessiner la particule
    drawParticle(part, d);
  }
}

function drawParticle(part, distance) {
  let alpha, size;
  
  // Tailles réduites sur mobile
  const sizeMultiplier = perf.isLowEnd ? 0.6 : 1;
  
  if (part.type === 'title') {
    if (part.dispersionLevel > 0.5) {
      // Mode dispersé : apparence flottante
      alpha = lerp(
        map(distance, 0, 120, 200, 80),
        150,
        part.dispersionLevel
      );
      size = lerp(
        map(distance, 0, 120, 2.2, 1),
        1.8,
        part.dispersionLevel
      ) * sizeMultiplier;
    } else {
      // Mode assemblé
      alpha = map(distance, 0, 120, 200, 80);
      size = map(distance, 0, 120, 2.2, 1) * sizeMultiplier;
    }
  } else {
    if (part.dispersionLevel > 0.5) {
      alpha = lerp(
        map(distance, 0, 80, 220, 140),
        180,
        part.dispersionLevel
      );
      size = lerp(
        map(distance, 0, 80, 1.6, 1.2),
        1.4,
        part.dispersionLevel
      ) * sizeMultiplier;
    } else {
      alpha = map(distance, 0, 80, 220, 140);
      size = map(distance, 0, 80, 1.6, 1.2) * sizeMultiplier;
    }
  }
  
  // Réduire l'alpha pour les particules loin du centre (sauf si dispersé)
  if (part.distToCenter && part.dispersionLevel < 0.5) {
    let centerFade = map(part.distToCenter, 0, 1, 1, 0.5);
    alpha *= centerFade;
  }
  
  fill(230, alpha);
  circle(part.pos.x, part.pos.y, size);
}

// Debounced resize - protection contre les redémarrages intempestifs
let resizeTimeout;
let lastWidth = 0;
let lastHeight = 0;

function windowResized() {
  const newWidth = windowWidth;
  const newHeight = windowHeight;
  
  // Ignorer les micro-changements de taille (scroll sur mobile, barre d'adresse, etc)
  if (Math.abs(newWidth - lastWidth) < 50 && Math.abs(newHeight - lastHeight) < 50) {
    return; // Ne rien faire
  }
  
  lastWidth = newWidth;
  lastHeight = newHeight;
  
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const parent = document.getElementById('app');
    resizeCanvas(parent.offsetWidth, window.innerHeight);
    
    updateGrid();
    
    // Réinitialiser les points et particules
    textPoints = [];
    particles = [];
    backgroundParticles = [];
    parasiteParticles = [];
    
    extractTextPoints();
    createParticles();
    createBackgroundParticles();
    createParasites();
    
    console.log('Canvas resized:', newWidth, 'x', newHeight);
  }, 250);
}

// Throttled scroll handler
let scrollTimeout;
let lastScrollTime = 0;

function onScroll() {
  const now = Date.now();
  
  // Throttle sur mobile (max 30fps)
  if (perf.isLowEnd && now - lastScrollTime < 33) {
    return;
  }
  
  lastScrollTime = now;
  
  let raw = window.scrollY / window.innerHeight;
  scrollForce = constrain(pow(raw, 1.4) * 3 * 2.5, 0, 3);
}

// Utiliser passive listener pour meilleures performances
window.addEventListener('scroll', onScroll, { passive: true });