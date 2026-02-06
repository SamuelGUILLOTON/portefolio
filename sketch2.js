// Variables globales
        let particles = [];
        let backgroundParticles = [];
        let parasiteParticles = [];
        let flowField = [];
        let cols, rows;
        let scale = 20;
        let zoff = 0;
        let scrollForce = 0;
        let lastScrollForce = 0;
        let breathingPhase = 0;
        let frameCounter = 0;

        // Configuration de performance
        let isMobile = false;
        let perf = {};

        function detectPerformance() {
            const ua = navigator.userAgent.toLowerCase();
            isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
            
            const isLowEnd = isMobile || window.innerWidth < 768;
            
            return {
                isMobile,
                isLowEnd,
                particleCount: isLowEnd ? 
                    { main: 12000, background: 6000, parasites: 3000 } : 
                    { main: 25000, background: 12000, parasites: 5000 },
                pixelDensity: isLowEnd ? 1 : Math.min(window.devicePixelRatio, 2),
                flowFieldScale: isLowEnd ? 30 : 20,
                updateInterval: isLowEnd ? 2 : 1
            };
        }

        function setup() {
            perf = detectPerformance();
            
            const parent = document.getElementById('app');
            let c = createCanvas(parent.offsetWidth, parent.offsetHeight);
            c.parent(parent);
            
            pixelDensity(perf.pixelDensity);
            
            scale = perf.flowFieldScale;
            cols = floor(width / scale);
            rows = floor(height / scale);
            
            // Créer tous les systèmes de particules
            createOrganicCloud();
            createBackgroundParticles();
            createParasites();
            updateGrid();
            
            console.log('Setup complet - Particules:', particles.length);
        }

        function draw() {
            frameCounter++;
            
            if (perf.isLowEnd && frameCounter % perf.updateInterval !== 0) {
                return;
            }
            
            background('#0f0f0f');
            
            // Respiration lente et fluide
            breathingPhase += 0.015;
            
            // Mise à jour des systèmes
            updateFlowField();
            updateBackgroundParticles();
            updateParticles();
            updateParasites();
            
            zoff += 0.005;
            lastScrollForce = scrollForce;
        }

        function createOrganicCloud() {
            particles = [];
            
            // Centre du nuage en haut de l'écran
            const centerX = width / 2;
            const centerY = height * 0.15;
            
            // Dimensions du nuage
            const cloudWidth = min(width * 0.4, 400);
            const cloudHeight = min(height * 0.25, 250);
            
            for (let i = 0; i < perf.particleCount.main; i++) {
                let angle = random(TWO_PI);
                let radiusVariation = random(1);
                
                // Distribution uniforme dans tout le nuage (racine carrée pour densité constante)
                let normalizedRadius = sqrt(radiusVariation);
                
                // Variation organique avec Perlin noise
                let noiseOffset = noise(i * 0.01, angle * 2) * 0.3;
                normalizedRadius = normalizedRadius * (1 + noiseOffset);
                
                // Forme elliptique
                let rx = normalizedRadius * cloudWidth;
                let ry = normalizedRadius * cloudHeight;
                
                let baseX = centerX + cos(angle) * rx;
                let baseY = centerY + sin(angle) * ry;
                
                // Variation organique supplémentaire
                let organicVariation = createVector(
                    (noise(i * 0.03, 0) - 0.5) * 40,
                    (noise(i * 0.03, 100) - 0.5) * 40
                );
                
                let x = baseX + organicVariation.x;
                let y = baseY + organicVariation.y;
                
                // Distance au centre normalisée
                let distToCenter = dist(x, y, centerX, centerY);
                let maxDist = max(cloudWidth, cloudHeight);
                let normalizedDist = constrain(distToCenter / maxDist, 0, 1);
                
                // Dispersion initiale uniforme
                let dispersionAmount = 12;
                
                particles.push({
                    pos: createVector(x, y).add(
                        randomGaussian() * dispersionAmount,
                        randomGaussian() * dispersionAmount
                    ),
                    vel: createVector(),
                    acc: createVector(),
                    target: createVector(x, y),
                    baseTarget: createVector(x, y),
                    maxSpeed: 3,
                    maxForce: 0.3,
                    distToCenter: normalizedDist,
                    isDispersed: false,
                    dispersionLevel: 0,
                    floatOffset: random(1000),
                    breathingOffset: random(TWO_PI),
                    size: 2.2 * (perf.isLowEnd ? 0.7 : 1)
                });
            }
        }

        function updateParticles() {
            noStroke();
            
            // Effet de respiration : expansion/contraction douce ±8%
            let breathingScale = 1 + sin(breathingPhase) * 0.08;
            let breathingSpeed = sin(breathingPhase * 2) * 0.02;
            
            for (let part of particles) {
                let centerX = width / 2;
                let centerY = height * 0.15;
                
                // Appliquer la respiration
                let toCenter = p5.Vector.sub(part.baseTarget, createVector(centerX, centerY));
                let breathingIntensity = map(part.distToCenter, 0, 1, 1, 0.5);
                let breathingVariation = sin(breathingPhase + part.breathingOffset) * breathingIntensity;
                
                toCenter.mult(breathingScale + breathingVariation * 0.05);
                part.target = p5.Vector.add(createVector(centerX, centerY), toCenter);
                
                let toTarget = p5.Vector.sub(part.target, part.pos);
                let d = toTarget.mag();
                
                // Gestion du niveau de dispersion
                if (scrollForce > 0.2) {
                    part.dispersionLevel = min(1, part.dispersionLevel + 0.05);
                    part.isDispersed = part.dispersionLevel > 0.3;
                } else if (scrollForce < 0.05) {
                    part.dispersionLevel = max(0, part.dispersionLevel - 0.02);
                    part.isDispersed = part.dispersionLevel > 0.3;
                }
                
                let dispersedWeight = part.dispersionLevel;
                let assembledWeight = 1 - part.dispersionLevel;
                
                // === FORCES DE DISPERSION ===
                if (scrollForce > 0.2) {
                    let angle = noise(
                        part.pos.x * 0.01,
                        part.pos.y * 0.01,
                        zoff + part.floatOffset
                    ) * TWO_PI * 2;
                    
                    let disperse = p5.Vector.fromAngle(angle);
                    disperse.mult(scrollForce * 1.2 * dispersedWeight);
                    part.acc.add(disperse);
                }
                
                // === FORCES DE FLOTTEMENT ===
                if (part.dispersionLevel > 0.1) {
                    let x = floor(part.pos.x / scale);
                    let y = floor(part.pos.y / scale);
                    let index = constrain(x + y * cols, 0, flowField.length - 1);
                    
                    if (flowField[index]) {
                        let force = flowField[index].copy();
                        force.mult(0.5 * dispersedWeight);
                        part.acc.add(force);
                    }
                    
                    // Mouvement brownien
                    let brownian = createVector(
                        (noise(part.pos.x * 0.005 + part.floatOffset, zoff) - 0.5) * 0.6,
                        (noise(part.pos.y * 0.005 + part.floatOffset, zoff + 100) - 0.5) * 0.6
                    );
                    brownian.mult(dispersedWeight);
                    part.acc.add(brownian);
                    
                    // Attraction vers le centre horizontal
                    let distFromCenter = abs(part.pos.x - width / 2);
                    if (distFromCenter > width * 0.45) {
                        let toCenter = createVector(width / 2 - part.pos.x, 0);
                        toCenter.normalize();
                        toCenter.mult(0.1 * dispersedWeight);
                        part.acc.add(toCenter);
                    }
                }
                
                // === FORCES DE RETOUR ===
                if (assembledWeight > 0.1) {
                    toTarget.normalize();
                    
                    if (d < 100) {
                        let m = map(d, 0, 100, 0, part.maxSpeed);
                        toTarget.mult(m);
                    } else {
                        toTarget.mult(part.maxSpeed);
                    }
                    
                    let steer = p5.Vector.sub(toTarget, part.vel);
                    steer.limit(part.maxForce);
                    steer.mult(assembledWeight * 2);
                    part.acc.add(steer);
                    
                    // Flow field subtil
                    let x = floor(part.pos.x / scale);
                    let y = floor(part.pos.y / scale);
                    let index = constrain(x + y * cols, 0, flowField.length - 1);
                    
                    if (flowField[index]) {
                        let force = flowField[index].copy();
                        force.mult(0.3 * assembledWeight);
                        part.acc.add(force);
                    }
                    
                    // Contrainte de distance maximale
                    let maxDist = 240;
                    let offset = p5.Vector.sub(part.pos, part.target);
                    
                    if (offset.mag() > maxDist && assembledWeight > 0.5) {
                        offset.setMag(maxDist);
                        part.pos = p5.Vector.add(part.target, offset);
                        part.vel.mult(0.4);
                    }
                }
                
                // Appliquer la physique
                part.vel.add(part.acc);
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
            
            if (part.dispersionLevel > 0.5) {
                // Mode dispersé
                alpha = lerp(
                    map(distance, 0, 120, 200, 80),
                    150,
                    part.dispersionLevel
                );
                size = lerp(part.size, part.size * 0.8, part.dispersionLevel);
            } else {
                // Mode assemblé avec respiration
                alpha = map(distance, 0, 120, 200, 80);
                let breathingSize = 1 + sin(breathingPhase + part.breathingOffset) * 0.15;
                size = part.size * breathingSize;
            }
            
            // Fade aux bords uniforme
            if (part.distToCenter && part.dispersionLevel < 0.5) {
                let centerFade = map(part.distToCenter, 0.7, 1, 1, 0.3);
                alpha *= centerFade;
            }
            
            fill(230, alpha);
            circle(part.pos.x, part.pos.y, size);
        }

        function createBackgroundParticles() {
            backgroundParticles = [];
            
            const centerX = width / 2;
            const centerY = height * 0.15;
            const numBackgroundParticles = perf.isLowEnd ? 1200 : 2400;
            
            for (let i = 0; i < numBackgroundParticles; i++) {
                let angle = random(TWO_PI);
                let radiusVariation = random(1);
                
                let baseRadius = pow(radiusVariation, 0.6) * min(width, height) * 0.5;
                let noiseOffset = noise(i * 0.01, angle) * 150;
                let radius = baseRadius + noiseOffset;
                
                let x = centerX + cos(angle) * radius;
                let y = centerY + sin(angle) * radius * 0.6;
                
                let distToCenter = dist(x, y, centerX, centerY);
                let maxDist = width * 0.4;
                let normalizedDist = constrain(distToCenter / maxDist, 0, 1);
                let sizeMultiplier = map(normalizedDist, 0, 1, 0.7, 1.3);
                
                backgroundParticles.push({
                    pos: createVector(x, y),
                    vel: createVector(),
                    acc: createVector(),
                    originalPos: createVector(x, y),
                    maxSpeed: 1.8,
                    maxForce: 0.25,
                    distToCenter: normalizedDist,
                    size: random(0.6, 1.8) * sizeMultiplier * (perf.isLowEnd ? 0.5 : 1),
                    baseAlpha: map(normalizedDist, 0, 1, 60, 30),
                    floatOffset: random(1000),
                    dispersionLevel: 0
                });
            }
        }

        function updateBackgroundParticles() {
            noStroke();
            
            for (let part of backgroundParticles) {
                if (scrollForce > 0.2) {
                    part.dispersionLevel = min(1, part.dispersionLevel + 0.04);
                } else if (scrollForce < 0.05) {
                    part.dispersionLevel = max(0, part.dispersionLevel - 0.015);
                }
                
                let dispersedWeight = part.dispersionLevel;
                let assembledWeight = 1 - part.dispersionLevel;
                
                // Forces de dispersion
                if (dispersedWeight > 0.1) {
                    let x = floor(part.pos.x / scale);
                    let y = floor(part.pos.y / scale);
                    let index = constrain(x + y * cols, 0, flowField.length - 1);
                    
                    if (flowField[index]) {
                        let force = flowField[index].copy();
                        force.mult(0.4 * dispersedWeight);
                        part.acc.add(force);
                    }
                    
                    let brownian = createVector(
                        (noise(part.pos.x * 0.003 + part.floatOffset, zoff) - 0.5) * 0.8,
                        (noise(part.pos.y * 0.003 + part.floatOffset, zoff + 100) - 0.5) * 0.8
                    );
                    brownian.mult(dispersedWeight);
                    part.acc.add(brownian);
                    
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
                }
                
                // Forces de retour
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
                }
                
                part.vel.add(part.acc);
                let maxVel = lerp(part.maxSpeed, 2.5, dispersedWeight);
                part.vel.limit(maxVel);
                part.pos.add(part.vel);
                part.acc.mult(0);
                
                let centerFade = map(part.distToCenter, 0, 1, 1, 0.5);
                let baseAlpha = part.baseAlpha * centerFade;
                let alpha = lerp(baseAlpha, baseAlpha * 1.3, dispersedWeight * 0.5);
                
                fill(200, alpha);
                circle(part.pos.x, part.pos.y, part.size);
            }
        }

        function createParasites() {
            parasiteParticles = [];
            
            const centerX = width / 2;
            const centerY = height * 0.15;
            
            for (let i = 0; i < perf.particleCount.parasites; i++) {
                let pt = random(particles);
                if (!pt) continue;
                
                let distToCenter = dist(pt.target.x, pt.target.y, centerX, centerY);
                let maxDist = width * 0.4;
                let normalizedDist = constrain(distToCenter / maxDist, 0, 1);
                let keepProbability = map(normalizedDist, 0, 1, 1, 0.35);
                
                if (random() > keepProbability) continue;
                
                let dispersionAmount = map(normalizedDist, 0, 1, 70, 25);
                
                parasiteParticles.push({
                    pos: pt.target.copy().add(
                        randomGaussian() * dispersionAmount,
                        randomGaussian() * dispersionAmount
                    ),
                    nx: random(1000),
                    ny: random(1000),
                    life: random(200, 800),
                    size: random(0.6, 2.4) * (perf.isLowEnd ? 0.6 : 1),
                    distToCenter: normalizedDist
                });
            }
        }

        function updateParasites() {
            noStroke();
            
            for (let i = parasiteParticles.length - 1; i >= 0; i--) {
                let p = parasiteParticles[i];
                
                if (p.pos.x < -50 || p.pos.x > width + 50 || 
                    p.pos.y < -50 || p.pos.y > height + 50) {
                    continue;
                }
                
                let dx = noise(p.nx + zoff) * 2 - 1;
                let dy = noise(p.ny + zoff) * 2 - 1;
                
                p.pos.x += dx * 0.6;
                p.pos.y += dy * 0.8;
                
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
                p.life -= scrollForce * scrollForce * 20;
                p.pos.y -= scrollForce * random(1.5, 3.5);
                
                let alpha = map(p.life, 0, 200, 0, 80, true);
                fill(220, alpha);
                circle(p.pos.x, p.pos.y, p.size);
                
                if (p.life <= 0 && scrollForce < 0.5) {
                    let pt = random(particles);
                    if (pt) {
                        p.pos = pt.target.copy().add(
                            randomGaussian() * 20,
                            randomGaussian() * 20
                        );
                        p.life = random(200, 600);
                    }
                }
            }
        }

        function updateFlowField() {
            let yoff = 0;
            
            for (let y = 0; y < rows; y++) {
                let xoff = 0;
                
                for (let x = 0; x < cols; x++) {
                    let angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
                    let v = p5.Vector.fromAngle(angle);
                    v.setMag(0.5);
                    
                    let index = x + y * cols;
                    flowField[index] = v;
                    
                    xoff += 0.1;
                }
                yoff += 0.1;
            }
        }

        function updateGrid() {
            cols = floor(width / scale);
            rows = floor(height / scale);
            flowField = new Array(cols * rows);
        }

        // Gestion du scroll
        let scrollTimeout;
        let lastScrollTime = 0;

        function onScroll() {
            const now = Date.now();
            
            if (perf.isLowEnd && now - lastScrollTime < 33) {
                return;
            }
            
            lastScrollTime = now;
            
            let raw = window.scrollY / window.innerHeight;
            scrollForce = constrain(pow(raw, 1.4) * 3 * 2.5, 0, 3);
            
            // Masquer l'indicateur de scroll
            const indicator = document.querySelector('.scroll-indicator');
            if (scrollForce > 0.1) {
                indicator.classList.add('hidden');
            } else {
                indicator.classList.remove('hidden');
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });

        // Gestion du resize
        let resizeTimeout;

        function windowResized() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const parent = document.getElementById('app');
                resizeCanvas(parent.offsetWidth, window.innerHeight);
                
                updateGrid();
                
                particles = [];
                backgroundParticles = [];
                parasiteParticles = [];
                
                createOrganicCloud();
                createBackgroundParticles();
                createParasites();
                
                console.log('Canvas resized');
            }, 250);
        }