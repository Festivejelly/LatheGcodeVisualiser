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

  // Initialize the Ace Editor
  const editor = ace.edit("gcodeEditor");
  editor.setTheme("ace/theme/github_dark");
  editor.session.setMode("ace/mode/plain_text");

  let currentX = 0;
  let currentZ = 0;
  let previsousCanvasX = 0;
  let previsousCanvasZ = 0;
  let canvasX = 0;
  let canvasZ = 0;
  let scaleFactor = 20;
  let drawableCommands: GCodeCommand[] = [];


  clearButton.addEventListener('click', () => {
    editor.setValue(''); // Clear the editor

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    }

    // Reset and hide the slider
    progressSlider.value = "0";
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
    const content = editor.getValue();
    if (content) {
      parseGCode(content);
      draw(drawableCommands);

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
          draw(drawableCommands, scaledValue);
          updateSliderLabel(command);
        }
      };
    }
  });

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
    draw(drawableCommands, drawableCommands.length); // Redraw the entire set of commands
  }

  function calculateDynamicScaleFactor(commands: GCodeCommand[], canvasWidth: number, canvasHeight: number): number {
    let cumulativeX = 0;
    let cumulativeZ = 0;
    let maxX = 0;
    let maxZ = 0;

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
    });

    // Object size in mm
    const objectSizeX = maxX; // maxX is radius-like, so diameter is maxX * 2
    const objectSizeZ = maxZ; // same for Z

    // Base scale: 20 pixels per mm for small objects
    let baseScale = 40; // 20 pixels per mm

    // Adjust scale for larger objects to fit within canvas
    const scaleX = canvasWidth / objectSizeX;
    const scaleZ = canvasHeight / objectSizeZ;

    // Choose the smaller scale factor to ensure the object fits within the canvas
    let scale = Math.min(scaleX, scaleZ, baseScale);
    return scale;
  }

  function draw(commands: GCodeCommand[], progress?: number) {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentX = 0;
    currentZ = 0;
    previsousCanvasX = canvas.height;
    previsousCanvasZ = canvas.width;

    const maxCount = progress !== undefined ? Math.min(progress + 1, commands.length) : commands.length;

    for (let i = 0; i < maxCount; i++) {
      drawCommand(commands[i]);
    }
  }

  function drawCommand(command: GCodeCommand) {
    if (!ctx) return;
    ctx.lineWidth = 2;
    if (command.isRelative) {
      currentX += command.x ?? 0;
      currentZ += command.z ?? 0;
    }

    canvasX = canvas.height - (currentX * scaleFactor);
    canvasZ = canvas.width - (currentZ * scaleFactor);

    if ((command.isCut && showCuts.checked) || (!command.isCut && showNonCuts.checked)) {
      ctx.beginPath();
      ctx.strokeStyle = command.isCut ? cutLineColour : nonCutLineColour;
      ctx.moveTo(previsousCanvasZ, previsousCanvasX);
      ctx.lineTo(canvasZ, canvasX);
      ctx.stroke();
    }

    previsousCanvasX = canvasX;
    previsousCanvasZ = canvasZ;
  }
});