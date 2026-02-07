const words = [
  "Graphic Designer",
  "Editor",
  "Art Director",
  "Cinematographer"
];
const el = document.getElementById("word");
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeLoop() {
  const current = words[wordIndex];
  
  if (!isDeleting) {
    el.textContent = current.slice(0, charIndex++);
    if (charIndex > current.length) {
      setTimeout(() => isDeleting = true, 1200);
    }
  } else {
    el.textContent = current.slice(0, charIndex--);
    if (charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
    }
  }
  setTimeout(typeLoop, isDeleting ? 60 : 90);
}
typeLoop();