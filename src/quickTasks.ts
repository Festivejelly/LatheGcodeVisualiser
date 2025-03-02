import { Sender, SenderClient } from './sender';
import { Threading, type ThreadingType, type ThreadSpec, type ThreadingDirection } from './threading';


let sender: Sender | null;
let minimumVersion = 'H4V12FJ';

const quickTaskConfig: { [key: string]: { modal: HTMLDivElement, openButton: HTMLButtonElement, closeButton: HTMLButtonElement, executeButton: HTMLButtonElement, stopButton: HTMLButtonElement, progressBar: HTMLProgressElement, taskFunction: () => void } } = {
  'quickTaskFacing': {
    openButton: document.getElementById('quickTaskFacingButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskFacingModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskFacingCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskFacingExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskFacingStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskFacingProgressBar') as HTMLProgressElement,
    taskFunction: facingTask
  },
  'quickTaskGrooving': {
    openButton: document.getElementById('quickTaskGroovingButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskGroovingModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskGroovingCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskGroovingExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskGroovingStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskGroovingProgressBar') as HTMLProgressElement,
    taskFunction: groovingTask
  },
  'quickTaskProfiling': {
    openButton: document.getElementById('quickTaskProfilingButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskProfilingModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskProfilingCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskProfilingExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskProfilingStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskProfilingProgressBar') as HTMLProgressElement,
    taskFunction: profilingTask
  },
  'quickTaskDrilling': {
    openButton: document.getElementById('quickTaskDrillingButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskDrillingModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskDrillingCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskDrillingExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskDrillingStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskDrillingProgressBar') as HTMLProgressElement,
    taskFunction: drillingTask
  },
  'quickTaskCone': {
    openButton: document.getElementById('quickTaskConeButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskConeModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskConeCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskConeExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskConeStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskConeProgressBar') as HTMLProgressElement,
    taskFunction: coneTask
  },
  'quickTaskBoring': {
    openButton: document.getElementById('quickTaskBoringButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskBoringModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskBoringCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskBoringExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskBoringStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskBoringProgressBar') as HTMLProgressElement,
    taskFunction: boringTask
  },
  'quickTaskThreading': {
    openButton: document.getElementById('quickTaskThreadingButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskThreadingModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskThreadingCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskThreadingExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskThreadingStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskThreadingProgressBar') as HTMLProgressElement,
    taskFunction: threadingTask
  },
  'quickTaskToolOffsets': {
    openButton: document.getElementById('quickTaskToolOffsetsButton') as HTMLButtonElement,
    modal: document.getElementById('quickTaskToolOffsetsModal') as HTMLDivElement,
    closeButton: document.getElementById('quickTaskToolOffsetsCloseButton') as HTMLButtonElement,
    executeButton: document.getElementById('quickTaskToolOffsetsExecuteButton') as HTMLButtonElement,
    stopButton: document.getElementById('quickTaskToolOffsetsStopButton') as HTMLButtonElement,
    progressBar: document.getElementById('quickTaskToolOffsetsProgressBar') as HTMLProgressElement,
    taskFunction: toolOffsetsTask
  }
};

//Facing
const quickTaskFacingMovementType = document.getElementById('quickTaskFacingMovementType') as HTMLSelectElement;
//const quickTaskFacingDepth = document.getElementById('quickTaskFacingDepth') as HTMLInputElement;
//const quickTaskFacingFeedRate = document.getElementById('quickTaskFacingFeedRate') as HTMLInputElement;
const quickTaskFacingDepthContainer = document.getElementById('quickTaskFacingDepthContainer') as HTMLDivElement;
const quickTaskFacingFinalDiameterContainer = document.getElementById('quickTaskFacingFinalDiameterContainer') as HTMLDivElement;


