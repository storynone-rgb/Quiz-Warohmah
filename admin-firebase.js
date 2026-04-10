// admin-firebase.js - Admin Authentication & Dashboard
const firebaseConfig = {
  apiKey: "AIzaSyB1_u4tQjJmIvzHNj0nmxjBM2nDORpZ38U",
  authDomain: "quiz-warohmah.firebaseapp.com",
  projectId: "quiz-warohmah",
  storageBucket: "quiz-warohmah.firebasestorage.app",
  messagingSenderId: "271883195532",
  appId: "1:271883195532:web:723ea686eb8cba402397a9",
  measurementId: "G-J39252WX95"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentView = 'mata-kuliah';
let currentMataKuliah = null;
let currentCourse = null;

const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const themeToggle = document.getElementById('themeToggle');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginStatus.textContent = 'Sedang login...';
    loginStatus.className = '';
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      loginStatus.textContent = 'Login berhasil! Mengarahkan...';
      loginStatus.className = 'success';
      localStorage.setItem('adminToken', user.uid);
      localStorage.setItem('adminEmail', user.email);
      setTimeout(() => window.location.href = 'edit.html', 1000);
    } catch (error) {
      loginStatus.textContent = getErrorMessage(error.code);
      loginStatus.className = 'error';
    }
  });
}

function getErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Email tidak valid',
    'auth/user-disabled': 'Akun dinonaktifkan',
    'auth/user-not-found': 'Akun tidak ditemukan',
    'auth/wrong-password': 'Password salah',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'auth/network-request-failed': 'Koneksi internet bermasalah'
  };
  return messages[code] || 'Login gagal. Cek email dan password.';
}

onAuthStateChanged(auth, (user) => {
  if (window.location.pathname.includes('edit.html') && !user) {
    window.location.href = 'admin.html';
  }
  if (window.location.pathname.includes('admin.html') && user) {
    window.location.href = 'edit.html';
  }
});

function initTheme() {
  const savedTheme = localStorage.getItem('quiz-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
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
  if (themeToggle) {
    themeToggle.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }
}

if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
initTheme();

export { auth, db, signOut, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, increment };
