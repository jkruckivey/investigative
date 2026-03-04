/**
 * SCORM 1.2 API Wrapper
 * Finds the LMS API, handles all SCORM communication with error handling.
 * Falls back gracefully when running outside an LMS (local testing).
 */
var scormAPI = (function () {
  'use strict';

  var api = null;
  var initialized = false;
  var finished = false;
  var debug = true;

  function log(msg) {
    if (debug && window.console) {
      console.log('[SCORM] ' + msg);
    }
  }

  function findAPI(win) {
    var attempts = 0;
    while (win.API == null && win.parent != null && win.parent !== win) {
      attempts++;
      if (attempts > 10) { return null; }
      win = win.parent;
    }
    return win.API || null;
  }

  function getAPI() {
    if (api) { return api; }
    api = findAPI(window);
    if (!api && window.opener) {
      api = findAPI(window.opener);
    }
    if (!api) {
      log('LMS API not found — running in standalone mode');
    }
    return api;
  }

  function initialize() {
    if (initialized) { return true; }
    var lms = getAPI();
    if (!lms) {
      initialized = true; // standalone mode
      return true;
    }
    var result = lms.LMSInitialize('');
    if (result === 'true' || result === true) {
      initialized = true;
      log('LMSInitialize succeeded');
      // Set incomplete on first launch
      var status = getValue('cmi.core.lesson_status');
      if (status === 'not attempted' || status === '' || !status) {
        setValue('cmi.core.lesson_status', 'incomplete');
      }
      return true;
    }
    log('LMSInitialize failed: ' + getError());
    initialized = true; // continue in degraded mode
    return false;
  }

  function terminate() {
    if (finished || !initialized) { return true; }
    commit();
    var lms = getAPI();
    if (!lms) { finished = true; return true; }
    var result = lms.LMSFinish('');
    finished = true;
    if (result === 'true' || result === true) {
      log('LMSFinish succeeded');
      return true;
    }
    log('LMSFinish failed: ' + getError());
    return false;
  }

  function getValue(key) {
    var lms = getAPI();
    if (!lms) { return ''; }
    var val = lms.LMSGetValue(key);
    log('GET ' + key + ' = ' + val);
    return val;
  }

  function setValue(key, val) {
    var lms = getAPI();
    if (!lms) {
      log('SET (standalone) ' + key + ' = ' + val);
      return true;
    }
    var result = lms.LMSSetValue(key, String(val));
    log('SET ' + key + ' = ' + val + ' -> ' + result);
    return result === 'true' || result === true;
  }

  function commit() {
    var lms = getAPI();
    if (!lms) { return true; }
    return lms.LMSCommit('') === 'true';
  }

  function getError() {
    var lms = getAPI();
    if (!lms) { return '0'; }
    return lms.LMSGetLastError();
  }

  // Convenience methods

  function setBookmark(pageId) {
    setValue('cmi.core.lesson_location', pageId);
    commit();
  }

  function getBookmark() {
    return getValue('cmi.core.lesson_location');
  }

  function setScore(raw, min, max) {
    setValue('cmi.core.score.raw', Math.round(raw));
    setValue('cmi.core.score.min', min || 0);
    setValue('cmi.core.score.max', max || 100);
    commit();
  }

  function setStatus(status) {
    // Valid: "passed", "completed", "failed", "incomplete", "browsed", "not attempted"
    setValue('cmi.core.lesson_status', status);
    commit();
  }

  function setSuspendData(data) {
    setValue('cmi.suspend_data', typeof data === 'string' ? data : JSON.stringify(data));
    commit();
  }

  function getSuspendData() {
    var raw = getValue('cmi.suspend_data');
    if (!raw) { return null; }
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }

  return {
    initialize: initialize,
    terminate: terminate,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    setBookmark: setBookmark,
    getBookmark: getBookmark,
    setScore: setScore,
    setStatus: setStatus,
    setSuspendData: setSuspendData,
    getSuspendData: getSuspendData
  };
})();
