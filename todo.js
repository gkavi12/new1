document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const todoList = document.getElementById('todo-list');
    const inProgressList = document.getElementById('in-progress-list');
    const doneList = document.getElementById('done-list');
    const taskColumns = document.querySelectorAll('.task-column');
    const taskLists = document.querySelectorAll('.task-list');

    // Initialize the app
    loadTasks();

    // Event Listeners
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Make task lists droppable
    taskLists.forEach(list => {
        list.addEventListener('dragover', dragOver);
        list.addEventListener('dragenter', dragEnter);
        list.addEventListener('dragleave', dragLeave);
        list.addEventListener('drop', drop);
    });

    // Load tasks from local storage
    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || {
            todo: [],
            inProgress: [],
            done: []
        };

        renderTasks(tasks.todo, todoList);
        renderTasks(tasks.inProgress, inProgressList);
        renderTasks(tasks.done, doneList);
    }

    // Render tasks to a specific list
    function renderTasks(tasks, listElement) {
        listElement.innerHTML = '';
        
        tasks.forEach((task, index) => {
            const taskElement = createTaskElement(task, index);
            listElement.appendChild(taskElement);
        });
    }

    // Create a task element
    function createTaskElement(task, index) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.draggable = true;
        taskElement.dataset.index = index;
        taskElement.dataset.id = task.id;

        taskElement.innerHTML = `
            <div class="task-text">${task.text}</div>
            <div class="task-actions">
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // Add drag event listeners
        taskElement.addEventListener('dragstart', dragStart);
        taskElement.addEventListener('dragend', dragEnd);

        // Add action event listeners
        const editBtn = taskElement.querySelector('.edit-btn');
        const deleteBtn = taskElement.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => editTask(taskElement, task));
        deleteBtn.addEventListener('click', () => deleteTask(taskElement));

        return taskElement;
    }

    // Add a new task
    function addTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const tasks = JSON.parse(localStorage.getItem('tasks')) || {
                todo: [],
                inProgress: [],
                done: []
            };

            const newTask = {
                id: Date.now(),
                text: taskText,
                createdAt: new Date().toISOString()
            };

            tasks.todo.push(newTask);
            localStorage.setItem('tasks', JSON.stringify(tasks));

            const taskElement = createTaskElement(newTask, tasks.todo.length - 1);
            todoList.appendChild(taskElement);

            newTaskInput.value = '';
        }
    }

    // Edit a task
    function editTask(taskElement, task) {
        const taskText = taskElement.querySelector('.task-text');
        const currentText = taskText.textContent;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'edit-input';
        
        taskText.replaceWith(input);
        input.focus();

        const saveEdit = (e) => {
            if (e.key === 'Enter' || e.type === 'blur') {
                const newText = input.value.trim();
                if (newText && newText !== currentText) {
                    updateTaskInStorage(task.id, newText);
                    taskText.textContent = newText;
                }
                input.replaceWith(taskText);
                input.removeEventListener('keypress', saveEdit);
                input.removeEventListener('blur', saveEdit);
            }
        };

        input.addEventListener('keypress', saveEdit);
        input.addEventListener('blur', saveEdit);
    }

    // Update task in local storage
    function updateTaskInStorage(taskId, newText) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || {
            todo: [],
            inProgress: [],
            done: []
        };

        // Check all columns for the task
        for (const column of ['todo', 'inProgress', 'done']) {
            const taskIndex = tasks[column].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[column][taskIndex].text = newText;
                tasks[column][taskIndex].updatedAt = new Date().toISOString();
                localStorage.setItem('tasks', JSON.stringify(tasks));
                break;
            }
        }
    }

    // Delete a task
    function deleteTask(taskElement) {
        const taskId = parseInt(taskElement.dataset.id);
        const tasks = JSON.parse(localStorage.getItem('tasks')) || {
            todo: [],
            inProgress: [],
            done: []
        };

        // Remove from the appropriate column
        let columnUpdated = false;
        for (const column of ['todo', 'inProgress', 'done']) {
            const taskIndex = tasks[column].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[column].splice(taskIndex, 1);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                columnUpdated = true;
                break;
            }
        }

        if (columnUpdated) {
            taskElement.remove();
        }
    }

    // Drag and Drop Functions
    let draggedItem = null;

    function dragStart() {
        draggedItem = this;
        setTimeout(() => {
            this.classList.add('dragging');
        }, 0);
    }

    function dragEnd() {
        this.classList.remove('dragging');
        draggedItem = null;
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function dragEnter(e) {
        e.preventDefault();
        this.classList.add('highlight');
    }

    function dragLeave() {
        this.classList.remove('highlight');
    }

    function drop() {
        this.classList.remove('highlight');
        
        if (draggedItem) {
            const taskId = parseInt(draggedItem.dataset.id);
            const sourceList = draggedItem.parentElement;
            const targetList = this;
            
            // Determine source and target columns
            const sourceColumn = sourceList.parentElement.id.split('-')[0];
            const targetColumn = targetList.parentElement.id.split('-')[0];
            
            // Only proceed if moving to a different column
            if (sourceColumn !== targetColumn) {
                moveTaskInStorage(taskId, sourceColumn, targetColumn);
                
                // Remove from source list and add to target list
                const task = getTaskFromStorage(taskId, sourceColumn);
                if (task) {
                    removeTaskFromStorage(taskId, sourceColumn);
                    addTaskToStorage(task, targetColumn);
                    
                    // Update UI
                    draggedItem.remove();
                    const newTaskElement = createTaskElement(task, 
                        JSON.parse(localStorage.getItem('tasks'))[targetColumn].length - 1);
                    targetList.appendChild(newTaskElement);
                }
            }
        }
    }

    // Helper functions for drag and drop
    function getTaskFromStorage(taskId, column) {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        return tasks[column].find(task => task.id === taskId);
    }

    function removeTaskFromStorage(taskId, column) {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        const taskIndex = tasks[column].findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[column].splice(taskIndex, 1);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }

    function addTaskToStorage(task, column) {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        tasks[column].push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function moveTaskInStorage(taskId, fromColumn, toColumn) {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        const taskIndex = tasks[fromColumn].findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
            const [task] = tasks[fromColumn].splice(taskIndex, 1);
            tasks[toColumn].push(task);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }
});