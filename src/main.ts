import { GCode } from './gcode.ts';
import { exampleGcode } from './example.ts';

export const editor = ace.edit("gcodeEditor");
export const gcodeResponseEditor = ace.edit("gcodeResponseEditor");

type GCodeCommand = {
  x?: number;
  z?: number;
  isRelative: boolean;
  isCut?: boolean;
  lineNumber?: number; // Line number in the original G-code file
  originalLine?: string; // Original line text from the G-code file
};

const cutLineColour = '#DC143C'
const nonCutLineColour = '#6B8E23'

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById('gcodeCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  //const gcodeInput = document.getElementById('gcodeInput') as HTMLTextAreaElement;
  const simulateButton = document.getElementById('simulateButton') as HTMLButtonElement;
  const showCuts = document.getElementById('showCuts') as HTMLInputElement;
  const showNonCuts = document.getElementById('showNonCuts') as HTMLInputElement;
  const sliderLabel = document.getElementById('sliderLabel') as HTMLDivElement;
  const progressSlider = document.getElementById('progressSlider') as HTMLInputElement;
  const sliderContainer = document.getElementById('sliderContainer') as HTMLDivElement;
  const displayOptionsContainer = document.getElementById('displayOptionsContainer') as HTMLDivElement;
  const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
  const saveGCodeNameInput = document.querySelector<HTMLInputElement>('.saveGCodeNameInput')!;
  const loadSelect = document.querySelector<HTMLSelectElement>('.loadGCodeSelect')!;
  const loadButton = document.querySelector<HTMLButtonElement>('.loadGCodeButton')!;
  const saveButton = document.querySelector<HTMLButtonElement>('.saveGCodeButton')!;
  const deleteButton = document.querySelector<HTMLButtonElement>('.deleteGCodeButton')!;
  const gcodeSenderContainer = document.getElementById('gcodeSenderContainer') as HTMLDivElement;
  const gcodeResponseContainer = document.getElementById('gcodeResponseContainer') as HTMLDivElement;
  const gcodeSenderButton = document.getElementById('gcodeSenderButton') as HTMLButtonElement;
  const exampleElement = document.getElementById('exampleCode') as HTMLAnchorElement;

  //modal
  const helpModal = document.getElementById("helpModal") as HTMLDivElement;
  const helpBtn = document.getElementById("helpButton") as HTMLButtonElement;
  const helpSpan = document.getElementById("closeHelpModal") as HTMLSpanElement;

  //modal event listeners
  helpBtn.onclick = function () {
    helpModal.style.display = "block";
  }

  helpSpan.onclick = function () {
    helpModal.style.display = "none";
  }

  window.onclick = function (event) {
    if (event.target == helpModal) {
      helpModal.style.display = "none";
    }
  }

  saveButton.addEventListener('click', () => saveGCode());
  loadButton.addEventListener('click', () => loadGCode());
  deleteButton.addEventListener('click', () => deleteGCode());

  new GCode();

  updateLoadSelect();

  // Initialize the Ace Editor

  editor.setTheme("ace/theme/github_dark");
  editor.session.setMode("ace/mode/plain_text");
  //dont show print margin
  editor.setShowPrintMargin(false);

  exampleElement.addEventListener('click', () => loadExample());

  gcodeResponseEditor.setTheme("ace/theme/monokai"); // Set the theme to match your style
  gcodeResponseEditor.session.setMode("ace/mode/text"); // Set mode to plain text or appropriate mode
  gcodeResponseEditor.setReadOnly(true);
  gcodeResponseEditor.setShowPrintMargin(false);

  gcodeSenderButton.addEventListener('click', () => {
    gcodeResponseContainer.style.display = 'block';
  });

  gcodeResponseEditor.getSession().on('change', () => {
    // Wait for the change to render
    setTimeout(() => {
      var lastRow = gcodeResponseEditor.getSession().getLength();
      gcodeResponseEditor.scrollToLine(lastRow, true, true, function () { });
    }, 0); // Using 0ms timeout which works in most cases
  });

  updatePlaceholder();

  let currentX = 0;
  let currentZ = 0;
  let previousCanvasX = 0;
  let previousCanvasZ = 0;
  let initialOffsetX = 0;
  let initialOffsetZ = 0;
  let offSetFromScreenEdgeZ = 1;
  let canvasX = 0;
  let canvasZ = 0;
  let scaleFactor = 20;
  let drawableCommands: GCodeCommand[] = [];
  let commands: GCodeCommand[] = [];


  clearButton.addEventListener('click', () => {
    editor.setValue(''); // Clear the editor
    updatePlaceholder();
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    }

    fileInput.value = '';

    // Reset and hide the slider
    progressSlider.value = "0";
    sliderContainer.style.display = 'none';
    displayOptionsContainer.style.display = 'none';
    gcodeResponseContainer.style.display = 'none';
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
    const content = editor.getValue();
    if (content) {
      commands = parseGCode(content);
      draw(commands, drawableCommands);

      sliderContainer.style.display = 'block';
      displayOptionsContainer.style.display = 'block';

      progressSlider.max = drawableCommands.length.toString();
      progressSlider.value = progressSlider.min; // Start the slider at the beginning

      showCuts.addEventListener('change', handleCheckboxChange);
      showNonCuts.addEventListener('change', handleCheckboxChange);

      progressSlider.oninput = () => {
        if (!ctx) return; // Ensure ctx is not null
        const scaledValue = Math.floor(parseInt(progressSlider.value));

        if (scaledValue < drawableCommands.length) {
          const command = drawableCommands[scaledValue];
          draw(commands, drawableCommands, scaledValue);
          updateSliderLabel(command);
        }
      };

      gcodeSenderContainer.style.display = 'block';
    }
  });

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
  }

  function updateSliderLabel(command: GCodeCommand | undefined) {
    if (command?.lineNumber !== undefined) {
      editor.gotoLine(command.lineNumber, 0, true); // Highlight the line in the editor
      sliderLabel.innerHTML = `Line:${command.lineNumber}<br>${command?.originalLine}` || '';
    } else {
      sliderLabel.innerHTML = '';
    }
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target as FileReader).result as string;
      editor.setValue(content); // Set content in Ace Editor
    };
    reader.readAsText(file);
  }

  function parseGCode(data: string): GCodeCommand[] {
    const commands: GCodeCommand[] = [];
    let isRelative = false; // Track the relative positioning mode
    drawableCommands = [];
    const lines = data.split('\n');
    lines.forEach((line, index) => {
      const command: GCodeCommand = { isRelative: isRelative, isCut: line.includes('; cut') };
      const parts = line.match(/([GXYZF])([0-9.-]+)/g);

      parts?.forEach(part => {
        const value = parseFloat(part.slice(1));
        switch (part[0]) {
          case 'G':
            if (value === 90) command.isRelative = false;
            if (value === 91) command.isRelative = true;
            break;
          case 'X':
            command.x = value;
            break;
          case 'Z':
            command.z = value;
            break;
        }
      });

      if (command.x !== undefined || command.z !== undefined) {

        const newCommand: GCodeCommand = {
          ...command,
          lineNumber: index + 1,
          originalLine: line
        };

        commands.push(newCommand);
        if (command.isRelative) {
          drawableCommands.push(newCommand); // Map the command index to the line number
        }
      }

      // Update the relative positioning mode for subsequent commands
      isRelative = command.isRelative;
    });
    scaleFactor = calculateDynamicScaleFactor(drawableCommands, canvas.width, canvas.height);
    return commands;
  }

  function handleCheckboxChange() {
    progressSlider.value = '0';
    draw(commands, drawableCommands, drawableCommands.length); // Redraw the entire set of commands
  }

  function calculateDynamicScaleFactor(commands: GCodeCommand[], canvasWidth: number, canvasHeight: number): number {
    let cumulativeX = 0;
    let cumulativeZ = 0;
    let maxX = 0;
    let maxZ = 0;
    let minX = 0; // new variable to track the minimum X value
    let minZ = 0; // new variable to track the minimum Z value

    commands.forEach(command => {
      if (command.isRelative) {
        if (command.x !== undefined) {
          cumulativeX += command.x;
        }
        if (command.z !== undefined) {
          cumulativeZ += command.z;
        }
      }

      maxX = Math.max(maxX, Math.abs(cumulativeX));
      maxZ = Math.max(maxZ, Math.abs(cumulativeZ));
      minX = Math.min(minX, cumulativeX); // update minX
      minZ = Math.min(minZ, cumulativeZ); // update minZ
    });

    // Object size in mm
    const objectSizeX = maxX; // calculate objectSizeX as the difference between maxX and minX
    const objectSizeZ = maxZ - minZ; // calculate objectSizeZ as the difference between maxZ and minZ

    // Base scale: 40 pixels per mm for small objects
    let baseScale = 40; // 40 pixels per mm

    // Adjust base scale for larger objects
    const xZeroLocation = canvasHeight / 2;

    const screenEdgeMargin = 1; // extra margin to ensure the object fits within the canvas

    // Adjust scale for larger objects to fit within canvas
    const scaleX = xZeroLocation / objectSizeX - screenEdgeMargin;
    const scaleZ = canvasWidth / objectSizeZ - screenEdgeMargin;

    // Choose the smaller scale factor to ensure the object fits within the canvas
    let scale = Math.min(scaleX, scaleZ, baseScale);
    return scale;
}

  function draw(commands: GCodeCommand[], drawableCommands: GCodeCommand[], progress?: number) {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentX = 0;
    currentZ = 0;

    // Apply the initial absolute offset
    for (const command of commands) {
      if (!command.isRelative) {
        if (command.x !== undefined) {
          initialOffsetX = command.x * scaleFactor;
        }
        if (command.z !== undefined) {
          initialOffsetZ = command.z * scaleFactor;
        }
      }
      else if (command.isRelative) {
        break;
      }
    }

    previousCanvasX = (canvas.height / 2) - initialOffsetX;
    previousCanvasZ = canvas.width - initialOffsetZ - offSetFromScreenEdgeZ;

    const maxCount = progress !== undefined ? Math.min(progress + 1, drawableCommands.length) : drawableCommands.length;

    for (let i = 0; i < maxCount; i++) {
      drawCommand(drawableCommands[i]);
    }
  }

  function drawCommand(drawableCommands: GCodeCommand) {
    if (!ctx) return;
    ctx.lineWidth = 2;
    if (drawableCommands.isRelative) {
      currentX += drawableCommands.x ?? 0;
      currentZ += drawableCommands.z ?? 0;
    }

    canvasX = (canvas.height / 2) - initialOffsetX - (currentX * scaleFactor);
    canvasZ = canvas.width - initialOffsetZ - (currentZ * scaleFactor) - offSetFromScreenEdgeZ;

    if ((drawableCommands.isCut && showCuts.checked) || (!drawableCommands.isCut && showNonCuts.checked)) {
      ctx.beginPath();
      ctx.strokeStyle = drawableCommands.isCut ? cutLineColour : nonCutLineColour;
      ctx.moveTo(previousCanvasZ, previousCanvasX);
      ctx.lineTo(canvasZ, canvasX);
      ctx.stroke();
    }

    previousCanvasX = canvasX;
    previousCanvasZ = canvasZ;
  }

  function loadExample() {
    editor.setValue(exampleGcode);
  }
});