//Profiling
const quickTaskProfilingFinalDiameter = document.getElementById('quickTaskProfilingFinalDiameter') as HTMLInputElement;
const quickTaskProfilingDepth = document.getElementById('quickTaskProfilingDepth') as HTMLInputElement;
const quickTaskProfilingDepthPerPass = document.getElementById('quickTaskProfilingDepthPerPass') as HTMLInputElement;
const quickTaskProfilingFinishingDepth = document.getElementById('quickTaskProfilingFinishingDepth') as HTMLInputElement;
const quickTaskProfilingPasses = document.getElementById('quickTaskProfilingPasses') as HTMLInputElement;
const quickTaskProfilingType = document.getElementById('quickTaskProfilingType') as HTMLSelectElement;
const quickTaskProfilingFinalDiameterContainer = document.getElementById('quickTaskProfilingFinalDiameterContainer') as HTMLDivElement;
const quickTaskProfilingDepthContainer = document.getElementById('quickTaskProfilingDepthContainer') as HTMLDivElement;

//Drilling
const quickTaskDrillingDepth = document.getElementById('quickTaskDrillingDepth') as HTMLInputElement;
const quickTaskDrillingFeedRate = document.getElementById('quickTaskDrillingFeedRate') as HTMLInputElement;
const quickTaskDrillingPeckCheckbox = document.getElementById('quickTaskDrillingPeckCheckbox') as HTMLInputElement;
const quickTaskDrillingPeckingDepthContainer = document.getElementById('quickTaskDrillingPeckingDepthContainer') as HTMLDivElement;
const quickTaskDrillingPeckingDepth = document.getElementById('quickTaskDrillingPeckingDepth') as HTMLInputElement;

//Threading
const quickTaskThreadingType = document.getElementById('quickTaskThreadingType') as HTMLSelectElement;
const quickTaskThreadingSize = document.getElementById('quickTaskThreadingSize') as HTMLSelectElement;
const quickTaskThreadingDirection = document.getElementById('quickTaskThreadingDirection') as HTMLSelectElement;
const quickTaskThreadingExternalOrInternal = document.getElementById('quickTaskThreadingExternalOrInternal') as HTMLSelectElement;
const quickTaskThreadingLength = document.getElementById('quickTaskThreadingLength') as HTMLInputElement;
const quickTaskThreadingPasses = document.getElementById('quickTaskThreadingPasses') as HTMLInputElement;

//Boring
//const quickTaskBoringDepth = document.getElementById('quickTaskBoringDepth') as HTMLInputElement;
//const quickTaskBoringWidth = document.getElementById('quickTaskBoringWidth') as HTMLInputElement;
//const quickTaskBoringFeedRate = document.getElementById('quickTaskBoringFeedRate') as HTMLInputElement;
//const quickTaskBoringType = document.getElementById('quickTaskBoringType') as HTMLSelectElement;
//const quickTaskBoringFinalDiameterContainer = document.getElementById('quickTaskBoringFinalDiameterContainer') as HTMLDivElement;
//const quickTaskBoringWidthContainer = document.getElementById('quickTaskBoringWidthContainer') as HTMLDivElement;
//const quickTaskBoringFinalDiameter = document.getElementById('quickTaskBoringFinalDiameter') as HTMLInputElement;
//const quickTaskBoringDepthPerPass = document.getElementById('quickTaskBoringDepthPerPass') as HTMLInputElement;
//const quickTaskBoringFinishingDepth = document.getElementById('quickTaskBoringFinishingDepth') as HTMLInputElement;
//const quickTaskBoringPasses = document.getElementById('quickTaskBoringPasses') as HTMLInputElement;

//Tool offsets
const quickTaskToolOffsetsProbeDiameter = document.getElementById('quickTaskToolOffsetsProbeDiameter') as HTMLInputElement;
const quickTaskToolOffsetsToolNumber = document.getElementById('quickTaskToolOffsetsToolNumber') as HTMLSelectElement;
const quickTaskToolOffsetsToolType = document.getElementById('quickTaskToolOffsetsToolType') as HTMLSelectElement;
const quickTaskToolOffsetsOffsetX = document.getElementById('quickTaskToolOffsetsOffsetX') as HTMLInputElement;
const quickTaskToolOffsetsOffsetZ = document.getElementById('quickTaskToolOffsetsOffsetZ') as HTMLInputElement;


