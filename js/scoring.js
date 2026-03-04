/**
 * Scoring Manager
 * Accumulates points per module, calculates weighted final score,
 * reports to SCORM via parent.scormAPI.
 */
var scoring = (function () {
  'use strict';

  // Module weights (must total 100)
  var weights = {
    m2: 15,
    m3: 25,
    m4: 40,
    m5: 20
  };

  // Gate thresholds — must score this % on module to proceed
  var gates = {
    m2: 70,
    m3: 70
  };

  var PASS_THRESHOLD = 75;

  // Per-module score storage: { m2: { earned: 0, possible: 0 }, ... }
  var scores = {};

  function _getScorm() {
    try { return parent.scormAPI || window.scormAPI; } catch (e) { return window.scormAPI; }
  }

  function _load() {
    var scorm = _getScorm();
    if (scorm) {
      var data = scorm.getSuspendData();
      if (data && data.scores) {
        scores = data.scores;
      }
    }
  }

  function _save() {
    var scorm = _getScorm();
    if (scorm) {
      var data = scorm.getSuspendData() || {};
      data.scores = scores;
      scorm.setSuspendData(data);
    }
  }

  function initModule(moduleId, totalPossible) {
    if (!scores[moduleId]) {
      scores[moduleId] = { earned: 0, possible: totalPossible || 0 };
    } else {
      scores[moduleId].possible = totalPossible || scores[moduleId].possible;
    }
  }

  function addPoints(moduleId, points, possibleForQuestion) {
    if (!scores[moduleId]) {
      scores[moduleId] = { earned: 0, possible: 0 };
    }
    scores[moduleId].earned += points;
    if (possibleForQuestion) {
      scores[moduleId].possible += possibleForQuestion;
    }
    _save();
  }

  function setModuleScore(moduleId, earned, possible) {
    scores[moduleId] = { earned: earned, possible: possible };
    _save();
  }

  function getModulePercent(moduleId) {
    var s = scores[moduleId];
    if (!s || s.possible === 0) { return 0; }
    return Math.round((s.earned / s.possible) * 100);
  }

  function getModuleScore(moduleId) {
    return scores[moduleId] || { earned: 0, possible: 0 };
  }

  function checkGate(moduleId) {
    var threshold = gates[moduleId];
    if (threshold === undefined) { return true; } // no gate
    return getModulePercent(moduleId) >= threshold;
  }

  function getFinalWeightedScore() {
    var total = 0;
    for (var mod in weights) {
      if (weights.hasOwnProperty(mod)) {
        var pct = getModulePercent(mod);
        total += (pct * weights[mod]) / 100;
      }
    }
    return Math.round(total);
  }

  function reportFinalScore() {
    var final = getFinalWeightedScore();
    var scorm = _getScorm();
    if (scorm) {
      scorm.setScore(final, 0, 100);
      scorm.setStatus(final >= PASS_THRESHOLD ? 'passed' : 'failed');
    }
    return final;
  }

  function getAllScores() {
    var result = {};
    for (var mod in weights) {
      if (weights.hasOwnProperty(mod)) {
        result[mod] = {
          earned: (scores[mod] || {}).earned || 0,
          possible: (scores[mod] || {}).possible || 0,
          percent: getModulePercent(mod),
          weight: weights[mod]
        };
      }
    }
    result.final = getFinalWeightedScore();
    result.passed = result.final >= PASS_THRESHOLD;
    return result;
  }

  function reset() {
    scores = {};
    _save();
  }

  // Auto-load on init
  _load();

  return {
    weights: weights,
    gates: gates,
    PASS_THRESHOLD: PASS_THRESHOLD,
    initModule: initModule,
    addPoints: addPoints,
    setModuleScore: setModuleScore,
    getModulePercent: getModulePercent,
    getModuleScore: getModuleScore,
    checkGate: checkGate,
    getFinalWeightedScore: getFinalWeightedScore,
    reportFinalScore: reportFinalScore,
    getAllScores: getAllScores,
    reset: reset
  };
})();
