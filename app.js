if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => {
    console.error('SW registration failed:', err);
  });
}

async function askPermission() {
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

askPermission();

let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
const timeouts = {};

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.action === 'notificationShown' && data.id) {
      markTaskCompleted(data.id);
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

  const task = { id, title, time };

  tasks.push(task);
  saveTasks();
  renderTask(task);
  scheduleTask(task);
  document.getElementById('title').value = document.getElementById('datetime').value = '';
}

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

function removeTimeoutForTask(id) {
  if (timeouts[id]) {
    clearTimeout(timeouts[id]);
    delete timeouts[id];
  }
}

function markTaskCompleted(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.completed) return;
  task.completed = true;
  saveTasks();
  renderAll();
  removeTimeoutForTask(id);
}

function removeTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  removeTimeoutForTask(id);
  tasks = tasks.filter((t) => t.id !== id);

  saveTasks();
  renderAll();
}

function scheduleTask(task) {
  if (task.completed) return;
  const diff = task.time - Date.now();
  if (diff <= 0) return;

  timeouts[task.id] = setTimeout(() => {
    navigator.serviceWorker.ready.then(async (reg) => {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          action: 'showNotification',
          title: 'To-Do Reminder',
          body: task.title,
          id: task.id,
        });
      }
    });
  }, diff);
}

tasks.forEach(scheduleTask);
renderAll();
