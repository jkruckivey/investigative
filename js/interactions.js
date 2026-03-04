/**
 * Reusable Interaction Components
 * All components render into a container element and emit score events.
 *
 * Usage from content pages:
 *   <script src="../js/interactions.js"></script>  (adjust path as needed)
 *   <div id="my-activity"></div>
 *   <script> new MultipleChoice({ ... }).render('my-activity'); </script>
 */

/* ============================================================
   MultipleChoice
   ============================================================ */
function MultipleChoice(config) {
  // config: { question, options: [{ text, correct, feedback }], onComplete(correct, points) }
  this.question = config.question || '';
  this.options = config.options || [];
  this.onComplete = config.onComplete || function () {};
  this.answered = false;
}

MultipleChoice.prototype.render = function (containerId) {
  var self = this;
  var el = document.getElementById(containerId);
  if (!el) return;

  var html = '';
  if (this.question) {
    html += '<p class="mc-question"><strong>' + this.question + '</strong></p>';
  }
  html += '<ul class="mc-options" role="radiogroup">';
  var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (var i = 0; i < this.options.length; i++) {
    html += '<li class="mc-option" tabindex="0" role="radio" aria-checked="false" data-index="' + i + '">';
    html += '<span class="option-marker">' + letters[i] + '</span>';
    html += '<span class="option-text">' + this.options[i].text + '</span>';
    html += '</li>';
  }
  html += '</ul>';
  html += '<div class="mc-feedback" id="' + containerId + '-feedback"></div>';

  el.innerHTML = html;

  var items = el.querySelectorAll('.mc-option');
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener('click', function () { self._select(containerId, this); });
    items[j].addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self._select(containerId, this); }
    });
  }
};

MultipleChoice.prototype._select = function (containerId, optionEl) {
  if (this.answered) return;
  this.answered = true;

  var idx = parseInt(optionEl.getAttribute('data-index'));
  var opt = this.options[idx];
  var isCorrect = !!opt.correct;

  // Mark all options
  var el = document.getElementById(containerId);
  var items = el.querySelectorAll('.mc-option');
  for (var i = 0; i < items.length; i++) {
    items[i].style.pointerEvents = 'none';
    if (i === idx) {
      items[i].classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    if (this.options[i].correct && i !== idx) {
      items[i].classList.add('correct');
    }
  }

  // Show feedback
  var fb = document.getElementById(containerId + '-feedback');
  if (fb) {
    fb.className = 'mc-feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    fb.innerHTML = opt.feedback || (isCorrect ? 'Correct!' : 'Not quite. The correct answer has been highlighted.');
  }

  this.onComplete(isCorrect, isCorrect ? 1 : 0);
};


/* ============================================================
   ClickReveal
   ============================================================ */
function ClickReveal(config) {
  // config: { items: [{ title, content }] }
  this.items = config.items || [];
}

ClickReveal.prototype.render = function (containerId) {
  var el = document.getElementById(containerId);
  if (!el) return;

  var html = '';
  for (var i = 0; i < this.items.length; i++) {
    html += '<div class="click-reveal-item" id="' + containerId + '-item-' + i + '">';
    html += '<button class="click-reveal-trigger" aria-expanded="false" onclick="ClickReveal.toggle(\'' + containerId + '-item-' + i + '\')">';
    html += '<span>' + this.items[i].title + '</span>';
    html += '<span class="arrow" aria-hidden="true">&#9654;</span>';
    html += '</button>';
    html += '<div class="click-reveal-content" role="region">' + this.items[i].content + '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
};

ClickReveal.toggle = function (itemId) {
  var item = document.getElementById(itemId);
  if (!item) return;
  var isOpen = item.classList.contains('open');
  item.classList.toggle('open');
  var trigger = item.querySelector('.click-reveal-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', !isOpen);
};


/* ============================================================
   BranchScenario
   ============================================================ */
function BranchScenario(config) {
  // config: { start, scenes: { id: { text, image?, choices: [{ label, next, points, feedback }] } }, onComplete(totalPoints, maxPoints) }
  this.scenes = config.scenes || {};
  this.startId = config.start || 'scene-1';
  this.onComplete = config.onComplete || function () {};
  this.totalPoints = 0;
  this.maxPoints = config.maxPoints || 0;
  this.containerId = '';
}

BranchScenario.prototype.render = function (containerId) {
  this.containerId = containerId;
  this.totalPoints = 0;
  this._showScene(this.startId);
};

BranchScenario.prototype._showScene = function (sceneId) {
  var self = this;
  var scene = this.scenes[sceneId];
  var el = document.getElementById(this.containerId);
  if (!el || !scene) return;

  // Check if this is an end scene
  if (scene.end) {
    el.innerHTML = '<div class="branch-scene">' +
      '<div class="scene-text">' + scene.text + '</div>' +
      '</div>';
    this.onComplete(this.totalPoints, this.maxPoints);
    return;
  }

  var html = '<div class="branch-scene">';
  html += '<div class="scene-text">' + scene.text + '</div>';

  if (scene.choices && scene.choices.length > 0) {
    html += '<ul class="branch-choices" role="list">';
    for (var i = 0; i < scene.choices.length; i++) {
      html += '<li class="branch-choice" tabindex="0" role="button" data-index="' + i + '" data-scene="' + sceneId + '">';
      html += scene.choices[i].label;
      html += '</li>';
    }
    html += '</ul>';
    html += '<div class="branch-feedback" id="' + this.containerId + '-fb"></div>';
    html += '<button class="btn btn-primary" id="' + this.containerId + '-continue" style="display:none;margin-top:0.75rem;">Continue</button>';
  }

  html += '</div>';
  el.innerHTML = html;

  // Bind choice events
  var choices = el.querySelectorAll('.branch-choice');
  for (var j = 0; j < choices.length; j++) {
    choices[j].addEventListener('click', function () { self._choose(this); });
    choices[j].addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self._choose(this); }
    });
  }
};