document.addEventListener("DOMContentLoaded", () => {

  let activeQuickTaskConfig: { modal: HTMLDivElement, openButton: HTMLButtonElement, closeButton: HTMLButtonElement, executeButton: HTMLButtonElement, stopButton: HTMLButtonElement, progressBar: HTMLProgressElement, taskFunction: () => void };
  sender = Sender.getInstance();
  sender.addStatusChangeListener(() => handleStatusChange(), SenderClient.QUICKTASKS);

  //Connect button
  const connectButton = document.getElementById('connectButton') as HTMLButtonElement;

  interface ToolOffset {
    tool: number;
    z: number;
    x: number;
    w: number;  // Z-axis compensation
    u: number;  // X-axis compensation
  }

  const parseToolOffsets = (response: string): ToolOffset[] => {
    // Remove 'Tool offsets:' prefix and 'ok' suffix
    const offsetsString = response.replace('toolOffsets:', '').replace('ok', '');

    // Split into individual tool strings by the pipe character
    const toolStrings = offsetsString.split('|');

    return toolStrings.map(toolString => {
      // Extract tool number
      const toolMatch = toolString.match(/T(\d+)/);
      const tool = toolMatch ? parseInt(toolMatch[1]) : 0;

      // Extract values using regular expressions
      const zMatch = toolString.match(/Z=(-?\d+\.?\d*)/);
      const xMatch = toolString.match(/X=(-?\d+\.?\d*)/);
      const wMatch = toolString.match(/W=(-?\d+\.?\d*)/);
      const uMatch = toolString.match(/U=(-?\d+\.?\d*)/);

      return {
        tool,
        z: zMatch ? parseFloat(zMatch[1]) : 0,
        x: xMatch ? parseFloat(xMatch[1]) : 0,
        w: wMatch ? parseFloat(wMatch[1]) : 0,
        u: uMatch ? parseFloat(uMatch[1]) : 0
      };
    }).filter(offset => !isNaN(offset.tool)); // Filter out any invalid entries
  };

  // Quick task open buttons
  Object.keys(quickTaskConfig).forEach(taskId => {
    const config = quickTaskConfig[taskId];
    const openButton = quickTaskConfig[taskId].openButton;
    openButton.addEventListener('click', async () => {
      if (!sender?.isConnected()) {
        alert('Please connect to the machine first');
      } else {
        activeQuickTaskConfig = config;

        //if its a cone task show an alert saying not implemented
        if (taskId === 'quickTaskCone' || taskId === 'quickTaskGrooving') {
          alert('Not Yet Implemented, coming soon!');
        } else {
          config.modal.style.display = 'block';
        }

        //if task is tool offsets, populate the tool number select with the available tools
        if (taskId === 'quickTaskToolOffsets') {

          const response = await sender.getToolOffsets(SenderClient.GCODE);
          const toolOffsets = parseToolOffsets(response);

          // Clear existing options
          quickTaskToolOffsetsToolNumber.innerHTML = '';

          if (toolOffsets.length > 0) {
            for (let i = 1; i <= (toolOffsets.length - 1); i++) {
              const option = document.createElement('option');
              option.value = `T${i}`;
              option.textContent = `T${i}`;
              quickTaskToolOffsetsToolNumber.appendChild(option);
            }

            //set the default value to the first tool
            quickTaskToolOffsetsToolNumber.value = 'T1';

          }
        }
      }
    });

    // Execute button
    config.executeButton.addEventListener('click', () => {
      config.taskFunction();
    });

    // Stop button
    config.stopButton.addEventListener('click', () => {
      sender?.stop();
    });

    // Close button
    config.closeButton.addEventListener('click', () => {
      config.modal.style.display = 'none';
    });
  });



  //<---- Facing event listeners ---->
  quickTaskFacingMovementType.addEventListener('change', () => {
    if (quickTaskFacingMovementType.value === 'Absolute') {
      quickTaskFacingFinalDiameterContainer!.style.display = 'block';
      quickTaskFacingDepthContainer!.style.display = 'none';
    } else {
      quickTaskFacingFinalDiameterContainer!.style.display = 'none';
      quickTaskFacingDepthContainer!.style.display = 'block';
    }
  });


  //<---- Profiling event listeners ---->
  quickTaskProfilingType.addEventListener('change', () => {
    if (quickTaskProfilingType.value === 'Absolute') {
      quickTaskProfilingDepthContainer!.style.display = 'none';
      quickTaskProfilingFinalDiameterContainer!.style.display = 'block';
    } else {
      quickTaskProfilingDepthContainer!.style.display = 'block';
      quickTaskProfilingFinalDiameterContainer!.style.display = 'none';
    }
  });

  quickTaskProfilingFinalDiameter.addEventListener('input', () => profilingUpdateDepthOfPasses('Absolute'));
  quickTaskProfilingDepth.addEventListener('input', () => profilingUpdateDepthOfPasses('Relative'));
  quickTaskProfilingPasses.addEventListener('input', () => profilingUpdateDepthOfPasses(quickTaskProfilingType.value));


  //<---- drilling event listeners ---->
  quickTaskDrillingPeckCheckbox.addEventListener('change', () => {
    if (quickTaskDrillingPeckCheckbox.checked) {
      quickTaskDrillingPeckingDepthContainer.style.display = 'block';
    } else {
      quickTaskDrillingPeckingDepthContainer.style.display = 'none';
    }
  });


  //<---- Threading event listeners ---->
  quickTaskThreadingSize.addEventListener('change', () => {
    const threadSpec = Threading.getThreadSpecByName(quickTaskThreadingSize.value) as ThreadSpec;
    const threadingExternalOrInternal = quickTaskThreadingExternalOrInternal.value as ThreadingType;
    const depth = threadSpec.getThreadDepth(threadingExternalOrInternal);

    //calculate number of passes assuming 0.1mm per pass
    const defaultPasses = Math.ceil(depth / 0.1) + 1;

    quickTaskThreadingPasses.value = defaultPasses.toString();
  });


  //<---- Tool offset event listeners ---->
  const localStorageProbeDiameter = localStorage.getItem('probeDiameter');

  if (localStorageProbeDiameter !== null) {
    quickTaskToolOffsetsProbeDiameter.value = localStorageProbeDiameter;
  }

  const updateThreadSizes = () => {

    const threadingType = quickTaskThreadingType.value;
    const threadSpecs = Threading.getThreadsForGroup(threadingType);
    //const externalOrInternal = quickTaskThreadingExternalOrInternal.value;

    // Clear existing options
    quickTaskThreadingSize.innerHTML = '<option value="">Select Thread Size</option>';

    if (threadSpecs.length > 0) {

      threadSpecs
        .sort((a, b) => {
          // First sort by diameter
          if (a.nominalDiameter !== b.nominalDiameter) {
            return a.nominalDiameter - b.nominalDiameter;
          }
          // Then by pitch (smaller pitch/fine first)
          return a.pitch - b.pitch;
        })
        .forEach(thread => {
          const option = document.createElement('option');
          option.value = thread.name;
          option.textContent = thread.name;
          quickTaskThreadingSize.appendChild(option);
        });
      quickTaskThreadingSize.disabled = false;
    } else {
      quickTaskThreadingSize.disabled = true;
    }
  }

  quickTaskThreadingType.addEventListener('change', updateThreadSizes);

  //call on page load
  updateThreadSizes();


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

      //show execute button
      activeQuickTaskConfig.executeButton.style.display = 'flex';

      //hide stop button
      activeQuickTaskConfig.stopButton.style.display = 'none';

      //reset progress bar
      activeQuickTaskConfig.progressBar.value = 0;

      //hide the parent div of the progress slider
      activeQuickTaskConfig.progressBar.parentElement!.style.display = 'none';

    } else if (isRun) {

      //hide execute button
      activeQuickTaskConfig.executeButton.style.display = 'none';

      //show stop button
      activeQuickTaskConfig.stopButton.style.display = 'inline-block';

      //show the parent div of the progress slider
      activeQuickTaskConfig.progressBar.parentElement!.style.display = 'block';

      //update progress bar
      const progress = status.progress;
      activeQuickTaskConfig.progressBar.value = progress;
    }

  }
})


