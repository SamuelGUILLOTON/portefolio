const modal = document.getElementById('videoModal');
const iframe = document.getElementById('youtubeVideo');
const closeBtn = document.getElementById('closeModal');

// fermer le modal
closeBtn.addEventListener('click', () => {
    iframe.src = "";
    modal.style.display = "none";
});

modal.addEventListener('click', e => {
    if (e.target.id === 'videoModal') {
        iframe.src = "";
        modal.style.display = "none";
    }
});

async function loadCSVAndGenerateThumbnails(csvUrl) {
    const response = await fetch(csvUrl);
    const text = await response.text();
    const lines = text.split('\n').slice(1);
    const container = document.getElementById('gridContainer');

    // observer pour fade-in / fade-out avec delay
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const delay = entry.target.dataset.index * 0.1;

            if (entry.isIntersecting) {
                entry.target.style.transitionDelay = `${delay}s`;
                entry.target.classList.add('visible');
            } else {
                entry.target.style.transitionDelay = '0s';
                entry.target.classList.remove('visible');
            }
        });
    }, {
        threshold: 0.3
    });

    lines.forEach((line, i) => {
        if (!line.trim()) return;

        const [url, title, artist, image1, image2, role] = line.split(',');

        const div = document.createElement('div');
        div.className = 'image-box';
        div.style.backgroundImage = `url("images/${image1.trim()}")`;

        // index pour le stagger
        div.dataset.index = i;

        // info overlay
        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = `<div class='title'><strong>${title.trim()}</strong><br>${artist.trim()}</div><div class='role'><br>${role.trim()}<div>`;
        div.appendChild(info);

        // hover image1 → image2
        const images = [
            `images/${image1.trim()}`,
            `images/${image2.trim()}`
        ];

        let index = 0;
        let interval = null;

        div.addEventListener('mouseenter', () => {
            interval = setInterval(() => {
                index = (index + 1) % images.length;
                div.style.backgroundImage = `url(${images[index]})`;
            }, 1200);
        });

        div.addEventListener('mouseleave', () => {
            clearInterval(interval);
            interval = null;
            index = 0;
            div.style.backgroundImage = `url(${images[0]})`;
        });

        // clic → vidéo
        div.addEventListener('click', () => {
            iframe.src = url.trim().replace("watch?v=", "embed/") + "?autoplay=1";
            modal.style.display = "flex";
        });

        container.appendChild(div);
        observer.observe(div);
    });
}

// charger le CSV
loadCSVAndGenerateThumbnails('video.csv');
