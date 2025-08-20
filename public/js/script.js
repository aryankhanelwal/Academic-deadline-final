// Array to hold all tasks in memory
let tasks = [];
// Holds the ID of the task currently being edited (if any)
let editingTaskId = null;

// Fetch tasks from server for the logged-in user
async function fetchTasks() {
  try {
    const response = await fetch('/tasks', {
      method: 'GET',
      credentials: 'include', // Include credentials to send session cookies
    });
    if (response.ok) {
      tasks = await response.json();
      renderTasks();
    } else {
      alert('Failed to fetch tasks. Please try again.');
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    alert('An error occurred while fetching tasks. Please try again.');
  }
}

// Load tasks when the page is loaded
window.addEventListener('DOMContentLoaded', fetchTasks);

// Generates a unique task ID based on the current timestamp
function generateTaskId() {
  return 'TASK-' + Date.now().toString().slice(-6); // e.g., TASK-123456
}

// Sorts tasks by their due date (earliest first)
function sortTasksByDate(taskArray) {
  return taskArray.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

// Returns icon and CSS class info for a given category
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

// Renders all tasks in the task list section
function renderTasks() {
  const taskList = document.querySelector('.task-list');
  // Remove any existing task cards before rendering
  taskList.querySelectorAll('.task-card').forEach(card => card.remove());

  // Sort tasks by due date
  const sortedTasks = sortTasksByDate(tasks);

  // Render each task as a card
  for (let task of sortedTasks) {
    // Map server fields to frontend fields
    const id = task._id || task.id;
    const title = task.title;
    const category = task.category;
    const dueDate = task.date || task.dueDate; // Server uses 'date', frontend expects 'dueDate'
    const notes = task.notes;
    const priority = task.isPriority || task.priority; // Server uses 'isPriority', frontend expects 'priority'
    
    const today = new Date();
    const due = new Date(dueDate);
    const categoryInfo = getCategoryInfo(category);
    // Calculate days left until due date
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    // Create the task card element
    const taskDiv = document.createElement('div');
    // Add classes for styling and status
    taskDiv.className = `task-card ${categoryInfo.class} ${priority ? "priority" : ""} ${daysLeft < 3 && daysLeft >= 0 ? "soon" : ""} ${daysLeft < 0 ? "overdue" : ""}`;

    // Set the inner HTML for the task card
    taskDiv.innerHTML = `
      <div class="task-header">
        <span class="category"><i class="fas ${categoryInfo.icon}"></i> ${category}</span>
        <span class="status">${daysLeft < 0 ? `⚠️ Overdue: ${due.toDateString().slice(4)}` : `⏰ Due: ${due.toDateString().slice(4)}`}</span>
      </div>
      <h3>${title}</h3>
      <p>${notes || ''}</p>
      <p style="font-size: 0.8rem; color: #888;">Task ID: ${id}</p>
      <div class="controls">
        <button onclick="markComplete('${id}')">✅ Complete</button>
        <button onclick="editTask('${id}')">Edit</button>
        <button onclick="deleteTask('${id}')">Delete</button>
      </div>
    `;
    // Add the card to the task list
    taskList.appendChild(taskDiv);
  }
}

// Filters tasks based on selected start and end dates
function filterTasks() {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  // Ensure both dates are selected
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Filter tasks whose due date falls within the selected range
  const filtered = tasks.filter(task => {
    const due = new Date(task.dueDate);
    return due >= start && due <= end;
  });

  renderFilteredTasks(filtered);
}

// Renders only the filtered tasks (used by filterTasks)
function renderFilteredTasks(filteredTasks) {
  const taskList = document.querySelector('.task-list');
  // Remove any existing task cards before rendering
  taskList.querySelectorAll('.task-card').forEach(card => card.remove());

  // Render each filtered task as a card
  for (let task of filteredTasks) {
    const { id, title, category, dueDate, notes, priority } = task;
    const today = new Date();
    const due = new Date(dueDate);
    const categoryInfo = getCategoryInfo(category);
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    const taskDiv = document.createElement('div');
    taskDiv.className = `task-card ${categoryInfo.class} ${priority ? "priority" : ""} ${daysLeft < 3 && daysLeft >= 0 ? "soon" : ""} ${daysLeft < 0 ? "overdue" : ""}`;

    taskDiv.innerHTML = `
      <div class="task-header">
        <span class="category"><i class="fas ${categoryInfo.icon}"></i> ${category}</span>
        <span class="status">${daysLeft < 0 ? `⚠️ Overdue: ${due.toDateString().slice(4)}` : `⏰ Due: ${due.toDateString().slice(4)}`}</span>
      </div>
      <h3>${title}</h3>
      <p>${notes || ''}</p>
      <p style="font-size: 0.8rem; color: #888;">Task ID: ${id}</p>
      <div class="controls">
        <button onclick="markComplete('${id}')">✅ Complete</button>
        <button onclick="editTask('${id}')">Edit</button>
        <button onclick="deleteTask('${id}')">Delete</button>
      </div>
    `;
    taskList.appendChild(taskDiv);
  }
}

// Clears the filter and shows all tasks
function clearFilter() {
  document.getElementById("start-date").value = '';
  document.getElementById("end-date").value = '';
  renderTasks();
}

// Handles the submission of the Add/Edit Task form
document.querySelector(".task-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Get form values
  const title = this.querySelector("input[type='text']").value;
  const category = this.querySelector("select").value;
  const dueDate = this.querySelector("#due-date").value; // Ensures correct date input is used
  const notes = this.querySelector("textarea").value;
  const priority = this.querySelectorAll("input[type='checkbox']")[0].checked;

  // Create the task object (server will handle taskid and userId)
  const task = { title, category, date: dueDate, notes, isPriority: priority };

  try {
    if (editingTaskId) {
      // Update existing task
      const response = await fetch(`/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(task)
      });
      
      if (response.ok) {
        editingTaskId = null;
        document.getElementById("submit-btn").innerText = "➕ Add Task";
      } else {
        alert('Failed to update task');
        return;
      }
    } else {
      // Add new task
      const response = await fetch('/tasks/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(task)
      });
      
      if (!response.ok) {
        alert('Failed to add task');
        return;
      }
    }
    
    // Reset form and refresh tasks from server
    this.reset();
    document.getElementById("task-id").value = "";
    await fetchTasks(); // Refresh tasks from server
  } catch (error) {
    console.error('Error saving task:', error);
    alert('An error occurred while saving the task');
  }
});

// Deletes a task by ID
async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }
  
  try {
    const response = await fetch(`/tasks/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      await fetchTasks(); // Refresh tasks from server
    } else {
      alert('Failed to delete task');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    alert('An error occurred while deleting the task');
  }
}

// Marks a task as complete (removes it from the list)
async function markComplete(id) {
  if (!confirm('Mark this task as complete?')) {
    return;
  }
  
  try {
    const response = await fetch(`/tasks/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      await fetchTasks(); // Refresh tasks from server
    } else {
      alert('Failed to mark task as complete');
    }
  } catch (error) {
    console.error('Error completing task:', error);
    alert('An error occurred while completing the task');
  }
}

// Loads a task into the form for editing
function editTask(id) {
  const task = tasks.find(t => (t._id || t.id) === id);
  if (!task) return;

  const form = document.querySelector(".task-form");
  const inputs = form.querySelectorAll("input, select, textarea");

  // Populate form fields with task data (map server fields to frontend fields)
  inputs[0].value = task.title;
  inputs[1].value = task.category;
  inputs[2].value = task.date || task.dueDate; // Server uses 'date'
  inputs[3].value = task.notes;
  inputs[4].checked = task.isPriority || task.priority; // Server uses 'isPriority'

  document.getElementById("task-id").value = task._id || task.id;
  editingTaskId = task._id || task.id;
  document.getElementById("submit-btn").innerText = "✏️ Update Task";
}


