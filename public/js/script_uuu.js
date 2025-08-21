// frontend/script.js
const taskForm = document.getElementById("taskForm");
let editingTaskId = null; // Track which task is being edited
let allTasks = []; // Global storage for all tasks to enable filtering

function generateTaskId() {
  return 'TASK-' + Date.now().toString().slice(-6); // e.g., TASK-123456
}

function getCategoryInfo(category) {
  const map = {
    "Assignment": { icon: "fa-file-alt", class: "assignment" },
    "Lab": { icon: "fa-flask", class: "lab" },
    "Exam": { icon: "fa-pencil-ruler", class: "exam" },
    "Project": { icon: "fa-laptop-code", class: "project" },
    "Registration": { icon: "fa-clipboard-check", class: "registration" }
  };
  return map[category] || { icon: "fa-tasks", class: "default" };
}

async function fetchTasks() {
  const response = await fetch("http://65.1.93.41:3000/tasks", {
    credentials: 'include'
  });
  allTasks = await response.json(); // Store tasks globally
  displayTasks(allTasks); // Display all tasks initially
}

function displayTasks(tasks) {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "<h2>📅 Upcoming Tasks</h2>"; // Clear existing tasks

  if (tasks.length === 0) {
    taskList.innerHTML += "<p>No tasks found matching your criteria.</p>";
    return;
  }

  tasks.forEach((task) => {
    const categoryInfo = getCategoryInfo(task.category);
    const due = new Date(task.date);
    const today = new Date();
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    const taskBlock = document.createElement("div");
    taskBlock.className = `task-card ${categoryInfo.class} ${task.isPriority ? "priority" : ""} ${daysLeft < 3 && daysLeft >= 0 ? "soon" : ""} ${daysLeft < 0 ? "overdue" : ""}`;

    taskBlock.innerHTML = `
      <div class="task-header">
        <span class="category"><i class="fas ${categoryInfo.icon}"></i> ${task.category}</span>
        <span class="status">${daysLeft < 0 ? `⚠️ Overdue: ${due.toDateString().slice(4)}` : `⏰ Due: ${due.toDateString().slice(4)}`}</span>
      </div>
      <h3>${task.title}</h3>
      <p>${task.notes || ''}</p>
      <div class="controls">
        <button onclick="editTask('${task._id}')">Edit</button>
        <button onclick="markComplete('${task._id}')">✅ Complete</button>
        <button onclick="deleteTask('${task._id}')">Delete</button>
      </div>
    `;

    taskList.appendChild(taskBlock); // ✅ Append to parent
  });
}




taskForm.addEventListener("submit", submitTaskForm);

function loadTaskIntoForm(task) {
  document.getElementById("title").value = task.title;
  document.getElementById("category").value = task.category;
  document.getElementById("date").value = task.date.split("T")[0];
  document.getElementById("notes").value = task.notes || "";
  document.getElementById("isPriority").checked = task.isPriority;
  document.getElementById("isRecurring").checked = task.isRecurring;
  editingTaskId = task._id;
}

async function submitTaskForm(e) {
  e.preventDefault();

  const taskData = {
    title: document.getElementById("title").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
    notes: document.getElementById("notes").value,
    isPriority: document.getElementById("isPriority").checked,
    isRecurring: document.getElementById("isRecurring").checked
  };
  
  const method = editingTaskId ? "PUT" : "POST";
  const url = editingTaskId ? `http://65.1.93.41:3000/tasks/${editingTaskId}` : "http://65.1.93.41:3000/tasks/add";

  await fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(taskData)
  });

  taskForm.reset();
  editingTaskId = null;
  fetchTasks();
}

async function editTask(id) {
  const response = await fetch(`http://65.1.93.41:3000/tasks/${id}`, {
    credentials: 'include'
  });
  const task = await response.json();
  loadTaskIntoForm(task);
}

async function markComplete(id) {
  await fetch(`http://65.1.93.41:3000/tasks/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  fetchTasks();
}

async function deleteTask(id) {
  await fetch(`http://65.1.93.41:3000/tasks/${id}`, {
    method: "DELETE",
    credentials: 'include'
  });
  fetchTasks();
}

// Filter Functions
function filterTasks() {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  const categoryFilter = document.getElementById("category-filter").value;
  const statusFilter = document.getElementById("status-filter").value;
  const priorityOnly = document.getElementById("priority-filter").checked;

  let filteredTasks = allTasks.filter(task => {
    // Date range filter
    if (startDate || endDate) {
      const taskDate = new Date(task.date);
      if (startDate && taskDate < new Date(startDate)) return false;
      if (endDate && taskDate > new Date(endDate)) return false;
    }

    // Category filter
    if (categoryFilter && task.category !== categoryFilter) return false;

    // Priority filter
    if (priorityOnly && !task.isPriority) return false;

    // Status filter
    if (statusFilter) {
      const due = new Date(task.date);
      const today = new Date();
      const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      
      switch(statusFilter) {
        case 'upcoming':
          if (daysLeft < 0) return false;
          break;
        case 'overdue':
          if (daysLeft >= 0) return false;
          break;
        case 'soon':
          if (daysLeft < 0 || daysLeft >= 3) return false;
          break;
      }
    }

    return true;
  });

  // Sort filtered tasks by date (ascending)
  filteredTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  displayTasks(filteredTasks);
  updateTaskListHeader(filteredTasks.length);
}

function clearFilter() {
  // Clear all filter inputs
  document.getElementById("start-date").value = "";
  document.getElementById("end-date").value = "";
  document.getElementById("category-filter").value = "";
  document.getElementById("status-filter").value = "";
  document.getElementById("priority-filter").checked = false;
  
  // Display all tasks
  displayTasks(allTasks);
  updateTaskListHeader(allTasks.length);
}

function updateTaskListHeader(taskCount) {
  const taskList = document.getElementById("taskList");
  const header = taskList.querySelector("h2");
  if (header) {
    header.textContent = `📅 Tasks (${taskCount} found)`;
  }
}

// Auto-filter on input change for better user experience
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners for real-time filtering (optional)
  const filterElements = [
    'start-date', 'end-date', 'category-filter', 
    'status-filter', 'priority-filter'
  ];
  
  filterElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', filterTasks);
    }
  });
});

fetchTasks();
