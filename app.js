// app.js - Home Page Script (User)
const firebaseConfig = {
  apiKey: "AIzaSyB1_u4tQjJmIvzHNj0nmxjBM2nDORpZ38U",
  authDomain: "quiz-warohmah.firebaseapp.com",
  projectId: "quiz-warohmah",
  storageBucket: "quiz-warohmah.firebasestorage.app",
  messagingSenderId: "271883195532",
  appId: "1:271883195532:web:723ea686eb8cba402397a9",
  measurementId: "G-J39252WX95"
};

let firebaseApp, firebaseAuth, firebaseFirestore;
async function loadFirebase() {
  if (typeof firebase === 'undefined') {
    await Promise.all([
      loadScript("https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"),
      loadScript("https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"),
      loadScript("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js")
    ]);
  }
  if (!firebase.apps.length) firebaseApp = firebase.initializeApp(firebaseConfig);
  else firebaseApp = firebase.apps[0];
  firebaseAuth = firebase.auth;
  firebaseFirestore = firebase.firestore;
  return { firebaseApp, firebaseAuth, firebaseFirestore };
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const mataKuliahList = document.getElementById('mataKuliahList');
const refreshBtn = document.getElementById('refreshBtn');
const themeToggle = document.getElementById('themeToggle');
const totalCourses = document.getElementById('totalCourses');
const totalQuestions = document.getElementById('totalQuestions');

let isOnline = navigator.onLine;
let cachedData = null;

async function loadMataKuliah() {
  try {
    mataKuliahList.innerHTML = `<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Memuat data...</p></div>`;
    if (cachedData && !isOnline) { displayMataKuliah(cachedData); return; }
    const { firebaseFirestore } = await loadFirebase();
    const db = firebaseFirestore();
    const q = firebaseFirestore.query(firebaseFirestore.collection(db, "mata_kuliah"), firebaseFirestore.orderBy("nama", "asc"));
    const snapshot = await firebaseFirestore.getDocs(q);
    const mataKuliah = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    cachedData = mataKuliah;
    if (mataKuliah.length === 0) {
      mataKuliahList.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-book"></i></div><h3>Belum ada mata kuliah</h3><p>Silakan hubungi admin</p><a href="admin.html" class="btn primary"><i class="fas fa-user-shield"></i> Login Admin</a></div>`;
      totalCourses.textContent = "0 Mata Kuliah";
      totalQuestions.textContent = "0 Soal";
      return;
    }
    let totalSoal = 0;
    for (const mk of mataKuliah) {
      try {
        const coursesSnapshot = await firebaseFirestore.getDocs(firebaseFirestore.collection(db, "mata_kuliah", mk.id, "courses"));
        for (const courseDoc of coursesSnapshot.docs) totalSoal += courseDoc.data().totalSoal || 0;
      } catch (e) {}
    }
    totalCourses.textContent = `${mataKuliah.length} Mata Kuliah`;
    totalQuestions.textContent = `${totalSoal} Soal`;
    displayMataKuliah(mataKuliah, totalSoal);
  } catch (error) {
    if (cachedData) { displayMataKuliah(cachedData); return; }
    mataKuliahList.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 style="color:#ff3b30;">Gagal Memuat Data</h3><p>${error.message}</p><button onclick="location.reload()" class="btn secondary"><i class="fas fa-redo"></i> Coba Lagi</button></div>`;
  }
}

function displayMataKuliah(mataKuliah, totalSoal = 0) {
  totalCourses.textContent = `${mataKuliah.length} Mata Kuliah`;
  totalQuestions.textContent = `${totalSoal} Soal`;
  mataKuliahList.innerHTML = mataKuliah.map(mk => `
    <div class="course-item slide-in">
      <div class="left">
        <div class="course-badge">${mk.nama?.charAt(0) || 'M'}</div>
        <div>
          <h3>${mk.nama || 'Tanpa Nama'}</h3>
          <p class="muted">${mk.description || 'Tidak ada deskripsi'}</p>
          <div style="display:flex;gap:12px;margin-top:8px;"><span class="badge">${mk.totalCourses||0} Course</span></div>
        </div>
      </div>
      <a href="quiz.html?mataKuliah=${mk.id}" class="btn primary"><i class="fas fa-play"></i> Mulai</a>
    </div>
  `).join('');
}

function initTheme() {
  const savedTheme = localStorage.getItem('quiz-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('quiz-theme', newTheme);
  themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

refreshBtn.addEventListener('click', loadMataKuliah);
themeToggle.addEventListener('click', toggleTheme);
window.addEventListener('online', () => { isOnline = true; loadMataKuliah(); });
window.addEventListener('offline', () => { isOnline = false; });

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setTimeout(loadMataKuliah, 100);
});
window.toggleTheme = toggleTheme;