BranchScenario.prototype._choose = function (choiceEl) {
  var sceneId = choiceEl.getAttribute('data-scene');
  var idx = parseInt(choiceEl.getAttribute('data-index'));
  var scene = this.scenes[sceneId];
  var choice = scene.choices[idx];
  var self = this;

  // Disable all choices
  var allChoices = document.querySelectorAll('#' + this.containerId + ' .branch-choice');
  for (var i = 0; i < allChoices.length; i++) {
    allChoices[i].style.pointerEvents = 'none';
  }
  choiceEl.classList.add('chosen');

  // Award points
  this.totalPoints += (choice.points || 0);

  // Show feedback
  var fb = document.getElementById(this.containerId + '-fb');
  if (fb && choice.feedback) {
    var quality = (choice.points || 0) >= 1 ? 'good' : (choice.points || 0) > 0 ? 'partial' : 'poor';
    fb.className = 'branch-feedback show ' + quality;
    fb.innerHTML = choice.feedback;
  }

  // Show continue button
  var continueBtn = document.getElementById(this.containerId + '-continue');
  if (continueBtn && choice.next) {
    continueBtn.style.display = 'inline-flex';
    continueBtn.onclick = function () { self._showScene(choice.next); };
  }
};


/* ============================================================
   DragSort
   ============================================================ */
function DragSort(config) {
  // config: { items: [{ text, category }], categories: [{ id, label }], onComplete(correct, total) }
  this.items = config.items || [];
  this.categories = config.categories || [];
  this.onComplete = config.onComplete || function () {};
  this.containerId = '';
  this.placed = 0;
}

DragSort.prototype.render = function (containerId) {
  this.containerId = containerId;
  var el = document.getElementById(containerId);
  if (!el) return;

  // Shuffle items
  var shuffled = this.items.slice().sort(function () { return Math.random() - 0.5; });

  var html = '<div class="drag-container">';

  // Source column
  html += '<div class="drag-source">';
  html += '<h4>Items to Sort</h4>';
  html += '<div class="drag-items" id="' + containerId + '-source">';
  for (var i = 0; i < shuffled.length; i++) {
    html += '<div class="drag-item" draggable="true" data-category="' + shuffled[i].category + '" id="' + containerId + '-item-' + i + '">';
    html += shuffled[i].text;
    html += '</div>';
  }
  html += '</div></div>';

  // Category drop zones
  for (var c = 0; c < this.categories.length; c++) {
    html += '<div class="drop-zone" data-category-id="' + this.categories[c].id + '" id="' + containerId + '-zone-' + this.categories[c].id + '">';
    html += '<h4>' + this.categories[c].label + '</h4>';
    html += '</div>';
  }

  html += '</div>';
  html += '<div id="' + containerId + '-result"></div>';

  el.innerHTML = html;
  this._bindDragEvents();
};

