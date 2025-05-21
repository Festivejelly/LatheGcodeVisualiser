import { GCode } from './gcode.ts';
import { exampleGcode } from './example.ts';
import './planner';
import './quickTasks';
import { CanvasDrawer, GCodeCommand } from './canvas-drawer.ts';

export const editor = ace.edit("gcodeEditor");
export const gcodeResponseEditor = ace.edit("gcodeResponseEditor");
export const gcodeSenderEditor = ace.edit("gcodeSenderEditor");
export let gCode: GCode;

document.addEventListener("DOMContentLoaded", () => {

  gCode = new GCode();
  const canvasDrawer = new CanvasDrawer();
  let drawableCommands: GCodeCommand[] = [];

  const standardCanvas = document.getElementById('gcodeCanvas') as HTMLCanvasElement;
  const zoomCanvas = document.getElementById('zoomCanvas') as HTMLCanvasElement;
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const simulateButton = document.getElementById('simulateButton') as HTMLButtonElement;
  const showCuts = document.getElementById('showCuts') as HTMLInputElement;
  const showNonCuts = document.getElementById('showNonCuts') as HTMLInputElement;
  const showCutsZoom = document.getElementById('showCutsZoom') as HTMLInputElement;
  const showNonCutsZoom = document.getElementById('showNonCutsZoom') as HTMLInputElement;
  const sliderLabel = document.getElementById('sliderLabel') as HTMLDivElement;
  const zoomSliderLabel = document.getElementById('zoomSliderLabel') as HTMLDivElement;
  const progressSlider = document.getElementById('progressSlider') as HTMLInputElement;
  const zoomProgressSlider = document.getElementById('zoomProgressSlider') as HTMLInputElement;
  const sliderContainer = document.getElementById('sliderContainer') as HTMLDivElement;
  const displayOptionsContainer = document.getElementById('displayOptionsContainer') as HTMLDivElement;
  const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
  const saveGCodeNameInput = document.querySelector<HTMLInputElement>('.saveGCodeNameInput')!;
  const loadSelect = document.querySelector<HTMLSelectElement>('.loadGCodeSelect')!;
  const loadButton = document.querySelector<HTMLButtonElement>('.loadGCodeButton')!;
  const saveButton = document.querySelector<HTMLButtonElement>('.saveGCodeButton')!;
  const deleteButton = document.querySelector<HTMLButtonElement>('.deleteGCodeButton')!;
  const gcodeSenderContainer = document.getElementById('gcodeSenderContainer') as HTMLDivElement;
  const exampleElement = document.getElementById('exampleCode') as HTMLAnchorElement;

  //modals
  const helpModal = document.getElementById("helpModal") as HTMLDivElement;
  const helpBtn = document.getElementById("helpButton") as HTMLButtonElement;
  const helpClose = document.getElementById("closeHelpModal") as HTMLSpanElement;
  const zoomModal = document.getElementById("zoomModal") as HTMLDivElement;
  const zoomButton = document.getElementById("zoomButton") as HTMLButtonElement;
  const zoomCloseX = document.getElementById("closeZoomModal") as HTMLSpanElement;
  const zoomCloseButton = document.getElementById("zoomCloseButton") as HTMLButtonElement;

  const simulationTab = document.getElementById('simulationTab') as HTMLLIElement;
  const controlTab = document.getElementById('controlTab') as HTMLLIElement;
  const quickTasksTab = document.getElementById('quickTasksTab') as HTMLLIElement;
  const plannerTab = document.getElementById('plannerTab') as HTMLLIElement;
  const helpTab = document.getElementById('helpTab') as HTMLLIElement;
  const connectionContainer = document.getElementById('connectionContainer') as HTMLDivElement;
  const simulationContent = document.getElementById('simulationContainer') as HTMLDivElement;
  const controlContent = document.getElementById('controlsContainer') as HTMLDivElement;
  const quickTasksContent = document.getElementById('quickTasksContainer') as HTMLDivElement;
  const plannerContent = document.getElementById('plannerContainer') as HTMLDivElement;
  const helpContent = document.getElementById('helpContainer') as HTMLDivElement;
  const incrementButtons = document.querySelectorAll('#latheControls .increment-btn') as NodeListOf<HTMLButtonElement>;
  const moveDistanceInput = document.getElementById('moveDistance') as HTMLInputElement;

  if (!localStorage.getItem('helpModalShown')) {
    helpModal.style.display = "block";
    localStorage.setItem('helpModalShown', 'true');
  }

  // Jog buttons
  incrementButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // Remove active class from all buttons
      incrementButtons.forEach(function (button) {
        button.classList.remove('active');
      });

      // Add active class to the clicked button
      this.classList.add('active');

      var incrementValue = this.dataset.increment;
      moveDistanceInput.value = incrementValue as string;
      // save the increment value to local storage
      localStorage.setItem('moveDistance', incrementValue as string);
    });
  });

  simulationTab.addEventListener('click', () => {
    simulationContent.style.display = 'flex';
    controlContent.style.display = 'none';
    quickTasksContent.style.display = 'none';
    plannerContent.style.display = 'none';
    connectionContainer.style.display = 'none';
    helpContent.style.display = 'none';
  });

  controlTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'flex';
    quickTasksContent.style.display = 'none';
    plannerContent.style.display = 'none';
    connectionContainer.style.display = 'block';
    helpContent.style.display = 'none';
  });

  quickTasksTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'none';
    quickTasksContent.style.display = 'flex';
    plannerContent.style.display = 'none';
    connectionContainer.style.display = 'block';
    helpContent.style.display = 'none';
  });

  plannerTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'none';
    quickTasksContent.style.display = 'none';
    plannerContent.style.display = 'flex';
    connectionContainer.style.display = 'block';
    helpContent.style.display = 'none';

    const event = new Event('containerVisible');
    plannerContent.dispatchEvent(event);
  });

  helpTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'none';
    quickTasksContent.style.display = 'none';
    plannerContent.style.display = 'none';
    connectionContainer.style.display = 'none';
    helpContent.style.display = 'flex';
  });

  zoomCanvas.width = window.visualViewport!.width - 100;
  zoomCanvas.height = window.visualViewport!.height - 150;

  //on window resize, resize the zoom canvas
  window.addEventListener('resize', function () {
    zoomCanvas.width = window.visualViewport!.width - 100;
    zoomCanvas.height = window.visualViewport!.height - 150;

    //set the zoom slider to the start
    zoomProgressSlider.value = zoomProgressSlider.min;

    //redraw the zoom canvas
    drawToCanvas(zoomCanvas);
  });

  //zoom modal event listeners
  zoomButton.onclick = function () {
    zoomModal.style.display = 'block';

    //draw the zoomed in canvas
    drawToCanvas(zoomCanvas);
  };

  zoomCloseX.onclick = function () {
    zoomModal.style.display = "none";
  }

  zoomCloseButton.onclick = function () {
    zoomModal.style.display = "none";
  }

  //help modal event listeners
  helpBtn.onclick = function () {
    helpModal.style.display = "block";
  }

  helpClose.onclick = function () {
    helpModal.style.display = "none";
  }

  window.onclick = function (event) {
    if (event.target == helpModal) {
      helpModal.style.display = "none";
    }
    if (event.target == zoomModal) {
      zoomModal.style.display = "none";
    }
  }

  saveButton.addEventListener('click', () => saveGCode());
  loadButton.addEventListener('click', () => loadGCode());
  deleteButton.addEventListener('click', () => deleteGCode());

  updateLoadSelect();

  // Initialize the Ace Editor
  editor.setTheme("ace/theme/github_dark");
  editor.session.setMode("ace/mode/plain_text");
  editor.setShowPrintMargin(false);

  gcodeSenderEditor.setTheme("ace/theme/github_dark");
  gcodeSenderEditor.session.setMode("ace/mode/plain_text");
  gcodeSenderEditor.setShowPrintMargin(false);

  exampleElement.addEventListener('click', () => loadExample());

  gcodeResponseEditor.setTheme("ace/theme/monokai"); // Set the theme to match your style
  gcodeResponseEditor.session.setMode("ace/mode/text"); // Set mode to plain text or appropriate mode
  gcodeResponseEditor.setReadOnly(true);
  gcodeResponseEditor.setShowPrintMargin(false);

  gcodeResponseEditor.getSession().on('change', () => {
    // Wait for the change to render
    setTimeout(() => {
      var lastRow = gcodeResponseEditor.getSession().getLength();
      gcodeResponseEditor.scrollToLine(lastRow, true, true, function () { });
    }, 0); // Using 0ms timeout which works in most cases
  });

  gcodeSenderEditor.on('focus', () => {
    if (gcodeSenderEditor.getValue() === 'Paste your gcode here or click choose file to upload') {
      gcodeSenderEditor.setValue('');
    }
  });

  updatePlaceholder();

  progressSlider.oninput = () => {
    const progress = Math.floor(parseInt(progressSlider.value));

    if (progress < drawableCommands.length) {
      const command = drawableCommands[progress];
      let scaleFactor = canvasDrawer.calculateDynamicScaleFactor(drawableCommands, standardCanvas);
      canvasDrawer.draw(standardCanvas, drawableCommands, scaleFactor, progress, showCuts.checked, showNonCuts.checked);
      updateSliderLabel(command);
    }
  };

  zoomProgressSlider.oninput = () => {
    const progress = Math.floor(parseInt(zoomProgressSlider.value));

    if (progress < drawableCommands.length) {
      const command = drawableCommands[progress];
      let scaleFactor = canvasDrawer.calculateDynamicScaleFactor(drawableCommands, zoomCanvas);
      canvasDrawer.draw(zoomCanvas, drawableCommands, scaleFactor, progress, showCutsZoom.checked, showNonCutsZoom.checked);
      updateZoomSliderLabel(command);
    }
  };

  clearButton.addEventListener('click', () => {
    gcodeSenderEditor.setValue('');
    editor.setValue(''); // Clear the editor
    updatePlaceholder();

    const ctx = standardCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, standardCanvas.width, standardCanvas.height); // Clear the canvas

    fileInput.value = '';

    // Reset and hide the slider
    progressSlider.value = "0";
    zoomProgressSlider.value = "0";
    sliderContainer.style.display = 'none';
    displayOptionsContainer.style.display = 'none';
  });

  fileInput.addEventListener('change', (event) => {
    // Ensure that event.target is an HTMLInputElement and files are not null
    if (event.target instanceof HTMLInputElement && event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file) {
        readFile(file);
      }
    }
  });

  simulateButton.addEventListener('click', () => {
    drawToCanvas(standardCanvas);
  });

  function drawToCanvas(canvas?: HTMLCanvasElement) {
    if (!canvas) return; // Ensure canvas is not null

    const content = editor.getValue();
    if (content) {
      drawableCommands = canvasDrawer.parseGCode(content);

      let scaleFactor = canvasDrawer.calculateDynamicScaleFactor(drawableCommands, canvas);
      canvasDrawer.draw(canvas, drawableCommands, scaleFactor, undefined, showCuts.checked, showNonCuts.checked);

      sliderContainer.style.display = 'block';
      displayOptionsContainer.style.display = 'block';

      showCuts.addEventListener('change', handleCheckboxChange);
      showNonCuts.addEventListener('change', handleCheckboxChange);
      showCutsZoom.addEventListener('change', handleCheckboxChangeZoom);
      showNonCutsZoom.addEventListener('change', handleCheckboxChangeZoom);

      progressSlider.max = (drawableCommands.length - 1).toString();
      progressSlider.value = progressSlider.min; // Start the slider at the beginning

      zoomProgressSlider.max = (drawableCommands.length - 1).toString();
      zoomProgressSlider.value = zoomProgressSlider.min; // Start the slider at the beginning

      gcodeSenderContainer.style.display = 'block';
    }
  }

  function saveGCode() {
    const saveName = saveGCodeNameInput.value.trim();
    if (!saveName) return; // Handle empty name case
    const prefixedName = `gCode-${saveName}`;
    localStorage.setItem(prefixedName, editor.getValue());
    updateLoadSelect(prefixedName);

    saveGCodeNameInput.value = '';
  }

  function loadGCode() {
    const selectedName = loadSelect.value;
    const gCode = localStorage.getItem(selectedName);
    if (gCode) {
      editor.setValue(gCode);
      gcodeSenderEditor.setValue(gCode);
    }
  }

  function deleteGCode() {
    const selectedName = loadSelect.value;
    localStorage.removeItem(selectedName);
    updateLoadSelect();
  }

  function updateLoadSelect(selectedName?: string) {
    loadSelect.innerHTML = '';

    let hasSavedItems = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Exclude 'latheCode' from the dropdown options
      if (key && key !== 'latheCode' && key.startsWith('gCode-')) {
        hasSavedItems = true;
        const option = document.createElement('option');
        const displayName = key.replace('gCode-', '');
        option.value = key;
        option.textContent = displayName;
        loadSelect.appendChild(option);

        if (key === selectedName) {
          option.selected = true;
        }
      }
    }

    // If no saved items, add a placeholder
    if (!hasSavedItems) {
      const placeholderOption = document.createElement('option');
      placeholderOption.textContent = 'No items saved';
      placeholderOption.disabled = true; // Make it non-selectable
      loadSelect.appendChild(placeholderOption);
    } else {
      // Sort the keys alphabetically if there are saved items
      const sortedOptions = Array.from(loadSelect.options)
        .sort((a, b) => a.text.localeCompare(b.text));

      loadSelect.innerHTML = '';
      sortedOptions.forEach(option => {
        loadSelect.appendChild(option);
      });
    }
  }

  function updatePlaceholder() {
    // Get the current content of the editor
    const content = editor.getValue();
    const controlContent = gcodeSenderEditor.getValue();
    // Check if the content is empty and set the placeholder
    if (content === '') {
      editor.setValue('Paste your gcode here or click choose file to upload');
      // Move the cursor to the start to avoid the placeholder text being immediately deleted
      editor.gotoLine(1, 0);
      // If the editor is in focus, clear the placeholder (simulate the placeholder behavior)
      editor.on('focus', function () {
        if (editor.getValue() === 'Paste your gcode here or click choose file to upload') {
          editor.setValue('');
        }
      });
    }

    if (controlContent === '') {
      gcodeSenderEditor.setValue('Paste your gcode here or click choose file to upload');
      // Move the cursor to the start to avoid the placeholder text being immediately deleted
      gcodeSenderEditor.gotoLine(1, 0);
      // If the editor is in focus, clear the placeholder (simulate the placeholder behavior)
      gcodeSenderEditor.on('focus', function () {
        if (gcodeSenderEditor.getValue() === 'Paste your gcode here or click choose file to upload') {
          gcodeSenderEditor.setValue('');
        }
      });
    }
  }

  function updateSliderLabel(command: GCodeCommand | undefined) {
    if (command?.lineNumber !== undefined) {
      editor.gotoLine(command.lineNumber, 0, true); // Highlight the line in the editor
      sliderLabel.innerHTML = `Line:${command.lineNumber}<br>${command?.originalLine}<br>Abs: X${command.absolutePosition?.x ?? 0} &lpar;Dia: ${(command.absolutePosition?.x ?? 0) * 2}&rpar; Z${command.absolutePosition?.z}` || '';
    } else {
      sliderLabel.innerHTML = '';
    }
  }

  function updateZoomSliderLabel(command: GCodeCommand | undefined) {
    if (command?.lineNumber !== undefined) {
      editor.gotoLine(command.lineNumber, 0, true); // Highlight the line in the editor
      zoomSliderLabel.innerHTML = `Line:${command.lineNumber}<br>${command?.originalLine}<br>Abs: X${command.absolutePosition?.x} &lpar;Dia: ${(command.absolutePosition?.x ?? 0) * 2}&rpar; Z${command.absolutePosition?.z}` || '';
    } else {
      zoomSliderLabel.innerHTML = '';
    }
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target as FileReader).result as string;
      editor.setValue(content); // Set content in Ace Editor
      gcodeSenderEditor.setValue(content); // Set content in Ace Editor
    };
    reader.readAsText(file);
  }

  function handleCheckboxChange() {
    //sync checkboxes
    showCutsZoom.checked = showCuts.checked;
    showNonCutsZoom.checked = showNonCuts.checked;
    progressSlider.value = '0';
    const scaleFactor = canvasDrawer.calculateDynamicScaleFactor(drawableCommands, standardCanvas);
    canvasDrawer.draw(standardCanvas, drawableCommands, scaleFactor, undefined, showCuts.checked, showNonCuts.checked);
  }

  function handleCheckboxChangeZoom() {
    //sync checkboxes
    showCuts.checked = showCutsZoom.checked;
    showNonCuts.checked = showNonCutsZoom.checked;
    zoomProgressSlider.value = '0';
    const scaleFactor = canvasDrawer.calculateDynamicScaleFactor(drawableCommands, zoomCanvas);
    canvasDrawer.draw(zoomCanvas, drawableCommands, scaleFactor, undefined, showCutsZoom.checked, showNonCutsZoom.checked);
  }

  function loadExample() {
    editor.setValue(exampleGcode);
  }
});