/* =========================
   CLOUDINARY
========================= */

const CLOUD_NAME = "dthe9fzpc";

const cloudinaryPreview = (id) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto,eo_6/${id}.mp4`;

const cloudinaryFull = (id) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto,so_25/${id}.mp4`;

const cloudinaryThumbnail = (tc, id) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto,${tc || 1}/${id}.jpg`;

/* =========================
   DOM
========================= */

const modal = document.getElementById('videoModal');
const iframe = document.getElementById('youtubeVideo');
const closeBtn = document.getElementById('closeModal');
const container = document.getElementById('gridContainer');

/* =========================
   DEVICE DETECTION
========================= */

const isTouch = window.matchMedia('(hover: none)').matches;
const isSingleColumn = () => window.innerWidth < 772;

// Détection iOS spécifique
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

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
   VIDEO HELPERS (iOS)
========================= */

// Force le chargement des métadonnées vidéo sur iOS
function preloadVideoForIOS(video) {
  if (isIOS) {
    video.load();
  }
}

// Gestion améliorée de la lecture vidéo pour iOS
function playVideoSafely(video) {
  if (!video) return Promise.reject();
  
  // Sur iOS, s'assurer que la vidéo est prête
  if (isIOS && video.readyState < 2) {
    return new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', () => {
        video.play().then(resolve).catch(reject);
      }, { once: true });
      video.load();
    });
  }
  
  return video.play().catch(() => {});
}

// Pause vidéo avec reset
function stopVideo(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  
  // Sur iOS, libérer les ressources
  if (isIOS) {
    video.src = video.src; // Force le reset
  }
}

/* =========================
   OBSERVERS
========================= */

// Fade in / out
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const delay = isSingleColumn() ? 0 : entry.target.dataset.index * 0.1;

    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = `${delay}s`;
      entry.target.classList.add('visible');
    } else {
      entry.target.style.transitionDelay = '0s';
      entry.target.classList.remove('visible');
    }
  });
}, {
  threshold: isSingleColumn() ? 0.1 : 0.3,
  rootMargin: '50px'
});

// Centre écran mobile (optimisé pour iOS)
const centerObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!isSingleColumn()) return;

    const el = entry.target;
    const video = el.querySelector('video');
    const thumbnail = el.querySelector('.thumbnail-image');

    if (entry.isIntersecting) {
      // Blur les autres éléments
      document.querySelectorAll('.image-box').forEach(box => {
        if (box !== el) {
          box.classList.add('blur');
          const v = box.querySelector('video');
          const t = box.querySelector('.thumbnail-image');
          if (v) {
            v.style.opacity = '0';
            stopVideo(v);
          }
          if (t) {
            t.style.opacity = '1';
          }
        }
      });

      el.classList.add('is-center');
      el.classList.remove('blur');

      // Afficher la preview quand centré sur mobile
      if (thumbnail) thumbnail.style.opacity = '0';
      if (video) {
        video.style.opacity = '1';
        
        // Sur iOS, utiliser la fonction améliorée
        if (isIOS) {
          playVideoSafely(video);
        } else {
          video.play().catch(() => {});
        }
      }
    } else {
      el.classList.remove('is-center');
      el.classList.add('blur');

      if (video) {
        video.style.opacity = '0';
        stopVideo(video);
      }
      if (thumbnail) {
        thumbnail.style.opacity = '1';
      }
    }
  });
}, {
  rootMargin: '-40% 0px -40% 0px',
  threshold: 0.01
});

/* =========================
   GRID CLOUDINARY VIDEOS
========================= */

function generateThumbnailsFromCloudinary(videos) {
  videos.forEach((videoData, i) => {

    const div = document.createElement('div');
    div.className = 'image-box';
    div.dataset.index = i;

    /* ===== THUMBNAIL IMAGE ===== */
    const thumbnail = document.createElement('img');
    thumbnail.className = 'thumbnail-image';
    thumbnail.src = cloudinaryThumbnail(videoData.timecode, videoData.public_id);
    thumbnail.alt = `${videoData.title} - ${videoData.artist}`;
    thumbnail.style.cssText = 'position: absolute; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s ease;';
    div.appendChild(thumbnail);

    /* ===== VIDEO PREVIEW ===== */
    const video = document.createElement('video');
    video.className = 'preview-video';
    video.src = cloudinaryPreview(videoData.public_id);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    
    // Attributs supplémentaires pour iOS
    if (isIOS) {
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x-webkit-airplay', 'deny');
    }
    
    video.style.cssText = 'opacity: 0; transition: opacity 0.3s ease;';
    div.appendChild(video);

    /* ===== INFO ===== */
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `
      <div class="title">
        <strong>${videoData.title}</strong><br>${videoData.artist}
      </div>
      <div class="role">${videoData.role}</div>
    `;
    div.appendChild(info);

    /* ===== HOVER DESKTOP ===== */
    if (!isTouch) {
      let blurTimeout;

      div.addEventListener('mouseenter', () => {
        clearTimeout(blurTimeout);
        
        thumbnail.style.opacity = '0';
        video.style.opacity = '1';
        video.play().catch(() => {});
        
        blurTimeout = setTimeout(() => {
          document
            .querySelectorAll('.image-box:not(:hover)')
            .forEach(el => el.classList.add('blur'));
        }, 80);
      });

      div.addEventListener('mouseleave', () => {
        clearTimeout(blurTimeout);
        
        thumbnail.style.opacity = '1';
        video.style.opacity = '0';
        stopVideo(video);
        
        document
          .querySelectorAll('.image-box')
          .forEach(el => el.classList.remove('blur'));
      });
    }

    /* ===== MOBILE TOUCH HANDLING ===== */
    let isPreviewPlaying = false;
    let tapTimeout = null;

    /* ===== CLICK → PREVIEW (mobile) or MODAL (desktop)
    div.addEventListener('click', (e) => {
      // Desktop: ouvrir le modal directement
      if (!isTouch) {
        iframe.src = cloudinaryFull(videoData.public_id);
        modal.style.display = "flex";
        return;
      }

      // Mobile: premier tap = preview, second tap = modal
      if (!isPreviewPlaying) {
        e.stopPropagation();
        thumbnail.style.opacity = '0';
        video.style.opacity = '1';
        
        // Utiliser la fonction optimisée pour iOS
        if (isIOS) {
          playVideoSafely(video);
        } else {
          video.play().catch(() => {});
        }
        
        isPreviewPlaying = true;
        
        // Sur iOS, reset automatique après 10 secondes si pas de second tap
        if (isIOS) {
          clearTimeout(tapTimeout);
          tapTimeout = setTimeout(() => {
            if (isPreviewPlaying) {
              thumbnail.style.opacity = '1';
              video.style.opacity = '0';
              stopVideo(video);
              isPreviewPlaying = false;
            }
          }, 10000);
        }
      } else {
        clearTimeout(tapTimeout);
        iframe.src = cloudinaryFull(videoData.public_id);
        modal.style.display = "flex";
        
        // Reset preview state
        thumbnail.style.opacity = '1';
        video.style.opacity = '0';
        stopVideo(video);
        isPreviewPlaying = false;
      }
    });
 ===== */

    /* ===== CLICK → MODAL ===== */
    div.addEventListener('click', () => {
      // Ouvrir le modal avec la vidéo complète
      iframe.src = cloudinaryFull(videoData.public_id);
      modal.style.display = "flex";
      
      // Nettoyer la preview si elle tourne
      if (video.readyState > 0) {
        thumbnail.style.opacity = '1';
        video.style.opacity = '0';
        stopVideo(video);
      }
    });

    
    // Sur iOS, précharger les métadonnées au scroll
    if (isIOS) {
      const loadObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            preloadVideoForIOS(video);
            loadObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });
      
      loadObserver.observe(div);
    }

    container.appendChild(div);

    fadeObserver.observe(div);
    centerObserver.observe(div);
  });
}

/* =========================
   LEGAL MODAL
========================= */

const legalModal = document.getElementById("legalModal");
const legalClose = document.querySelector(".legal-close");

document.querySelector("footer p:last-child").addEventListener("click", () => {
  legalModal.classList.add("active");
});

legalClose.addEventListener("click", () => {
  legalModal.classList.remove("active");
});

legalModal.addEventListener("click", (e) => {
  if (e.target === legalModal) {
    legalModal.classList.remove("active");
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    legalModal.classList.remove("active");
  }
});

/* =========================
   iOS SPECIFIC FIXES
========================= */

// Empêcher le bounce scroll sur iOS si nécessaire
/* NOUVELLE VERSION - Plus permissive */
if (isIOS) {
  // Uniquement empêcher le bounce sur le body, pas sur le contenu
  document.body.addEventListener('touchmove', (e) => {
    // Ne bloquer QUE si on touche directement le body
    if (e.target === document.body) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Fix orientation
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  });
}

/* =========================
   INIT (JSON)
========================= */

fetch('./videos.json')
  .then(res => res.json())
  .then(videos => {
    generateThumbnailsFromCloudinary(videos);
  })
  .catch(err => {
    console.error('Erreur chargement video.json', err);
  });