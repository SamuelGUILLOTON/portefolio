        
        import * as THREE from 'three';

        const canvas = document.getElementById('cutting-mat');

        // la couche alpha définit la transparence, alpha a 0 = transparent et a 1 pas trans
        const ctx = canvas.getContext('2d', { alpha: false });
        
        let dpr = window.devicePixelRatio || 1;
        let canvasWidth, canvasHeight;
        
        const gridSize = 40; // Taille d'une cellule en pixels (1cm)
        const borderSize = 50; // Bordure avec les graduations
        
        function resizeCanvas() {
            dpr = window.devicePixelRatio || 1;
            
            canvasWidth = window.innerWidth;
            canvasHeight = Math.max(
                window.innerHeight,
                document.documentElement.scrollHeight
            );
            
            canvas.width = canvasWidth * dpr;
            canvas.height = canvasHeight * dpr;
            
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
            
            ctx.scale(dpr, dpr);
            
            drawCuttingMat();
        }
        
        function drawCuttingMat() {
            // Fond noir
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Zone de travail principale (plus claire)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(borderSize, borderSize, canvasWidth - borderSize * 2, canvasHeight - borderSize * 2);
            
            // Grille fine (millimètres)
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = borderSize + gridSize / 10; x < canvasWidth - borderSize; x += gridSize / 10) {
                if (Math.round((x - borderSize) / gridSize) * gridSize !== Math.round(x - borderSize)) {
                    ctx.moveTo(x, borderSize);
                    ctx.lineTo(x, canvasHeight - borderSize);
                }
            }
            for (let y = borderSize + gridSize / 10; y < canvasHeight - borderSize; y += gridSize / 10) {
                if (Math.round((y - borderSize) / gridSize) * gridSize !== Math.round(y - borderSize)) {
                    ctx.moveTo(borderSize, y);
                    ctx.lineTo(canvasWidth - borderSize, y);
                }
            }
            ctx.stroke();
            
            // Grille principale (centimètres)
            ctx.strokeStyle = '#383838';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = borderSize + gridSize; x < canvasWidth - borderSize; x += gridSize) {
                ctx.moveTo(x, borderSize);
                ctx.lineTo(x, canvasHeight - borderSize);
            }
            for (let y = borderSize + gridSize; y < canvasHeight - borderSize; y += gridSize) {
                ctx.moveTo(borderSize, y);
                ctx.lineTo(canvasWidth - borderSize, y);
            }
            ctx.stroke();
            
            // Lignes diagonales (caractéristique principale)
            ctx.strokeStyle = '#4a4a4a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Diagonales de coin supérieur gauche vers bas-droite
            const workWidth = canvasWidth - borderSize * 2;
            const workHeight = canvasHeight - borderSize * 2;
            const centerX = borderSize + workWidth / 2;
            const centerY = borderSize + workHeight / 2;
            
            // Diagonales principales depuis le centre
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(borderSize, borderSize);
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(canvasWidth - borderSize, borderSize);
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(borderSize, canvasHeight - borderSize);
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(canvasWidth - borderSize, canvasHeight - borderSize);
            ctx.stroke();
            
            // Bordures extérieures
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.strokeRect(borderSize, borderSize, canvasWidth - borderSize * 2, canvasHeight - borderSize * 2);
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
            
            // Graduations sur les bordures
            ctx.fillStyle = '#888';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Graduations horizontales (haut)
            for (let x = borderSize; x <= canvasWidth - borderSize; x += gridSize) {
                const cm = Math.round((x - borderSize) / gridSize);
                if (cm % 5 === 0) {
                    ctx.fillStyle = '#aaa';
                    ctx.font = 'bold 11px monospace';
                } else {
                    ctx.fillStyle = '#666';
                    ctx.font = '9px monospace';
                }
                ctx.fillText(cm, x, 25);
                
                // Petites marques
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, borderSize - 5);
                ctx.lineTo(x, borderSize);
                ctx.stroke();
            }
            
            // Graduations horizontales (bas)
            for (let x = borderSize; x <= canvasWidth - borderSize; x += gridSize) {
                const cm = Math.round((x - borderSize) / gridSize);
                if (cm % 5 === 0) {
                    ctx.fillStyle = '#aaa';
                    ctx.font = 'bold 11px monospace';
                } else {
                    ctx.fillStyle = '#666';
                    ctx.font = '9px monospace';
                }
                ctx.fillText(cm, x, canvasHeight - 25);
                
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, canvasHeight - borderSize);
                ctx.lineTo(x, canvasHeight - borderSize + 5);
                ctx.stroke();
            }
            
            // Graduations verticales (gauche)
            ctx.textAlign = 'center';
            ctx.save();
            for (let y = borderSize; y <= canvasHeight - borderSize; y += gridSize) {
                const cm = Math.round((y - borderSize) / gridSize);
                if (cm % 5 === 0) {
                    ctx.fillStyle = '#aaa';
                    ctx.font = 'bold 11px monospace';
                } else {
                    ctx.fillStyle = '#666';
                    ctx.font = '9px monospace';
                }
                ctx.translate(25, y);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(cm, 0, 0);
                ctx.rotate(Math.PI / 2);
                ctx.translate(-25, -y);
                
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(borderSize - 5, y);
                ctx.lineTo(borderSize, y);
                ctx.stroke();
            }
            ctx.restore();
            
            // Graduations verticales (droite)
            ctx.save();
            for (let y = borderSize; y <= canvasHeight - borderSize; y += gridSize) {
                const cm = Math.round((y - borderSize) / gridSize);
                if (cm % 5 === 0) {
                    ctx.fillStyle = '#aaa';
                    ctx.font = 'bold 11px monospace';
                } else {
                    ctx.fillStyle = '#666';
                    ctx.font = '9px monospace';
                }
                ctx.translate(canvasWidth - 25, y);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(cm, 0, 0);
                ctx.rotate(Math.PI / 2);
                ctx.translate(-(canvasWidth - 25), -y);
                
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(canvasWidth - borderSize, y);
                ctx.lineTo(canvasWidth - borderSize + 5, y);
                ctx.stroke();
            }
            ctx.restore();
            
            // Texte dans le coin supérieur gauche
            ctx.fillStyle = '#666';
            ctx.font = '9px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('CUTTING MAT', 10, 12);
            ctx.fillText('SELF-HEALING', 10, 22);
            ctx.fillText('A3 SIZE', 10, 32);
        }
        
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                const newHeight = Math.max(
                    window.innerHeight,
                    document.documentElement.scrollHeight
                );
                if (Math.abs(newHeight - canvasHeight) > 10) {
                    resizeCanvas();
                }
            }, 100);
        });
        
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 100);
        });
        
        const observer = new MutationObserver(function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(resizeCanvas, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        resizeCanvas();