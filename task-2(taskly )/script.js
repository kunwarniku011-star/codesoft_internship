
const STORAGE_KEY = "taskly_tasks";   // key used in Local Storage
const THEME_KEY = "taskly_theme";

const $ = (id) => document.getElementById(id);   // short helper

const addForm = $("addForm"), taskTitle = $("taskTitle"), taskCategory = $("taskCategory"),
  taskPriority = $("taskPriority"), taskDue = $("taskDue");
const taskList = $("taskList"), emptyState = $("emptyState");
const editDialog = $("editDialog"), editForm = $("editForm");

let tasks = [];                                   // all tasks in memory
let filters = { search: "", status: "all", category: "all", priority: "all", sort: "newest" };
let editingId = null;                             // id of the task being edited

/* ---------- 2. STORAGE: save & load from Local Storage ---------- */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    tasks = [];   // if saved data is corrupted, start fresh
  }
}

/* ---------- 3. VALIDATION ---------- */
// Returns an error message, or "" if the title is valid
function validateTitle(title, ignoreId = null) {
  const clean = title.trim();
  if (clean === "") return "Please enter a task.";
  if (clean.length < 3) return "Task must be at least 3 characters.";
  const duplicate = tasks.some(
    (t) => t.id !== ignoreId && t.title.toLowerCase() === clean.toLowerCase() && !t.completed
  );
  if (duplicate) return "This task is already on your list.";
  return "";
}

// Due date cannot be in the past (empty is allowed)
function validateDue(dateStr) {
  if (!dateStr) return "";
  return dateStr < todayString() ? "Due date can't be in the past." : "";
}

// Today as YYYY-MM-DD in local time (matches <input type="date">)
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/* ---------- 4. TASK ACTIONS: add / toggle / edit / delete ---------- */
function addTask(title, category, priority, due) {
  tasks.unshift({
    id: Date.now().toString(),   // simple unique id
    title: title.trim(),
    category, priority, due,
    completed: false,
    createdAt: Date.now(),
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function openEdit(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  editingId = id;
  $("editTitle").value = task.title;
  $("editCategory").value = task.category;
  $("editPriority").value = task.priority;
  $("editDue").value = task.due;
  $("editTitleError").textContent = "";
  editDialog.showModal();
}

function clearCompleted() {
  if (!tasks.some((t) => t.completed)) return;
  if (!confirm("Remove all completed tasks?")) return;
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
}

/* ---------- 5. RENDERING ---------- */
// Escape text so user input can never inject HTML
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function render() {
  const visible = getVisibleTasks();

  // Build the HTML for every visible task
  taskList.innerHTML = visible.map((t) => {
    const overdue = t.due && !t.completed && t.due < todayString();
    return `
      <li class="task p-${t.priority} ${t.completed ? "done" : ""}">
        <input type="checkbox" data-action="toggle" data-id="${t.id}" ${t.completed ? "checked" : ""}
               aria-label="Mark task as ${t.completed ? "pending" : "completed"}">
        <div class="task-body">
          <div class="task-title">${escapeHTML(t.title)}</div>
          <div class="meta">
            <span class="tag">${escapeHTML(t.category)}</span>
            <span>${t.priority[0].toUpperCase() + t.priority.slice(1)} priority</span>
            ${t.due ? `<span class="due ${overdue ? "overdue" : ""}">${overdue ? "Overdue: " : "Due "}${formatDate(t.due)}</span>` : ""}
          </div>
        </div>
        <div class="actions">
          <button data-action="edit" data-id="${t.id}" aria-label="Edit task" title="Edit">✏️</button>
          <button class="del" data-action="delete" data-id="${t.id}" aria-label="Delete task" title="Delete">🗑️</button>
        </div>
      </li>`;
  }).join("");

  // Empty-state message (different text if filters are hiding everything)
  emptyState.hidden = visible.length > 0;
  emptyState.textContent = tasks.length === 0
    ? "No tasks yet. Add your first task above."
    : "No tasks match your search or filters.";

  updateStats();
}

// Counts for total / pending / completed + progress bar
function updateStats() {
  const done = tasks.filter((t) => t.completed).length;
  $("statTotal").textContent = tasks.length;
  $("statDone").textContent = done;
  $("statPending").textContent = tasks.length - done;
  $("progressBar").style.width = tasks.length ? `${(done / tasks.length) * 100}%` : "0%";
}

/* ---------- 6. SEARCH, FILTER & SORT ---------- */
function getVisibleTasks() {
  const priorityRank = { high: 0, medium: 1, low: 2 };

  const result = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus = filters.status === "all" ||
      (filters.status === "completed" ? t.completed : !t.completed);
    const matchCategory = filters.category === "all" || t.category === filters.category;
    const matchPriority = filters.priority === "all" || t.priority === filters.priority;
    return matchSearch && matchStatus && matchCategory && matchPriority;
  });

  result.sort((a, b) => {
    if (filters.sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
    if (filters.sort === "due") {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;            // tasks without due date go last
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    }
    return b.createdAt - a.createdAt;  // newest first
  });
  return result;
}

/* ---------- 7. DARK MODE ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("themeIcon").textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  // Use saved choice, otherwise follow the device setting
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

/* ---------- 8. EVENT LISTENERS ---------- */
// Add task
addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const titleErr = validateTitle(taskTitle.value);
  const dueErr = validateDue(taskDue.value);
  $("titleError").textContent = titleErr;
  $("dueError").textContent = dueErr;
  taskTitle.classList.toggle("invalid", !!titleErr);
  if (titleErr || dueErr) return;          // stop if anything is invalid

  addTask(taskTitle.value, taskCategory.value, taskPriority.value, taskDue.value);
  addForm.reset();
  taskPriority.value = "medium";
  taskTitle.focus();
});

// Clear the error as soon as the user starts typing again
taskTitle.addEventListener("input", () => {
  $("titleError").textContent = "";
  taskTitle.classList.remove("invalid");
});

// One listener handles every checkbox / edit / delete button in the list
taskList.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;
  if (action === "toggle") toggleTask(id);
  if (action === "edit") openEdit(id);
  if (action === "delete") deleteTask(id);
});

// Save edited task
editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const err = validateTitle($("editTitle").value, editingId);
  $("editTitleError").textContent = err;
  if (err) return;

  const task = tasks.find((t) => t.id === editingId);
  task.title = $("editTitle").value.trim();
  task.category = $("editCategory").value;
  task.priority = $("editPriority").value;
  task.due = $("editDue").value;
  saveTasks();
  render();
  editDialog.close();
});
$("cancelEdit").addEventListener("click", () => editDialog.close());

// Search & filters
$("searchInput").addEventListener("input", (e) => { filters.search = e.target.value; render(); });
$("categoryFilter").addEventListener("change", (e) => { filters.category = e.target.value; render(); });
$("priorityFilter").addEventListener("change", (e) => { filters.priority = e.target.value; render(); });
$("sortSelect").addEventListener("change", (e) => { filters.sort = e.target.value; render(); });

$("statusFilter").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  filters.status = btn.dataset.status;
  render();
});

$("clearDone").addEventListener("click", clearCompleted);
$("themeToggle").addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

/* ---------- 9. START THE APP ---------- */
initTheme();
loadTasks();
$("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
taskDue.min = todayString();   // block past dates in the date picker
render();