//<---- Profiling functions ---->
function profilingTask() {

  //profiling modal inputs
  const profilingLength = parseFloat((document.getElementById('quickTaskProfilingLength') as HTMLInputElement).value);
  const profilingPasses = parseInt((quickTaskProfilingPasses).value, 10);
  const feedRate = parseFloat((document.getElementById('quickTaskProfilingFeedRate') as HTMLInputElement).value);
  const retractFeedrate = 200;

  const commands: string[] = [];


  commands.push('G91'); //set to relative positioning

  const mainPassDepth = parseFloat(quickTaskProfilingDepthPerPass.value);
  const finishingPassDepth = parseFloat(quickTaskProfilingFinishingDepth.value);

  //main passes
  for (let i = 0; i < profilingPasses - 1; i++) {

    //cutting move x
    commands.push(`G1 X${mainPassDepth} F${feedRate}`);
    //cutting move Z
    commands.push(`G1 Z${profilingLength} F${feedRate}`);
    //retract move
    commands.push(`G1 X-0.2 F${retractFeedrate}`);
    //retract move
    commands.push(`G1 Z-${profilingLength} F${retractFeedrate}`);
    //unretract X
    commands.push(`G1 X0.2 F${retractFeedrate}`);
  }

  //finishing pass
  commands.push(`G1 X${finishingPassDepth} F${feedRate}`);
  commands.push(`G1 Z${profilingLength} F${feedRate}`);
  //retract move
  commands.push(`G1 X-0.2 F${retractFeedrate}`);
  commands.push(`G1 Z-${profilingLength} F${retractFeedrate}`);

  commands.push('G90'); // Set to absolute positioning

  sender?.sendCommands(commands, SenderClient.QUICKTASKS);
}