DragSort.prototype._bindDragEvents = function () {
  var self = this;
  var el = document.getElementById(this.containerId);

  var items = el.querySelectorAll('.drag-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('dragstart', function (e) {
      e.dataTransfer.setData('text/plain', this.id);
      this.classList.add('dragging');
    });
    items[i].addEventListener('dragend', function () {
      this.classList.remove('dragging');
    });
  }

  var zones = el.querySelectorAll('.drop-zone');
  for (var z = 0; z < zones.length; z++) {
    zones[z].addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });
    zones[z].addEventListener('dragleave', function () {
      this.classList.remove('drag-over');
    });
    zones[z].addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      var itemId = e.dataTransfer.getData('text/plain');
      var item = document.getElementById(itemId);
      if (!item) return;
      this.appendChild(item);
      item.draggable = false;
      item.style.cursor = 'default';

      var correctCat = item.getAttribute('data-category');
      var zoneCat = this.getAttribute('data-category-id');
      if (correctCat === zoneCat) {
        item.classList.add('correct-place');
      } else {
        item.classList.add('incorrect-place');
      }

      self.placed++;
      if (self.placed >= self.items.length) {
        self._checkResults();
      }
    });
  }
};

DragSort.prototype._checkResults = function () {
  var el = document.getElementById(this.containerId);
  var items = el.querySelectorAll('.drag-item');
  var correct = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].classList.contains('correct-place')) correct++;
  }
  var resultEl = document.getElementById(this.containerId + '-result');
  if (resultEl) {
    var pct = Math.round((correct / this.items.length) * 100);
    resultEl.innerHTML = '<div class="card ' + (pct >= 70 ? 'card-success' : 'card-warning') + '">' +
      '<strong>' + correct + ' of ' + this.items.length + ' correct (' + pct + '%)</strong></div>';
  }
  this.onComplete(correct, this.items.length);
};


/* ============================================================
   MatchPairs
   ============================================================ */
function MatchPairs(config) {
  // config: { pairs: [{ left, right }], onComplete(correct, total) }
  this.pairs = config.pairs || [];
  this.onComplete = config.onComplete || function () {};
  this.selectedLeft = null;
  this.matched = 0;
  this.correct = 0;
  this.containerId = '';
}

MatchPairs.prototype.render = function (containerId) {
  this.containerId = containerId;
  var el = document.getElementById(containerId);
  if (!el) return;

  var shuffledRight = this.pairs.slice().sort(function () { return Math.random() - 0.5; });

  var html = '<div class="match-container">';
  html += '<div class="match-column" id="' + containerId + '-left">';
  for (var i = 0; i < this.pairs.length; i++) {
    html += '<div class="match-item match-left" tabindex="0" data-pair="' + i + '">' + this.pairs[i].left + '</div>';
  }
  html += '</div>';
  html += '<div class="match-column" id="' + containerId + '-right">';
  for (var j = 0; j < shuffledRight.length; j++) {
    var origIdx = this.pairs.indexOf(shuffledRight[j]);
    html += '<div class="match-item match-right" tabindex="0" data-pair="' + origIdx + '">' + shuffledRight[j].right + '</div>';
  }
  html += '</div>';
  html += '</div>';
  html += '<div id="' + containerId + '-result"></div>';

  el.innerHTML = html;
  this._bindEvents();
};

MatchPairs.prototype._bindEvents = function () {
  var self = this;
  var el = document.getElementById(this.containerId);

  var leftItems = el.querySelectorAll('.match-left');
  var rightItems = el.querySelectorAll('.match-right');

  for (var i = 0; i < leftItems.length; i++) {
    leftItems[i].addEventListener('click', function () { self._selectLeft(this); });
  }
  for (var j = 0; j < rightItems.length; j++) {
    rightItems[j].addEventListener('click', function () { self._selectRight(this); });
  }
};

MatchPairs.prototype._selectLeft = function (el) {
  if (el.classList.contains('matched')) return;
  var leftItems = document.querySelectorAll('#' + this.containerId + ' .match-left');
  for (var i = 0; i < leftItems.length; i++) { leftItems[i].classList.remove('selected'); }
  el.classList.add('selected');
  this.selectedLeft = el;
};

