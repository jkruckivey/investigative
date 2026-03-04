/**
 * Navigation Controller
 * Manages page sequencing, progress tracking, bookmarking, and module gating.
 * Runs in the parent frame (index.html).
 */
var nav = (function () {
  'use strict';

  // Ordered page sequence — each entry is the page file path relative to pages/
  // Branching pages (M4 tracks) are handled separately
  var sequence = [
    'welcome.html',
    // Module 1
    'm1/m1-01.html', 'm1/m1-02.html', 'm1/m1-03.html', 'm1/m1-04.html',
    'm1/m1-05.html', 'm1/m1-06.html', 'm1/m1-kc.html',
    // Module 2
    'm2/m2-01.html', 'm2/m2-02.html', 'm2/m2-03.html', 'm2/m2-04.html',
    'm2/m2-05.html', 'm2/m2-06.html', 'm2/m2-07.html', 'm2/m2-assess.html',
    // Module 3
    'm3/m3-01.html', 'm3/m3-02.html', 'm3/m3-03.html', 'm3/m3-04.html',
    'm3/m3-05.html', 'm3/m3-06.html', 'm3/m3-07.html', 'm3/m3-08.html',
    'm3/m3-assess.html',
    // Module 4 — role selection, then tracks merge at assess
    'm4/m4-select.html',
    // HR track
    'm4/m4-hr/m4-hr-01.html', 'm4/m4-hr/m4-hr-02.html', 'm4/m4-hr/m4-hr-03.html',
    'm4/m4-hr/m4-hr-04.html', 'm4/m4-hr/m4-hr-05.html', 'm4/m4-hr/m4-hr-06.html',
    // FSQA track
    'm4/m4-fsqa/m4-fsqa-01.html', 'm4/m4-fsqa/m4-fsqa-02.html', 'm4/m4-fsqa/m4-fsqa-03.html',
    'm4/m4-fsqa/m4-fsqa-04.html', 'm4/m4-fsqa/m4-fsqa-05.html', 'm4/m4-fsqa/m4-fsqa-06.html',
    // OHS track
    'm4/m4-ohs/m4-ohs-01.html', 'm4/m4-ohs/m4-ohs-02.html', 'm4/m4-ohs/m4-ohs-03.html',
    'm4/m4-ohs/m4-ohs-04.html', 'm4/m4-ohs/m4-ohs-05.html', 'm4/m4-ohs/m4-ohs-06.html',
    // M4 assessment
    'm4/m4-assess.html',
    // Module 5
    'm5/m5-01.html', 'm5/m5-02.html', 'm5/m5-03.html', 'm5/m5-04.html',
    'm5/m5-05.html', 'm5/m5-06.html', 'm5/m5-assess.html',
    // Completion
    'completion.html'
  ];

  // Track which M4 role the learner selected
  var selectedRole = null; // 'hr', 'fsqa', or 'ohs'

  // Tracks for M4 branching
  var m4Tracks = {
    hr: ['m4/m4-hr/m4-hr-01.html', 'm4/m4-hr/m4-hr-02.html', 'm4/m4-hr/m4-hr-03.html',
         'm4/m4-hr/m4-hr-04.html', 'm4/m4-hr/m4-hr-05.html', 'm4/m4-hr/m4-hr-06.html'],
    fsqa: ['m4/m4-fsqa/m4-fsqa-01.html', 'm4/m4-fsqa/m4-fsqa-02.html', 'm4/m4-fsqa/m4-fsqa-03.html',
           'm4/m4-fsqa/m4-fsqa-04.html', 'm4/m4-fsqa/m4-fsqa-05.html', 'm4/m4-fsqa/m4-fsqa-06.html'],
    ohs: ['m4/m4-ohs/m4-ohs-01.html', 'm4/m4-ohs/m4-ohs-02.html', 'm4/m4-ohs/m4-ohs-03.html',
          'm4/m4-ohs/m4-ohs-04.html', 'm4/m4-ohs/m4-ohs-05.html', 'm4/m4-ohs/m4-ohs-06.html']
  };

  // Pages the learner actually sees (built dynamically based on role selection)
  var activeSequence = [];
  var currentIndex = 0;
  var visited = {};

  // Module metadata for progress display
  var modules = [
    { id: 'welcome', label: 'Welcome', startPage: 'welcome.html' },
    { id: 'm1', label: 'Module 1', startPage: 'm1/m1-01.html' },
    { id: 'm2', label: 'Module 2', startPage: 'm2/m2-01.html' },
    { id: 'm3', label: 'Module 3', startPage: 'm3/m3-01.html' },
    { id: 'm4', label: 'Module 4', startPage: 'm4/m4-select.html' },
    { id: 'm5', label: 'Module 5', startPage: 'm5/m5-01.html' },
    { id: 'completion', label: 'Complete', startPage: 'completion.html' }
  ];

  // Gate checks — module IDs that require a passing score before proceeding
  var gatedModules = {
    'm3/m3-01.html': 'm2',  // Must pass M2 to enter M3
    'm4/m4-select.html': 'm3'  // Must pass M3 to enter M4
  };

  function _buildActiveSequence() {
    activeSequence = [];
    for (var i = 0; i < sequence.length; i++) {
      var page = sequence[i];
      // Skip tracks that aren't selected
      if (selectedRole) {
        var isOtherTrack = false;
        for (var role in m4Tracks) {
          if (m4Tracks.hasOwnProperty(role) && role !== selectedRole) {
            if (m4Tracks[role].indexOf(page) !== -1) {
              isOtherTrack = true;
              break;
            }
          }
        }
        if (isOtherTrack) { continue; }
      }
      activeSequence.push(page);
    }
  }

  function _getIframe() {
    return document.getElementById('content-frame');
  }

  function _loadPage(pageId) {
    var iframe = _getIframe();
    if (iframe) {
      iframe.src = 'pages/' + pageId;
    }
    visited[pageId] = true;
    _updateProgress();
    _updateNavButtons();
    _updateModuleIndicator();
    // Bookmark
    if (window.scormAPI) {
      scormAPI.setBookmark(pageId);
    }
  }

  function _getCurrentPage() {
    return activeSequence[currentIndex] || '';
  }

  function _checkGate(pageId) {
    var requiredModule = gatedModules[pageId];
    if (!requiredModule) { return true; }
    if (window.scoring) {
      return scoring.checkGate(requiredModule);
    }
    return true;
  }

  function _updateProgress() {
    var count = 0;
    for (var p in visited) {
      if (visited.hasOwnProperty(p)) { count++; }
    }
    var pct = Math.round((count / activeSequence.length) * 100);
    var bar = document.getElementById('progress-fill');
    var text = document.getElementById('progress-text');
    if (bar) { bar.style.width = pct + '%'; }
    if (text) { text.textContent = pct + '% Complete'; }
  }

  function _updateNavButtons() {
    var prevBtn = document.getElementById('btn-prev');
    var nextBtn = document.getElementById('btn-next');
    if (prevBtn) {
      prevBtn.disabled = currentIndex <= 0;
    }
    if (nextBtn) {
      nextBtn.disabled = currentIndex >= activeSequence.length - 1;
      // Change label on last page
      nextBtn.textContent = currentIndex >= activeSequence.length - 2 ? 'Finish' : 'Next';
    }
  }

  function _updateModuleIndicator() {
    var page = _getCurrentPage();
    var currentModule = 'welcome';
    for (var i = modules.length - 1; i >= 0; i--) {
      var idx = activeSequence.indexOf(modules[i].startPage);
      if (idx !== -1 && currentIndex >= idx) {
        currentModule = modules[i].id;
        break;
      }
    }
    // Update module tabs
    var tabs = document.querySelectorAll('.module-tab');
    for (var t = 0; t < tabs.length; t++) {
      var tab = tabs[t];
      tab.classList.toggle('active', tab.getAttribute('data-module') === currentModule);
    }
    // Update page title
    var titleEl = document.getElementById('page-title');
    if (titleEl) {
      for (var m = 0; m < modules.length; m++) {
        if (modules[m].id === currentModule) {
          titleEl.textContent = modules[m].label;
          break;
        }
      }
    }
  }

  // Public API

  function init() {
    _buildActiveSequence();
    // Check for bookmark
    var bookmark = null;
    if (window.scormAPI) {
      bookmark = scormAPI.getBookmark();
    }
    // Restore role selection from suspend data
    if (window.scormAPI) {
      var data = scormAPI.getSuspendData();
      if (data && data.selectedRole) {
        selectedRole = data.selectedRole;
        _buildActiveSequence();
      }
      if (data && data.visited) {
        visited = data.visited;
      }
    }
    if (bookmark && activeSequence.indexOf(bookmark) !== -1) {
      currentIndex = activeSequence.indexOf(bookmark);
    } else {
      currentIndex = 0;
    }
    _loadPage(activeSequence[currentIndex]);
  }

  function goNext() {
    if (currentIndex >= activeSequence.length - 1) { return; }
    var nextPage = activeSequence[currentIndex + 1];
    if (!_checkGate(nextPage)) {
      var mod = gatedModules[nextPage];
      alert('You need to score at least ' + scoring.gates[mod] + '% on the ' + mod.toUpperCase() + ' assessment before continuing. Please review the material and try the assessment again.');
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
    if (!_checkGate(pageId)) { return false; }
    currentIndex = idx;
    _loadPage(pageId);
    _saveState();
    return true;
  }

  function selectRole(role) {
    if (!m4Tracks[role]) { return; }
    selectedRole = role;
    _buildActiveSequence();
    // Save role to suspend data
    _saveState();
    // Advance to first page of selected track
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

  function getCurrentPageId() {
    return _getCurrentPage();
  }

  function getActiveSequence() {
    return activeSequence.slice();
  }

  function getTotalPages() {
    return activeSequence.length;
  }

  function getVisitedCount() {
    var count = 0;
    for (var p in visited) {
      if (visited.hasOwnProperty(p)) { count++; }
    }
    return count;
  }

  return {
    init: init,
    goNext: goNext,
    goPrev: goPrev,
    goToPage: goToPage,
    selectRole: selectRole,
    getCurrentPageId: getCurrentPageId,
    getActiveSequence: getActiveSequence,
    getTotalPages: getTotalPages,
    getVisitedCount: getVisitedCount,
    modules: modules,
    selectedRole: function () { return selectedRole; }
  };
})();
