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

// Fade in / out
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
}, { threshold: 0.3 });

// Centre écran (mobile)
const centerObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {

    if (!isSingleColumn()) return;

    const el = entry.target;
    const info = el.querySelectorAll('.item-info'); // sélection des infos
    const imagebox = el.querySelectorAll('.image-box');

    if (entry.isIntersecting) {
      el.classList.add('is-center');

      // retirer le flou
      el.classList.remove('blur');


      // auto-hover image
      if (!el._interval && el._images) {
        let i = 0;
        el._interval = setInterval(() => {
          i = (i + 1) % el._images.length;
          el.style.backgroundImage = `url(${el._images[i]})`;
        }, 1200);
      }

    } else {
      el.classList.remove('is-center');

      // ajouter le flou
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
    div.className = 'image-box visible';
    div.dataset.index = i;

    const images = [
      `images/${image1.trim()}`,
      `images/${image2.trim()}`
    ];

    div._images = images;
    div.style.backgroundImage = `url(${images[0]})`;

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

    let blurTimeout;

    div.addEventListener('mouseenter', () => {
      clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        document
          .querySelectorAll('div.image-box:not(:hover)')
          .forEach(el => el.classList.add('blur'));
      }, 80); // ajuste la latence (ms)
    });

    div.addEventListener('mouseleave', () => {
      clearTimeout(blurTimeout);
      document
        .querySelectorAll('div.image-box')
        .forEach(el => el.classList.remove('blur'));
    });

    /* ===== HOVER DESKTOP
    if (!isTouch) {
      let index = 0;
      let interval = null;

      div.addEventListener('mouseenter', () => {
        console.log(div)
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
    } ===== */

    /* ===== VIDEO PREVIEW DESKTOP ===== */
if (!isTouch) {
  let previewIframe = null;

  div.addEventListener('mouseenter', () => {
    if (previewIframe) return;

    const videoId = url.trim().split('watch?v=')[1];

    previewIframe = document.createElement('iframe');
    previewIframe.className = 'preview';
    previewIframe.src =
      `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1`;
    previewIframe.allow = 'autoplay; encrypted-media';

    div.appendChild(previewIframe);
    div.classList.add('is-preview');
  });

  div.addEventListener('mouseleave', () => {
    div.classList.remove('is-preview');

    if (previewIframe) {
      previewIframe.remove();
      previewIframe = null;
    }

    div.style.backgroundImage = `url(${images[0]})`;
  });
}

    /* ===== CLICK VIDEO ===== */
    div.addEventListener('click', () => {
      iframe.src = url.trim().replace("watch?v=", "embed/") + "?autoplay=1";
      modal.style.display = "flex";
    });

    container.appendChild(div);

    fadeObserver.observe(div);
    centerObserver.observe(div);
  });
}

/* =========================
   INIT
========================= */

loadCSVAndGenerateThumbnails('video.csv');

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