MatchPairs.prototype._selectRight = function (el) {
  if (!this.selectedLeft || el.classList.contains('matched')) return;
  var leftPair = this.selectedLeft.getAttribute('data-pair');
  var rightPair = el.getAttribute('data-pair');

  this.matched++;
  if (leftPair === rightPair) {
    this.correct++;
    this.selectedLeft.classList.remove('selected');
    this.selectedLeft.classList.add('matched');
    el.classList.add('matched');
  } else {
    this.selectedLeft.classList.remove('selected');
    this.selectedLeft.classList.add('wrong');
    el.classList.add('wrong');
    var s = this.selectedLeft;
    setTimeout(function () { s.classList.remove('wrong'); el.classList.remove('wrong'); }, 800);
    this.matched--; // allow retry
  }

  this.selectedLeft = null;

  if (this.matched >= this.pairs.length) {
    var resultEl = document.getElementById(this.containerId + '-result');
    if (resultEl) {
      resultEl.innerHTML = '<div class="card card-success"><strong>All pairs matched!</strong></div>';
    }
    this.onComplete(this.correct, this.pairs.length);
  }
};


/* ============================================================
   FillTemplate
   ============================================================ */
function FillTemplate(config) {
  // config: { intro, fields: [{ label, type: "text"|"textarea"|"select", options?, expected, feedback }], onComplete(earned, possible) }
  this.intro = config.intro || '';
  this.fields = config.fields || [];
  this.onComplete = config.onComplete || function () {};
  this.containerId = '';
}

FillTemplate.prototype.render = function (containerId) {
  this.containerId = containerId;
  var el = document.getElementById(containerId);
  if (!el) return;

  var html = '';
  if (this.intro) { html += '<p>' + this.intro + '</p>'; }
  html += '<div class="template-form">';
  for (var i = 0; i < this.fields.length; i++) {
    var f = this.fields[i];
    html += '<div class="template-field" id="' + containerId + '-field-' + i + '">';
    html += '<label for="' + containerId + '-input-' + i + '">' + f.label + '</label>';
    if (f.type === 'textarea') {
      html += '<textarea id="' + containerId + '-input-' + i + '" rows="3"></textarea>';
    } else if (f.type === 'select' && f.options) {
      html += '<select id="' + containerId + '-input-' + i + '">';
      html += '<option value="">-- Select --</option>';
      for (var o = 0; o < f.options.length; o++) {
        html += '<option value="' + f.options[o] + '">' + f.options[o] + '</option>';
      }
      html += '</select>';
    } else {
      html += '<input type="text" id="' + containerId + '-input-' + i + '">';
    }
    html += '<div class="mc-feedback" id="' + containerId + '-fb-' + i + '"></div>';
    html += '</div>';
  }
  html += '</div>';
  html += '<button class="btn btn-primary" id="' + containerId + '-submit">Check Answers</button>';
  html += '<div id="' + containerId + '-result" style="margin-top:1rem;"></div>';

  el.innerHTML = html;

  var self = this;
  document.getElementById(containerId + '-submit').addEventListener('click', function () { self._check(); });
};

FillTemplate.prototype._check = function () {
  var earned = 0;
  for (var i = 0; i < this.fields.length; i++) {
    var input = document.getElementById(this.containerId + '-input-' + i);
    var field = document.getElementById(this.containerId + '-field-' + i);
    var fb = document.getElementById(this.containerId + '-fb-' + i);
    var val = input.value.trim().toLowerCase();
    var expected = this.fields[i].expected;
    var isCorrect = false;

    if (Array.isArray(expected)) {
      for (var e = 0; e < expected.length; e++) {
        if (val.indexOf(expected[e].toLowerCase()) !== -1) { isCorrect = true; break; }
      }
    } else {
      isCorrect = val.indexOf(expected.toLowerCase()) !== -1;
    }

    field.classList.remove('correct', 'incorrect');
    field.classList.add(isCorrect ? 'correct' : 'incorrect');
    input.disabled = true;

    if (fb) {
      fb.className = 'mc-feedback show ' + (isCorrect ? 'correct' : 'incorrect');
      fb.innerHTML = this.fields[i].feedback || (isCorrect ? 'Correct!' : 'Expected: ' + (Array.isArray(expected) ? expected.join(' or ') : expected));
    }

    if (isCorrect) earned++;
  }

  document.getElementById(this.containerId + '-submit').disabled = true;

  var resultEl = document.getElementById(this.containerId + '-result');
  if (resultEl) {
    var pct = Math.round((earned / this.fields.length) * 100);
    resultEl.innerHTML = '<div class="card ' + (pct >= 70 ? 'card-success' : 'card-warning') + '">' +
      '<strong>' + earned + ' of ' + this.fields.length + ' correct (' + pct + '%)</strong></div>';
  }

  this.onComplete(earned, this.fields.length);
};
