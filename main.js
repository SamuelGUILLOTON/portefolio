const modal = document.getElementById('videoModal');
const iframe = document.getElementById('youtubeVideo');
const closeBtn = document.getElementById('closeModal');
const container = document.getElementById('gridContainer');

const isTouch = window.matchMedia('(hover: none)').matches;
const isSingleColumn = () => window.innerWidth < 772;

/* =========================
   MODAL VIDEO
========================= */

closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

function closeModal() {
  iframe.src = "";
  modal.style.display = "none";
}

/* =========================
   OBSERVERS
========================= */

// Fade in / out - Optimisé
const fadeObserver = new IntersectionObserver(entries => {
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
  threshold: 0.3,
  rootMargin: '50px' // Préchargement anticipé
});

// Centre écran (mobile) - Optimisé
const centerObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!isSingleColumn()) return;
    
    const el = entry.target;
    
    if (entry.isIntersecting) {
      // Flouter toutes les autres vignettes
      document.querySelectorAll('.image-box').forEach(box => {
        if (box !== el) {
          box.classList.add('blur');
          box.classList.remove('is-center');
          
          // Arrêter l'animation des autres vignettes
          if (box._interval) {
            clearInterval(box._interval);
            box._interval = null;
            if (box._images) {
              box.style.backgroundImage = `url(${box._images[0]})`;
            }
          }
        }
      });
      
      el.classList.add('is-center');
      el.classList.remove('blur');
      
      // auto-hover image pour la vignette centrée uniquement
      if (!el._interval && el._images) {
        let i = 0;
        el._interval = setInterval(() => {
          i = (i + 1) % el._images.length;
          el.style.backgroundImage = `url(${el._images[i]})`;
        }, 1200);
      }
    } else {
      el.classList.remove('is-center');
      el.classList.add('blur');
      
      clearInterval(el._interval);
      el._interval = null;
      
      if (el._images) {
        el.style.backgroundImage = `url(${el._images[0]})`;
      }
    }
  });
}, {
  rootMargin: '-40% 0px -40% 0px',
  threshold: 0.01
});

/* =========================
   LAZY LOADING IMAGES
========================= */

const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const div = entry.target;
      
      // Charger l'image seulement quand visible
      if (div._images && !div._imagesLoaded) {
        div._images.forEach(src => {
          const img = new Image();
          img.src = src;
        });
        div._imagesLoaded = true;
      }
      
      imageObserver.unobserve(div);
    }
  });
}, {
  rootMargin: '200px' // Commencer à charger 200px avant
});

/* =========================
   LOAD CSV & GRID
========================= */

async function loadCSVAndGenerateThumbnails(csvUrl) {
  const response = await fetch(csvUrl);
  const text = await response.text();
  const lines = text.split('\n').slice(1);
  
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    
    const [
      url,
      title,
      artist,
      image1,
      image2,
      role
    ] = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
      .map(s => s.replace(/"/g, ''));
    
    const div = document.createElement('div');
    div.className = 'image-box';
    div.dataset.index = i;
    
    const images = [
      `images/${image1.trim()}`,
      `images/${image2.trim()}`
    ];
    
    div._images = images;
    div._imagesLoaded = false;
    
    // Placeholder background (sera remplacé par lazy loading)
    div.style.backgroundColor = '#1a1a1a';
    
    // INFO
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `
      <div class="title">
        <strong>${title.trim()}</strong><br>${artist.trim()}
      </div>
      <div class="role">${role.trim()}</div>
    `;
    div.appendChild(info);
    
    // BLUR HOVER (desktop uniquement)
    if (!isTouch) {
      let blurTimeout;
      
      div.addEventListener('mouseenter', () => {
        clearTimeout(blurTimeout);
        blurTimeout = setTimeout(() => {
          document
            .querySelectorAll('div.image-box:not(:hover)')
            .forEach(el => el.classList.add('blur'));
        }, 80);
      });
      
      div.addEventListener('mouseleave', () => {
        clearTimeout(blurTimeout);
        document
          .querySelectorAll('div.image-box')
          .forEach(el => el.classList.remove('blur'));
      });
    }
    
    /* ===== VIDEO PREVIEW DESKTOP ===== */
    if (!isTouch) {
      let previewIframe = null;
      let previewTimeout = null;
      
      div.addEventListener('mouseenter', () => {
        // Délai avant de charger la preview pour éviter les chargements inutiles
        previewTimeout = setTimeout(() => {
          if (previewIframe) return;
          
          const videoId = url.trim().split('watch?v=')[1];
          
          previewIframe = document.createElement('iframe');
          previewIframe.className = 'preview';
          previewIframe.src =
            `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1`;
          previewIframe.allow = 'autoplay; encrypted-media';
          
          div.appendChild(previewIframe);
          div.classList.add('is-preview');
        }, 300); // Attendre 300ms avant de charger
      });
      
      div.addEventListener('mouseleave', () => {
        clearTimeout(previewTimeout);
        div.classList.remove('is-preview');
        
        if (previewIframe) {
          previewIframe.remove();
          previewIframe = null;
        }
        
        if (div._images && div._imagesLoaded) {
          div.style.backgroundImage = `url(${div._images[0]})`;
        }
      });
    }
    
    /* ===== CLICK VIDEO ===== */
    div.addEventListener('click', () => {
      iframe.src = url.trim().replace("watch?v=", "embed/") + "?autoplay=1";
      modal.style.display = "flex";
    });
    
    container.appendChild(div);
    
    // Lazy load des images
    imageObserver.observe(div);
    
    // Observers pour animations
    fadeObserver.observe(div);
    centerObserver.observe(div);
    
    // Charger la première image après un court délai
    setTimeout(() => {
      if (div._images) {
        div.style.backgroundImage = `url(${div._images[0]})`;
      }
    }, i * 50); // Stagger le chargement
  });
}

/* =========================
   LEGAL MODAL
========================= */

const legalModal = document.getElementById("legalModal");
const legalClose = document.querySelector(".legal-close");

// ouvrir depuis le footer
document.querySelector("footer p:last-child").addEventListener("click", () => {
  legalModal.classList.add("active");
});

// fermer
legalClose.addEventListener("click", () => {
  legalModal.classList.remove("active");
});

// clic en dehors
legalModal.addEventListener("click", (e) => {
  if (e.target === legalModal) {
    legalModal.classList.remove("active");
  }
});

// ESC
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    legalModal.classList.remove("active");
  }
});

/* =========================
   INIT
========================= */

loadCSVAndGenerateThumbnails('video.csv');