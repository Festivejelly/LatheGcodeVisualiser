import dragula from 'dragula';
import 'dragula/dist/dragula.min.css';
import { Sender, SenderClient } from './sender';
import { KeyEmulation } from './keyEmulation';
import { nanoid } from 'nanoid';
import { storage } from './storage';

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
const newTaskGcodeRepeatable = document.getElementById('newTaskGcodeRepeatable') as HTMLInputElement;
const newTaskName = document.getElementById('newTaskName') as HTMLInputElement;
const taskTextTitle = document.getElementById('taskTextTitle') as HTMLHeadingElement;
const newTaskDescription = document.getElementById('newTaskDescription') as HTMLInputElement;

let sender: Sender | null;
const connectButton = document.getElementById('connectButton') as HTMLButtonElement;
const plannerContainer = document.getElementById('plannerContainer') as HTMLDivElement;
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
const newJobButton = document.getElementById('newJobButton') as HTMLButtonElement;
const saveJobNameInput = document.getElementById('saveJobNameInput') as HTMLInputElement;
const saveJobNameSelect = document.getElementById('saveJobNameSelect') as HTMLSelectElement;
const newJobNameContainer = document.getElementById('newJobNameContainer') as HTMLDivElement;

const saveProjectNameSelect = document.getElementById('saveProjectNameSelect') as HTMLSelectElement;
const saveProjectNameInput = document.getElementById('saveProjectNameInput') as HTMLInputElement;
const newProjectNameContainer = document.getElementById('newProjectNameContainer') as HTMLDivElement;
const saveJobGroupNameInput = document.getElementById('saveJobGroupNameInput') as HTMLInputElement;
const saveJobGroupNameSelect = document.getElementById('saveJobGroupNameSelect') as HTMLSelectElement;
const newJobGroupNameContainer = document.getElementById('newJobGroupNameContainer') as HTMLDivElement;

const saveJobSaveButton = document.getElementById('saveJobSaveButton') as HTMLButtonElement;
const jobLoadSelect = document.getElementById('jobLoadSelect') as HTMLSelectElement;
const projectLoadSelect = document.getElementById('projectLoadSelect') as HTMLSelectElement;
const groupLoadSelect = document.getElementById('groupLoadSelect') as HTMLSelectElement;
const loadJobButton = document.getElementById('loadJobButton') as HTMLButtonElement;
const deleteJobButton = document.getElementById('deleteJobButton') as HTMLButtonElement;
const importJobButton = document.getElementById('importJobButton') as HTMLButtonElement;
const exportJobButton = document.getElementById('exportJobButton') as HTMLButtonElement;
const exportJobModal = document.getElementById('exportJobModal') as HTMLDivElement;
const exportJobModalCloseButton = document.getElementById('exportJobModalClose') as HTMLButtonElement;
const exportJobSaveButton = document.getElementById('exportJobSaveButton') as HTMLButtonElement;
const exportJobProjectNameSelect = document.getElementById('exportJobProjectNameSelect') as HTMLSelectElement;
const exportJobGroupNameSelect = document.getElementById('exportJobGroupNameSelect') as HTMLSelectElement;
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

//create type to represent job which is an array of tasks: {"name": "","tasks": [{"id": "","collectionName": ""}]}
type Job = {
  name: string;
  projectName: string;
  groupName: string;
  tasks: { id: string, collectionName: string }[];
};

type TaskData = {
  id: string;
  name: string;
  type: string;
  description: string;
  gcode?: string;
  isRepeatable?: boolean;
  buttonKeys?: string;
  order?: number;
};

type TaskCollection = {
  name: string;
  tasks: TaskData[];
};

// Add this type definition for Project structure
type Project = {
  name: string;
  groups: {
    name: string;
    jobs: Job[];
  }[];
};

