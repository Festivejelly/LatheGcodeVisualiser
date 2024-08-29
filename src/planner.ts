import dragula from 'dragula';
import 'dragula/dist/dragula.min.css';
import { Sender } from './sender';
import { KeyEmulation } from './keyEmulation';
import { nanoid } from 'nanoid';

const availableTasks = document.getElementById('availableTasks') as HTMLDivElement;
const tasksToExecute = document.getElementById('tasksToExecute') as HTMLDivElement;
const deleteTasks = document.getElementById('deleteTasks') as HTMLDivElement;
const addNewTask = document.getElementById('addNewTaskButton') as HTMLButtonElement;
const newTaskModal = document.getElementById('newTaskModal') as HTMLDivElement;
const closeTaskModal = document.getElementById('closeNewTaskModal') as HTMLSpanElement;
const newTaskType = document.getElementById('newTaskType') as HTMLSelectElement;
const gcodeTaskContainer = document.getElementById('gcodeTaskContainer') as HTMLDivElement;
const newTaskGcode = document.getElementById('newTaskGcode') as HTMLTextAreaElement;
const emulationOuterContainer = document.getElementById('emulationOuterContainer') as HTMLDivElement;
const saveNewTaskButton = document.getElementById('saveNewTaskButton') as HTMLButtonElement;
const newTaskName = document.getElementById('newTaskName') as HTMLInputElement;
const taskTextTitle = document.getElementById('taskTextTitle') as HTMLHeadingElement;
const newTaskDescription = document.getElementById('newTaskDescription') as HTMLInputElement;

let sender: Sender | null;
const plannerConnectButton = document.getElementById('plannerConnectButton') as HTMLButtonElement;
const plannerContainer = document.getElementById('plannerContainer') as HTMLDivElement;
let isConnected = false;
let feedRate: number | null = null;

//saving and loading available tasks
const saveAvailableTaskCollectionButton = document.getElementById('saveAvailableTaskCollection') as HTMLButtonElement;
const saveAvailableTaskCollectionButtonModal = document.getElementById('saveAvailableTaskCollectionButtonModal') as HTMLButtonElement;
const loadTaskCollectionButton = document.getElementById('loadTaskCollection') as HTMLButtonElement;
const availableTaskCollections = document.getElementById('availableTaskCollections') as HTMLSelectElement;
const collectionToSaveTo = document.getElementById('collectionToSaveTo') as HTMLSelectElement;
const newCollectionNameContainer = document.getElementById('newCollectionNameContainer') as HTMLDivElement;
const newCollectionName = document.getElementById('newCollectionName') as HTMLInputElement;
const deleteTaskCollectionButton = document.getElementById('deleteTaskCollection') as HTMLButtonElement;

const saveCollectionModal = document.getElementById('saveCollectionModal') as HTMLDivElement;
const saveCollectionModalToSaveTo = document.getElementById('saveCollectionModalToSaveTo') as HTMLSelectElement;
const saveCollectionModalCloseButton = document.getElementById('saveCollectionModalClose') as HTMLButtonElement;
const newCollectionNameModal = document.getElementById('newCollectionNameModal') as HTMLInputElement;
const newCollectionNameContainerModal = document.getElementById('newCollectionNameContainerModal') as HTMLDivElement;

//importing available tasks
const importAvailableTasksButton = document.getElementById('importAvailableTasks') as HTMLButtonElement;
const exportAvailableTasksButton = document.getElementById('exportAvailableTasks') as HTMLButtonElement;

//jobs
const saveJobModal = document.getElementById('saveJobModal') as HTMLDivElement;
const saveJobModalCloseButton = document.getElementById('saveJobModalClose') as HTMLButtonElement;
export const executeJobButton = document.getElementById('executeJobButton') as HTMLButtonElement;
const saveJobButton = document.getElementById('saveJobButton') as HTMLButtonElement;
const saveJobNameInput = document.getElementById('saveJobNameInput') as HTMLInputElement;
const saveJobNameSelect = document.getElementById('saveJobNameSelect') as HTMLSelectElement;
const newJobNameContainer = document.getElementById('newJobNameContainer') as HTMLDivElement;
const saveJobSaveButton = document.getElementById('saveJobSaveButton') as HTMLButtonElement;
const jobLoadSelect = document.getElementById('jobLoadSelect') as HTMLSelectElement;
const loadJobButton = document.getElementById('loadJobButton') as HTMLButtonElement;
const deleteJobButton = document.getElementById('deleteJobButton') as HTMLButtonElement;
const importJobButton = document.getElementById('importJobButton') as HTMLButtonElement;
const exportJobButton = document.getElementById('exportJobButton') as HTMLButtonElement;
const exportJobModal = document.getElementById('exportJobModal') as HTMLDivElement;
const exportJobModalCloseButton = document.getElementById('exportJobModalClose') as HTMLButtonElement;
const exportJobSaveButton = document.getElementById('exportJobSaveButton') as HTMLButtonElement;
const exportJobNameSelect = document.getElementById('exportJobNameSelect') as HTMLSelectElement;

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

