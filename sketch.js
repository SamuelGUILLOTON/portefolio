// Variables globales
let particles = [];
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

function preload() {
  font = loadFont('fonts/BOONE.otf');
}

function setup() {
  let c = createCanvas(windowWidth, windowHeight); c.parent('app');
  
  cols = floor(width / scale);
  rows = floor(height / scale);
  
  // Extraire les points du texte
  extractTextPoints();
  
  // Créer les particules
  createParticles();

  createParasites();
}

function draw() {
  background(0);
  
  // Calculer le flow field avec Perlin noise
  updateFlowField();
  
  // Mettre à jour et dessiner les particules
  updateParticles();
  
  // Incrémenter le temps pour l'animation
  zoff += 0.005;

  updateParasites();
}

function updateParasites() {
  noStroke();

  for (let p of parasiteParticles) {
    let dx = noise(p.nx + zoff) * 2 - 1;
    let dy = noise(p.ny + zoff) * 2 - 1;

    p.pos.x += dx * 0.6;
    p.pos.y += dy * 0.8;

    p.nx += 0.01;
    p.ny += 0.01;
    p.life--;

    p.life -= scrollForce * scrollForce * 18;
    p.pos.y -= scrollForce * random(0.5, 1.2);

    let alpha = map(p.life, 0, 200, 0, 80, true);
    fill(220, alpha);
    circle(p.pos.x, p.pos.y, p.size);

    // régénération
    if (p.life <= 0) {
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

  for (let i = 0; i < 800; i++) {
    let pt = random(sourcePoints);
    if (!pt) continue;

    parasiteParticles.push({
      pos: pt.copy().add(
        randomGaussian() * 50,
        randomGaussian() * 50
      ),
      vel: createVector(),
      acc: createVector(),
      nx: random(1000),
      ny: random(1000),
      life: random(200, 800),
      size: random(0.6, 2.4)
    });
  }
}

function extractTextPoints() {
  titlePoints = [];
  subtitlePoints = [];

  let pg = createGraphics(width, height);
  pg.pixelDensity(1);
  pg.background(0);
  pg.fill(255);
  pg.noStroke();
  pg.textAlign(CENTER, CENTER);
  

  // TITRE
  //pg.textFont(font);
  pg.textSize(120);
  pg.text('LIMINAL JOY', width / 2, height / 2 - 30);

  // SOUS-TITRE (lisible)
  pg.textSize(30);
  pg.text("VISUAL BUILDER", width / 2, height / 2 + 60);

  pg.loadPixels();

  for (let y = 0; y < pg.height; y += 2) {
    for (let x = 0; x < pg.width; x += 2) {
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
    'Subtitle:', subtitlePoints.length
  );
}

function createParticles() {
  particles = [];

  // TITRE
  for (let i = 0; i < 2600; i++) {
    let pt = random(titlePoints);
    if (!pt) continue;

    particles.push({
      pos: pt.copy().add(randomGaussian() * 60, randomGaussian() * 60),
      vel: createVector(),
      acc: createVector(),
      target: pt.copy(),
      maxSpeed: 3,
      maxForce: 0.3,
      type: 'title'
    });
  }

  // SOUS-TITRE (plus stable)
  for (let i = 0; i < 1800; i++) {
    let pt = random(subtitlePoints);
    if (!pt) continue;

    particles.push({
      pos: pt.copy().add(randomGaussian() * 20, randomGaussian() * 20),
      vel: createVector(),
      acc: createVector(),
      target: pt.copy(),
      maxSpeed: 2,
      maxForce: 0.6,
      type: 'subtitle'
    });
  }
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
  for (let part of particles) {
    // Force d'attraction vers la cible (steering behavior)
    let toTarget = p5.Vector.sub(part.target, part.pos);
    let d = toTarget.mag();
    let dispersion = scrollForce * scrollForce; // courbe douce
    toTarget.normalize();
    
    // Ralentir en approchant de la cible
    if (d < 100) {
      let m = map(d, 0, 100, 0, part.maxSpeed);
      toTarget.mult(m);
    } else {
      toTarget.mult(part.maxSpeed * (1 - dispersion));
    }
    
    let steer = p5.Vector.sub(toTarget, part.vel);
    steer.limit(part.maxForce);
    part.acc.add(steer);
    
    // Ajouter l'influence du flow field
    let x = floor(part.pos.x / scale);
    let y = floor(part.pos.y / scale);
    let index = x + y * cols;
    
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

  fill(230, alpha);
  noStroke();
  circle(part.pos.x, part.pos.y, size);
}

// Optionnel : redimensionner le canvas si la fenêtre change
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Réinitialiser les points et particules
  textPoints = [];
  particles = [];
  extractTextPoints();
  createParticles();
  createParasites();
}

function onScroll() {
    let raw = window.scrollY / window.innerHeight;
    scrollForce = constrain(pow(raw, 1.4) * 3 * 2.5, 0, 3); // force plus forte
}

window.addEventListener('scroll', onScroll);