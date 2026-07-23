/**
 * Navigation Controller — Investigation Essentials for Frontline Supervisors (FIND)
 * Engine carried over verbatim; CONFIG below is set for this course.
 */
var nav = (function () {
  'use strict';

  var sequence = [
    'welcome.html',
    // Module 1 — Understanding Your Role
    'm1-01.html', 'm1-02.html', 'm1-03.html',
    // Module 2 — F: Frame the Issue
    'm2-01.html', 'm2-02.html',
    // Module 3 — I: Investigate the Facts
    'm3-01.html', 'm3-02.html', 'm3-03.html', 'm3-04.html',
    // Module 4 — N: Narrow Down What Happened
    'm4-01.html', 'm4-02.html', 'm4-03.html',
    // Module 5 — D: Document and Decide
    'm5-01.html', 'm5-02.html', 'm5-03.html',
    // Capstone — FIND the Facts: The Missing Temperature Check (SCORED)
    'capstone-01.html', 'capstone-02.html', 'capstone-03.html',
    // Job aid + completion
    'jobaid.html',
    'completion.html'
  ];

  var m4Tracks = {}; // linear course, no role branching

  var modules = [
    { id: 'welcome',    label: 'Intro',     startPage: 'welcome.html' },
    { id: 'm1',         label: 'Role',      startPage: 'm1-01.html' },
    { id: 'm2',         label: 'F',         startPage: 'm2-01.html' },
    { id: 'm3',         label: 'I',         startPage: 'm3-01.html' },
    { id: 'm4',         label: 'N',         startPage: 'm4-01.html' },
    { id: 'm5',         label: 'D',         startPage: 'm5-01.html' },
    { id: 'capstone',   label: 'Capstone',  startPage: 'capstone-01.html' },
    { id: 'jobaid',     label: 'Job Aid',   startPage: 'jobaid.html' },
    { id: 'completion', label: 'Complete',  startPage: 'completion.html' }
  ];

  // Recommended low-friction gating: linear/open, capstone reachable after M5,
  // completion after the capstone results page.
  var moduleGates = {
    'welcome':    { type: 'always' },
    'm1':         { type: 'always' },
    'm2':         { type: 'always' },
    'm3':         { type: 'always' },
    'm4':         { type: 'always' },
    'm5':         { type: 'always' },
    'capstone':   { type: 'visited', page: 'm5-03.html' },
    'jobaid':     { type: 'always' },
    'completion': { type: 'visited', page: 'capstone-03.html' }
  };

  // ==========================================================================
  // ENGINE — do not edit below this line.
  // ==========================================================================
  var selectedRole = null;
  var activeSequence = [];
  var currentIndex = 0;
  var visited = {};

  var _startPageToModule = {};
  (function () {
    for (var i = 0; i < modules.length; i++) {
      _startPageToModule[modules[i].startPage] = modules[i].id;
    }
  })();

  function _buildActiveSequence() {
    activeSequence = [];
    for (var i = 0; i < sequence.length; i++) {
      var page = sequence[i];
      if (selectedRole) {
        var isOtherTrack = false;
        for (var role in m4Tracks) {
          if (m4Tracks.hasOwnProperty(role) && role !== selectedRole) {
            if (m4Tracks[role].indexOf(page) !== -1) { isOtherTrack = true; break; }
          }
        }
        if (isOtherTrack) { continue; }
      }
      activeSequence.push(page);
    }
  }

  function _getIframe() { return document.getElementById('content-frame'); }

  function _loadPage(pageId) {
    var iframe = _getIframe();
    if (iframe) { iframe.src = 'pages/' + pageId; }
    visited[pageId] = true;
    _updateProgress();
    _updateNavButtons();
    _updateModuleIndicator();
    if (window.scormAPI) { scormAPI.setBookmark(pageId); }
  }

  function _getCurrentPage() { return activeSequence[currentIndex] || ''; }

  function isModuleLocked(moduleId) {
    var gate = moduleGates[moduleId];
    if (!gate || gate.type === 'always') { return false; }
    if (gate.type === 'visited') { return !visited[gate.page]; }
    if (gate.type === 'score') { if (window.scoring) { return !scoring.checkGate(gate.module); } }
    return false;
  }

  function _checkGate(pageId) {
    var moduleId = _startPageToModule[pageId];
    if (moduleId) { return !isModuleLocked(moduleId); }
    return true;
  }

  function _getGateMessage(moduleId) {
    var gate = moduleGates[moduleId];
    if (!gate) { return ''; }
    if (gate.type === 'visited') {
      if (moduleId === 'capstone') { return 'Please work through Modules 1 to 5 before starting the capstone.'; }
      if (moduleId === 'completion') { return 'Please complete the capstone before viewing your results.'; }
      return 'You must complete the previous module before accessing this one.';
    }
    if (gate.type === 'score') {
      var threshold = (window.scoring && scoring.gates[gate.module]) || 70;
      return 'You need to score at least ' + threshold + '% on the ' + gate.module.toUpperCase() + ' assessment before continuing.';
    }
    return '';
  }

  function _updateProgress() {
    var count = 0;
    for (var p in visited) { if (visited.hasOwnProperty(p)) { count++; } }
    var pct = Math.round((count / activeSequence.length) * 100);
    var bar = document.getElementById('progress-fill');
    var text = document.getElementById('progress-text');
    if (bar) { bar.style.width = pct + '%'; }
    if (text) { text.textContent = pct + '% Complete'; }
  }

  function _updateNavButtons() {
    var prevBtn = document.getElementById('btn-prev');
    var nextBtn = document.getElementById('btn-next');
    if (prevBtn) { prevBtn.disabled = currentIndex <= 0; }
    if (nextBtn) {
      nextBtn.disabled = currentIndex >= activeSequence.length - 1;
      nextBtn.textContent = currentIndex >= activeSequence.length - 2 ? 'Finish' : 'Next';
    }
  }

  function _updateModuleIndicator() {
    var currentModule = 'welcome';
    for (var i = modules.length - 1; i >= 0; i--) {
      var idx = activeSequence.indexOf(modules[i].startPage);
      if (idx !== -1 && currentIndex >= idx) { currentModule = modules[i].id; break; }
    }
    var tabs = document.querySelectorAll('.module-tab');
    for (var t = 0; t < tabs.length; t++) {
      var tab = tabs[t];
      var tabModule = tab.getAttribute('data-module');
      tab.classList.toggle('active', tabModule === currentModule);
      tab.classList.toggle('locked', isModuleLocked(tabModule));
    }
  }

  function init() {
    _buildActiveSequence();
    var bookmark = null;
    if (window.scormAPI) { bookmark = scormAPI.getBookmark(); }
    if (window.scormAPI) {
      var data = scormAPI.getSuspendData();
      if (data && data.selectedRole) { selectedRole = data.selectedRole; _buildActiveSequence(); }
      if (data && data.visited) { visited = data.visited; }
    }
    if (bookmark && activeSequence.indexOf(bookmark) !== -1) { currentIndex = activeSequence.indexOf(bookmark); }
    else { currentIndex = 0; }
    _loadPage(activeSequence[currentIndex]);
  }

  function goNext() {
    if (currentIndex >= activeSequence.length - 1) { return; }
    var nextPage = activeSequence[currentIndex + 1];
    if (!_checkGate(nextPage)) {
      var moduleId = _startPageToModule[nextPage];
      if (moduleId) { alert(_getGateMessage(moduleId)); }
      return;
    }
    currentIndex++;
    _loadPage(activeSequence[currentIndex]);
    _saveState();
  }

  function goPrev() {
    if (currentIndex <= 0) { return; }
    currentIndex--;
    _loadPage(activeSequence[currentIndex]);
  }

  function goToPage(pageId) {
    var idx = activeSequence.indexOf(pageId);
    if (idx === -1) { return false; }
    if (!_checkGate(pageId)) {
      var moduleId = _startPageToModule[pageId];
      if (moduleId) { alert(_getGateMessage(moduleId)); }
      return false;
    }
    currentIndex = idx;
    _loadPage(pageId);
    _saveState();
    return true;
  }

  function selectRole(role) {
    if (!m4Tracks[role]) { return; }
    selectedRole = role;
    _buildActiveSequence();
    _saveState();
    goNext();
  }

  function _saveState() {
    if (window.scormAPI) {
      var data = scormAPI.getSuspendData() || {};
      data.selectedRole = selectedRole;
      data.visited = visited;
      scormAPI.setSuspendData(data);
    }
  }

  function getCurrentPageId() { return _getCurrentPage(); }
  function getActiveSequence() { return activeSequence.slice(); }
  function getTotalPages() { return activeSequence.length; }
  function getVisitedCount() {
    var count = 0;
    for (var p in visited) { if (visited.hasOwnProperty(p)) { count++; } }
    return count;
  }

  return {
    init: init, goNext: goNext, goPrev: goPrev, goToPage: goToPage, selectRole: selectRole,
    getCurrentPageId: getCurrentPageId, getActiveSequence: getActiveSequence,
    getTotalPages: getTotalPages, getVisitedCount: getVisitedCount,
    isModuleLocked: isModuleLocked, modules: modules,
    selectedRole: function () { return selectedRole; }
  };
})();
