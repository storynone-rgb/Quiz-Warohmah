// user.js - Untuk website 2 (quiz-warohmah)
// Tidak ada sisa konfigurasi dari website 1

const firebaseConfig = {
  apiKey: "AIzaSyB1_u4tQjJmIvzHNj0nmxjBM2nDORpZ38U",
  authDomain: "quiz-warohmah.firebaseapp.com",
  projectId: "quiz-warohmah",
  storageBucket: "quiz-warohmah.firebasestorage.app",
  messagingSenderId: "271883195532",
  appId: "1:271883195532:web:723ea686eb8cba402397a9"
};

// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  addDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get mataKuliahId from URL
const urlParams = new URLSearchParams(window.location.search);
const mataKuliahId = urlParams.get('mataKuliah') || null;

// State
let currentCourse = null;
let originalQuestions = [];
let randomizedQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timer = 0;
let timerInterval = null;

// DOM Elements
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const coursesSection = document.getElementById('coursesSection');
const coursesList = document.getElementById('coursesList');
const backBtn = document.getElementById('backBtn');
const quizSection = document.getElementById('quizSection');
const quizProgress = document.getElementById('quizProgress');
const quizContainer = document.getElementById('quizContainer');
const timerDisplay = document.getElementById('timer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const finishBtn = document.getElementById('finishBtn');
const quitBtn = document.getElementById('quitBtn');
const themeToggle = document.getElementById('themeToggle');

// ========== FUNGSI NATURAL SORT ==========
function naturalSort(a, b) {
  const extractNumbers = (str) => {
    const matches = str.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  };

  const aNumbers = extractNumbers(a.nama || '');
  const bNumbers = extractNumbers(b.nama || '');
  
  if (aNumbers.length > 0 && bNumbers.length > 0) {
    if (aNumbers[0] !== bNumbers[0]) {
      return aNumbers[0] - bNumbers[0];
    }
  }
  
  return (a.nama || '').localeCompare(b.nama || '', undefined, { 
    numeric: true, 
    sensitivity: 'base' 
  });
}

// ========== FUNGSI PENGACAKAN ==========
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function prepareRandomizedQuiz(questions) {
  if (!questions || questions.length === 0) return [];
  
  const shuffledQuestions = shuffleArray(questions);
  
  return shuffledQuestions.map(question => {
    const options = question.pilihan || question.options || {};
    const correctAnswer = question.jawaban || question.correct;
    
    const optionsArray = Object.entries(options);
    if (optionsArray.length === 0) return question;
    
    const shuffledOptions = shuffleArray(optionsArray);
    let newCorrectAnswer = '';
    const newOptions = {};
    
    shuffledOptions.forEach(([originalKey, value], idx) => {
      const newKey = String.fromCharCode(65 + idx);
      newOptions[newKey] = value;
      
      if (originalKey === correctAnswer) {
        newCorrectAnswer = newKey;
      }
    });
    
    if (!newCorrectAnswer && correctAnswer && options[correctAnswer]) {
      const correctText = options[correctAnswer];
      Object.entries(newOptions).forEach(([key, value]) => {
        if (value === correctText) {
          newCorrectAnswer = key;
        }
      });
    }
    
    return {
      ...question,
      pilihan: newOptions,
      jawaban: newCorrectAnswer,
      originalCorrectAnswer: correctAnswer
    };
  });
}

// ========== FUNGSI UTAMA ==========
async function loadCourses() {
  if (!mataKuliahId) {
    coursesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3 style="margin-bottom: 8px;">Mata Kuliah Tidak Ditemukan</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Silakan pilih mata kuliah dari halaman utama</p>
        <a href="index.html" class="btn primary">
          <i class="fas fa-home"></i> Kembali ke Home
        </a>
      </div>
    `;
    return;
  }
  
  try {
    // Hapus orderBy karena kita akan sorting manual dengan naturalSort
    const coursesSnapshot = await getDocs(collection(db, "mata_kuliah", mataKuliahId, "courses"));
    let courses = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    courses.sort(naturalSort);
    
    if (courses.length === 0) {
      coursesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-folder-open"></i>
          </div>
          <h3 style="margin-bottom: 8px;">Belum ada Course</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Tidak ada course yang tersedia di mata kuliah ini</p>
          <a href="index.html" class="btn primary">
            <i class="fas fa-arrow-left"></i> Pilih Mata Kuliah Lain
          </a>
        </div>
      `;
      return;
    }
    
    coursesList.innerHTML = courses.map((course, index) => `
      <div class="course-item slide-in" style="animation-delay: ${index * 0.05}s;">
        <div class="left">
          <div class="course-badge">${course.nama?.charAt(0) || 'C'}</div>
          <div>
            <h3 style="margin-bottom: 4px;">${course.nama || 'Tanpa Nama'}</h3>
            <p class="muted">${course.description || 'Tidak ada deskripsi'}</p>
            <div style="display: flex; gap: 12px; margin-top: 8px;">
              <span class="badge">${course.totalSoal || 0} Soal</span>
              <span class="muted">•</span>
              <span class="muted" style="font-size: 13px;">
                <i class="fas fa-clock"></i> ${Math.ceil((course.totalSoal || 0) * 1.5)} menit
              </span>
            </div>
          </div>
        </div>
        <button class="btn primary" onclick="startQuiz('${course.id}', '${course.nama || 'Course'}')">
          <i class="fas fa-play"></i> Mulai Quiz
        </button>
      </div>
    `).join('');
    
  } catch (error) {
    console.error("Error loading courses:", error);
    coursesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 style="margin-bottom: 8px; color: #ff3b30;">Gagal Memuat Course</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">${error.message}</p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button onclick="location.reload()" class="btn secondary">
            <i class="fas fa-redo"></i> Coba Lagi
          </button>
          <a href="index.html" class="btn primary">
            <i class="fas fa-home"></i> Kembali
          </a>
        </div>
      </div>
    `;
  }
}

// Start Quiz
window.startQuiz = async function(courseId, courseName) {
  currentCourse = { id: courseId, name: courseName };
  
  coursesSection.style.display = 'none';
  quizSection.style.display = 'block';
  pageTitle.textContent = courseName;
  pageSubtitle.textContent = 'Sedang mengerjakan...';
  backBtn.style.display = 'inline-flex';
  
  try {
    const questionsSnapshot = await getDocs(collection(db, "mata_kuliah", mataKuliahId, "courses", courseId, "soal"));
    originalQuestions = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      pertanyaan: doc.data().pertanyaan || doc.data().question,
      pilihan: doc.data().pilihan || doc.data().options,
      jawaban: doc.data().jawaban || doc.data().correct,
      explanation: doc.data().explanation
    }));
    
    if (originalQuestions.length === 0) {
      quizContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-question-circle"></i>
          </div>
          <h3 style="margin-bottom: 8px;">Belum ada Soal</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Tidak ada soal yang tersedia di course ini</p>
          <button onclick="showCourses()" class="btn primary">
            <i class="fas fa-arrow-left"></i> Kembali ke Course
          </button>
        </div>
      `;
      return;
    }
    
    randomizedQuestions = prepareRandomizedQuiz(originalQuestions);
    
    currentQuestionIndex = 0;
    userAnswers = {};
    timer = 0;
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timer++;
      const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
      const seconds = (timer % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
    }, 1000);
    
    renderQuestion();
    
  } catch (error) {
    console.error("Error loading questions:", error);
    quizContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 style="margin-bottom: 8px; color: #ff3b30;">Gagal Memuat Soal</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">${error.message}</p>
        <button onclick="showCourses()" class="btn primary">
          <i class="fas fa-arrow-left"></i> Kembali
        </button>
      </div>
    `;
  }
};

function renderQuestion() {
  const question = randomizedQuestions[currentQuestionIndex];
  if (!question) return;
  
  quizProgress.textContent = `Soal ${currentQuestionIndex + 1}/${randomizedQuestions.length}`;
  
  quizContainer.innerHTML = `
    <div class="q-text">
      <b>${currentQuestionIndex + 1}.</b> ${question.pertanyaan || question.question || 'Pertanyaan tidak tersedia'}
    </div>
    <div class="choices">
      ${['A', 'B', 'C', 'D'].map(key => {
        const optionText = (question.pilihan || question.options || {})[key] || '';
        const isSelected = userAnswers[currentQuestionIndex] === key;
        
        if (!optionText || optionText.trim() === '') return '';
        
        return `
          <div class="choice ${isSelected ? 'selected' : ''}" 
               onclick="selectAnswer('${key}')">
            <span class="label">${key}.</span>
            <span class="text">${optionText}</span>
            ${isSelected ? '<span style="color: #25D366; margin-left: auto;"><i class="fas fa-check"></i></span>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  prevBtn.style.display = currentQuestionIndex > 0 ? 'flex' : 'none';
  nextBtn.style.display = currentQuestionIndex < randomizedQuestions.length - 1 ? 'flex' : 'none';
  finishBtn.style.display = currentQuestionIndex === randomizedQuestions.length - 1 ? 'flex' : 'none';
}

window.selectAnswer = function(answer) {
  userAnswers[currentQuestionIndex] = answer;
  renderQuestion();
};

prevBtn.addEventListener('click', () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentQuestionIndex < randomizedQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  }
});

finishBtn.addEventListener('click', finishQuiz);
quitBtn.addEventListener('click', confirmQuit);

async function finishQuiz() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  let score = 0;
  const results = randomizedQuestions.map((q, index) => {
    const userAnswerKey = userAnswers[index];
    const correctAnswerKey = q.jawaban;
    const isCorrect = userAnswerKey === correctAnswerKey;
    
    if (isCorrect) score++;
    
    const userAnswerText = userAnswerKey 
      ? `${userAnswerKey}. ${q.pilihan[userAnswerKey] || 'Tidak ada teks jawaban'}` 
      : 'Tidak dijawab';
    
    const correctAnswerText = `${correctAnswerKey}. ${q.pilihan[correctAnswerKey] || 'Tidak ada teks jawaban'}`;
    
    const allOptions = [];
    for (const [key, value] of Object.entries(q.pilihan || {})) {
      allOptions.push(`${key}. ${value}`);
    }
    
    return {
      question: q.pertanyaan || q.question,
      questionNumber: index + 1,
      userAnswerKey,
      userAnswerText,
      correctAnswerKey,
      correctAnswerText,
      isCorrect,
      explanation: q.explanation,
      allOptions: allOptions.join(' | ')
    };
  });
  
  const result = {
    courseName: currentCourse.name,
    courseId: currentCourse.id,
    totalQuestions: randomizedQuestions.length,
    score: score,
    percentage: Math.round((score / randomizedQuestions.length) * 100),
    timeSpent: timer,
    results: results,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('quizResult', JSON.stringify(result));
  
  try {
    await addDoc(collection(db, "quiz_results"), {
      courseId: currentCourse.id,
      courseName: currentCourse.name,
      score: score,
      totalQuestions: randomizedQuestions.length,
      timeSpent: timer,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving result:", error);
  }
  
  window.location.href = 'result.html';
}

window.showCourses = function() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  quizSection.style.display = 'none';
  coursesSection.style.display = 'block';
  pageTitle.textContent = 'Quiz';
  pageSubtitle.textContent = 'Pilih course';
  backBtn.style.display = 'none';
};

function confirmQuit() {
  const modal = document.getElementById('confirmModal');
  const message = document.getElementById('confirmMessage');
  const cancelBtn = document.getElementById('confirmCancel');
  const okBtn = document.getElementById('confirmOk');
  
  message.textContent = 'Apakah Anda yakin ingin keluar dari quiz? Semua jawaban akan hilang.';
  modal.style.display = 'flex';
  
  cancelBtn.onclick = () => {
    modal.style.display = 'none';
  };
  
  okBtn.onclick = () => {
    modal.style.display = 'none';
    showCourses();
  };
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
  updateThemeIcon();
}

function updateThemeIcon() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  themeToggle.innerHTML = currentTheme === 'dark' 
    ? '<i class="fas fa-sun"></i>' 
    : '<i class="fas fa-moon"></i>';
}

backBtn.addEventListener('click', showCourses);

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  themeToggle.addEventListener('click', toggleTheme);
  loadCourses();
});

window.toggleTheme = toggleTheme;