async function profilingUpdateDepthOfPasses(movementType: string) {

  const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);

  const startPosX = latestStatus?.x!;

  let totalDepth: number;
  if (movementType === 'Absolute') {
    totalDepth = Math.abs(startPosX - (-parseFloat(quickTaskProfilingFinalDiameter.value) / 2));
  } else {
    totalDepth = parseFloat(quickTaskProfilingDepth.value);
  }

  //calculate depth per pass based on total depths and number of passes but account for a finish pass of 0.1mm
  const passes = parseInt(quickTaskProfilingPasses.value, 10);
  const finishingPassDepth = 0.1;
  const depthPerPass = (totalDepth - finishingPassDepth) / (passes -1);

  // Update the depth per pass input with the adjusted value
  quickTaskProfilingDepthPerPass.value = depthPerPass.toFixed(3);
  quickTaskProfilingFinishingDepth.value = finishingPassDepth.toFixed(3);
}

//other quick task functions
function facingTask() {

  //facing modal inputs
  const facingFeedRate = document.getElementById('quickTaskFacingFeedRate') as HTMLInputElement;
  const facingMovementType = document.getElementById('quickTaskFacingMovementType') as HTMLSelectElement;

  let commands: string[] = [];

  const startPosition = sender?.getStatus().x;

  if (facingMovementType.value === 'Absolute') {
    commands.push('G90'); //set to absolute positioning
    commands.push(`G1 X0 F${facingFeedRate.value}`);
    commands.push(`G1 X${startPosition} F${facingFeedRate.value}`); //retract a bit
    commands.push('G91'); //set to relative positioning    
  } else {
    const facingDepth = document.getElementById('quickTaskFacingDepth') as HTMLInputElement;
    commands.push('G91'); //set to relative positioning
    commands.push(`G1 X${facingDepth.value} F${facingFeedRate.value}`);
    commands.push(`G1 X-${facingDepth.value} F${facingFeedRate.value}`); //retract a bit
    commands.push('G90'); //set to absolute positioning
  }

  sender?.sendCommands(commands, SenderClient.QUICKTASKS);
}