document.addEventListener('DOMContentLoaded', () => {


  sender = Sender.getInstance();
  sender.addStatusChangeListener(() => handleStatusChange(), SenderClient.PLANNER);
  sender.addCurrentCommandListener(handleCurrentCommand);

  plannerContainer.addEventListener('containerVisible', async () => {

    tasksToExecute.innerHTML = '';

    updateAvailableTaskCollectionsSelect();
    rebuildavailableTasksElements();


    rebuildTaskElements();
    updateProjectLoadSelect();
    updateGroupLoadSelect();
    updateJobLoadSelect();

    const currentJob = await getSelectedJobFromSelectedGroup();
    if (currentJob) {
      loadJob(currentJob);
    }
    updateTaskNumbers();
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

  saveJobGroupNameSelect.addEventListener('change', () => {
    if (saveJobGroupNameSelect.value === 'new') {
      newJobGroupNameContainer.style.display = 'block';
    } else {
      newJobGroupNameContainer.style.display = 'none';
    }
  });

  saveProjectNameSelect.addEventListener('change', () => {
    if (saveProjectNameSelect.value === 'new') {
      saveProjectNameInput.style.display = 'block';
    } else {
      saveProjectNameInput.style.display = 'none';
    }
  });

  saveCollectionModalCloseButton.onclick = function () {
    saveCollectionModal.style.display = 'none';
  }

  //saving and loading available tasks
  saveAvailableTaskCollectionButton.onclick = function () {
    saveCollectionModal.style.display = 'block';
  }

  saveAvailableTaskCollectionButtonModal.onclick = async function () {

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
    const selectedTaskCollectionName = await storage.getItem('selectedTaskCollection');
    let taskCollection;
    if (selectedTaskCollectionName) {
      const selectedTaskCollection = await storage.getItem(`taskCollection_${selectedTaskCollectionName}`);
      if (selectedTaskCollection) {
        taskCollection = JSON.parse(selectedTaskCollection);
        // If the new collection name is the same as the selected one, no need to change it
        if (taskCollectionName !== selectedTaskCollectionName) {
          taskCollection.name = taskCollectionName;
          await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(taskCollection));
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

  loadTaskCollectionButton.onclick = async function () {
    const taskCollectionName = availableTaskCollections.value;
    await storage.setItem('selectedTaskCollection', taskCollectionName);
    rebuildavailableTasksElements();
  }

  deleteTaskCollectionButton.onclick = async function () {
    const taskCollectionName = availableTaskCollections.value;

    //dont allow user to delete the default collection
    if (taskCollectionName === 'default') {
      alert('You cannot delete the default collection');
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete the collection ${taskCollectionName}?`);
    if (confirmDelete) {
      await storage.removeItem(`taskCollection_${taskCollectionName}`);
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
              collections.forEach(async collection => {
                const taskCollectionName = collection.name;
                const taskCollection = await storage.getItem(`taskCollection_${taskCollectionName}`);
                //if task collection already exists then prompt
                if (taskCollection) {
                  const shouldOverride = window.confirm(`Task collection ${taskCollectionName} already exists. Do you want to override it?`);
                  if (shouldOverride) {
                    await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
                  }
                } else {
                  await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
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

exportAvailableTasksButton.onclick = async function () {
    const taskCollections = await storage.getKeys('taskCollection_');
    const collections: TaskCollection[] = [];
    
    for (const collection of taskCollections) {
      const taskCollection = await storage.getItem(collection);
      if (taskCollection) {
        collections.push(JSON.parse(taskCollection));
      }
    }

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

  async function updateGroupLoadSelect() {
    groupLoadSelect.innerHTML = '';

    if (!projectLoadSelect || !projectLoadSelect.value) {
      return;
    }

    const projectData = await storage.getItem(`savedProject_${projectLoadSelect.value}`);
    if (!projectData) return;

    const project = JSON.parse(projectData) as Project;

    project.groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.name;
      option.textContent = group.name;
      groupLoadSelect.appendChild(option);
    });

    // Set to last selected group if available
    const selectedGroup = await storage.getItem('selectedGroup');
    if (selectedGroup) {
      const groupExists = project.groups.some(g => g.name === selectedGroup);
      if (groupExists) {
        groupLoadSelect.value = selectedGroup;
      }
    }
  }

  async function getSelectedJobFromSelectedGroup() {

    const selectedProject = projectLoadSelect.value;
    const selectedGroup = groupLoadSelect.value;
    const selectedJob = jobLoadSelect.value;

    if (!selectedProject || !selectedGroup || !selectedJob) return null;

    const projectData = await storage.getItem(`savedProject_${selectedProject}`);
    if (!projectData) return null;

    const project = JSON.parse(projectData) as Project;
    const group = project.groups.find(g => g.name === selectedGroup);
    if (!group) return null;

    const job = group.jobs.find(j => j.name === selectedJob);
    if (!job) return null;

    // Ensure job has a groupName
    if (!job.groupName) {
      job.groupName = selectedGroup;
    }

    return job;
  }

  async function updateJobLoadSelect() {
    jobLoadSelect.innerHTML = '';

    if (!projectLoadSelect || !projectLoadSelect.value) return;

    const projectData = await storage.getItem(`savedProject_${projectLoadSelect.value}`);
    if (!projectData) return;

    const project = JSON.parse(projectData) as Project;
    const selectedGroup = groupLoadSelect.value;

    const group = project.groups.find(g => g.name === selectedGroup);
    if (!group) return;

    group.jobs.forEach(job => {
      const option = document.createElement('option');
      option.value = job.name;
      option.textContent = job.name;
      jobLoadSelect.appendChild(option);
    });
  }

  async function updateAvailableTaskCollectionsSelect() {

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

    const taskCollections = await storage.getKeys('taskCollection_');
    taskCollections.sort();
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
    const selectedCollection = await storage.getItem('selectedTaskCollection');

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


  function handleCurrentCommand(command: string) {
    if (!sender) return;
    const status = sender.getStatus();

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
      connectButton.innerText = 'Connect';
      connectButton.disabled = false;
      //clear the button colour
      connectButton.style.backgroundColor = '';
      return;
    } else {
      connectButton.innerText = 'Connected';
      connectButton.disabled = true;
      //colour button green
      connectButton.style.backgroundColor = 'green';
    }

    const isRun = status.condition === 'run';

    if (!isRun) {
      completeCncTaskButton.style.display = 'block';
      completeCncTaskButton.disabled = false;
      completeCncTaskButton.classList.add('interaction-ready-button');
      cncTaskSenderProgressLabel.innerText = "Task completed";

      //if gcode task is repeatable then enable the execute button. We can read the execute button attribute to see if the task is repeatable
      if (executeGcodeButton.attributes.getNamedItem('data-repeatable')?.value === 'true') {
        executeGcodeButton.disabled = false;
        executeGcodeButton.classList.remove('disabled-button');
        executeGcodeButton.classList.add('interaction-ready-button');
        executeGcodeButton.textContent = 'Execute Again?';

      } else {
        executeGcodeButton.disabled = true;
      }

    } else if (isRun) {
      executeGcodeButton.disabled = true;
      executeGcodeButton.classList.add('disabled-button');
      executeGcodeButton.classList.remove('interaction-ready-button');
      completeCncTaskButton.classList.remove('interaction-ready-button');
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
    saveJob('currentJob');
  });

  async function saveJob(name: string, group: string = '', project: string = '') {
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');
    const jobData: Job = { name: '', projectName: '', groupName: '', tasks: [] };
    tasks.forEach(task => {
      const taskId = task.getAttribute('data-task-id');
      const collectionName = task.getAttribute('data-collection-name');
      jobData.tasks.push({ id: taskId!, collectionName: collectionName! });
    });

    jobData.name = name;
    jobData.groupName = group;

    if (name === 'currentJob') {
      await storage.setItem(name, JSON.stringify(jobData));
    }
    else {
      if (project && group) {
        // Check if project exists, if not create it
        let projectData = await storage.getItem(`savedProject_${project}`);
        let projectObj: Project;

        if (!projectData) {
          projectObj = { name: project, groups: [] };
        } else {
          projectObj = JSON.parse(projectData) as Project;
        }

        // Find or create the group
        let groupObj = projectObj.groups.find(g => g.name === group);

        if (!groupObj) {
          groupObj = { name: group, jobs: [] };
          projectObj.groups.push(groupObj);
        }

        // Check if job already exists
        const existingJobIndex = groupObj.jobs.findIndex(job => job.name === name);

        if (existingJobIndex !== -1) {
          // Replace existing job
          groupObj.jobs[existingJobIndex] = { name: name, projectName: project, groupName: group, tasks: jobData.tasks };
        } else {
          // Add new job
          groupObj.jobs.push({ name: name, projectName: project, groupName: group, tasks: jobData.tasks });
        }

        // Save the updated project
        await storage.setItem(`savedProject_${project}`, JSON.stringify(projectObj));
      }
    }
  }

  async function loadJob(job: Job) {

    let tasks = job.tasks;

    const removedTasks: { collectionName: string; id: any; }[] = [];
    tasks = tasks.filter(async (task: { collectionName: string; id: any; }) => {
      const collectionData = await storage.getItem(`taskCollection_${task.collectionName}`);
      if (!collectionData) {
        removedTasks.push(task);
        return false;
      }
      return true;
    });

    await storage.setItem('currentJob', JSON.stringify(tasks));

    tasksToExecute.innerHTML = '';

    tasks.forEach(async (task: { collectionName: string; id: any; }) => {
      const collectionData = await storage.getItem(`taskCollection_${task.collectionName}`);
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

    await storage.setItem('loadedJob', JSON.stringify({
      name: job.name,
      groupName: job.groupName
    }));

  }

  //remove available-task class and add task-to-execute class
  drake.on('drop', async (el, target, source) => {
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
          const taskCollection = await storage.getItem(`taskCollection_${taskCollectionName}`);
          if (taskCollection) {
            const collection = JSON.parse(taskCollection) as TaskCollection;
            collection.tasks = collection.tasks.filter((task: TaskData) => task.id !== taskId);
            await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
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

  async function rebuildavailableTasksElements() {
    availableTasks.innerHTML = '';

    let taskCollectionName = await storage.getItem('selectedTaskCollection')

    if (taskCollectionName === null || taskCollectionName === '') {
      taskCollectionName = availableTaskCollections.value;
      await storage.setItem('selectedTaskCollection', taskCollectionName);
    }

    const taskCollection = await storage.getItem(`taskCollection_${taskCollectionName}`);

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
        newTask.setAttribute('data-task-type', task.type);
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
  saveNewTaskButton.addEventListener('click', async () => {

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
      taskData.isRepeatable = newTaskGcodeRepeatable.checked;
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
      await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(taskCollection));
      //update the select list
      const option = document.createElement('option');
      option.value = taskCollectionName;
      option.textContent = taskCollectionName;

      availableTaskCollections.appendChild(option);
      updateAvailableTaskCollectionsSelect();
    } else {
      const taskCollectionName = collectionToSaveTo.value;
      const taskCollection = await storage.getItem(`taskCollection_${taskCollectionName}`);
      if (taskCollection) {
        const collection = JSON.parse(taskCollection) as TaskCollection;

        //if the task already exists then remove it
        const existingTask = collection.tasks.find(task => task.id === taskId);
        if (existingTask) {
          collection.tasks = collection.tasks.filter(task => task.id !== taskId);
        }
        collection.tasks.push(taskData);
        await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(collection));
      } else {
        const taskCollection = {
          name: taskCollectionName,
          tasks: [] as TaskData[]
        };
        taskCollection.tasks.push(taskData);
        await storage.setItem(`taskCollection_${taskCollectionName}`, JSON.stringify(taskCollection));
      }
    }

    rebuildavailableTasksElements();
  });

  availableTasks.addEventListener('click', async event => {
    const target = event.target as HTMLElement;
    if (target.matches('.show-info')) {
      const parentDiv = target.parentNode as HTMLDivElement;
      const taskId = parentDiv.getAttribute('data-task-id');
      let taskData: TaskData | null = null;
      const currentCollectionName = await storage.getItem('selectedTaskCollection');

      //get task from selected collection
      const taskCollection = await storage.getItem(`taskCollection_${currentCollectionName}`);

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
        newTaskGcodeRepeatable.checked = taskData.isRepeatable || false;
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

    const task = jobQueue.shift(); // Get the next task

    if (task && task.type === 'manual') {
      manualTaskName.textContent = `Task ${task.order}: ${task.name}`;
      manualTaskInstructions.value = task.description;
      manualTaskModal.style.display = 'block';

      if (jobQueue.length === 0) {
        completeManualTaskButton.innerText = 'Complete Job';
      } else {
        completeManualTaskButton.innerText = 'Next Task -->';
      }

    } else if (task && task.type === 'gcode') {
      executeGcodeButton.disabled = false;
      executeGcodeButton.classList.remove('disabled-button');
      executeGcodeButton.classList.add('interaction-ready-button');
      executeGcodeButton.textContent = 'Execute Gcode';

      //add an attribute that indicates if the task is repeatable
      if (task.isRepeatable) {
        executeGcodeButton.setAttribute('data-repeatable', 'true');
      } else {
        executeGcodeButton.removeAttribute('data-repeatable');
      }

      cncTaskName.textContent = `Task ${task.order}: ${task.name}`;
      cncTaskGcode.value = task.gcode ?? '';
      cncTaskModal.style.display = 'block';

      if (jobQueue.length === 0) {
        completeCncTaskButton.innerText = 'Complete Job';
      } else {
        completeCncTaskButton.innerText = 'Next Task -->';
      }

      const taskModalContent = cncTaskModal.querySelector('.task-modal-content') as HTMLElement; // Typecast to HTMLElement
      if (taskModalContent) {
        taskModalContent.style.backgroundColor = '';
      }
      completeCncTaskButton.disabled = true;
      completeCncTaskButton.style.display = 'none';
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
    completeManualTaskButton.innerText = 'Next Task -->';
    manualTaskModal.style.display = 'none';
    executeNextTask();
  }

  completeCncTaskButton.onclick = function () {
    completeCncTaskButton.innerText = 'Next Task -->';
    cncTaskModal.style.display = 'none';
    executeNextTask();
  }

  executeGcodeButton.onclick = function () {
    if (sender) {
      sender.start(cncTaskGcode.value, SenderClient.PLANNER);
    }
  }

  jobCancelledCloseButton.onclick = function () {
    jobCancelledModal.style.display = 'none';
  }

  executeJobButton.onclick = function () {
    if (!sender?.isConnected()) {
      notConnectedModal.style.display = 'block';
      return;
    }
    const tasks = tasksToExecute.querySelectorAll('.task-to-execute');

    tasks.forEach(async task => {

      const taskId = task.getAttribute('data-task-id');
      const taskOrder = task.getAttribute('data-task-order');
      const collectionName = task.getAttribute('data-collection-name');

      const taskCollection = await storage.getItem(`taskCollection_${collectionName}`);
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

  saveJobButton.onclick = async function () {
    saveJobModal.style.display = 'block';

    //clear html of the select elements
    saveProjectNameSelect.innerHTML = '';
    saveJobGroupNameSelect.innerHTML = '';
    saveJobNameSelect.innerHTML = '';

    //clear text inputs
    saveProjectNameInput.value = '';
    saveJobGroupNameInput.value = '';
    saveJobNameInput.value = '';

    //get all the projects
    const projects = await storage.getKeys('savedProject_');
    projects.sort();
    //if there are projects then fill the project name select with the projects
    if (projects.length > 0) {
      projects.forEach(project => {
        const projectName = project.replace('savedProject_', '');
        const option = document.createElement('option');
        option.value = projectName;
        option.textContent = projectName;
        saveProjectNameSelect.appendChild(option);
      });

      // Set up handlers for existing projects
      if (saveProjectNameSelect.selectedIndex >= 0) {
        const selectedProject = saveProjectNameSelect.value;
        updateGroupSelectForProject(selectedProject);
      }
    } else {
      //if there are no projects then show the new project name input
      newProjectNameContainer.style.display = 'block';
      newJobGroupNameContainer.style.display = 'block';
      newJobNameContainer.style.display = 'block';
    }

    //add new options to the end
    const newProjectOption = document.createElement('option');
    newProjectOption.value = 'new';
    newProjectOption.textContent = '--new project--';
    saveProjectNameSelect.appendChild(newProjectOption);

    const newGroupNameOption = document.createElement('option');
    newGroupNameOption.value = 'new';
    newGroupNameOption.textContent = '--new group--';
    saveJobGroupNameSelect.appendChild(newGroupNameOption);

    const newJobNameOption = document.createElement('option');
    newJobNameOption.value = 'new';
    newJobNameOption.textContent = '--new job--';
    saveJobNameSelect.appendChild(newJobNameOption);
  };

  // Add function to update groups dropdown when project changes
  async function updateGroupSelectForProject(projectName: string) {
    saveJobGroupNameSelect.innerHTML = '';
    saveJobNameSelect.innerHTML = '';

    const projectData = await storage.getItem(`savedProject_${projectName}`);
    if (projectData) {
      const project = JSON.parse(projectData) as Project;

      // Add groups to selection
      project.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.name;
        option.textContent = group.name;
        saveJobGroupNameSelect.appendChild(option);
      });

      // Add jobs from the first group if it exists
      if (project.groups.length > 0) {
        project.groups[0].jobs.forEach(job => {
          const option = document.createElement('option');
          option.value = job.name;
          option.textContent = job.name;
          saveJobNameSelect.appendChild(option);
        });
      }
    }
  }

  // Add project selection change handler
  saveProjectNameSelect.addEventListener('change', () => {
    if (saveProjectNameSelect.value === 'new') {
      newProjectNameContainer.style.display = 'block';
      newJobGroupNameContainer.style.display = 'block';
      newJobNameContainer.style.display = 'block';

      // Clear group and job selects
      saveJobGroupNameSelect.innerHTML = '';
      saveJobNameSelect.innerHTML = '';
      saveJobGroupNameInput.value = '';
      saveJobNameInput.value = '';

    } else {
      newProjectNameContainer.style.display = 'none';
      newJobGroupNameContainer.style.display = 'none';
      newJobNameContainer.style.display = 'none';

      // update groups for selected project
      updateGroupSelectForProject(saveProjectNameSelect.value);

      // update the jobs for the first group
      updateJobSelectForGroup(saveProjectNameSelect.value, saveJobGroupNameSelect.value);

    }

    // Add new group and job options
    const newGroupOption = document.createElement('option');
    newGroupOption.value = 'new';
    newGroupOption.textContent = '--new group--';
    saveJobGroupNameSelect.appendChild(newGroupOption);

    const newJobOption = document.createElement('option');
    newJobOption.value = 'new';
    newJobOption.textContent = '--new job--';
    saveJobNameSelect.appendChild(newJobOption);
  });

  // Add handler for group selection change
  saveJobGroupNameSelect.addEventListener('change', () => {
    if (saveJobGroupNameSelect.value === 'new') {
      newJobGroupNameContainer.style.display = 'block';
      // When selecting new group, clear job list and add only new job option
      saveJobNameSelect.innerHTML = '';
      newJobNameContainer.style.display = 'block';
      const newJobOption = document.createElement('option');
      newJobOption.value = 'new';
      newJobOption.textContent = '--new job--';
      saveJobNameSelect.appendChild(newJobOption);
    } else {
      newJobGroupNameContainer.style.display = 'none';

      // Update jobs for selected group
      const projectName = saveProjectNameSelect.value;
      const groupName = saveJobGroupNameSelect.value;

      if (projectName !== 'new') {
        updateJobSelectForGroup(projectName, groupName);
      }
    }
  });

  // Add function to update jobs dropdown when group changes
  async function updateJobSelectForGroup(projectName: string, groupName: string) {
    saveJobNameSelect.innerHTML = '';

    const projectData = await storage.getItem(`savedProject_${projectName}`);
    if (projectData) {
      const project = JSON.parse(projectData) as Project;
      const group = project.groups.find(g => g.name === groupName);

      if (group) {
        group.jobs.forEach(job => {
          const option = document.createElement('option');
          option.value = job.name;
          option.textContent = job.name;
          saveJobNameSelect.appendChild(option);
        });
      }
    }
  }

  // Update save job button handler
  saveJobSaveButton.onclick = async function () {
    let projectName = saveProjectNameSelect.value === 'new' ? saveProjectNameInput.value : saveProjectNameSelect.value;
    let groupName = saveJobGroupNameSelect.value === 'new' ? saveJobGroupNameInput.value : saveJobGroupNameSelect.value;
    let jobName = saveJobNameSelect.value === 'new' ? saveJobNameInput.value : saveJobNameSelect.value;

    if (projectName === '' || projectName === null) {
      alert('Please enter a name for the project');
      return;
    }

    if (groupName === '' || groupName === null) {
      alert('Please enter a name for the group');
      return;
    }

    if (jobName === '' || jobName === null) {
      alert('Please enter a name for the job');
      return;
    }

    // Check if job exists
    let jobExists = false;
    const projectData = await storage.getItem(`savedProject_${projectName}`);

    if (projectData) {
      const project = JSON.parse(projectData) as Project;
      const group = project.groups.find(g => g.name === groupName);

      if (group) {
        jobExists = group.jobs.some(job => job.name === jobName);
      }
    }

    if (jobExists) {
      const confirmOverwrite = confirm('A job with this name already exists in this group. Do you want to overwrite it?');
      if (!confirmOverwrite) {
        return;
      }
    }

    saveJob(jobName, groupName, projectName);

    //update loadedJob to the saved job
    await storage.setItem('loadedJob', JSON.stringify({
      name: jobName,
      groupName: groupName,
      projectName: projectName
    }));

    //update selected Project and Selected Group
    await storage.setItem('selectedProject', projectName);
    await storage.setItem('selectedGroup', groupName);

    saveJobModal.style.display = 'none';

    //clear inputs and hide them
    newProjectNameContainer.style.display = 'none';
    newJobGroupNameContainer.style.display = 'none';
    newJobNameContainer.style.display = 'none';

    saveProjectNameInput.value = '';
    saveJobGroupNameInput.value = '';
    saveJobNameInput.value = '';

    //update the project, group and job select elements
    updateProjectLoadSelect();
    updateGroupLoadSelect();
    updateJobLoadSelect();

    //show modal saying job saved
    alert(`${jobName} saved`);
  };

  newJobButton.onclick = async function () {
    await storage.setItem('loadedJob', '');
    await storage.setItem('currentJob', '');
    tasksToExecute.innerHTML = '';
  }

  saveJobModalCloseButton.onclick = function () {
    saveJobModal.style.display = 'none';
  }

  exportJobModalCloseButton.onclick = function () {
    exportJobModal.style.display = 'none';
  }

  groupLoadSelect.addEventListener('change', async () => {
    const groupName = groupLoadSelect.value;
    await storage.setItem('selectedGroup', groupName);
    updateJobLoadSelect();
  });

  loadJobButton.onclick = async function () {
    //first clear any existing tasks
    tasksToExecute.innerHTML = '';

    const projectName = projectLoadSelect.value;
    const groupName = groupLoadSelect.value;
    const jobName = jobLoadSelect.value;

    if (!projectName || !groupName || !jobName) {
      alert('Please select a project, group, and job to load');
      return;
    }

    const projectData = await storage.getItem(`savedProject_${projectName}`);
    if (!projectData) return;

    const project = JSON.parse(projectData) as Project;
    const group = project.groups.find(g => g.name === groupName);

    if (!group) return;

    const job = group.jobs.find(j => j.name === jobName);

    if (!job) return;

    loadJob(job);

    // Save selected project/group/job
    await storage.setItem('selectedProject', projectName);
    await storage.setItem('selectedGroup', groupName);
    await storage.setItem('loadedJob', JSON.stringify({
      name: jobName,
      groupName: groupName,
      projectName: projectName
    }));

    updateTaskNumbers();
    rebuildTaskElements();
  };

  //delete selected job from local storage
  deleteJobButton.onclick = async function () {

    const projectName = projectLoadSelect.value;
    const groupName = groupLoadSelect.value;
    const jobName = jobLoadSelect.value;

    if (!projectName || !groupName || !jobName) {
      alert('Please select a project, group, and job to delete');
      return;
    }

    const projectData = await storage.getItem(`savedProject_${projectName}`);
    if (!projectData) return;

    const project = JSON.parse(projectData) as Project;
    const groupIndex = project.groups.findIndex(g => g.name === groupName);

    if (groupIndex === -1) return;

    const group = project.groups[groupIndex];
    group.jobs = group.jobs.filter(job => job.name !== jobName);

    // If group is now empty, remove it
    if (group.jobs.length === 0) {
      project.groups.splice(groupIndex, 1);
    }

    // If project is now empty, remove it
    if (project.groups.length === 0) {
      await storage.removeItem(`savedProject_${projectName}`);
      updateProjectLoadSelect();
    } else {
      await storage.setItem(`savedProject_${projectName}`, JSON.stringify(project));
    }

    updateGroupLoadSelect();
    updateJobLoadSelect();
    tasksToExecute.innerHTML = '';
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

        const promises = Array.from(files).map(file => new Promise<{ job: Job; projectName: string; }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async function (e) {
            const contents = e.target?.result;
            if (contents) {
              try {
                const importedData = JSON.parse(contents as string);
                let job: Job;
                let projectName: string;
                let groupName: string;

                // Check if the imported data has the new format with projectName
                if (importedData.projectName) {
                  // New format
                  job = importedData as Job;
                  projectName = job.projectName;
                  groupName = job.groupName;
                } else {
                  // Legacy format - migrate to "Imported" project
                  job = importedData as Job;
                  projectName = "Imported";
                  groupName = job.groupName || "Legacy";
                  job.projectName = projectName; // Add projectName to the job
                }

                // Check if project exists, if not create it
                let projectData = await storage.getItem(`savedProject_${projectName}`);
                let projectObj: Project;

                if (!projectData) {
                  projectObj = { name: projectName, groups: [] };
                } else {
                  projectObj = JSON.parse(projectData) as Project;
                }

                // Find or create the group
                let groupObj = projectObj.groups.find(g => g.name === groupName);

                if (!groupObj) {
                  groupObj = { name: groupName, jobs: [] };
                  projectObj.groups.push(groupObj);
                }

                // Check if job already exists in this group
                const existingJobIndex = groupObj.jobs.findIndex(j => j.name === job.name);

                if (existingJobIndex !== -1) {
                  const confirmOverwrite = confirm(`A job with name "${job.name}" already exists in project "${projectName}", group "${groupName}". Do you want to overwrite it?`);
                  if (!confirmOverwrite) {
                    resolve({ job, projectName });
                    return;
                  }
                  // Replace existing job
                  groupObj.jobs[existingJobIndex] = job;
                } else {
                  // Add new job
                  groupObj.jobs.push(job);
                }

                // Save the updated project
                await storage.setItem(`savedProject_${projectName}`, JSON.stringify(projectObj));

                // Update current selections
                await storage.setItem('selectedProject', projectName);
                await storage.setItem('selectedGroup', groupName);
                await storage.setItem('loadedJob', JSON.stringify({
                  name: job.name,
                  groupName: groupName,
                  projectName: projectName
                }));

                resolve({ job, projectName });
              } catch (error) {
                reject(new Error('Invalid JSON format'));
              }
            } else {
              reject(new Error('No contents'));
            }
          }
          reader.readAsText(file);
        }));

        Promise.all(promises).then(results => {
          if (results.length > 0) {
            const [firstResult] = results;

            rebuildavailableTasksElements();

            updateProjectLoadSelect();
            if (projectLoadSelect && firstResult) {
              projectLoadSelect.value = firstResult.projectName;
            }
            updateGroupLoadSelect();
            updateJobLoadSelect();

            if (firstResult && firstResult.job) {
              loadJob(firstResult.job);
              rebuildTaskElements();
              updateTaskNumbers();
            }
          }
        }).catch(error => {
          console.error('Error importing job:', error);
          alert('Error importing job: ' + error.message);
        });
      }
    }
    input.click();
  }

  exportJobButton.onclick = async function () {
    exportJobGroupNameSelect.innerHTML = '';
    exportJobNameSelect.innerHTML = '';
    exportJobProjectNameSelect.innerHTML = '';

    //get all the projects
    const projects = await storage.getKeys('savedProject_');
    projects.sort();

    //if there are projects then fill the project name select with the projects
    if (projects.length > 0) {
      projects.forEach(project => {
        const projectName = project.replace('savedProject_', '');
        const option = document.createElement('option');
        option.value = projectName;
        option.textContent = projectName;
        exportJobProjectNameSelect.appendChild(option);
      });
    } else {
      alert('No projects found. Please create a project first.');
      return;
    }

    //show the current project, group and job as the default selected values
    const selectedProject = await storage.getItem('selectedProject');
    const selectedGroup = await storage.getItem('selectedGroup');
    const selectedJob = await storage.getItem('loadedJob');

    if (selectedProject) {
      exportJobProjectNameSelect.value = selectedProject;
    }

    if (selectedGroup) {
      //create all the group name options for the selected project
      const projectData = await storage.getItem(`savedProject_${selectedProject}`);
      if (projectData) {
        const project = JSON.parse(projectData) as Project;
        project.groups.forEach((group: { name: string; }) => {
          const groupNameOption = document.createElement('option');
          groupNameOption.value = group.name;
          groupNameOption.textContent = group.name;
          exportJobGroupNameSelect.appendChild(groupNameOption);
        });
      }

      //set the group name select to the selected group 
      exportJobGroupNameSelect.value = selectedGroup;
    }

    if (selectedJob) {
      const jobData = JSON.parse(selectedJob) as { name: string; groupName: string; };

      //create job name option
      const jobNameOption = document.createElement('option');
      jobNameOption.value = jobData.name;
      jobNameOption.textContent = jobData.name;
      exportJobNameSelect.appendChild(jobNameOption);
      //set the job name select to the selected job
      exportJobNameSelect.value = jobData.name;
    }

    exportJobModal.style.display = 'block';
  }

  exportJobProjectNameSelect.addEventListener('change', async () => {
    const projectName = exportJobProjectNameSelect.value;
    await storage.setItem('selectedProject', projectName);
    exportJobGroupNameSelect.innerHTML = '';
    exportJobNameSelect.innerHTML = '';
    populateExportGroupNames();
  });

  exportJobGroupNameSelect.addEventListener('change', () => {
    populateExportJobNames();
  });

  async function populateExportGroupNames() {
    const projectName = exportJobProjectNameSelect.value;
    const projectData = await storage.getItem(`savedProject_${projectName}`);
    if (projectData) {
      const project = JSON.parse(projectData) as Project;
      exportJobGroupNameSelect.innerHTML = '';
      project.groups.forEach((group: { name: string; }) => {
        const groupNameOption = document.createElement('option');
        groupNameOption.value = group.name;
        groupNameOption.textContent = group.name;
        exportJobGroupNameSelect.appendChild(groupNameOption);
      });
    }
  }

  async function populateExportJobNames() {
    const groupName = exportJobGroupNameSelect.value;
    const projectName = exportJobProjectNameSelect.value;
    const projectData = await storage.getItem(`savedProject_${projectName}`);
    const groupData = projectData ? JSON.parse(projectData).groups.find((g: { name: string; }) => g.name === groupName) : null;
    if (groupData) {
      exportJobNameSelect.innerHTML = '';
      groupData.jobs.forEach((job: { name: string; }) => {
        const jobNameOption = document.createElement('option');
        jobNameOption.value = job.name;
        jobNameOption.textContent = job.name;
        exportJobNameSelect.appendChild(jobNameOption);
      });
    }
  }

  exportJobSaveButton.onclick = async function () {
    //get the name of the selected job

    const projectName = exportJobProjectNameSelect.value;
    const groupName = exportJobGroupNameSelect.value;
    const jobName = exportJobNameSelect.value;

    //load project from local storage
    const projectData = await storage.getItem(`savedProject_${projectName}`);

    if (!projectData) return;
    const project = JSON.parse(projectData) as Project;
    const group = project.groups.find((g: { name: string; }) => g.name === groupName);
    if (!group) return;

    //get jobData from group data
    const jobData = group.jobs.find((j: { name: string; }) => j.name === jobName);
    if (!jobData) return;

    if (jobData) {
      const tasks = jobData.tasks;

      const job: Job = { name: jobData.name, projectName: projectName, groupName: groupName, tasks: [] };

      tasks.forEach(async (task: { collectionName: any; id: any; }) => {
        const collectionData = await storage.getItem(`taskCollection_${task.collectionName}`);
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

  // Add function to update project selection dropdown
  async function updateProjectLoadSelect() {
    if (!projectLoadSelect) return;

    projectLoadSelect.innerHTML = '';

  const projects = await storage.getKeys('savedProject_');
  projects.sort();

    projects.forEach(projectKey => {
      const projectName = projectKey.replace('savedProject_', '');
      const option = document.createElement('option');
      option.value = projectName;
      option.textContent = projectName;
      projectLoadSelect.appendChild(option);
    });

    // Set to last selected project if available
    const selectedProject = await storage.getItem('selectedProject');
    if (selectedProject && projects.includes(`savedProject_${selectedProject}`)) {
      projectLoadSelect.value = selectedProject;
    }
  }

  // Add project change event listener
  if (projectLoadSelect) {
    projectLoadSelect.addEventListener('change', async () => {
      const projectName = projectLoadSelect.value;
      await storage.setItem('selectedProject', projectName);
      updateGroupLoadSelect();
      updateJobLoadSelect();
    });
  }
});