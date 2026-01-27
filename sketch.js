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
  font = loadFont('fonts/BOONE.otf');
}

function setup() {
  const parent = document.getElementById('app');
  
  let c = createCanvas(
    parent.offsetWidth,
    window.innerHeight
  );
  c.parent(parent);
  
  pixelDensity(perf.pixelDensity);
  
  scale = perf.flowFieldScale;
  cols = floor(width / scale);
  rows = floor(height / scale);
  
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

  if (frameCounter % 4 === 0) {
    updateFlowField(); // 15 fps pour le flow = largement suffisant
  }

  background('#0f0f0f');
  updateBackgroundParticles();
  updateParticles();
  updateParasites();
  zoff += 0.005;
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
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < perf.particleCount.parasites; i++) {
    let pt = random(sourcePoints);
    if (!pt) continue;
    
    // Même logique de concentration au centre
    let distToCenter = dist(pt.x, pt.y, centerX, centerY);
    let maxDist = dist(0, 0, width / 2, height / 2);
    let normalizedDist = distToCenter / maxDist;
    
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
      size: random(0.6, 2.4),
      distToCenter: normalizedDist
    });
  }
  
  console.log('Parasites created:', parasiteParticles.length);
}

function createBackgroundParticles() {
  backgroundParticles = [];
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Nombre de particules de fond (moins que les particules de texte)
  const numBackgroundParticles = perf.isLowEnd ? 400 : 800;
  
  for (let i = 0; i < numBackgroundParticles; i++) {
    // Position aléatoire sur tout l'écran
    let x = random(width);
    let y = random(height);
    
    // Calculer distance au centre pour l'opacité
    let distToCenter = dist(x, y, centerX, centerY);
    let maxDist = dist(0, 0, width / 2, height / 2);
    let normalizedDist = distToCenter / maxDist;
    
    backgroundParticles.push({
      pos: createVector(x, y),
      vel: createVector(),
      acc: createVector(),
      target: createVector(x, y), // Position fixe comme target
      maxSpeed: 1.5,
      maxForce: 0.2,
      distToCenter: normalizedDist,
      size: random(0.8, 2),
      baseAlpha: random(30, 80)
    });
  }
  
  console.log('Background particles created:', backgroundParticles.length);
}

