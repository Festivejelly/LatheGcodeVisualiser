import dragula from 'dragula';
import 'dragula/dist/dragula.min.css';
import { Sender } from './sender';

const availableTasks = document.getElementById('availableTasks') as HTMLDivElement;
const tasksToExecute = document.getElementById('tasksToExecute') as HTMLDivElement;
const deleteTasks = document.getElementById('deleteTasks') as HTMLDivElement;
const addNewTask = document.getElementById('addNewTaskButton') as HTMLButtonElement;
const newTaskModal = document.getElementById('newTaskModal') as HTMLDivElement;
const closeTaskModal = document.getElementById('closeNewTaskModal') as HTMLSpanElement;
const newTaskType = document.getElementById('newTaskType') as HTMLSelectElement;
const newTaskGcode = document.getElementById('newTaskGcode') as HTMLTextAreaElement;
const saveNewTaskButton = document.getElementById('saveNewTaskButton') as HTMLButtonElement;
const newTaskName = document.getElementById('newTaskName') as HTMLInputElement;
const newTaskDescription = document.getElementById('newTaskDescription') as HTMLInputElement;
export const executeJobButton = document.getElementById('executeJobButton') as HTMLButtonElement;
const taskInfoModal = document.getElementById('taskInfoModal') as HTMLDivElement;
const closeTaskInfoModal = document.getElementById('closeTaskInfoModal') as HTMLSpanElement;
const taskInfoName = document.getElementById('taskInfoName') as HTMLInputElement;
const taskInfoType = document.getElementById('taskInfoType') as HTMLSelectElement;
const taskInfoDescription = document.getElementById('taskInfoDescription') as HTMLTextAreaElement;
const taskInfoGcode = document.getElementById('taskInfoGcode') as HTMLTextAreaElement;
const overideExistingTask = document.getElementById('overideExistingTask') as HTMLButtonElement;
const saveJobButton = document.getElementById('saveJobButton') as HTMLButtonElement;
const saveJobNameInput = document.getElementById('saveJobNameInput') as HTMLInputElement;
const jobLoadSelect = document.getElementById('jobLoadSelect') as HTMLSelectElement;
const loadJobToExecute = document.getElementById('loadJobToExecute') as HTMLButtonElement;
const deleteJobToExecute = document.getElementById('deleteJobToExecute') as HTMLButtonElement;
const importJobToExecute = document.getElementById('importJobToExecute') as HTMLButtonElement;
const exportJobToExecute = document.getElementById('exportJobToExecute') as HTMLButtonElement;
const overideOrCreateNewModal = document.getElementById('overideOrCreateNewModal') as HTMLDivElement;
const taskConflictText = document.getElementById('taskConflictText') as HTMLTextAreaElement;
const overideTaskOnImport = document.getElementById('overideTaskOnImport') as HTMLButtonElement;
const createNewTaskOnImport = document.getElementById('createNewTaskOnImport') as HTMLButtonElement;
const cancelTaskImport = document.getElementById('cancelTaskImport') as HTMLButtonElement;
let sender: Sender | null;
const plannerConnectButton = document.getElementById('plannerConnectButton') as HTMLButtonElement;
let isConnected = false;
let lastTaskCompleted = false;

const jobQueue: TaskData[] = []; // Initialize with tasks in the job
const manualTaskModal = document.getElementById('manualTaskModal') as HTMLDivElement;
const cncTaskModal = document.getElementById('cncTaskModal') as HTMLDivElement;
const cancelManualTaskButton = document.getElementById('cancelManualTask') as HTMLButtonElement;
const completeManualTaskButton = document.getElementById('completeManualTask') as HTMLButtonElement;
const manualTaskInstructions = document.getElementById('manualTaskInstructions') as HTMLTextAreaElement;
const cncTaskGcode = document.getElementById('cncTaskGcode') as HTMLTextAreaElement;
const cancelCncTaskButton = document.getElementById('cancelCncTask') as HTMLButtonElement;
const executeGcodeButton = document.getElementById('executeGcode') as HTMLButtonElement;
const completeCncTaskButton = document.getElementById('completeCncTask') as HTMLButtonElement;
const manualTaskName = document.getElementById('manualTaskName') as HTMLSpanElement;
const cncTaskName = document.getElementById('cncTaskName') as HTMLSpanElement;
const cncTaskSenderProgressLabel = document.getElementById('cncTaskSenderProgressLabel') as HTMLSpanElement;
const cncTaskSenderProgress = document.getElementById('cncTaskSenderProgress') as HTMLProgressElement;

