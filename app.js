// app.js

// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => {
    console.error('SW registration failed:', err);
  });
}

// ask permission
async function askPermission() {
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}
askPermission();

let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
const timeouts = {}; // keep timeouts to allow cancel

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Listen for messages from the service worker (e.g. notification shown)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action === 'notificationShown' && data.tag) {
      // find task by tag and mark completed
      const t = tasks.find((x) => x.tag === data.tag);
      if (t) markTaskCompleted(t.id);
    }
  });
}

function addTask() {
  const title = document.getElementById('title').value.trim();
  const datetime = document.getElementById('datetime').value;

  if (!title || !datetime) {
    alert('Enter a title and choose a date/time');
    return;
  }

  const time = new Date(datetime).getTime();
  if (time <= Date.now()) {
    alert('Choose a future date/time');
    return;
  }

  const id = Date.now();
  const tag = 'todo-' + id;

  const task = { id, title, time, tag };
  tasks.push(task);
  saveTasks();
  renderTask(task);
  scheduleTask(task);
}

// render existing tasks
function renderAll() {
  document.getElementById('task-list').innerHTML = '';
  tasks.forEach(renderTask);
}
function renderTask(task) {
  const container = document.getElementById('task-list');
  const d = document.createElement('div');
  d.className = 'task' + (task.completed ? ' completed' : '');
  d.id = 'task-' + task.id;
  const date = new Date(task.time);
  d.innerHTML = `
    <span class="title-text">${task.title}</span> — ${date.toLocaleTimeString()}, ${date.toDateString()}
    <button onclick="removeTask(${task.id})">X</button>
  `;
  container.appendChild(d);
}

function markTaskCompleted(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.completed) return;
  task.completed = true;
  saveTasks();
  const el = document.getElementById('task-' + id);
  if (el) el.classList.add('completed');
  // clear any scheduled timeout
  if (timeouts[id]) {
    clearTimeout(timeouts[id]);
    delete timeouts[id];
  }
}

// remove
function removeTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  // clear timeout if exists
  if (timeouts[id]) {
    clearTimeout(timeouts[id]);
    delete timeouts[id];
  }
  // tell SW to close the notification if it is already shown (by tag)
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ action: 'closeNotification', tag: task.tag });
  }
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  const el = document.getElementById('task-' + id);
  if (el) el.remove();
}

// schedule a task
function scheduleTask(task) {
  if (task.completed) return; // don't schedule already-completed tasks
  const diff = task.time - Date.now();
  if (diff <= 0) return;

  // 1) Schedule with setTimeout while page/tab is open:
  timeouts[task.id] = setTimeout(() => {
    // try experimental showTrigger first
    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        // some browsers (experimental) allow showTrigger with TimestampTrigger
        if (reg && reg.showNotification) {
          // attempt to use notification trigger (may throw)
          await reg.showNotification('To-Do Reminder', {
            body: task.title,
            tag: task.tag,
            icon: 'icon.png',
            // showTrigger is experimental — this line will throw in most browsers
            showTrigger: new TimestampTrigger(task.time),
          });
          return;
        }
      } catch (err) {
        // ignore and fallback
      }

      // fallback: post message to SW to show notification
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          action: 'showNotification',
          title: 'To-Do Reminder',
          body: task.title,
          tag: task.tag,
        });
      } else {
        // as final fallback, use Notification in page (if permission)
        if (Notification.permission === 'granted') {
          new Notification('To-Do Reminder', { body: task.title, icon: 'icon.png', tag: task.tag });
        }
      }
    });
  }, diff);
}

// schedule existing tasks on startup
tasks.forEach(scheduleTask);
renderAll();
