const TIMER_DURATION = 30 * 60 * 1000; // 30 minutes

function updateDisplay(status) {
  const statusDiv = document.getElementById('status');
  const problemDiv = document.getElementById('problem');
  const timerDiv = document.getElementById('timer');
  const actionsDiv = document.getElementById('actions');
  
  if (status.complete) {
    statusDiv.className = 'status complete';
    statusDiv.textContent = '✓ Today\'s problem completed! Browse freely.';
    problemDiv.innerHTML = '';
    timerDiv.innerHTML = '';
    actionsDiv.innerHTML = '';
  } else {
    statusDiv.className = 'status incomplete';
    statusDiv.textContent = '⚠ Complete today\'s problem to unlock browsing';
    
    problemDiv.innerHTML = `
      <h3>Today's Problem:</h3>
      <strong>${status.problem.name}</strong>
      <br><br>
      <button class="primary" id="openProblem">Open Problem</button>
    `;
    
    document.getElementById('openProblem').addEventListener('click', () => {
      browser.tabs.create({ url: status.problem.url });
    });
    
    // Timer logic
    if (status.timerStarted) {
      const elapsed = Date.now() - status.timerStarted;
      const remaining = TIMER_DURATION - elapsed;
      
      if (remaining <= 0) {
        timerDiv.innerHTML = '<div class="timer">Timer expired!</div>';
        actionsDiv.innerHTML = `
          <button class="warning" id="skipProblem">Skip Today's Problem</button>
          <button class="success" id="markComplete">Mark as Complete</button>
        `;
        
        document.getElementById('skipProblem').addEventListener('click', () => {
          browser.runtime.sendMessage({ action: "skipWithTimer" }).then(() => {
            window.close();
          });
        });
      } else {
        startTimerDisplay(remaining);
        actionsDiv.innerHTML = `
          <button class="success" id="markComplete">Mark as Complete</button>
        `;
      }
    } else {
      actionsDiv.innerHTML = `
        <button class="primary" id="startTimer">Can't Solve? Start 30min Timer</button>
        <button class="success" id="markComplete">Mark as Complete</button>
      `;
      
      document.getElementById('startTimer').addEventListener('click', () => {
        browser.runtime.sendMessage({ action: "startTimer" }).then(() => {
          browser.runtime.sendMessage({ action: "getStatus" }).then(updateDisplay);
        });
      });
    }
    
    const markBtn = document.getElementById('markComplete');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        browser.runtime.sendMessage({ action: "markComplete" }).then(() => {
          window.close();
        });
      });
    }
  }
}

function startTimerDisplay(remaining) {
  const timerDiv = document.getElementById('timer');
  
  function updateTimer() {
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    timerDiv.innerHTML = `<div class="timer">${mins}:${secs.toString().padStart(2, '0')}</div>`;
    
    if (remaining <= 0) {
      browser.runtime.sendMessage({ action: "getStatus" }).then(updateDisplay);
    } else {
      remaining -= 1000;
      setTimeout(updateTimer, 1000);
    }
  }
  
  updateTimer();
}

// Initial load
browser.runtime.sendMessage({ action: "getStatus" }).then(updateDisplay);

// Add reset functionality
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const resetBtn = document.getElementById('resetProgress');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all progress? This will start from Problem #1')) {
          browser.storage.local.clear().then(() => {
            window.close();
          });
        }
      });
    }
  }, 100);
});
