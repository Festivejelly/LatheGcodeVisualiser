import { Sender, SenderClient } from './sender';
import { Threading, type ThreadingType, type ThreadSpec , type ThreadingDirection} from './threading';


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

//Threading
const quickTaskThreadingType = document.getElementById('quickTaskThreadingType') as HTMLSelectElement;
const quickTaskThreadingSize = document.getElementById('quickTaskThreadingSize') as HTMLSelectElement;
const quickTaskThreadingDirection = document.getElementById('quickTaskThreadingDirection') as HTMLSelectElement;
const quickTaskThreadingExternalOrInternal = document.getElementById('quickTaskThreadingExternalOrInternal') as HTMLSelectElement;
const quickTaskThreadingLength = document.getElementById('quickTaskThreadingLength') as HTMLInputElement;

document.addEventListener("DOMContentLoaded", () => {

  let activeQuickTaskConfig: { modal: HTMLDivElement, openButton: HTMLButtonElement, closeButton: HTMLButtonElement, executeButton: HTMLButtonElement, stopButton: HTMLButtonElement, progressBar: HTMLProgressElement, taskFunction: () => void };
  sender = Sender.getInstance();
  sender.addStatusChangeListener(() => handleStatusChange(), SenderClient.QUICKTASKS);

  //Connect button
  const connectButton = document.getElementById('connectButton') as HTMLButtonElement;

  // Quick task open buttons
  Object.keys(quickTaskConfig).forEach(taskId => {
    const config = quickTaskConfig[taskId];
    const openButton = quickTaskConfig[taskId].openButton;
    openButton.addEventListener('click', () => {
      if (!sender?.isConnected()) {
        alert('Please connect to the machine first');
      } else {
        activeQuickTaskConfig = config;
        config.modal.style.display = 'block';
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

  const probeDiameter = localStorage.getItem('probeDiameter');
  if (probeDiameter) {
    (document.getElementById('toolOffsetsProbeDiameter') as HTMLInputElement).value = probeDiameter;
  }

  //Facing
  const facingMovementType = document.getElementById('quickTaskFacingMovementType') as HTMLSelectElement;

  //if movement type is set to Absolute then hide quickTaskFacingDepthContainer
  facingMovementType.addEventListener('change', () => {
    if (facingMovementType.value === 'Absolute') {
      document.getElementById('quickTaskFacingDepthContainer')!.style.display = 'none';
    } else {
      document.getElementById('quickTaskFacingDepthContainer')!.style.display = 'block';
    }
  });

  //Profiling
  const quickTaskProfilingType = document.getElementById('quickTaskProfilingType') as HTMLSelectElement;

  //if profiling type is set to Absolute then hide quickTaskProfilingDepthContainer
  quickTaskProfilingType.addEventListener('change', () => {
    if (quickTaskProfilingType.value === 'Absolute') {
      document.getElementById('quickTaskProfilingDepthContainer')!.style.display = 'none';
      document.getElementById('quickTaskProfilingFinalDiameterContainer')!.style.display = 'block';
    } else {
      document.getElementById('quickTaskProfilingDepthContainer')!.style.display = 'block';
      document.getElementById('quickTaskProfilingFinalDiameterContainer')!.style.display = 'none';
    }
  });

  const finalDiameter = document.getElementById('quickTaskProfilingFinalDiameter') as HTMLInputElement;
  const profilingDepth = document.getElementById('quickTaskProfilingDepth') as HTMLInputElement;



  // Update on input for number of passes
  if (finalDiameter) {
    finalDiameter.addEventListener('input', () => updateNumberOfPasses('Absolute'));
  }

  if (profilingDepth) {
    profilingDepth.addEventListener('input', () => updateNumberOfPasses('Relative'));
  }

  async function updateNumberOfPasses(movementType: string) {

    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);

    const startPosX = latestStatus?.x!;

    const depthPerPass = document.getElementById('quickTaskProfilingDepthPerPass') as HTMLInputElement;
    const finishingPass = document.getElementById('quickTaskProfilingFinishingDepth') as HTMLInputElement;
    const profilingPasses = document.getElementById('quickTaskProfilingPasses') as HTMLInputElement;

    let totalDepth: number;
    if (movementType === 'Absolute') {
      const finalDiameter = document.getElementById('quickTaskProfilingFinalDiameter') as HTMLInputElement;
      totalDepth = Math.abs(startPosX - (-parseFloat(finalDiameter.value) / 2));
    } else {
      const profilingDepth = document.getElementById('quickTaskProfilingDepth') as HTMLInputElement;
      totalDepth = Math.abs(startPosX - (-parseFloat(profilingDepth.value)));
    }

    const mainPassDepth = parseFloat(depthPerPass.value);
    const finishingPassDepth = parseFloat(finishingPass.value);

    if (mainPassDepth <= 0 || finishingPassDepth <= 0) {
      console.error('Invalid pass depths');
      return;
    }

    // Calculate main passes needed
    const depthForMainPasses = totalDepth - finishingPassDepth;
    const mainPasses = Math.floor(depthForMainPasses / mainPassDepth);

    if (mainPasses <= 0) {
      console.error('Depth too small for main passes');
      return;
    }

    // Adjust the main pass depth to evenly distribute any remainder
    const adjustedMainPassDepth = (depthForMainPasses / mainPasses).toFixed(3);

    // Update the depth per pass input with the adjusted value
    depthPerPass.value = adjustedMainPassDepth;

    // Total passes is main passes plus one finishing pass
    const totalPasses = mainPasses + 1;
    profilingPasses.value = totalPasses.toString();
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



function profilingTask() {

  //profiling modal inputs
  const profilingLength = parseFloat((document.getElementById('quickTaskProfilingLength') as HTMLInputElement).value);
  const profilingPasses = parseInt((document.getElementById('quickTaskProfilingPasses') as HTMLInputElement).value, 10);
  const feedRate = parseFloat((document.getElementById('quickTaskProfilingFeedRate') as HTMLInputElement).value);
  const retractFeedrate = 200;

  const profilingDepth = document.getElementById('quickTaskProfilingDepth') as HTMLInputElement;
  const finalDiameter = document.getElementById('quickTaskProfilingFinalDiameter') as HTMLInputElement;

  //get profiling type
  const profilingType = (document.getElementById('quickTaskProfilingType') as HTMLInputElement).value;

  const startPosX = sender?.getStatus().x!;
  const startPosZ = sender?.getStatus().z!;

  const commands: string[] = [];

  if (profilingType === 'Absolute') {

    commands.push('G91'); //set to relative positioning

    //work out the depth of each cut to final diameter
    const depthRadius = parseFloat(finalDiameter.value) / 2;
    const depthPerPass = (startPosX - depthRadius) / profilingPasses;

    for (let i = 0; i < profilingPasses; i++) {

      //cutting move x
      commands.push(`G1 X${depthPerPass} F${feedRate}`);
      //cutting move Z
      commands.push(`G1 Z${profilingLength} F${feedRate}`);
      //retract move
      commands.push(`G1 X-${depthPerPass} F${retractFeedrate}`);
      //retract move
      commands.push(`G1 Z-${profilingLength} F${retractFeedrate}`);
      //unretract X
      commands.push(`G1 X${depthPerPass} F${retractFeedrate}`);
    }
  } else {

    commands.push('G91'); //set to relative positioning

    //work out the depth of each cut to final diameter
    const depthPerPass = (startPosX - parseFloat(profilingDepth.value) / profilingPasses);

    for (let i = 0; i < profilingPasses; i++) {
      //cutting move x
      commands.push(`G1 X${depthPerPass} F${feedRate}`);
      //cutting move Z
      commands.push(`G1 Z${profilingLength} F${feedRate}`);
      //retract move
      commands.push(`G1 X-${depthPerPass} F${retractFeedrate}`);
      //retract move
      commands.push(`G1 Z-${profilingLength} F${retractFeedrate}`);
      //unretract X
      commands.push(`G1 X${depthPerPass} F${retractFeedrate}`);
    }

  }

  commands.push('G90'); // Set to absolute positioning

  //more back to zero position
  commands.push(`G0 Z${startPosZ} X${startPosX} F${retractFeedrate}`);

  sender?.sendCommands(commands, SenderClient.QUICKTASKS);
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
      const threadingExternalOrInternal = quickTaskThreadingExternalOrInternal.value  as ThreadingType;
      const threadingLength = parseFloat(quickTaskThreadingLength.value);

      //get threading spec
      const threadSpec = Threading.getThreadSpecByName(threadingSize) as ThreadSpec;

      const gcode = Threading.generateThreadingGcode(threadSpec, threadingExternalOrInternal, threadingDirection, threadingLength);

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

  const toolNumber = document.getElementById('toolOffsetsToolNumber') as HTMLInputElement;

  //is user enters T1 instead of 1, strip the T
  let toolNumberValue = toolNumber.value;

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

  const toolType = document.getElementById('toolOffsetsToolType') as HTMLSelectElement;
  const offsetX = document.getElementById('toolOffsetsXValue') as HTMLInputElement;
  const offsetZ = document.getElementById('toolOffsetsZValue') as HTMLInputElement;
  const probeDiameter = document.getElementById('toolOffsetsProbeDiameter') as HTMLInputElement;

  let valuesProvided = "XZ";
  //determine if X and Z values are provided
  if (offsetX.value === '') {
    valuesProvided = valuesProvided.replace('X', '');
  }
  if (offsetZ.value === '') {
    valuesProvided = valuesProvided.replace('Z', '');
  }

  //if no values are provided, send error and return
  if (valuesProvided === '') {
    alert('Please enter X and/or Z values');
    return;
  }

  //save the probe diameter to local storage
  localStorage.setItem('probeDiameter', probeDiameter.value);


  let commands: string[] = [];

  const probeRadius = parseFloat(probeDiameter.value) / 2;

  if (toolType.value.startsWith('External')) { //Turning tools

    const offsets: ToolOffset = {
      x: parseFloat(offsetX.value),
      z: parseFloat(offsetZ.value),
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

  } else if (toolType.value.startsWith('Internal')) { //Boring tools

    const offsets: ToolOffset = {
      x: parseFloat(offsetX.value),
      z: parseFloat(offsetZ.value),
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
      x: parseFloat(offsetX.value),
      z: parseFloat(offsetZ.value),
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