function drillingTask() {
  
  //drilling modal inputs
  const drillingDepth = parseFloat(quickTaskDrillingDepth.value);
  const drillingFeedRate = parseFloat(quickTaskDrillingFeedRate.value);
  const drillingPeckCheckbox = quickTaskDrillingPeckCheckbox.checked;
  let drillingPeckDepth = parseFloat(quickTaskDrillingPeckingDepth.value);
  const retractFeedrate = 200;
  const slowRetractFeedrate = 50;
  const numberOfPecksUntilFullClearance = 3;
  const chipClearanceDistance = 3;
  let clearChips = false;
  let numberOfPecksPerformed = 0;

  let commands: string[] = [];


  //go to centre line of the part
  commands.push('G90'); //set to absolute positioning
  commands.push('G0 X0');

  commands.push('G91'); //set to relative positioning

  if (drillingPeckCheckbox) {

    let finalDepthAchieved = false;
    let totalDepth = 0;

    while (!finalDepthAchieved) {

      //drill
      commands.push(`G1 Z${drillingPeckDepth} F${drillingFeedRate}`);

      numberOfPecksPerformed++;

      totalDepth += drillingPeckDepth;

      //clear chips every 3 pecks
      if (numberOfPecksPerformed === numberOfPecksUntilFullClearance) {
        commands.push(`G1 Z-${totalDepth + chipClearanceDistance} F${retractFeedrate}`);
        clearChips = true;
        numberOfPecksPerformed = 0;
      } else {
        commands.push(`G1 Z-${totalDepth} F${retractFeedrate}`);

      }

      if (totalDepth >= drillingDepth) {
        finalDepthAchieved = true;
        { break; }
      } else if (totalDepth + drillingPeckDepth > drillingDepth) {
        //if the next peck would go over the total depth, then set the next peck to the remaining depth
        drillingPeckDepth = drillingDepth - totalDepth;
      }

      if(clearChips){
        //unretract fast taking into account the longer retract distance for chip clearance
        commands.push(`G1 Z${(totalDepth + chipClearanceDistance) - 0.2} F${retractFeedrate}`);

        //unretract slow
        commands.push(`G1 Z${0.2} F${slowRetractFeedrate}`);
        clearChips = false;
      } else {
        //unretract fast
        commands.push(`G1 Z${totalDepth - 0.2} F${retractFeedrate}`);

        //unretract slow
        commands.push(`G1 Z${0.2} F${slowRetractFeedrate}`);
      }
    }

  } else {
    commands.push(`G1 Z${drillingDepth} F${drillingFeedRate}`);
    commands.push(`G1 Z-${drillingDepth} F${retractFeedrate}`);
  }

  commands.push('G90'); //set to absolute positioning

  sender?.sendCommands(commands, SenderClient.QUICKTASKS);

}

function groovingTask() {
  alert('Not Yet Implemented');
}

function coneTask() {
  alert('Not Yet Implemented');
}

function boringTask() {
  alert('Not Yet Implemented');
}

function threadingTask() {
  const status = sender?.getStatus();
  if (!status || !status.isConnected) {
    alert('Please connect to the machine first');
    return;
  } else {
    if (status.version !== minimumVersion) {
      alert(`Threading is only supported on ${minimumVersion} controllers. Please see the help page for more information.`);
      return;
    } else {
      //get threading inputs
      const threadingSize = quickTaskThreadingSize.value;

      if (threadingSize === '') {
        alert('Please select a thread size');
        return;
      }

      const threadingDirection = quickTaskThreadingDirection.value as ThreadingDirection;
      const threadingExternalOrInternal = quickTaskThreadingExternalOrInternal.value as ThreadingType;
      const threadingLength = parseFloat(quickTaskThreadingLength.value);
      const threadingPasses = parseInt(quickTaskThreadingPasses.value, 10);

      //get threading spec
      const threadSpec = Threading.getThreadSpecByName(threadingSize) as ThreadSpec;

      const gcode = Threading.generateThreadingGcode(threadSpec, threadingExternalOrInternal, threadingDirection, threadingLength, threadingPasses);

      const commands: string[] = [];
      commands.push('G90'); //set to absolute positioning
      commands.push(gcode);
      sender?.sendCommands(commands, SenderClient.QUICKTASKS);
    }
  }
}