function updateBackgroundParticles() {
  noStroke();
  
  for (let part of backgroundParticles) {
    // Skip particles hors écran
    if (part.pos.x < -50 || part.pos.x > width + 50 || 
        part.pos.y < -50 || part.pos.y > height + 50) {
      continue;
    }
    
    // Légère attraction vers la position target
    let toTarget = p5.Vector.sub(part.target, part.pos);
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
    part.acc.add(steer);
    
    // Ajouter l'influence du flow field (plus subtile)
    let x = floor(part.pos.x / scale);
    let y = floor(part.pos.y / scale);
    let index = constrain(x + y * cols, 0, flowField.length - 1);
    
    if (flowField[index]) {
      let force = flowField[index].copy();
      force.mult(0.15); // Plus subtil que les particules de texte
      part.acc.add(force);
    }
    
    // Effet de scroll
    if (scrollForce > 0) {
      let angle = noise(
        part.pos.x * 0.01,
        part.pos.y * 0.01,
        zoff
      ) * TWO_PI * 2;
      
      let disperse = p5.Vector.fromAngle(angle);
      disperse.mult(scrollForce * 0.5);
      
      part.acc.add(disperse);
    }
    
    // Appliquer la physique
    part.vel.add(part.acc);
    part.vel.limit(part.maxSpeed);
    part.pos.add(part.vel);
    part.acc.mult(0);
    
    // Dessiner avec fade basé sur distance au centre
    let centerFade = map(part.distToCenter, 0, 1, 1, 0.3);
    let alpha = part.baseAlpha * centerFade;
    
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
  
  const titleSize = min(width * 0.12, 140);
  const subtitleSize = min(width * 0.035, 40);
  
  // Layout différent selon mobile/desktop
  if (isMobile || width < 768) {
      const blockCenterY = height * 0.48;
      const spacing = titleSize * 0.35;

      pg.textSize(titleSize);
      pg.text('LIMINAL', width / 2, blockCenterY - spacing);
      pg.text('JOY',     width / 2, blockCenterY + spacing);
  } else {
    // DESKTOP : LIMINAL JOY sur une ligne
    pg.textSize(titleSize);
    pg.text('LIMINAL JOY', width / 2, height / 2 - titleSize * 0.25);
    
    pg.textSize(subtitleSize);
    pg.text(
      "VISUAL BUILDER",
      width / 2,
      height / 2 + subtitleSize * 1.8
    );
  }
  
  pg.loadPixels();
  
  // Sampling plus espacé sur mobile pour réduire les points
  const step = perf.isLowEnd ? 3 : 2;
  
  for (let y = 0; y < pg.height; y += step) {
    for (let x = 0; x < pg.width; x += step) {
      let idx = (x + y * pg.width) * 4;
      let r = pg.pixels[idx];
      
      if (r > 220) {
        // Déterminer à quel texte appartient le point
        if (y < height / 2 + 10) {
          titlePoints.push(createVector(x, y));
        } else {
          subtitlePoints.push(createVector(x, y));
        }
      }
    }
  }
  
  console.log(
    'Title:', titlePoints.length,
    'Subtitle:', subtitlePoints.length,
    'Performance mode:', perf.isLowEnd ? 'LOW' : 'HIGH',
    'Layout:', isMobile ? 'MOBILE (stacked)' : 'DESKTOP (inline)'
  );
}

function createParticles() {
  particles = [];
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  // TITRE - Réduit drastiquement sur mobile avec concentration au centre
  for (let i = 0; i < perf.particleCount.title; i++) {
    let pt = random(titlePoints);
    if (!pt) continue;
    
    // Calculer la distance du point au centre (normalisée)
    let distToCenter = dist(pt.x, pt.y, centerX, centerY);
    let maxDist = dist(0, 0, width / 2, height / 2);
    let normalizedDist = distToCenter / maxDist;
    
    // Probabilité de garder la particule basée sur la distance au centre
    // Plus c'est loin du centre, moins il y a de particules
    // Probabilités augmentées pour plus de densité
    let keepProbability = map(normalizedDist, 0, 1, 1, 0.4);
    
    if (random() > keepProbability) {
      continue; // Skip cette particule
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
      distToCenter: normalizedDist // Stocker pour utilisation future
    });
  }
  
  // SOUS-TITRE (plus stable) avec même logique
  for (let i = 0; i < perf.particleCount.subtitle; i++) {
    let pt = random(subtitlePoints);
    if (!pt) continue;
    
    let distToCenter = dist(pt.x, pt.y, centerX, centerY);
    let maxDist = dist(0, 0, width / 2, height / 2);
    let normalizedDist = distToCenter / maxDist;
    
    let keepProbability = map(normalizedDist, 0, 1, 1, 0.5);
    
    if (random() > keepProbability) {
      continue;
    }
    
    let dispersionAmount = map(normalizedDist, 0, 1, 40, 15);
    
    particles.push({
      pos: pt.copy().add(
        randomGaussian() * dispersionAmount,
        randomGaussian() * dispersionAmount
      ),
      vel: createVector(),
      acc: createVector(),
      target: pt.copy(),
      maxSpeed: 2,
      maxForce: 0.6,
      type: 'subtitle',
      distToCenter: normalizedDist
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
    // Skip particles hors écran (avec marge)
    if (part.pos.x < -100 || part.pos.x > width + 100 || 
        part.pos.y < -100 || part.pos.y > height + 100) {
      continue;
    }
    
    // Force d'attraction vers la cible (steering behavior)
    let toTarget = p5.Vector.sub(part.target, part.pos);
    let d = toTarget.mag();
    let dispersion = scrollForce * scrollForce;
    
    // facteur de retour (scroll up)
    let returnBoost = map(scrollForce, 0, 1.5, 2.5, 1, true);
    
    toTarget.normalize();
    
    // Ralentir en approchant de la cible
    if (d < 100) {
      let m = map(d, 0, 100, 0, part.maxSpeed);
      toTarget.mult(m);
    } else {
      toTarget.mult(part.maxSpeed * returnBoost * (1 - dispersion));
    }
    
    let steer = p5.Vector.sub(toTarget, part.vel);
    steer.limit(part.maxForce * returnBoost);
    part.acc.add(steer);
    
    // Ajouter l'influence du flow field
    let x = floor(part.pos.x / scale);
    let y = floor(part.pos.y / scale);
    let index = constrain(x + y * cols, 0, flowField.length - 1);
    
    if (flowField[index]) {
      let force = flowField[index].copy();
      force.mult(0.3);
      part.acc.add(force);
    }
    
    if (scrollForce > 0) {
      let angle = noise(
        part.pos.x * 0.01,
        part.pos.y * 0.01,
        zoff
      ) * TWO_PI * 2;
      
      let disperse = p5.Vector.fromAngle(angle);
      disperse.mult(scrollForce * 0.8);
      
      part.acc.add(disperse);
    }
    
    // Appliquer la physique
    part.vel.add(part.acc);
    part.vel.limit(part.maxSpeed);
    part.pos.add(part.vel);
    
    let maxDist = part.type === 'title' ? 240 : 140;
    let offset = p5.Vector.sub(part.pos, part.target);
    
    if (offset.mag() > maxDist) {
      offset.setMag(maxDist);
      part.pos = p5.Vector.add(part.target, offset);
      part.vel.mult(0.4); // casser l'inertie
    }
    
    part.acc.mult(0);
    
    // Dessiner la particule
    drawParticle(part, d);
  }
}

function drawParticle(part, distance) {
  let alpha, size;
  
  if (part.type === 'title') {
    alpha = map(distance, 0, 120, 200, 80);
    size = map(distance, 0, 120, 2.2, 1);
  } else {
    // SOUS-TITRE = lisibilité
    alpha = map(distance, 0, 80, 220, 140);
    size = map(distance, 0, 80, 1.6, 1.2);
  }
  
  // Réduire l'alpha pour les particules loin du centre
  // Plus c'est loin, plus c'est transparent (fade plus doux)
  if (part.distToCenter) {
    let centerFade = map(part.distToCenter, 0, 1, 1, 0.5);
    alpha *= centerFade;
  }
  
  fill(230, alpha);
  circle(part.pos.x, part.pos.y, size);
}

// Debounced resize
let resizeTimeout;
function windowResized() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const parent = document.getElementById('app');
    resizeCanvas(parent.offsetWidth, window.innerHeight);
    
    updateGrid();
    
    // Réinitialiser les points et particules
    textPoints = [];
    particles = [];
    extractTextPoints();
    createParticles();
    createBackgroundParticles();
    createParasites();
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