//gcode exectution information
const currentGcodeLineContainer = document.getElementById('currentGcodeLineContainer') as HTMLDivElement;
const currentGcodeLine = document.getElementById('currentGcodeLine') as HTMLSpanElement;

const currentFeedrateContainer = document.getElementById('currentFeedrateContainer') as HTMLDivElement;
const currentFeedrate = document.getElementById('currentFeedrate') as HTMLSpanElement;


//emulation
const emulationInnerContainer = document.getElementById('emulationInnerContainer') as HTMLDivElement;
const emulationNewTasksList = document.getElementById('emulationNewTasks') as HTMLDivElement;
const emulatedButtonListDelete = document.getElementById('emulatedButtonListDelete') as HTMLDivElement;

const emulationTaskModal = document.getElementById('emulationTaskModal') as HTMLDivElement;

type TaskData = {
  id: string;
  name: string;
  type: string;
  description: string;
  gcode?: string;
  buttonKeys?: string;
  order?: number;
};

type TaskCollection = {
  name: string;
  tasks: TaskData[];
};

document.addEventListener('DOMContentLoaded', () => {

  sender = Sender.getInstance();
  sender.addStatusChangeListener(() => handleStatusChange());
  sender.addCurrentCommandListener(handleCurrentCommand);

  plannerContainer.addEventListener('containerVisible', () => {

    tasksToExecute.innerHTML = '';

    updateAvailableTaskCollectionsSelect();
    rebuildavailableTasksElements();
    loadJob('currentJob');
    updateTaskNumbers();
    rebuildTaskElements();
    updateJobLoadSelect();
  });

  saveCollectionModalToSaveTo.addEventListener('change', () => {
    if (saveCollectionModalToSaveTo.value === 'new') {
      newCollectionNameContainerModal.style.display = 'block';
    } else {
      newCollectionNameContainerModal.style.display = 'none';
    }
  });

  collectionToSaveTo.addEventListener('change', () => {
    if (collectionToSaveTo.value === 'new') {
      newCollectionNameContainer.style.display = 'block';
    } else {
      newCollectionNameContainer.style.display = 'none';
    }
  });

  saveJobNameSelect.addEventListener('change', () => {
    if (saveJobNameSelect.value === 'new') {
      newJobNameContainer.style.display = 'block';
    } else {
      newJobNameContainer.style.display = 'none';
    }
  });

  saveCollectionModalCloseButton.onclick = function () {
    saveCollectionModal.style.display = 'none';
  }

  //saving and loading available tasks
  saveAvailableTaskCollectionButton.onclick = function () {
    saveCollectionModal.style.display = 'block';
  }

  saveAvailableTaskCollectionButtonModal.onclick = function () {

    let taskCollectionName = "";

    if (saveCollectionModalToSaveTo.value === 'new') {

      taskCollectionName = newCollectionNameModal.value;
      if (taskCollectionName === null || taskCollectionName === '') {
        alert('Please enter a name for the collection');
        return;
      }
    } else {
      //set the name to the selected collection
      taskCollectionName = saveCollectionModalToSaveTo.value;
    }

    // Get the selected task collection
    const selectedTaskCollectionName = localStorage.getItem('selectedTaskCollection');
    let taskCollection;
    if (selectedTaskCollectionName) {
      const selectedTaskCollection = localStorage.getItem(`taskCollection_${selectedTaskCollectionName}`);
      if (selectedTaskCollection) {
        taskCollection = JSON.parse(selectedTaskCollection);
        // If the new collection name is the same as the selected one, no need to change it
        if (taskCollectionName !== selectedTaskCollectionName) {
          taskCollection.name = taskCollectionName;
          localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(taskCollection));
        }
      }
    }

    //update the select list
    const option = document.createElement('option');
    option.value = taskCollectionName;
    option.textContent = taskCollectionName;

    availableTaskCollections.appendChild(option);

    //close modal
    saveCollectionModal.style.display = 'none';

    //alert of save
    alert(`Collection ${taskCollectionName} saved`);

    updateAvailableTaskCollectionsSelect();
  }

  loadTaskCollectionButton.onclick = function () {
    const taskCollectionName = availableTaskCollections.value;
    localStorage.setItem('selectedTaskCollection', taskCollectionName);
    rebuildavailableTasksElements();
  }

  deleteTaskCollectionButton.onclick = function () {
    const taskCollectionName = availableTaskCollections.value;

    //dont allow user to delete the default collection
    if (taskCollectionName === 'default') {
      alert('You cannot delete the default collection');
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete the collection ${taskCollectionName}?`);
    if (confirmDelete) {
      localStorage.removeItem(`taskCollection_${taskCollectionName}`);
      updateAvailableTaskCollectionsSelect();
      rebuildavailableTasksElements();
    }
  }

  //import task collection(s) from file

  importAvailableTasksButton.onclick = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = async function (e) {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          reader.onload = function (e) {
            const contents = e.target?.result;
            if (contents) {
              const collections = JSON.parse(contents as string) as TaskCollection[];
              collections.forEach(collection => {
                const taskCollectionName = collection.name;
                const taskCollection = localStorage.getItem(`taskCollection_${taskCollectionName}`);
                //if task collection already exists then prompt
                if (taskCollection) {
                  const shouldOverride = window.confirm(`Task collection ${taskCollectionName} already exists. Do you want to override it?`);
                  if (shouldOverride) {
                    localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
                  }
                } else {
                  localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
                }
              });
              updateAvailableTaskCollectionsSelect();
            }
          }
          reader.readAsText(file);
        }
      }
    }
    input.click();
  }

  exportAvailableTasksButton.onclick = function () {
    const taskCollections = Object.keys(localStorage).filter(key => key.includes('taskCollection_'));
    const collections: TaskCollection[] = [];
    taskCollections.forEach(collection => {
      const taskCollection = localStorage.getItem(collection);
      if (taskCollection) {
        collections.push(JSON.parse(taskCollection));
      }
    });

    const blob = new Blob([JSON.stringify(collections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    //get the date and time
    const date = new Date();
    const dateString = date.toISOString().split('T')[0];
    a.download = `availableTasks_${dateString}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }


  emulationInnerContainer.addEventListener('click', function (event) {

    const targetElement = event.target as HTMLElement;
    // Check if a button was clicked
    if (targetElement.tagName === 'BUTTON') {
      // Get the id of the button
      const buttonId = targetElement.id;

      // Handle the button click
      handleButtonClick(buttonId);
    }
  });

  function handleButtonClick(buttonId: string) {

    const button = document.getElementById(buttonId);

    const clonedButton = button?.cloneNode(true) as HTMLButtonElement;

    // Add the emulated-button-list class to the cloned button
    clonedButton.classList.add('emulated-button-list');

    // Remove the ID from the cloned button
    clonedButton.removeAttribute('id');

    const uniqueId = 'emulated-' + Date.now();

    //create a data-emulateded-id attribute and set it to the emulatedButtonCount
    clonedButton.setAttribute('data-emulated-id', uniqueId);

    // const listItem = document.createElement('li');
    //  listItem.appendChild(clonedButton);
    emulationNewTasksList?.appendChild(clonedButton);
  }

  function updateJobLoadSelect() {
    jobLoadSelect.innerHTML = '';
    saveJobNameSelect.innerHTML = '';
    exportJobNameSelect.innerHTML = '';

    const savedJobs = Object.keys(localStorage).filter(key => key.includes('savedJob_')).sort();
    savedJobs.forEach(job => {
      const jobName = job.replace('savedJob_', '');
      const option = document.createElement('option');
      option.value = jobName;
      option.textContent = jobName;
      jobLoadSelect.appendChild(option);
      saveJobNameSelect.appendChild(option.cloneNode(true));
      exportJobNameSelect.appendChild(option.cloneNode(true));
    });

    // select the job that is stored in the loadedJobName local storage variable
    const loadedJobName = localStorage.getItem('loadedJobName');
    let optionExists = false;

    if (loadedJobName) {
      // check if the option already exists in the dropdown
      for (let i = 0; i < jobLoadSelect.options.length; i++) {
        if (jobLoadSelect.options[i].value === loadedJobName) {
          optionExists = true;
          break;
        }
      }
    }

    // if the loadedJobName is empty or doesn't exist in the dropdown, select the first item
    if (!loadedJobName || !optionExists) {
      jobLoadSelect.selectedIndex = 0;
    } else {
      // select the option in the dropdown
      jobLoadSelect.value = loadedJobName;
    }

    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = '--new collection--';
    saveJobNameSelect.appendChild(newOption.cloneNode(true));
  }

  function updateAvailableTaskCollectionsSelect() {

    availableTaskCollections.innerHTML = '';
    collectionToSaveTo.innerHTML = '';
    saveCollectionModalToSaveTo.innerHTML = '';

    // Add 'default' option to the beginning of the dropdown
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'default';
    availableTaskCollections.appendChild(defaultOption);
    collectionToSaveTo.appendChild(defaultOption.cloneNode(true));
    saveCollectionModalToSaveTo.appendChild(defaultOption.cloneNode(true));

    const taskCollections = Object.keys(localStorage).filter(key => key.includes('taskCollection_')).sort();
    taskCollections.forEach(collection => {

      if (collection === 'taskCollection_default') {
        return;
      }

      const collectionName = collection.replace('taskCollection_', '');
      const option = document.createElement('option');
      option.value = collectionName;
      option.textContent = collectionName;
      availableTaskCollections.appendChild(option);
      collectionToSaveTo.appendChild(option.cloneNode(true));
      saveCollectionModalToSaveTo.appendChild(option.cloneNode(true));
    });

    //set the selected collection to the last selected collection
    const selectedCollection = localStorage.getItem('selectedTaskCollection');

    if (selectedCollection) {
      availableTaskCollections.value = selectedCollection;
    }

    // Add 'new' option to the end of the dropdown
    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = '--new collection--';
    collectionToSaveTo.appendChild(newOption.cloneNode(true));
    saveCollectionModalToSaveTo.appendChild(newOption.cloneNode(true));
  }

  notConnectedCloseButton.onclick = function () {
    notConnectedModal.style.display = 'none';
  }

  plannerConnectButton.addEventListener('click', () => {
    //this.gcodeResponseContainer.style.display = 'block';
    if (!isConnected && sender) sender.connect();
  });

  function handleCurrentCommand(command: string) {
    if (!sender) return;
    const status = sender.getStatus();
    //const currentCommand = sender.getCurrentCommand();

    const isRun = status.condition === 'run';

    if (!isRun) {

    } else if (isRun) {

      const feedrateMatch = command.match(/F(\d+)/);
      if (feedrateMatch) {
        feedRate = parseInt(feedrateMatch[1], 10);
        currentFeedrate.innerText = feedRate.toString();
      }
      currentGcodeLine.innerText = command;

      currentFeedrateContainer.style.display = 'block';
      currentGcodeLineContainer.style.display = 'block';
    }
  }

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

    if (!isRun) {
      completeCncTaskButton.style.display = 'block';
      completeCncTaskButton.disabled = false;
      cncTaskSenderProgressLabel.innerText = "Task completed";

    } else if (isRun) {
      executeGcodeButton.disabled = true;
      cncTaskSenderProgressLabel.innerText = "Task in progress";
      completeCncTaskButton.style.display = 'none';
    }

    cncTaskSenderProgress.value = status.progress;

    cncTaskSenderProgress.style.display = 'block';
    cncTaskSenderProgressLabel.style.display = 'block';

  }

  const emulatedTaskDrake = dragula([emulationNewTasksList, emulatedButtonListDelete], {
    copy: false,
    accepts: (_el, target) => {
      return target === emulatedButtonListDelete || target === emulationNewTasksList;
    },
    revertOnSpill: true,
    removeOnSpill: false,
  });

  emulatedTaskDrake.on('drop', (el, target) => {
    if (target === emulatedButtonListDelete) {
      el.remove();
      //get the original button and delete it
      const emulatedId = el.getAttribute('data-emulated-id');
      const originalButton = emulationNewTasksList.querySelector(`[data-emulated-id="${emulatedId}"]`);
      if (originalButton) {
        originalButton.remove();
      }
    }
  });

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
    saveJob();
  });

  function saveJob(name: string = 'currentJob') {
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');
    const jobData: { id: string | null, collectionName: string | null }[] = [];
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id');
      const collectionName = task.getAttribute('data-collection-name');
      jobData.push({ id: taskId, collectionName: collectionName });
    });

    localStorage.setItem(name, JSON.stringify(jobData));
  }

  function loadJob(name: string = 'currentJob') {
    const jobData = localStorage.getItem(name);
    let tasks: { collectionName: string; id: any; }[] = [];

    if (jobData) {
      try {
        tasks = JSON.parse(jobData);
      } catch (e) {
        console.warn('Error parsing job data, clearing job data...');
        localStorage.setItem(name, JSON.stringify([]));
        localStorage.setItem('currentJob', JSON.stringify([]));
      }

      const removedTasks: { collectionName: string; id: any; }[] = [];
      tasks = tasks.filter((task: { collectionName: string; id: any; }) => {
        const collectionData = localStorage.getItem(`taskCollection_${task.collectionName}`);
        if (!collectionData) {
          removedTasks.push(task);
          return false;
        }
        return true;
      });


      localStorage.setItem('currentJob', JSON.stringify(tasks));
      localStorage.setItem(name, JSON.stringify(tasks));
      tasksToExecute.innerHTML = '';

      tasks.forEach((task: { collectionName: string; id: any; }) => {
        const collectionData = localStorage.getItem(`taskCollection_${task.collectionName}`);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const taskData = collection.tasks.find((t: any) => t.id === task.id);
          if (taskData) {
            const newTask = document.createElement('div');
            newTask.classList.add(`task-${taskData.type}`);
            newTask.classList.add('task-to-execute');
            newTask.setAttribute('data-task-id', taskData.id);
            newTask.setAttribute('data-task-name', taskData.name);
            newTask.setAttribute('data-collection-name', task.collectionName);
            newTask.textContent = taskData.name;
            tasksToExecute.appendChild(newTask);
          }
        }
      });
      if (removedTasks.length > 0) {
        alert(`The following tasks were removed because their collection does not exist: ${removedTasks.map(task => task.id).join(', ')}`);
      }
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
        //as the task as an available task, remove it from the collection
        if (taskToDelete) {
          const taskCollectionName = taskToDelete.getAttribute('data-collection-name');
          const taskCollection = localStorage.getItem(`taskCollection_${taskCollectionName}`);
          if (taskCollection) {
            const collection = JSON.parse(taskCollection) as TaskCollection;
            collection.tasks = collection.tasks.filter((task: TaskData) => task.id !== taskId);
            localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
          }
        }
      }

      if (taskToDelete) {
        taskToDelete.remove();
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
        } else if (task.classList.contains('task-emulation')) {
          icon.className = 'far fa-keyboard icon-tooltip';
          icon.setAttribute('data-tooltip', 'Emulation Task');
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
          } else if (task.classList.contains('task-emulation')) {
            icon.className = 'far fa-keyboard icon-tooltip';
            icon.setAttribute('data-tooltip', 'Emulation Task');
          }
          task.appendChild(icon);
        }
      }
    });
  }

  function rebuildavailableTasksElements() {
    availableTasks.innerHTML = '';

    let taskCollectionName = localStorage.getItem('selectedTaskCollection')

    if (taskCollectionName === null || taskCollectionName === '') {
      taskCollectionName = availableTaskCollections.value;
      localStorage.setItem('selectedTaskCollection', taskCollectionName);
    }

    const taskCollection = localStorage.getItem(`taskCollection_${taskCollectionName}`);

    if (taskCollection) {
      const collection = JSON.parse(taskCollection) as TaskCollection;
      collection.tasks.forEach((task: TaskData) => {
        const taskData: TaskData = {
          id: task.id,
          name: task.name,
          type: task.type,
          description: task.description
        };

        if (task.gcode) {
          taskData.gcode = task.gcode;
        }

        if (task.buttonKeys) {
          taskData.buttonKeys = task.buttonKeys;
        }

        const newTask = document.createElement('div');
        newTask.classList.add(`task-${task.type}`);
        newTask.classList.add('available-task');
        newTask.setAttribute('data-task-id', task.id.toString());
        newTask.setAttribute('data-task-name', task.name);
        newTask.setAttribute('data-collection-name', taskCollectionName || '');
        newTask.textContent = task.name;
        const infoButton = document.createElement('i');
        infoButton.classList.add('fas', 'fa-info-circle', 'fa-fw', 'show-info', 'icon-tooltip');
        infoButton.setAttribute('data-tooltip', 'Click for more info...');
        newTask.appendChild(infoButton);

        availableTasks.appendChild(newTask);
      });
    }
  }

  // Function to update task numbers
  function updateTaskNumbers() {
    const tasksToExecute = document.getElementById('tasksToExecute');
    if (tasksToExecute) {
      const tasks = tasksToExecute.querySelectorAll('div');
      tasks.forEach((task, index) => {
        const taskName = task.getAttribute('data-task-name');
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
      gcodeTaskContainer.style.display = 'none';
      emulationOuterContainer.style.display = 'none';
    } else if (newTaskType.value === 'emulation') {
      newTaskGcode.disabled = true;
      newTaskGcode.placeholder = 'Disabled for emulation tasks';
      newTaskGcode.value = '';
      gcodeTaskContainer.style.display = 'none';
      emulationOuterContainer.style.display = 'block';
    } else {
      emulationOuterContainer.style.display = 'none';
      gcodeTaskContainer.style.display = 'block';
      newTaskGcode.placeholder = 'Enter gcode here...';
      newTaskGcode.disabled = false;
    }
  });

  addNewTask.addEventListener('click', () => {
    newTaskModal.style.display = 'block';
    taskTextTitle.textContent = 'Add a new task';

    //clear name, description and gcode fields
    newTaskName.value = '';
    newTaskDescription.value = '';
    newTaskGcode.value = '';
    newCollectionName.value = '';
    newTaskModal.removeAttribute('data-task-id')

    collectionToSaveTo.value = '';
  });

  // Save new task
  saveNewTaskButton.addEventListener('click', () => {

    if (collectionToSaveTo.value === '') {
      alert('Please select a collection.');
      return;
    }

    //validate the form
    if (collectionToSaveTo.value === 'new' && newCollectionName.value === '') {
      alert('Please enter a collection name');
      return;
    }

    if (newTaskName.value === '' || newTaskName.value === null) {
      alert('Please enter a task name');
      return;
    }

    const taskName = newTaskName.value;
    const newTask = document.createElement('div');
    newTask.classList.add(`task-${newTaskType.value}`);
    newTask.classList.add('available-task');

    let taskId: string

    //get taskid from modal if it exists
    const taskIdFromModal = newTaskModal.getAttribute('data-task-id');
    if (taskIdFromModal) {
      taskId = taskIdFromModal;
    } else {
      taskId = nanoid();
    }

    newTask.setAttribute('data-task-id', taskId.toString());
    newTask.setAttribute('data-task-name', taskName);
    newTask.textContent = taskName;

    const infoButton = document.createElement('i');
    infoButton.classList.add('fas', 'fa-info-circle', 'fa-fw', 'show-info', 'icon-tooltip');
    infoButton.setAttribute('data-tooltip', 'Click for more info...');
    newTask.appendChild(infoButton);

    //if the task already exists then remove it
    const existingTask = availableTasks.querySelector(`[data-task-id="${taskId}"]`);
    if (existingTask) {
      existingTask.remove();
    }
    availableTasks.appendChild(newTask);
    newTaskModal.style.display = 'none';

    let emulatedButtonsList = "";
    //if the mode is emulation then add the button keys to the task
    if (newTaskType.value === 'emulation') {
      const emulatedButtons = emulationNewTasksList.querySelectorAll('.emulated-button-list');
      emulatedButtons.forEach(button => {
        const buttonId = button.getAttribute('data-button-key');
        emulatedButtonsList += buttonId + ',';
      });

      if (emulatedButtonsList.length > 0) {
        emulatedButtonsList = emulatedButtonsList.slice(0, -1);
      }
    }

    //create json object and save to local storage
    const taskData: TaskData = {
      id: taskId,
      name: taskName,
      type: newTaskType.value,
      description: newTaskDescription.value
    };

    if (newTaskType.value === 'gcode') {
      taskData.gcode = newTaskGcode.value;
    }

    if (newTaskType.value === 'emulation') {
      taskData.buttonKeys = emulatedButtonsList;
    }

    //if the collectionToSaveTo is set to new then save the task to a new collection
    if (collectionToSaveTo.value === 'new') {
      const taskCollectionName = newCollectionName.value;
      const taskCollection = {
        name: taskCollectionName,
        tasks: [] as TaskData[]
      };
      taskCollection.tasks.push(taskData);
      localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(taskCollection));
      //update the select list
      const option = document.createElement('option');
      option.value = taskCollectionName;
      option.textContent = taskCollectionName;

      availableTaskCollections.appendChild(option);
      updateAvailableTaskCollectionsSelect();
    } else {
      const taskCollectionName = collectionToSaveTo.value;
      const taskCollection = localStorage.getItem(`taskCollection_${taskCollectionName}`);
      if (taskCollection) {
        const collection = JSON.parse(taskCollection) as TaskCollection;

        //if the task already exists then remove it
        const existingTask = collection.tasks.find(task => task.id === taskId);
        if (existingTask) {
          collection.tasks = collection.tasks.filter(task => task.id !== taskId);
        }
        collection.tasks.push(taskData);
        localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
      } else {
        const taskCollection = {
          name: taskCollectionName,
          tasks: [] as TaskData[]
        };
        taskCollection.tasks.push(taskData);
        localStorage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(taskCollection));
      }
    }

    rebuildavailableTasksElements();
  });

  availableTasks.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (target.matches('.show-info')) {
      const parentDiv = target.parentNode as HTMLDivElement;
      const taskId = parentDiv.getAttribute('data-task-id');
      let taskData: TaskData | null = null;
      const currentCollectionName = localStorage.getItem('selectedTaskCollection');

      //get task from selected collection
      const taskCollection = localStorage.getItem(`taskCollection_${currentCollectionName}`);

      if (taskCollection) {
        const collection = JSON.parse(taskCollection) as TaskCollection;
        const task = collection.tasks.find((task: TaskData) => task.id === taskId);
        if (task) {
          taskData = task;
        }
      }

      if (taskData) {
        newTaskModal.style.display = 'block';
        newTaskName.value = taskData.name;
        newTaskType.value = taskData.type;
        newTaskDescription.value = taskData.description;
        newTaskGcode.value = taskData.gcode || '';
        collectionToSaveTo.value = currentCollectionName || 'default';
        taskTextTitle.textContent = 'Edit Task';

        if (taskData.type === 'emulation') {
          emulationOuterContainer.style.display = 'block';
          gcodeTaskContainer.style.display = 'none';
          emulationNewTasksList.innerHTML = '';
          const buttonKeys = (taskData.buttonKeys ?? '').split(',');
          buttonKeys.forEach((key: string) => {
            const button = document.createElement('button');
            button.classList.add('emulated-button-list');
            button.classList.add('material-symbols-outlined');
            button.setAttribute('data-button-key', key);
            button.textContent = KeyEmulation.getButtonName(key);
            if (button.textContent.length === 1) {
              button.classList.add('standard-font');
            }
            emulationNewTasksList.appendChild(button);
          });
        } else if (taskData.type === 'gcode') {
          emulationOuterContainer.style.display = 'none';
          gcodeTaskContainer.style.display = 'block';
          newTaskGcode.disabled = false;
          newTaskGcode.placeholder = 'Enter gcode here...';

        } else {
          emulationOuterContainer.style.display = 'none';
          gcodeTaskContainer.style.display = 'none';
        }

        if (taskId) {
          newTaskModal.setAttribute('data-task-id', taskId.toString());
        }
      }
    }
  });

  closeTaskModal.onclick = function () {
    newTaskModal.style.display = "none";
  }

  completeTaskCloseButton.onclick = function () {
    completeTaskModal.style.display = 'none';
  }

  function executeNextTask() {
    if (jobQueue.length === 0) {
      completeTaskModal.style.display = 'block';
      return;
    }

    executeGcodeButton.disabled = false;
    const task = jobQueue.shift(); // Get the next task

    if (task && task.type === 'manual') {
      manualTaskName.textContent = `Task ${task.order}: ${task.name}`;
      manualTaskInstructions.value = task.description;
      manualTaskModal.style.display = 'block';
    } else if (task && task.type === 'gcode') {
      cncTaskName.textContent = `Task ${task.order}: ${task.name}`;
      cncTaskGcode.value = task.gcode ?? '';
      cncTaskModal.style.display = 'block';
      const taskModalContent = cncTaskModal.querySelector('.task-modal-content') as HTMLElement; // Typecast to HTMLElement
      if (taskModalContent) {
        taskModalContent.style.backgroundColor = '';
      }
      completeCncTaskButton.disabled = true;
      cncTaskSenderProgress.style.display = 'none';
      cncTaskSenderProgressLabel.style.display = 'none';
    } else if (task && task.type === 'emulation') {
      //todo: add key emulation
      emulationTaskModal.style.display = 'block';

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
    sender?.stop();
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
    if (!isConnected) {
      notConnectedModal.style.display = 'block';
      return;
    }
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');
    tasks.forEach(task => {

      const taskId = task.getAttribute('data-task-id');
      const taskOrder = task.getAttribute('data-task-order');
      const collectionName = task.getAttribute('data-collection-name');

      const taskCollection = localStorage.getItem(`taskCollection_${collectionName}`);
      let taskData: TaskData | null = null;
      if (taskCollection) {
        const collection = JSON.parse(taskCollection) as TaskCollection;
        const task = collection.tasks.find((task: TaskData) => task.id === taskId);
        if (task) {
          taskData = task;
        }
      }
      if (taskData) {
        taskData.order = parseInt(taskOrder || '0');
        jobQueue.push(taskData);
      }
    });

    executeNextTask();
  }

  saveJobButton.onclick = function () {
    saveJobModal.style.display = 'block';
    //set the selected job to the loaded job
    const loadedJobName = localStorage.getItem('loadedJobName');
    if (loadedJobName) {
      saveJobNameSelect.value = loadedJobName;
    }
    if (saveJobNameSelect.options.length === 0) {
      saveJobNameInput.style.display = 'block';
    }
  }

  saveJobSaveButton.onclick = function () {

    let jobName = saveJobNameSelect.value === 'new' ? saveJobNameInput.value : saveJobNameSelect.value;

    if (jobName === '' || jobName === null) {
      alert('Please enter a name for the job');
      return;
    }

    const jobData = localStorage.getItem(`savedJob_${jobName}`);
    if (jobData) {
      const confirmOverwrite = confirm('A job with this name already exists. Do you want to overwrite it?');
      if (!confirmOverwrite) {
        return;
      }
    }

    saveJob(`savedJob_${jobName}`);
    updateJobLoadSelect();

    saveJobModal.style.display = 'none';
    saveJobNameInput.value = '';

    //show modal saying job saved
    alert(`${jobName} saved`);
  }

  saveJobModalCloseButton.onclick = function () {
    saveJobModal.style.display = 'none';
  }

  exportJobModalCloseButton.onclick = function () {
    exportJobModal.style.display = 'none';
  }

  loadJobButton.onclick = function () {
    //first clear any existing tasks
    tasksToExecute.innerHTML = '';

    const jobName = jobLoadSelect.value;
    const jobData = localStorage.getItem(`savedJob_${jobName}`);
    if (jobData) {
      const tasks = JSON.parse(jobData);
      tasks.forEach((task: { collectionName: string; id: any; }) => {
        const collectionData = localStorage.getItem(`taskCollection_${task.collectionName}`);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const taskData = collection.tasks.find((t: any) => t.id === task.id);
          if (taskData) {
            const newTask = document.createElement('div');
            newTask.classList.add(`task-${taskData.type}`);
            newTask.classList.add('task-to-execute');
            newTask.setAttribute('data-task-id', taskData.id.toString());
            newTask.setAttribute('data-task-name', taskData.name);
            newTask.setAttribute('data-collection-name', task.collectionName);
            newTask.textContent = taskData.name;
            tasksToExecute.appendChild(newTask);
          }
        }
      });

      //set the current job to the loaded job
      localStorage.setItem('currentJob', jobData);
    }

    //store the loaded job name in local storage
    localStorage.setItem('loadedJobName', jobName);

    updateTaskNumbers();
    rebuildTaskElements();
  }

  //delete selected job from local storage
  deleteJobButton.onclick = function () {
    const jobName = jobLoadSelect.value;
    localStorage.removeItem(`savedJob_${jobName}`);
    updateJobLoadSelect();
    rebuildTaskElements();
  }

  //import job from file
  importJobButton.onclick = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = function (e) {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        tasksToExecute.innerHTML = '';
        const promises = Array.from(files).map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = function (e) {
            const contents = e.target?.result;
            if (contents) {
              const job = JSON.parse(contents as string);
              localStorage.setItem('loadedJobName', job.name);
              localStorage.setItem(`savedJob_${job.name}`, JSON.stringify(job.tasks));
              resolve(job.name);
            } else {
              reject(new Error('No contents'));
            }
          }
          reader.readAsText(file);
        }));

        Promise.all(promises).then(jobNames => {
          // Load the last job
          loadJob(`savedJob_${jobNames[jobNames.length - 1]}`);
          updateTaskNumbers();
          rebuildTaskElements();
          rebuildavailableTasksElements();
          updateJobLoadSelect();

        }).catch(error => {
          console.error('Error reading files:', error);
        });
      }
    }
    input.click();
  }

  exportJobButton.onclick = function () {
    //show export job modal
    exportJobModal.style.display = 'block';
    const loadedJobName = localStorage.getItem('loadedJobName');
    if (loadedJobName) {
      exportJobNameSelect.value = loadedJobName;
    }
  }

  exportJobSaveButton.onclick = function () {
    //get the name of the selected job
    const jobName = exportJobNameSelect.value;

    //load job from local storage
    const jobData = localStorage.getItem(`savedJob_${jobName}`);

    if (jobData) {
      const tasks = JSON.parse(jobData);

      const job = {
        name: jobName,
        tasks: [] as any[]
      };

      tasks.forEach((task: { collectionName: any; id: any; }) => {
        const collectionData = localStorage.getItem(`taskCollection_${task.collectionName}`);
        if (collectionData) {
          const collection = JSON.parse(collectionData);
          const taskData = collection.tasks.find((t: any) => t.id === task.id);
          if (taskData) {
            job.tasks.push({ id: taskData.id, collectionName: task.collectionName });
          }
        }
      });

      const blob = new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.name}.json`;
      a.click();
      URL.revokeObjectURL(url);

      exportJobModal.style.display = 'none';
    }
  }
});