function toolOffsetsTask() {

  const status = sender?.getStatus();
  if (!status || !status.isConnected) {
    alert('Please connect to the machine first');
    return;
  } else {
    if (status.version !== minimumVersion) {
      alert(`Tool offsets is only supported on ${minimumVersion} controllers. Please see the help page for more information.`);
      return;
    }
  }


  //is user enters T1 instead of 1, strip the T
  let toolNumberValue = quickTaskToolOffsetsToolNumber.value;

  //if no tool number is entered, send error and return
  if (toolNumberValue === '') {
    alert('Please enter a tool number');
    return;
  }

  if (toolNumberValue[0] === 'T') {
    toolNumberValue = toolNumberValue.substring(1);
  }

  //if tool number is zero, send error and return
  if (parseInt(toolNumberValue, 10) === 0) {
    alert('T0 is the primary tool and cannot be modified');
    return;
  }

  let valuesProvided = "XZ";
  //determine if X and Z values are provided
  if (quickTaskToolOffsetsOffsetX.value === '') {
    valuesProvided = valuesProvided.replace('X', '');
  }
  if (quickTaskToolOffsetsOffsetZ.value === '') {
    valuesProvided = valuesProvided.replace('Z', '');
  }

  //if no values are provided, send error and return
  if (valuesProvided === '') {
    alert('Please enter X and/or Z values');
    return;
  }

  //save the probe diameter to local storage
  localStorage.setItem('probeDiameter', quickTaskToolOffsetsProbeDiameter.value);


  let commands: string[] = [];

  const probeRadius = parseFloat(quickTaskToolOffsetsProbeDiameter.value) / 2;

  if (quickTaskToolOffsetsToolType.value.startsWith('External')) { //Turning tools

    const offsets: ToolOffset = {
      x: parseFloat(quickTaskToolOffsetsOffsetX.value),
      z: parseFloat(quickTaskToolOffsetsOffsetZ.value),
      radius: probeRadius,
      toolType: 'External'
    };

    const calculatedOffsets = calculateToolOffsets(offsets);

    //if only X value is provided omit Z value
    if (valuesProvided === 'X') {
      commands.push(`G10 P${toolNumberValue} X${calculatedOffsets.x}`);
    } else if (valuesProvided === 'Z') {
      commands.push(`G10 P${toolNumberValue} Z${calculatedOffsets.z}`);
    } else {
      commands.push(`G10 P${toolNumberValue} X${calculatedOffsets.x} Z${calculatedOffsets.z}`);
    }

  } else if (quickTaskToolOffsetsToolType.value.startsWith('Internal')) { //Boring tools

    const offsets: ToolOffset = {
      x: parseFloat(quickTaskToolOffsetsOffsetX.value),
      z: parseFloat(quickTaskToolOffsetsOffsetZ.value),
      radius: probeRadius,
      toolType: 'Internal'
    };

    const calculatedOffsets = calculateToolOffsets(offsets);

    //if only X value is provided omit Z value
    if (valuesProvided === 'X') {
      commands.push(`G10 P${toolNumberValue} X${calculatedOffsets.x}`);
    } else if (valuesProvided === 'Z') {
      commands.push(`G10 P${toolNumberValue} Z${calculatedOffsets.z}`);
    } else {
      commands.push(`G10 P${toolNumberValue} X${calculatedOffsets.x} Z${calculatedOffsets.z}`);
    }

  } else { //Drill tools

    const offsets: ToolOffset = {
      x: parseFloat(quickTaskToolOffsetsOffsetX.value),
      z: parseFloat(quickTaskToolOffsetsOffsetZ.value),
      radius: probeRadius,
      toolType: 'Drill'
    };

    const calculatedOffsets = calculateToolOffsets(offsets);

    //if only X value is provided omit Z value
    if (valuesProvided === 'X') {
      commands.push(`G10 P${toolNumberValue} X${calculatedOffsets.x}`);
    } else if (valuesProvided === 'Z') {
      commands.push(`G10 P${toolNumberValue} Z${calculatedOffsets.z}`);
    } else {
      commands.push(`G10 P${toolNumberValue} X${calculatedOffsets.x} Z${calculatedOffsets.z}`);
    }
  }

  //send commands
  sender?.sendCommands(commands, SenderClient.QUICKTASKS);

  //Alert user that tool offsets have been set

  alert(`Tool offsets for T${toolNumberValue} have been set`);
}

interface ToolOffset {
  x: number;
  z: number;
  radius: number;
  toolType: 'External' | 'Internal' | 'Drill'
}

interface CalculatedOffset {
  x: number;
  z: number;
}

function calculateToolOffsets(input: ToolOffset): CalculatedOffset {
  let xOffset: number;

  switch (input.toolType) {
    case 'Drill':
      // For drills: simply reverse the X value from controller
      xOffset = -input.x;
      break;

    case 'Internal':
      // For boring bars: compensate from back of probe
      xOffset = -(input.x - input.radius);
      break;

    case 'External':
      // For turning tools: compensate from front of probe
      xOffset = -(input.x - (-input.radius));
      break;
  }

  // Z offset is always simply reversed
  const zOffset = -input.z;

  const roundToThree = (num: number): number => {
    return Math.round(num * 1000) / 1000;
  };

  return {
    x: roundToThree(xOffset),
    z: roundToThree(zOffset)
  };
}