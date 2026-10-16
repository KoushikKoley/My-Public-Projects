/* ============================================
   Little Star GK — Premium App Logic v2.0
   ============================================ */

(function () {
  'use strict';

  // ====================================
  // CONFIG
  // ====================================
  const PASSWORD = 'Sriparna';
  const STORAGE_KEY = 'littleStarGK_progress_v1';
  const SETTINGS_KEY = 'littleStarGK_settings_v1';
  const DEFAULT_QUESTIONS_PER_QUIZ = 10;

  // ====================================
  // ACCENT PRESETS
  // ====================================
  const ACCENT_PRESETS = {
    violet: { hex: '#7c3aed', rgb: '124, 58, 237', hover: '#6d28d9' },
    rose:   { hex: '#e11d48', rgb: '225, 29, 72', hover: '#be123c' },
    amber:  { hex: '#d97706', rgb: '217, 119, 6', hover: '#b45309' },
    emerald:{ hex: '#059669', rgb: '5, 150, 105', hover: '#047857' },
    sky:    { hex: '#0284c7', rgb: '2, 132, 199', hover: '#0369a1' },
    pink:   { hex: '#db2777', rgb: '219, 39, 119', hover: '#be185d' },
    orange: { hex: '#ea580c', rgb: '234, 88, 12', hover: '#c2410c' },
    lime:   { hex: '#65a30d', rgb: '101, 163, 13', hover: '#4d7c0f' }
  };

  // ====================================
  // STATE
  // ====================================
  const state = {
    mode: 'quiz',
    currentCategory: null,
    currentQuestions: [],
    currentIndex: 0,
    currentQuizCorrect: 0,
    currentQuizStars: 0,
    answeredThisRound: false,
    searchQuery: '',
    activeFilter: 'all',
    settings: loadSettings(),
    stats: loadStats()
  };

  function defaultStats() {
    return {
      totalStars: 0,
      totalCorrect: 0,
      totalAttempted: 0,
      currentStreak: 0,
      bestStreak: 0,
      perCategory: {}
    };
  }
  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultStats();
      const obj = JSON.parse(raw);
      if (!obj.perCategory) obj.perCategory = {};
      Object.keys(obj.perCategory).forEach(k => {
        const seen = obj.perCategory[k].seen;
        obj.perCategory[k].seen = new Set(Array.isArray(seen) ? seen : []);
      });
      return Object.assign(defaultStats(), obj);
    } catch (e) { return defaultStats(); }
  }
  function saveStats() {
    try {
      const toSave = Object.assign({}, state.stats);
      toSave.perCategory = {};
      Object.keys(state.stats.perCategory).forEach(k => {
        const c = state.stats.perCategory[k];
        toSave.perCategory[k] = {
          attempted: c.attempted || 0,
          correct: c.correct || 0,
          stars: c.stars || 0,
          seen: Array.from(c.seen || [])
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {}
  }
  function ensureCatStat(catId) {
    if (!state.stats.perCategory[catId]) {
      state.stats.perCategory[catId] = {
        attempted: 0, correct: 0, stars: 0, seen: new Set()
      };
    }
    return state.stats.perCategory[catId];
  }

  function defaultSettings() {
    return {
      theme: 'light',
      accentName: 'violet',
      customAccent: null,
      fontSize: 1,
      animations: true,
      radius: 2,
      quizLength: 10
    };
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      return Object.assign(defaultSettings(), JSON.parse(raw));
    } catch (e) { return defaultSettings(); }
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (e) {}
  }

  // ====================================
  // DATA
  // ====================================
  const CATEGORIES = (typeof window.GK_CATEGORIES !== 'undefined') ? window.GK_CATEGORIES : [];
  const ALL_QUESTIONS = (typeof window.GK_QUESTIONS !== 'undefined') ? window.GK_QUESTIONS : [];
  function getCategoryById(id) { return CATEGORIES.find(c => String(c.id) === String(id)); }
  function getQuestionsByCategory(catId) { return ALL_QUESTIONS.filter(q => String(q.categoryId) === String(catId)); }

  // ====================================
  // ELEMENTS
  // ====================================
  const el = {
    root: document.documentElement,
    loginScreen: document.getElementById('loginScreen'),
    mainApp: document.getElementById('mainApp'),
    passwordInput: document.getElementById('passwordInput'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),

    menuToggle: document.getElementById('menuToggle'),
    logoutBtn: document.getElementById('logoutBtn'),
    settingsBtn: document.getElementById('settingsBtn'),

    totalStars: document.getElementById('totalStars'),
    totalCorrect: document.getElementById('totalCorrect'),
    currentStreak: document.getElementById('currentStreak'),
    categoriesCount: document.getElementById('categoriesCount'),
    totalQuestionsCount: document.getElementById('totalQuestionsCount'),
    attemptedCount: document.getElementById('attemptedCount'),
    accuracyPct: document.getElementById('accuracyPct'),

    modeBtns: document.querySelectorAll('.mode-btn'),
    searchInput: document.getElementById('searchInput'),
    filterChips: document.querySelectorAll('.filter-chip'),
    categoriesGrid: document.getElementById('categoriesGrid'),

    homePage: document.getElementById('homePage'),
    quizPage: document.getElementById('quizPage'),
    resultPage: document.getElementById('resultPage'),

    // Settings sidebar
    settingsSidebar: document.getElementById('settingsSidebar'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    closeSettings: document.getElementById('closeSettings'),
    modeOptions: document.querySelectorAll('.mode-option'),
    accentChips: document.querySelectorAll('.accent-chip'),
    customAccentInput: document.getElementById('customAccentInput'),
    customAccentHex: document.getElementById('customAccentHex'),
    applyCustomAccent: document.getElementById('applyCustomAccent'),
    fontSizeSlider: document.getElementById('fontSizeSlider'),
    animationsToggle: document.getElementById('animationsToggle'),
    radiusSlider: document.getElementById('radiusSlider'),
    quizLengthBtns: document.querySelectorAll('.quiz-length-btn'),
    resetProgress: document.getElementById('resetProgress'),

    quizCategoryEmoji: document.getElementById('quizCategoryEmoji'),
    quizCategoryName: document.getElementById('quizCategoryName'),
    currentQNum: document.getElementById('currentQNum'),
    totalQNum: document.getElementById('totalQNum'),
    progressFill: document.getElementById('progressFill'),
    modeBadge: document.getElementById('modeBadge'),

    questionEmoji: document.getElementById('questionEmoji'),
    questionText: document.getElementById('questionText'),
    optionsGrid: document.getElementById('optionsGrid'),
    feedbackBox: document.getElementById('feedbackBox'),
    feedbackEmoji: document.getElementById('feedbackEmoji'),
    feedbackText: document.getElementById('feedbackText'),
    feedbackAnswer: document.getElementById('feedbackAnswer'),

    nextBtn: document.getElementById('nextBtn'),
    showAnswerBtn: document.getElementById('showAnswerBtn'),
    backToHome: document.getElementById('backToHome'),
    restartTopicBtn: document.getElementById('restartTopicBtn'),

    topicStars: document.getElementById('topicStars'),
    topicCorrect: document.getElementById('topicCorrect'),
    topicWrong: document.getElementById('topicWrong'),
    topicAccuracy: document.getElementById('topicAccuracy'),
    topicProgressPct: document.getElementById('topicProgressPct'),
    topicProgressFill: document.getElementById('topicProgressFill'),

    resultEmoji: document.getElementById('resultEmoji'),
    resultTitle: document.getElementById('resultTitle'),
    resultSubtitle: document.getElementById('resultSubtitle'),
    resultCorrect: document.getElementById('resultCorrect'),
    resultWrong: document.getElementById('resultWrong'),
    resultStars: document.getElementById('resultStars'),
    resultAccuracy: document.getElementById('resultAccuracy'),
    retryBtn: document.getElementById('retryBtn'),
    homeBtn: document.getElementById('homeBtn'),

    confettiContainer: document.getElementById('confettiContainer'),
    toast: document.getElementById('toast')
  };

  // ====================================
  // APPLY SETTINGS TO DOM
  // ====================================
  function applySettings() {
    const s = state.settings;
    // Theme
    el.root.setAttribute('data-theme', s.theme);
    // Font size
    el.root.setAttribute('data-fontsize', String(s.fontSize));
    // Radius
    el.root.setAttribute('data-radius', String(s.radius));
    // Animations
    el.root.setAttribute('data-anim', s.animations ? 'on' : 'off');

    // Accent color
    let accent;
    if (s.customAccent && /^#[0-9a-f]{6}$/i.test(s.customAccent)) {
      accent = {
        hex: s.customAccent,
        rgb: hexToRgb(s.customAccent),
        hover: shadeColor(s.customAccent, -15)
      };
    } else if (ACCENT_PRESETS[s.accentName]) {
      accent = ACCENT_PRESETS[s.accentName];
    } else {
      accent = ACCENT_PRESETS.violet;
    }
    el.root.style.setProperty('--accent', accent.hex);
    el.root.style.setProperty('--accent-rgb', accent.rgb);
    el.root.style.setProperty('--accent-soft', 'rgba(' + accent.rgb + ', 0.12)');
    el.root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accent.hex}, ${shadeColor(accent.hex, 25)})`);
    el.root.style.setProperty('--accent-hover', accent.hover);

    // Update theme-color meta for mobile browser chrome
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.setAttribute('content', s.theme === 'dark' ? '#0a0b14' : accent.hex);

    // Update settings UI
    document.querySelectorAll('.mode-option').forEach(b => {
      b.classList.toggle('active', b.dataset.themeSet === s.theme);
    });
    document.querySelectorAll('.accent-chip').forEach(b => {
      b.classList.toggle('active', b.dataset.accentSet === s.accentName && !s.customAccent);
    });
    if (el.fontSizeSlider) el.fontSizeSlider.value = s.fontSize;
    if (el.animationsToggle) el.animationsToggle.checked = s.animations;
    if (el.radiusSlider) el.radiusSlider.value = s.radius;
    if (el.customAccentInput) el.customAccentInput.value = s.customAccent || accent.hex;
    if (el.customAccentHex) el.customAccentHex.value = s.customAccent || accent.hex;
    document.querySelectorAll('.quiz-length-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.ql) === s.quizLength);
    });
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return '124, 58, 237';
    return `${parseInt(m[1],16)}, ${parseInt(m[2],16)}, ${parseInt(m[3],16)}`;
  }
  function shadeColor(hex, percent) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    let r = parseInt(m[1], 16);
    let g = parseInt(m[2], 16);
    let b = parseInt(m[3], 16);
    r = Math.max(0, Math.min(255, Math.round(r * (1 + percent / 100))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 + percent / 100))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 + percent / 100))));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ====================================
  // LOGIN
  // ====================================
  function initLogin() {
    el.passwordInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') tryLogin();
    });
    el.loginBtn.addEventListener('click', tryLogin);
    setTimeout(() => el.passwordInput.focus(), 300);
  }
  function tryLogin() {
    const val = el.passwordInput.value.trim();
    if (val === PASSWORD) {
      el.loginScreen.classList.add('hidden');
      el.mainApp.classList.remove('hidden');
      renderHome();
      showToast('Welcome back, Little Star!');
    } else {
      el.loginError.textContent = 'Wrong password. Try again!';
      el.passwordInput.value = '';
      el.passwordInput.focus();
      el.loginError.style.animation = 'none';
      void el.loginError.offsetWidth;
      el.loginError.style.animation = 'shake 0.4s ease';
    }
  }

  // ====================================
  // HOME
  // ====================================
  function renderHome() {
    updateGlobalStats();
    renderCategories();
  }
  function updateGlobalStats() {
    el.categoriesCount.textContent = CATEGORIES.length;
    el.totalQuestionsCount.textContent = ALL_QUESTIONS.length;
    el.totalStars.textContent = state.stats.totalStars || 0;
    el.totalCorrect.textContent = state.stats.totalCorrect || 0;
    el.currentStreak.textContent = state.stats.currentStreak || 0;
    el.attemptedCount.textContent = state.stats.totalAttempted || 0;
    const acc = state.stats.totalAttempted > 0
      ? Math.round((state.stats.totalCorrect / state.stats.totalAttempted) * 100)
      : 0;
    el.accuracyPct.textContent = acc + '%';
  }
  function renderCategories() {
    el.categoriesGrid.innerHTML = '';
    const q = state.searchQuery.toLowerCase().trim();
    let filtered = CATEGORIES.filter(c => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.banglaName && c.banglaName.includes(q));
    });
    filtered = filtered.filter(c => {
      const total = getQuestionsByCategory(c.id).length;
      const cs = ensureCatStat(c.id);
      const seenCount = cs.seen.size;
      if (state.activeFilter === 'all') return true;
      if (state.activeFilter === 'not-started') return cs.attempted === 0 && seenCount === 0;
      if (state.activeFilter === 'started') return cs.attempted > 0 && seenCount < total;
      if (state.activeFilter === 'completed') return total > 0 && seenCount >= total;
      return true;
    });

    if (filtered.length === 0) {
      el.categoriesGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-faint);"><div style="font-size:48px;margin-bottom:12px;">🔍</div>No topics match your search. Try another keyword!</div>';
      return;
    }

    filtered.forEach((cat, idx) => {
      const total = getQuestionsByCategory(cat.id).length;
      const cs = ensureCatStat(cat.id);
      const seenCount = cs.seen.size;
      const progressPct = total > 0 ? Math.min(100, Math.round((seenCount / total) * 100)) : 0;
      let statusPill = '';
      let statusClass = '';
      if (cs.attempted === 0 && seenCount === 0) {
        statusPill = 'New'; statusClass = 'new';
      } else if (total > 0 && seenCount >= total) {
        statusPill = 'Mastered'; statusClass = 'mastered';
      } else if (cs.attempted > 0 || seenCount > 0) {
        statusPill = 'In Progress'; statusClass = 'progress';
      }

      const card = document.createElement('div');
      card.className = 'category-card';
      card.style.setProperty('--card-accent', cat.color || '#7c3aed');
      card.style.setProperty('--delay', (idx * 0.08) + 's');
      card.innerHTML = `
        ${statusPill ? `<div class="category-status-pill ${statusClass}">${statusPill}</div>` : ''}
        <div class="category-emoji">${cat.emoji}</div>
        <div class="category-name">${escapeHtml(cat.name)}</div>
        <div class="category-meta">${total} Questions</div>
        <div class="category-progress">
          <div class="category-progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="category-stars">★ ${cs.stars} stars</div>
      `;
      card.addEventListener('click', () => startCategory(cat.id));
      el.categoriesGrid.appendChild(card);
    });
  }

  // ====================================
  // QUIZ
  // ====================================
  function startCategory(catId) {
    const cat = getCategoryById(catId);
    if (!cat) return;
    const allCatQs = getQuestionsByCategory(catId);
    if (allCatQs.length === 0) {
      showToast('No questions in this topic yet!');
      return;
    }
    state.currentCategory = cat;
    state.currentIndex = 0;
    state.currentQuizCorrect = 0;
    state.currentQuizStars = 0;
    const quizLen = Math.min(state.settings.quizLength || DEFAULT_QUESTIONS_PER_QUIZ, allCatQs.length);
    const cs = ensureCatStat(catId);
    const unseen = allCatQs.filter(q => !cs.seen.has(q.id));
    const pool = unseen.length >= quizLen
      ? shuffle(unseen).slice(0, quizLen)
      : shuffle(allCatQs).slice(0, quizLen);
    state.currentQuestions = pool;
    showPage('quizPage');
    renderQuizHeader();
    renderQuestion();
  }

  function renderQuizHeader() {
    const cat = state.currentCategory;
    el.quizCategoryEmoji.textContent = cat.emoji;
    el.quizCategoryName.textContent = cat.name;
    el.totalQNum.textContent = state.currentQuestions.length;
    el.modeBadge.textContent = state.mode === 'quiz' ? 'Quiz Mode' : 'Learn Mode';
    updateTopicStats();
  }

  function updateTopicStats() {
    if (!state.currentCategory) return;
    const cs = ensureCatStat(state.currentCategory.id);
    el.topicStars.textContent = cs.stars;
    el.topicCorrect.textContent = cs.correct;
    const wrong = cs.attempted - cs.correct;
    el.topicWrong.textContent = wrong < 0 ? 0 : wrong;
    const acc = cs.attempted > 0 ? Math.round((cs.correct / cs.attempted) * 100) : 0;
    el.topicAccuracy.textContent = acc + '%';
    const total = getQuestionsByCategory(state.currentCategory.id).length;
    const seenCount = cs.seen.size;
    const progressPct = total > 0 ? Math.round((seenCount / total) * 100) : 0;
    el.topicProgressPct.textContent = progressPct + '%';
    el.topicProgressFill.style.width = progressPct + '%';
  }

  function renderQuestion() {
    const q = state.currentQuestions[state.currentIndex];
    if (!q) { finishQuiz(); return; }
    state.answeredThisRound = false;

    el.currentQNum.textContent = state.currentIndex + 1;
    const pct = ((state.currentIndex + 1) / state.currentQuestions.length) * 100;
    el.progressFill.style.width = pct + '%';

    el.questionEmoji.textContent = q.emoji || state.currentCategory.emoji;
    el.questionText.textContent = q.question;

    const cs = ensureCatStat(state.currentCategory.id);
    cs.seen.add(q.id);

    el.optionsGrid.innerHTML = '';
    el.feedbackBox.classList.add('hidden');
    el.nextBtn.classList.add('hidden');
    el.showAnswerBtn.classList.add('hidden');

    const letters = ['A', 'B', 'C', 'D', 'E'];

    if (state.mode === 'learn') {
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn' + (i === q.correct ? ' correct' : '');
        btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${escapeHtml(opt)}</span>`;
        el.optionsGrid.appendChild(btn);
      });
      el.feedbackBox.className = 'feedback-box';
      el.feedbackBox.style.background = 'var(--accent-soft)';
      el.feedbackBox.style.borderColor = 'var(--accent)';
      el.feedbackBox.style.border = '1.5px solid var(--accent)';
      el.feedbackEmoji.textContent = '💡';
      el.feedbackText.textContent = 'Correct Answer:';
      el.feedbackAnswer.textContent = q.options[q.correct];
      el.feedbackBox.classList.remove('hidden');
      el.nextBtn.classList.remove('hidden');
      el.nextBtn.innerHTML = state.currentIndex === state.currentQuestions.length - 1
        ? '<span>Finish</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<span>Next Question</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      saveStats();
      return;
    }

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener('click', () => handleAnswer(i));
      el.optionsGrid.appendChild(btn);
    });
    el.showAnswerBtn.classList.remove('hidden');
    saveStats();
  }

  function handleAnswer(selectedIdx) {
    if (state.answeredThisRound) return;
    state.answeredThisRound = true;
    const q = state.currentQuestions[state.currentIndex];
    if (!q) return;
    const isCorrect = selectedIdx === q.correct;

    const allBtns = el.optionsGrid.querySelectorAll('.option-btn');
    allBtns.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add('correct');
      else if (i === selectedIdx) b.classList.add('wrong');
      else b.classList.add('dim');
    });

    const cs = ensureCatStat(state.currentCategory.id);
    cs.attempted += 1;
    state.stats.totalAttempted += 1;

    if (isCorrect) {
      cs.correct += 1;
      cs.stars += 1;
      state.stats.totalCorrect += 1;
      state.stats.totalStars += 1;
      state.currentQuizCorrect += 1;
      state.currentQuizStars += 1;
      state.stats.currentStreak = (state.stats.currentStreak || 0) + 1;
      if (state.stats.currentStreak > (state.stats.bestStreak || 0)) {
        state.stats.bestStreak = state.stats.currentStreak;
      }
      el.feedbackBox.className = 'feedback-box correct';
      el.feedbackBox.style.background = '';
      el.feedbackBox.style.borderColor = '';
      el.feedbackBox.style.border = '';
      el.feedbackEmoji.textContent = '🎉';
      el.feedbackText.textContent = 'Correct! Great job!';
      el.feedbackAnswer.textContent = '✅ ' + q.options[q.correct];
      triggerConfetti();

      // Streak milestones
      if (state.stats.currentStreak === 3) showToast('🔥 3 in a row! Hot streak!');
      else if (state.stats.currentStreak === 5) showToast('🔥🔥 5 in a row! On fire!');
      else if (state.stats.currentStreak === 10) showToast('🏆 10 in a row! Unstoppable!');
    } else {
      state.stats.currentStreak = 0;
      el.feedbackBox.className = 'feedback-box wrong';
      el.feedbackBox.style.background = '';
      el.feedbackBox.style.borderColor = '';
      el.feedbackBox.style.border = '';
      el.feedbackEmoji.textContent = '💡';
      el.feedbackText.textContent = 'Oops! Not quite.';
      el.feedbackAnswer.textContent = '✅ Correct: ' + q.options[q.correct];
    }
    el.feedbackBox.classList.remove('hidden');
    el.showAnswerBtn.classList.add('hidden');

    el.nextBtn.classList.remove('hidden');
    el.nextBtn.innerHTML = state.currentIndex === state.currentQuestions.length - 1
      ? '<span>See Results</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<span>Next Question</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    updateGlobalStats();
    updateTopicStats();
    saveStats();
  }

  function showAnswerWithoutGuessing() {
    if (state.answeredThisRound) return;
    state.answeredThisRound = true;
    const q = state.currentQuestions[state.currentIndex];
    if (!q) return;

    const allBtns = el.optionsGrid.querySelectorAll('.option-btn');
    allBtns.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add('correct');
      else b.classList.add('dim');
    });

    const cs = ensureCatStat(state.currentCategory.id);
    cs.attempted += 1;
    state.stats.totalAttempted += 1;
    state.stats.currentStreak = 0;

    el.feedbackBox.className = 'feedback-box';
    el.feedbackBox.style.background = 'var(--accent-soft)';
    el.feedbackBox.style.borderColor = 'var(--accent)';
    el.feedbackBox.style.border = '1.5px solid var(--accent)';
    el.feedbackEmoji.textContent = '👀';
    el.feedbackText.textContent = 'Here is the answer!';
    el.feedbackAnswer.textContent = '✅ ' + q.options[q.correct];
    el.feedbackBox.classList.remove('hidden');
    el.showAnswerBtn.classList.add('hidden');

    el.nextBtn.classList.remove('hidden');
    el.nextBtn.innerHTML = state.currentIndex === state.currentQuestions.length - 1
      ? '<span>See Results</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<span>Next Question</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    updateGlobalStats();
    updateTopicStats();
    saveStats();
  }

  function finishQuiz() {
    const total = state.currentQuestions.length;
    const correct = state.currentQuizCorrect;
    const wrong = total - correct;
    const stars = state.currentQuizStars;
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

    showPage('resultPage');
    let emoji, title, subtitle;
    const ratio = total > 0 ? correct / total : 0;
    if (ratio >= 0.9) { emoji = '🏆'; title = 'Champion!'; subtitle = 'Outstanding! You are a true Little Star!'; }
    else if (ratio >= 0.7) { emoji = '🌟'; title = 'Great Job!'; subtitle = 'Excellent work! You are doing amazing!'; }
    else if (ratio >= 0.5) { emoji = '⭐'; title = 'Good Effort!'; subtitle = 'Nice try! Keep practicing to earn more stars!'; }
    else { emoji = '💪'; title = 'Keep Going!'; subtitle = 'Practice makes perfect! Try again, little one!'; }

    el.resultEmoji.textContent = emoji;
    el.resultTitle.textContent = title;
    el.resultSubtitle.textContent = subtitle;
    el.resultCorrect.textContent = correct;
    el.resultWrong.textContent = wrong;
    el.resultStars.textContent = stars;
    el.resultAccuracy.textContent = acc + '%';

    if (ratio >= 0.5) {
      triggerConfetti(50);
      setTimeout(() => triggerConfetti(30), 400);
    }
  }

  // ====================================
  // SETTINGS PANEL
  // ====================================
  function openSettings() { el.settingsSidebar.classList.add('open'); }
  function closeSettingsPanel() { el.settingsSidebar.classList.remove('open'); }

  function setTheme(theme) {
    state.settings.theme = theme;
    saveSettings();
    applySettings();
  }
  function setAccent(name) {
    state.settings.accentName = name;
    state.settings.customAccent = null;
    saveSettings();
    applySettings();
  }
  function setCustomAccent(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      showToast('Invalid color. Use #RRGGBB format.');
      return;
    }
    state.settings.customAccent = hex;
    saveSettings();
    applySettings();
    showToast('Custom accent applied!');
  }
  function setFontSize(val) {
    state.settings.fontSize = parseInt(val);
    saveSettings();
    applySettings();
  }
  function setAnimations(on) {
    state.settings.animations = on;
    saveSettings();
    applySettings();
  }
  function setRadius(val) {
    state.settings.radius = parseInt(val);
    saveSettings();
    applySettings();
  }
  function setQuizLength(val) {
    state.settings.quizLength = parseInt(val);
    saveSettings();
    applySettings();
  }

  function resetProgress() {
    if (!confirm('Are you sure? This will erase all your progress, stars, and streaks!')) return;
    state.stats = defaultStats();
    saveStats();
    updateGlobalStats();
    if (el.homePage.classList.contains('active')) renderCategories();
    showToast('Progress reset!');
    closeSettingsPanel();
  }

  // ====================================
  // NAV
  // ====================================
  function showPage(pageId) {
    [el.homePage, el.quizPage, el.resultPage].forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function goHome() {
    state.currentCategory = null;
    state.currentQuestions = [];
    state.currentIndex = 0;
    showPage('homePage');
    renderHome();
  }

  // ====================================
  // CONFETTI
  // ====================================
  function triggerConfetti(count) {
    if (!state.settings.animations) return;
    count = count || 30;
    const colors = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];
    const shapes = ['🎉', '⭐', '🌟', '✨', '🎊'];
    const accent = getComputedStyle(el.root).getPropertyValue('--accent').trim();
    if (accent) colors.unshift(accent);
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const isEmoji = Math.random() < 0.3;
      if (isEmoji) {
        piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        piece.style.fontSize = (14 + Math.random() * 14) + 'px';
        piece.style.background = 'transparent';
      } else {
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
      }
      piece.style.left = Math.random() * 100 + '%';
      piece.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
      piece.style.animationDelay = (Math.random() * 0.3) + 's';
      el.confettiContainer.appendChild(piece);
      setTimeout(() => piece.remove(), 3500);
    }
  }

  // ====================================
  // TOAST
  // ====================================
  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  // ====================================
  // UTILS
  // ====================================
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ====================================
  // EVENT BINDINGS
  // ====================================
  function bindEvents() {
    // Login
    el.passwordInput.addEventListener('keypress', e => { if (e.key === 'Enter') tryLogin(); });
    el.loginBtn.addEventListener('click', tryLogin);

    // Navbar
    el.logoutBtn.addEventListener('click', () => {
      el.mainApp.classList.add('hidden');
      el.loginScreen.classList.remove('hidden');
      el.passwordInput.value = '';
      el.loginError.textContent = '';
      setTimeout(() => el.passwordInput.focus(), 200);
    });

    el.menuToggle.addEventListener('click', () => {
      // Mobile: scroll to categories
      window.scrollTo({ top: document.querySelector('.toolbar').offsetTop - 80, behavior: 'smooth' });
    });

    el.settingsBtn.addEventListener('click', openSettings);
    el.closeSettings.addEventListener('click', closeSettingsPanel);
    el.settingsOverlay.addEventListener('click', closeSettingsPanel);

    // Settings - theme
    document.querySelectorAll('.mode-option').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.themeSet));
    });

    // Settings - accent
    document.querySelectorAll('.accent-chip').forEach(chip => {
      chip.addEventListener('click', () => setAccent(chip.dataset.accentSet));
    });

    // Custom accent
    el.customAccentInput.addEventListener('input', e => {
      el.customAccentHex.value = e.target.value.toUpperCase();
    });
    el.customAccentHex.addEventListener('input', e => {
      const v = e.target.value;
      if (/^#[0-9a-f]{6}$/i.test(v)) el.customAccentInput.value = v;
    });
    el.applyCustomAccent.addEventListener('click', () => {
      setCustomAccent(el.customAccentHex.value.trim());
    });

    // Sliders
    el.fontSizeSlider.addEventListener('input', e => setFontSize(e.target.value));
    el.radiusSlider.addEventListener('input', e => setRadius(e.target.value));
    el.animationsToggle.addEventListener('change', e => setAnimations(e.target.checked));
    document.querySelectorAll('.quiz-length-btn').forEach(btn => {
      btn.addEventListener('click', () => setQuizLength(btn.dataset.ql));
    });

    el.resetProgress.addEventListener('click', resetProgress);

    // Mode toggle (home)
    el.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        showToast(state.mode === 'quiz' ? 'Quiz Mode ON!' : 'Learn Mode ON!');
      });
    });

    // Search
    el.searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      if (el.homePage.classList.contains('active')) renderCategories();
    });

    // Filter chips
    el.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        el.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter;
        renderCategories();
      });
    });

    // Quiz actions
    el.nextBtn.addEventListener('click', () => {
      state.currentIndex += 1;
      if (state.currentIndex >= state.currentQuestions.length) finishQuiz();
      else renderQuestion();
    });
    el.showAnswerBtn.addEventListener('click', showAnswerWithoutGuessing);
    el.backToHome.addEventListener('click', goHome);
    el.retryBtn.addEventListener('click', () => {
      if (state.currentCategory) startCategory(state.currentCategory.id);
    });
    el.homeBtn.addEventListener('click', goHome);
    el.restartTopicBtn.addEventListener('click', () => {
      if (state.currentCategory) startCategory(state.currentCategory.id);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (el.settingsSidebar.classList.contains('open')) closeSettingsPanel();
      }
      // Quiz: A/B/C/D shortcut
      if (el.quizPage.classList.contains('active') && state.mode === 'quiz' && !state.answeredThisRound) {
        const key = e.key.toLowerCase();
        if (['a','b','c','d','e'].includes(key)) {
          const idx = ['a','b','c','d','e'].indexOf(key);
          const btns = el.optionsGrid.querySelectorAll('.option-btn');
          if (btns[idx]) btns[idx].click();
        }
      }
      // Next: Enter
      if (el.quizPage.classList.contains('active') && (e.key === 'Enter' || e.key === ' ')) {
        if (!el.nextBtn.classList.contains('hidden') && document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          el.nextBtn.click();
        }
      }
    });
  }

  // ====================================
  // INIT
  // ====================================
  function init() {
    applySettings();
    bindEvents();
    initLogin();
  }

  init();

})();