const jobCancelledModal = document.getElementById('jobCancelledModal') as HTMLDivElement;
const jobCancelledCloseButton = document.getElementById('jobCancelledCloseButton') as HTMLButtonElement;

const completeTaskModal = document.getElementById('completeTaskModal') as HTMLDivElement;
const completeTaskCloseButton = document.getElementById('completeTaskCloseButton') as HTMLButtonElement;

const notConnectedModal = document.getElementById('notConnectedModal') as HTMLDivElement;
const notConnectedCloseButton = document.getElementById('notConnectedCloseButton') as HTMLButtonElement;

type TaskData = {
  id: number;
  name: string;
  type: string;
  description: string;
  gcode: string;
  order: number;
};

document.addEventListener('DOMContentLoaded', () => {

  sender = Sender.getInstance();
  sender.addStatusChangeListener(() => handleStatusChange());

  //if there is no data in local storage then set up some placeholder tasks
  setUpPlaceHolderTasks(1, 'Insert Stock', 'manual', 'Insert stock into chuck', '');
  setUpPlaceHolderTasks(2, 'Mount Tool 0', 'manual', 'Insert tool 0 into tool holder', '');
  setUpPlaceHolderTasks(3, 'Select Tool 0', 'gcode', 'Run Gcode to select T0', 'T0');

  loadCurrentJob();
  updateTaskNumbers();
  rebuildTaskElements();
  rebuildavailableTasksElements();
  updateJobLoadSelect();

  function updateJobLoadSelect(cleanFirst: boolean = false) {
    if (cleanFirst) {
      jobLoadSelect.innerHTML = '';
    }
    const savedJobs = Object.keys(localStorage).filter(key => key.includes('savedJob_'));
    savedJobs.forEach(job => {
      const jobName = job.replace('savedJob_', '');
      const option = document.createElement('option');
      option.value = jobName;
      option.textContent = jobName;
      jobLoadSelect.appendChild(option);
    });
  }

  notConnectedCloseButton.onclick = function () {
    notConnectedModal.style.display = 'none';
  }

  plannerConnectButton.addEventListener('click', () => {
    //this.gcodeResponseContainer.style.display = 'block';
    if (!isConnected && sender) sender.connect();
  });

  function handleStatusChange() {
    if (!sender) return;
    const status = sender.getStatus();
    if (status.isConnected === false) {
      plannerConnectButton.innerText = 'Connect';
      isConnected = false;
      return;
    } else {
      isConnected = true;
      plannerConnectButton.innerText = 'Connected';
      plannerConnectButton.disabled = true;
    }

    const isRun = status.condition === 'run';

    if (!isRun && lastTaskCompleted) {
      completeCncTaskButton.style.display = 'block';
      completeCncTaskButton.disabled = false;
      lastTaskCompleted = false;
    } else if (isRun) {
      lastTaskCompleted = true;
    }

    cncTaskSenderProgress.value = status.progress;
    console.log(`Progress: ${status.progress}`);
    
    cncTaskSenderProgress.style.display = 'block';
    cncTaskSenderProgressLabel.style.display = 'block';
  }


  function setUpPlaceHolderTasks(taskId: number, taskName: string, newTaskType: string, newTaskDescription: string, newTaskGcode: string) {

    const taskData = {
      id: taskId,
      name: taskName,
      type: newTaskType,
      description: newTaskDescription,
      gcode: newTaskGcode,
    };

    const task = document.createElement('div');
    task.classList.add(`task-${newTaskType}`);
    task.classList.add('available-task');
    task.setAttribute('data-task-id', taskId.toString());
    task.setAttribute('data-task-name', taskName);
    task.textContent = taskName;

    const infoButton = document.createElement('i');
    infoButton.classList.add('fas', 'fa-info-circle', 'fa-fw', 'show-info', 'icon-tooltip');
    infoButton.setAttribute('data-tooltip', 'Click for more info...');
    task.appendChild(infoButton);

    availableTasks.appendChild(task);

    localStorage.setItem(`task_${taskId}`, JSON.stringify(taskData));
  }

  const drake = dragula([availableTasks, tasksToExecute, deleteTasks], {
    copy: (_el, source) => {
      return source === availableTasks;
    },
    accepts: (_el, target) => {
      return target === tasksToExecute || target === deleteTasks;
    },
    revertOnSpill: true,
    removeOnSpill: false,
  });

  // Listen for the 'dragend' event to update task numbers
  drake.on('dragend', () => {
    updateTaskNumbers();
    rebuildTaskElements();
    saveCurrentJob();
  });

  function saveCurrentJob(name: string = 'currentJob') {
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');
    const jobData: (string | null)[] = [];
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id');
      jobData.push(taskId);
    });

    localStorage.setItem(name, jobData.join(','));
  }

  function loadCurrentJob() {
    const jobData = localStorage.getItem('currentJob');
    if (jobData) {
      const tasks = jobData.split(',');
      tasks.forEach(taskId => {
        const taskData = localStorage.getItem(`task_${taskId}`);
        if (taskData) {
          const data = JSON.parse(taskData);
          const newTask = document.createElement('div');
          newTask.classList.add(`task-${data.type}`);
          newTask.classList.add('task-to-execute');
          newTask.setAttribute('data-task-id', data.id);
          newTask.textContent = data.name;
          tasksToExecute.appendChild(newTask);
        }
      });
    }
  }

  //remove available-task class and add task-to-execute class
  drake.on('drop', (el, target, source) => {
    //get data task id from target
    const taskId = el.getAttribute('data-task-id');
    const taskOrder = el.getAttribute('data-task-order');

    if (target === tasksToExecute) {
      el.classList.remove('available-task');
      el.classList.add('task-to-execute');
      rebuildTaskElements()
    } else if (target === deleteTasks) {
      el.remove();
      let taskToDelete: HTMLElement | null = null;
      if (source === tasksToExecute) {
        taskToDelete = tasksToExecute.querySelector(`[data-task-order="${taskOrder}"]`);
      }
      else if (source === availableTasks) {
        taskToDelete = availableTasks.querySelector(`[data-task-id="${taskId}"]`);
      }

      if (taskToDelete) {
        taskToDelete.remove();
        localStorage.removeItem(`task_${taskId}`);
      }
    }
  });

  function rebuildTaskElements() {
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');
    tasks.forEach(task => {
      // Check if the task is missing the <i> element (or any other element)
      if (!task.querySelector('i')) {
        const icon = document.createElement('i');
        if (task.classList.contains('task-manual')) {
          icon.className = 'fas fa-users-cog icon-tooltip';
          icon.setAttribute('data-tooltip', 'Manual Task');
        } else if (task.classList.contains('task-gcode')) {
          icon.className = 'fas fa-code icon-tooltip';
          icon.setAttribute('data-tooltip', 'Gcode Task');
        }
        task.appendChild(icon);
      } else {
        let icon = task.querySelector('i');
        if (icon) {
          //delete icon from task
          icon.remove();
          icon = document.createElement('i');
          if (task.classList.contains('task-manual')) {
            icon.className = 'fas fa-users-cog icon-tooltip';
            icon.setAttribute('data-tooltip', 'Manual Task');
          } else if (task.classList.contains('task-gcode')) {
            icon.className = 'fas fa-code icon-tooltip';
            icon.setAttribute('data-tooltip', 'Gcode Task');
          }
          task.appendChild(icon);
        }
      }
    });
  }

  function rebuildavailableTasksElements() {
    availableTasks.innerHTML = '';
    const tasks = Object.keys(localStorage).filter(key => key.includes('task_'));
    //sort tasks by id
    tasks.sort((a, b) => {
      const aId = parseInt(a.replace('task_', ''));
      const bId = parseInt(b.replace('task_', ''));
      return aId - bId;
    });

    tasks.forEach(task => {
      const taskId = task.replace('task_', '');
      const taskData = localStorage.getItem(`task_${taskId}`);
      if (taskData) {
        const data = JSON.parse(taskData);

        const newTask = document.createElement('div');
        newTask.classList.add(`task-${data.type}`);
        newTask.classList.add('available-task');
        newTask.setAttribute('data-task-id', data.id);
        newTask.textContent = data.name;

        const infoButton = document.createElement('i');
        infoButton.classList.add('fas', 'fa-info-circle', 'fa-fw', 'show-info', 'icon-tooltip');
        infoButton.setAttribute('data-tooltip', 'Click for more info...');
        newTask.appendChild(infoButton);

        availableTasks.appendChild(newTask);
      }
    });
  }

  // Function to update task numbers
  function updateTaskNumbers() {
    const tasksToExecute = document.getElementById('tasksToExecute');
    if (tasksToExecute) {
      const tasks = tasksToExecute.querySelectorAll('div');
      tasks.forEach((task, index) => {
        const taskId = task.getAttribute('data-task-id');
        const data = localStorage.getItem(`task_${taskId}`)
        const taskName = data ? JSON.parse(data).name : '';
        task.setAttribute('data-task-order', (index + 1).toString());
        task.textContent = `Task ${index + 1}: ${taskName}`;
      });
    }
  }

  //if task type set to manual then disable gcode input
  newTaskType.addEventListener('change', () => {
    if (newTaskType.value === 'manual') {
      newTaskGcode.disabled = true;
      newTaskGcode.placeholder = 'Disabled for manual tasks';
      newTaskGcode.value = '';
    } else {
      newTaskGcode.placeholder = 'Enter gcode here...';
      newTaskGcode.disabled = false;
    }
  });

  taskInfoType.addEventListener('change', () => {
    if (taskInfoType.value === 'manual') {
      taskInfoGcode.disabled = true;
      taskInfoGcode.placeholder = 'Disabled for manual tasks';
      taskInfoGcode.value = '';
    } else {
      taskInfoGcode.placeholder = 'Enter gcode here...';
      taskInfoGcode.disabled = false;
    }
  });

  addNewTask.addEventListener('click', () => {
    newTaskModal.style.display = 'block';
  });

  // Save new task
  saveNewTaskButton.addEventListener('click', () => {
    const taskName = newTaskName.value;
    const newTask = document.createElement('div');
    newTask.classList.add(`task-${newTaskType.value}`);
    newTask.classList.add('available-task');

    let taskId = 0;
    const existingTasks = Object.keys(localStorage).filter(key => key.includes('task_'));
    existingTasks.forEach(task => {
      const id = parseInt(task.replace('task_', ''));
      if (id > taskId) {
        taskId = id;
      }
    });

    taskId = taskId + 1;

    newTask.setAttribute('data-task-id', taskId.toString());
    newTask.setAttribute('data-task-name', taskName);
    newTask.textContent = taskName;

    const infoButton = document.createElement('i');
    infoButton.classList.add('fas', 'fa-info-circle', 'fa-fw', 'show-info', 'icon-tooltip');
    infoButton.setAttribute('data-tooltip', 'Click for more info...');
    newTask.appendChild(infoButton);

    availableTasks.appendChild(newTask);
    newTaskModal.style.display = 'none';

    //create json object and save to local storage
    const taskData = {
      id: taskId,
      name: taskName,
      type: newTaskType.value,
      description: newTaskDescription.value,
      gcode: newTaskGcode.value,
    };

    //stringify the object and save to local storage
    localStorage.setItem(`task_${taskId}`, JSON.stringify(taskData));
  });

  overideExistingTask.addEventListener('click', () => {
    const taskId = taskInfoModal.getAttribute('data-task-id');
    const taskData = localStorage.getItem(`task_${taskId}`);
    if (taskData) {
      const data = JSON.parse(taskData);
      data.name = taskInfoName.value;
      data.type = taskInfoType.value;
      data.description = taskInfoDescription.value;
      data.gcode = taskInfoGcode.value;
      localStorage.setItem(`task_${taskId}`, JSON.stringify(data));
    }

    const taskToUpdate = availableTasks.querySelector(`[data-task-id="${taskId}"]`);
    if (taskToUpdate) {
      taskToUpdate.textContent = taskInfoName.value;
      taskToUpdate.classList.remove('task-manual');
      taskToUpdate.classList.remove('task-gcode');
      taskToUpdate.classList.add(`task-${taskInfoType.value}`);
      const infoButton = document.createElement('i');
      infoButton.classList.add('fas', 'fa-info-circle', 'fa-fw', 'show-info', 'icon-tooltip');
      infoButton.setAttribute('data-tooltip', 'Click for more info...');
      taskToUpdate.appendChild(infoButton);
    }

    taskInfoModal.style.display = 'none';
  });

  availableTasks.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (target.matches('.show-info')) {
      const parentDiv = target.parentNode as HTMLDivElement;
      const taskId = parentDiv.getAttribute('data-task-id');
      const taskData = localStorage.getItem(`task_${taskId}`);
      if (taskData) {
        const data = JSON.parse(taskData);
        taskInfoModal.style.display = 'block';
        taskInfoName.value = data.name;
        taskInfoType.value = data.type;
        taskInfoDescription.value = data.description;
        taskInfoGcode.value = data.gcode;
        if (taskId) {
          taskInfoModal.setAttribute('data-task-id', taskId.toString());
        }
      }
    }
  });

  closeTaskModal.onclick = function () {
    newTaskModal.style.display = "none";
  }

  closeTaskInfoModal.onclick = function () {
    taskInfoModal.style.display = "none";
  }

  completeTaskCloseButton.onclick = function () {
    completeTaskModal.style.display = 'none';
  }

  function executeNextTask() {
    if (jobQueue.length === 0) {
      console.log('All tasks completed');
      completeTaskModal.style.display = 'block';
      return;
    }

    const task = jobQueue.shift(); // Get the next task

    if (task && task.type === 'manual') {
      manualTaskName.textContent = `Task ${task.order}: ${task.name}`;
      manualTaskInstructions.value = task.description;
      manualTaskModal.style.display = 'block';
    } else if (task && task.type === 'gcode') {
      cncTaskName.textContent = `Task ${task.order}: ${task.name}`;
      cncTaskGcode.value = task.gcode;
      cncTaskModal.style.display = 'block';
      completeCncTaskButton.disabled = true;
      cncTaskSenderProgress.style.display = 'none';
      cncTaskSenderProgressLabel.style.display = 'none';
    }
  }

  cancelManualTaskButton.onclick = function () {
    manualTaskModal.style.display = 'none';
    jobQueue.length = 0;
    jobCancelledModal.style.display = 'block';
  }

  cancelCncTaskButton.onclick = function () {
    cncTaskModal.style.display = 'none';
    jobQueue.length = 0;
    jobCancelledModal.style.display = 'block';
  }

  completeManualTaskButton.onclick = function () {
    manualTaskModal.style.display = 'none';
    executeNextTask();
  }

  completeCncTaskButton.onclick = function () {
    cncTaskModal.style.display = 'none';
    executeNextTask();
  }

  executeGcodeButton.onclick = function () {
    if (sender) {
      sender.start(cncTaskGcode.value);
    }
  }

  jobCancelledCloseButton.onclick = function () {
    jobCancelledModal.style.display = 'none';
  }

  executeJobButton.onclick = function () {
    if(!isConnected) {
      notConnectedModal.style.display = 'block';
      return;
    }
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');
    tasks.forEach(task => {

      const taskId = task.getAttribute('data-task-id');
      const taskOrder = task.getAttribute('data-task-order');
      const taskData = localStorage.getItem(`task_${taskId}`);
      if (taskData) {
        const data = JSON.parse(taskData) as TaskData;
        data.order = parseInt(taskOrder || '0');
        jobQueue.push(data);
      }
    });

    executeNextTask();
  }

  saveJobButton.onclick = function () {
    saveCurrentJob(`savedJob_${saveJobNameInput.value}`);
    updateJobLoadSelect(true);
  }

  loadJobToExecute.onclick = function () {
    //first clear any existing tasks
    tasksToExecute.innerHTML = '';

    const jobName = jobLoadSelect.value;
    const jobData = localStorage.getItem(`savedJob_${jobName}`);
    if (jobData) {
      const tasks = jobData.split(',');
      tasks.forEach(taskId => {
        const taskData = localStorage.getItem(`task_${taskId}`);
        if (taskData) {
          const data = JSON.parse(taskData);
          const newTask = document.createElement('div');
          newTask.classList.add(`task-${data.type}`);
          newTask.classList.add('task-to-execute');
          newTask.setAttribute('data-task-id', data.id);
          newTask.textContent = data.name;
          tasksToExecute.appendChild(newTask);
        }
      });
    }
    updateTaskNumbers();
    rebuildTaskElements();
  }

  //delete selected job from local storage
  deleteJobToExecute.onclick = function () {
    const jobName = jobLoadSelect.value;
    localStorage.removeItem(`savedJob_${jobName}`);
    updateJobLoadSelect(true);
  }

  //import job from file
  importJobToExecute.onclick = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const contents = e.target?.result;
          if (contents) {
            const job = JSON.parse(contents as string);
            const jobTasks = job.tasks;

            type conflict = {
              importId: number,
              importName: string,
              importType: string,
              importDescription: string,
              importGcode: string,
              existingId: number,
              existingName: string,
              existingType: string,
              existingDescription: string,
              exisitingGcode: string
            }

            const conflicts: conflict[] = [];

            jobTasks.forEach((task: { id: number, name: string; type: string; description: string, gcode: string }) => {


              const existingTask = localStorage.getItem(`task_${task.id}`);

              if (existingTask) {
                const existingTaskData = JSON.parse(existingTask);

                //we found an existing task with the same id, so we need to check if the name, type, description and gcode are the same
                if (task.name !== existingTaskData.name || task.type !== existingTaskData.type || task.description !== existingTaskData.description || task.gcode !== existingTaskData.gcode) {
                  conflicts.push({
                    importId: task.id,
                    importName: task.name,
                    importType: task.type,
                    importDescription: task.description,
                    importGcode: task.gcode,
                    existingId: existingTaskData.id,
                    existingName: existingTaskData.name,
                    existingType: existingTaskData.type,
                    existingDescription: existingTaskData.description,
                    exisitingGcode: existingTaskData.gcode
                  });
                }
              }
            })

            if (conflicts.length > 0) {
              overideOrCreateNewModal.style.display = 'block';
              taskConflictText.textContent = `The following tasks already exist in the current job. Please select an action for each task.\n\n`;
              conflicts.forEach(conflict => {
                taskConflictText.textContent += `Import Task ${conflict.importId} already exists.\n
                Import Task Name: ${conflict.importName} | Existing Task Name: ${conflict.existingName}\n
                Import Task Type: ${conflict.importType} | Existing Task Type: ${conflict.existingType}\n
                Import Task Description: ${conflict.importDescription} | Existing Task Description: ${conflict.existingDescription}\n\n`;
              });

              overideTaskOnImport.onclick = function () {

                tasksToExecute.innerHTML = '';
                conflicts.forEach(conflict => {
                  const taskData = {
                    id: conflict.importId,
                    name: conflict.importName,
                    type: conflict.importType,
                    description: conflict.importDescription,
                    gcode: conflict.importGcode,
                  };
                  localStorage.setItem(`task_${conflict.importId}`, JSON.stringify(taskData));
                  if (taskData) {
                    const newTask = document.createElement('div');
                    newTask.classList.add(`task-${taskData.type}`);
                    newTask.classList.add('task-to-execute');
                    newTask.setAttribute('data-task-id', taskData.id.toString());
                    newTask.textContent = taskData.name;
                    tasksToExecute.appendChild(newTask);
                  }
                });
                overideOrCreateNewModal.style.display = 'none';
                updateTaskNumbers();
                rebuildTaskElements();
                saveCurrentJob();
                rebuildavailableTasksElements();
              }

              createNewTaskOnImport.onclick = function () {
                //find highest task id in local storage
                let taskId = 0;
                const existingTasks = Object.keys(localStorage).filter(key => key.includes('task_'));
                existingTasks.forEach(task => {
                  const id = parseInt(task.replace('task_', ''));
                  if (id > taskId) {
                    taskId = id;
                  }
                });

                tasksToExecute.innerHTML = '';

                conflicts.forEach(conflict => {
                  taskId = taskId + 1;
                  const taskData = {
                    id: taskId,
                    name: conflict.importName,
                    type: conflict.importType,
                    description: conflict.importDescription,
                    gcode: conflict.importGcode,
                  };
                  localStorage.setItem(`task_${taskId}`, JSON.stringify(taskData));
                  if (taskData) {
                    const newTask = document.createElement('div');
                    newTask.classList.add(`task-${taskData.type}`);
                    newTask.classList.add('task-to-execute');
                    newTask.setAttribute('data-task-id', taskData.id.toString());
                    newTask.textContent = taskData.name;
                    tasksToExecute.appendChild(newTask);
                  }
                });

                overideOrCreateNewModal.style.display = 'none';
                updateTaskNumbers();
                rebuildTaskElements();
                saveCurrentJob();
                rebuildavailableTasksElements();
              }

              cancelTaskImport.onclick = function () {
                overideOrCreateNewModal.style.display = 'none';
              }
            } else {
              tasksToExecute.innerHTML = '';
              jobTasks.forEach((task: { id: number, name: string; type: string; description: string, gcode: string }) => {
                const taskData = {
                  id: task.id,
                  name: task.name,
                  type: task.type,
                  description: task.description,
                  gcode: task.gcode,
                };
                localStorage.setItem(`task_${task.id}`, JSON.stringify(taskData));
                const newTask = document.createElement('div');
                newTask.classList.add(`task-${taskData.type}`);
                newTask.classList.add('task-to-execute');
                newTask.setAttribute('data-task-id', taskData.id.toString());
                newTask.textContent = taskData.name;
                tasksToExecute.appendChild(newTask);
              });
              updateTaskNumbers();
              rebuildTaskElements();
              saveCurrentJob();
              rebuildavailableTasksElements();
            }
          }
        }
        reader.readAsText(file);
      }
    }
    input.click();
  }

  exportJobToExecute.onclick = function () {
    //get currentJob from local storage and export as json but let user choose file name and location
    const currentJob = localStorage.getItem('currentJob');
    if (currentJob) {
      const tasks = currentJob.split(',');
      const job = {
        tasks: [] as any[]
      };

      tasks.forEach(task => {
        const taskData = localStorage.getItem(`task_${task}`);
        if (taskData) {
          const data = JSON.parse(taskData);
          job.tasks.push(data);
        }
      });

      const blob = new Blob([JSON.stringify(job)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'currentJob.json';
      a.click();
      URL.revokeObjectURL(url);
    }

  }


});