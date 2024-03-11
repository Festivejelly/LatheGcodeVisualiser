import { GCode } from './gcode.ts';
import { exampleGcode } from './example.ts';
import './planner';

export const editor = ace.edit("gcodeEditor");
export const gcodeResponseEditor = ace.edit("gcodeResponseEditor");
export const gcodeSenderEditor = ace.edit("gcodeSenderEditor");
export let gCode: GCode;

enum MovementType {
  Cut,
  Travel,
  Retract
}

type GCodeCommand = {
  x?: number;
  z?: number;
  isRelative: boolean;
  absolutePosition?: AbsolutePosition;
  movementType?: MovementType;
  lineNumber?: number; // Line number in the original G-code file
  originalLine?: string; // Original line text from the G-code file
};

type AbsolutePosition = { z: number, x: number };

let absolutePosition: AbsolutePosition = { z: 0, x: 0 };

const cutLineColour = '#DC143C'
const travelLineColour = '#6B8E23'
const retractLineColour = '#FFA500'
const currentLineColour = '#242424'

document.addEventListener("DOMContentLoaded", () => {

  gCode = new GCode();

  const standardCanvas = document.getElementById('gcodeCanvas') as HTMLCanvasElement;
  const zoomCanvas = document.getElementById('zoomCanvas') as HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
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
  const plannerTab = document.getElementById('plannerTab') as HTMLLIElement;
  const threadingTab = document.getElementById('threadingTab') as HTMLLIElement;
  const simulationContent = document.getElementById('simulationContainer') as HTMLDivElement;
  const controlContent = document.getElementById('controlsContainer') as HTMLDivElement;
  const plannerContent = document.getElementById('plannerContainer') as HTMLDivElement;
  const threadingContent = document.getElementById('threadingContainer') as HTMLDivElement;
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
      console.log('Jog increment set to:', incrementValue);
      // Additional code to adjust jog distance based on incrementValue
    });
  });

  simulationTab.addEventListener('click', () => {
    simulationContent.style.display = 'flex';
    controlContent.style.display = 'none';
    plannerContent.style.display = 'none';
    threadingContent.style.display = 'none';
  });

  controlTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'flex';
    plannerContent.style.display = 'none';
    threadingContent.style.display = 'none';
  });

  plannerTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'none';
    plannerContent.style.display = 'flex';
    threadingContent.style.display = 'none';

    const event = new Event('containerVisible');
    plannerContent.dispatchEvent(event);
  });

  threadingTab.addEventListener('click', () => {
    simulationContent.style.display = 'none';
    controlContent.style.display = 'none';
    plannerContent.style.display = 'none';
    threadingContent.style.display = 'flex';
  });

  zoomCanvas.width = window.visualViewport!.width - 100;
  zoomCanvas.height = window.visualViewport!.height - 150;

  //on widnow resize, resize the zoom canvas
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

  let currentX = 0;
  let currentZ = 0;
  let previousCanvasX = 0;
  let previousCanvasZ = 0;
  let absX = 0;
  let absZ = 0;
  let offSetFromScreenEdgeZ = 5;
  let canvasX = 0;
  let canvasZ = 0;
  let drawableCommands: GCodeCommand[] = [];

  progressSlider.oninput = () => {
    const progress = Math.floor(parseInt(progressSlider.value));

    if (progress < drawableCommands.length) {
      const command = drawableCommands[progress];
      let scaleFactor = calculateDynamicScaleFactor(drawableCommands, standardCanvas);
      draw(standardCanvas, drawableCommands, scaleFactor, progress);
      updateSliderLabel(command);
    }
  };

  zoomProgressSlider.oninput = () => {
    const progress = Math.floor(parseInt(zoomProgressSlider.value));

    if (progress < drawableCommands.length) {
      const command = drawableCommands[progress];
      let scaleFactor = calculateDynamicScaleFactor(drawableCommands, zoomCanvas);
      draw(zoomCanvas, drawableCommands, scaleFactor, progress);
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
    if (!canvas) return; // Ensure cavnas is not null

    const content = editor.getValue();
    if (content) {
      parseGCode(content);

      let scaleFactor = calculateDynamicScaleFactor(drawableCommands, canvas);
      draw(canvas, drawableCommands, scaleFactor);

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
      sliderLabel.innerHTML = `Line:${command.lineNumber}<br>${command?.originalLine}<br>Abs: X${command.absolutePosition?.x} Z${command.absolutePosition?.z}` || '';
    } else {
      sliderLabel.innerHTML = '';
    }
  }

  function updateZoomSliderLabel(command: GCodeCommand | undefined) {
    if (command?.lineNumber !== undefined) {
      editor.gotoLine(command.lineNumber, 0, true); // Highlight the line in the editor
      zoomSliderLabel.innerHTML = `Line:${command.lineNumber}<br>${command?.originalLine}<br>Abs: X${command.absolutePosition?.x} Z${command.absolutePosition?.z}` || '';
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

  function parseGCode(data: string): GCodeCommand[] {
    const commands: GCodeCommand[] = [];
    let isRelative = false; // Track the relative positioning mode
    drawableCommands = [];
    const lines = data.split('\n');
    lines.forEach((line, index) => {
      const movementType: MovementType = line.includes('; cut') ? MovementType.Cut : line.includes('; retract') ? MovementType.Retract : MovementType.Travel;

      const command: GCodeCommand = { isRelative: isRelative, movementType };
      const parts = line.match(/([GXYZF])([0-9.-]+)/g);

      parts?.forEach(part => {
        const value = parseFloat(part.slice(1));
        switch (part[0]) {
          case 'G':
            if (value === 90) {
              command.isRelative = false;
              isRelative = false;
            }
            if (value === 91) {
              command.isRelative = true;
              isRelative = true;
            }
            break;
          case 'X':
            command.x = parseFloat(value.toFixed(3));
            if (!isRelative) {
              absolutePosition.x = parseFloat(value.toFixed(3));
            } else {
              absolutePosition.x = parseFloat((absolutePosition.x + value).toFixed(3));
            }
            break;
          case 'Z':
            command.z = parseFloat(value.toFixed(3));
            if (!isRelative) {
              absolutePosition.z = parseFloat(value.toFixed(3));
            } else {
              absolutePosition.z = parseFloat((absolutePosition.z + value).toFixed(3));
            }
            break;
        }
      });

      const newCommand: GCodeCommand = {
        ...command,
        lineNumber: index + 1,
        originalLine: line,
        absolutePosition: { ...absolutePosition } // Add the 'absolutePosition' property
      };

      if ((command.z !== undefined) || (command.x !== undefined)) {
        drawableCommands.push(newCommand);
      }
      commands.push(newCommand);

    });
    return commands;
  }

  function handleCheckboxChange() {
    //sync checkboxes
    showCutsZoom.checked = showCuts.checked;
    showNonCutsZoom.checked = showNonCuts.checked;
    progressSlider.value = '0';
    const scaleFactor = calculateDynamicScaleFactor(drawableCommands, standardCanvas);
    draw(standardCanvas, drawableCommands, scaleFactor, drawableCommands.length); // Redraw the entire set of commands
  }

  function handleCheckboxChangeZoom() {
    //sync checkboxes
    showCuts.checked = showCutsZoom.checked;
    showNonCuts.checked = showNonCutsZoom.checked;
    zoomProgressSlider.value = '0';
    const scaleFactor = calculateDynamicScaleFactor(drawableCommands, zoomCanvas);
    draw(zoomCanvas, drawableCommands, scaleFactor, drawableCommands.length); // Redraw the entire set of commands
  }

  function calculateDynamicScaleFactor(commands: GCodeCommand[], canvas: HTMLCanvasElement): number {
    let cumulativeXRelative = 0;
    let cumulativeZRelative = 0;
    let largestXAbs = 0;
    let largestZAbs = 0;
    let maxX = 0;
    let maxZ = 0;
    let minX = 0; // new variable to track the minimum X value
    let minZ = 0; // new variable to track the minimum Z value
    let baseScale = 0;

    let minZRelative = 0;
    let maxZRelative = 0;

    let minXRelative = 0;
    let maxXRelative = 0;

    if (canvas.id === 'zoomCanvas') {
      // Base scale: 40 pixels per mm for small objects
      baseScale = 80; // 40 pixels per mm
    } else {
      baseScale = 40;
    }

    commands.forEach(command => {
      if (command.isRelative) {
        if (command.x !== undefined) {
          cumulativeXRelative += command.x;
          minXRelative = Math.min(minXRelative, cumulativeXRelative);
          maxXRelative = Math.max(maxXRelative, cumulativeXRelative);
        }
        if (command.z !== undefined) {
          cumulativeZRelative += command.z;
          minZRelative = Math.min(minZRelative, cumulativeZRelative);
          maxZRelative = Math.max(maxZRelative, cumulativeZRelative);
        }
      } else {
        // find the largest X and Z values
        if (command.x !== undefined) {
          largestXAbs = Math.min(largestXAbs, command.x);
        }
        if (command.z !== undefined) {
          largestZAbs = Math.max(largestZAbs, command.z);
        }
      }
    });

    //find the largest X and Z values based on the cumulative values of Absolute and relative movements
    const sizeX = maxXRelative -= largestXAbs;
    const sizeZ = maxZRelative += largestZAbs;

    maxX = Math.max(maxX, Math.abs(sizeX));
    maxZ = Math.max(maxZ, Math.abs(sizeZ));
    minX = Math.min(minX, sizeX); // update minX
    minZ = Math.min(minZ, sizeZ); // update minZ


    // Object size in mm
    const objectSizeX = maxX; // calculate objectSizeX as the difference between maxX and minX
    const objectSizeZ = maxZ - minZ; // calculate objectSizeZ as the difference between maxZ and minZ

    // Adjust base scale for larger objects
    const xZeroLocation = canvas.height / 2;

    const screenEdgeMargin = 1; // extra margin to ensure the object fits within the canvas

    // Adjust scale for larger objects to fit within canvas
    const scaleX = xZeroLocation / objectSizeX - screenEdgeMargin;
    const scaleZ = canvas.width / objectSizeZ - screenEdgeMargin;

    // Choose the smaller scale factor to ensure the object fits within the canvas
    let scale = Math.min(scaleX, scaleZ, baseScale);
    return scale;
  }

  function draw(canvas: HTMLCanvasElement, drawableCommands: GCodeCommand[], scalingFactor: number, progress?: number) {
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentX = 0;
    currentZ = 0;
    absX = 0;
    absZ = 0;
    previousCanvasX = 0;
    previousCanvasZ = 0;

    // These values will always be the ABS Zero from the start of the program
    previousCanvasX = (canvas.height / 2);
    previousCanvasZ = canvas.width - offSetFromScreenEdgeZ;

    const maxCount = progress !== undefined ? Math.min(progress + 1, drawableCommands.length) : drawableCommands.length;

    for (let i = 0; i < maxCount; i++) {
      drawCommand(canvas, drawableCommands[i], scalingFactor, i === progress);
    }
  }

  function drawCommand(canvas: HTMLCanvasElement, drawableCommand: GCodeCommand, scaleFactor: number, isCurrentLine: boolean) {
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawCuts = showCuts.checked || showCutsZoom.checked;
    let drawNonCuts = showNonCuts.checked || showNonCutsZoom.checked;

    ctx.lineWidth = 2;
    if (drawableCommand.isRelative) {
      currentX += drawableCommand.x ?? 0;
      currentZ += drawableCommand.z ?? 0;
    }
    else {
      currentX = drawableCommand.x ?? absX;
      currentZ = drawableCommand.z ?? absZ;
      absX = currentX;
      absZ = currentZ;
    }

    canvasX = (canvas.height / 2) - (currentX * scaleFactor);
    canvasZ = canvas.width - (currentZ * scaleFactor) - offSetFromScreenEdgeZ;

    let lineColor = "";

    if ((drawableCommand.movementType == MovementType.Cut && drawCuts) || (drawableCommand.movementType == MovementType.Travel && drawNonCuts) || drawableCommand.movementType == MovementType.Retract && drawNonCuts) {
      ctx.beginPath();
      lineColor = drawableCommand.movementType == MovementType.Cut ? cutLineColour : drawableCommand.movementType == MovementType.Travel ? travelLineColour : retractLineColour;
      ctx.moveTo(previousCanvasZ, previousCanvasX);
      ctx.lineTo(canvasZ, canvasX);
      

      if (isCurrentLine) {
        ctx.strokeStyle = lineColor;
        ctx.setLineDash([5, 5]); // set the line to be dashed for the current line
        ctx.lineDashOffset = 0;

        ctx.stroke();

        // draw a dashed line with the color of the gaps
        ctx.strokeStyle = currentLineColour;
        ctx.setLineDash([5, 5]); // set the line to be dashed
        ctx.lineDashOffset = -5; // start the dash pattern 5 pixels into the gaps of the first line
        ctx.stroke();
      } else {
        ctx.strokeStyle = lineColor;
        ctx.setLineDash([]); // reset the line to be solid for other lines
        ctx.stroke();
      }

      // draw markers for the start and end points of the current line
      if (isCurrentLine) {
        // calculate the angle of the line
        let dx = canvasZ - previousCanvasZ;
        let dy = canvasX - previousCanvasX;
        let angle = Math.atan2(dy, dx);

        // draw a green triangle for the start point, rotated to the direction of travel
        ctx.save(); // save the current state of the context
        ctx.translate(previousCanvasZ, previousCanvasX); // move the origin to the start point
        ctx.rotate(angle + Math.PI / 2); // rotate the context to the angle of the line
        ctx.beginPath();
        ctx.moveTo(0, -5); // top vertex of the triangle
        ctx.lineTo(-5, 5); // bottom left vertex of the triangle
        ctx.lineTo(5, 5); // bottom right vertex of the triangle
        ctx.closePath(); // close the path to create a complete triangle
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.restore(); // restore the context to its original state

        // draw a red circle for the end point
        ctx.beginPath();
        ctx.rect(canvasZ - 3, canvasX - 3, 6, 6); // square with side length of 6
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    }

    previousCanvasX = canvasX;
    previousCanvasZ = canvasZ;
  }

  function loadExample() {
    editor.setValue(exampleGcode);
  }
});