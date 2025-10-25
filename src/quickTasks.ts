import { Sender, SenderClient } from './sender';
import { Threading, type ThreadingType, type ThreadSpec, type ThreadingDirection } from './threading';


let sender: Sender | null;
let minimumVersion = 'H4V12FJ';

const quickTaskConfig: { [key: string]: { modal: HTMLDivElement, openButton: HTMLButtonElement, closeButton: HTMLButtonElement, executeButton: HTMLButtonElement, stopButton: HTMLButtonElement, progressBar: HTMLProgressElement, taskFunction: () => Promise<void> } } = {
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
const quickTaskFacingTravelFeedRate = document.getElementById('quickTaskFacingTravelFeedRate') as HTMLInputElement;

const quickTaskFacingEndDiameter = document.getElementById('quickTaskFacingEndDiameter') as HTMLInputElement;
const quickTaskFacingFeedrate = document.getElementById('quickTaskFacingFeedrate') as HTMLInputElement;
const quickTaskFacingCopyToClipboardButton = document.getElementById('quickTaskFacingCopyToClipboardButton') as HTMLButtonElement;
const quickTaskFacingUsePecking = document.getElementById('quickTaskFacingUsePecking') as HTMLInputElement;
const quickTaskFacingPeckingDepth = document.getElementById('quickTaskFacingPeckingDepth') as HTMLInputElement;
const quickTaskFacingPeckingDepthContainer = document.getElementById('quickTaskFacingPeckingDepthContainer') as HTMLDivElement;
const quickTaskFacingPeckingRetractionRate = document.getElementById('quickTaskFacingPeckingRetractionRate') as HTMLInputElement;
const quickTaskFacingCurrentPosition = document.getElementById('quickTaskFacingCurrentPosition') as HTMLInputElement;
const quickTaskFacingRefreshPositionButton = document.getElementById('quickTaskFacingRefreshPositionButton') as HTMLButtonElement;
const quickTaskFacingXStartPosition = document.getElementById('quickTaskFacingXStartPosition') as HTMLInputElement;
const quickTaskFacingZStartPosition = document.getElementById('quickTaskFacingZStartPosition') as HTMLInputElement;

//Profiling
const quickTaskProfilingFinalDiameter = document.getElementById('quickTaskProfilingFinalDiameter') as HTMLInputElement;
const quickTaskProfilingDepth = document.getElementById('quickTaskProfilingDepth') as HTMLInputElement;
const quickTaskProfilingFeedRate = document.getElementById('quickTaskProfilingFeedRate') as HTMLInputElement;
const quickTaskProfilingRetractFeedRate = document.getElementById('quickTaskProfilingRetractFeedRate') as HTMLInputElement;
const quickTaskProfilingDepthPerPass = document.getElementById('quickTaskProfilingDepthPerPass') as HTMLInputElement;
const quickTaskProfilingFinishingDepth = document.getElementById('quickTaskProfilingFinishingDepth') as HTMLInputElement;
const quickTaskProfilingPasses = document.getElementById('quickTaskProfilingPasses') as HTMLInputElement;
const quickTaskProfilingType = document.getElementById('quickTaskProfilingType') as HTMLSelectElement;
const quickTaskProfilingFinalDiameterContainer = document.getElementById('quickTaskProfilingFinalDiameterContainer') as HTMLDivElement;
const quickTaskProfilingDepthContainer = document.getElementById('quickTaskProfilingDepthContainer') as HTMLDivElement;
const quickTaskProfilingCopyToClipboardButton = document.getElementById('quickTaskProfilingCopyToClipboardButton') as HTMLButtonElement;
const quickTaskProfilingRefreshPositionButton = document.getElementById('quickTaskProfilingRefreshPositionButton') as HTMLButtonElement;
const quickTaskProfilingCurrentPosition = document.getElementById('quickTaskProfilingCurrentPosition') as HTMLInputElement;
const quickTaskProfilingXStartPosition = document.getElementById('quickTaskProfilingXStartPosition') as HTMLInputElement;
const quickTaskProfilingZStartPosition = document.getElementById('quickTaskProfilingZStartPosition') as HTMLInputElement;

//Drilling
const quickTaskDrillingDepth = document.getElementById('quickTaskDrillingDepth') as HTMLInputElement;
const quickTaskDrillingFeedRate = document.getElementById('quickTaskDrillingFeedRate') as HTMLInputElement;
const quickTaskDrillingRetractFeedRate = document.getElementById('quickTaskDrillingRetractFeedRate') as HTMLInputElement;
const quickTaskDrillingPeckCheckbox = document.getElementById('quickTaskDrillingPeckCheckbox') as HTMLInputElement;
const quickTaskDrillingPeckingDepthContainer = document.getElementById('quickTaskDrillingPeckingDepthContainer') as HTMLDivElement;
const quickTaskDrillingPeckingDepth = document.getElementById('quickTaskDrillingPeckingDepth') as HTMLInputElement;
const quickTaskDrillingCopyToClipboardButton = document.getElementById('quickTaskDrillingCopyToClipboardButton') as HTMLButtonElement;
const quickTaskDrillingCurrentPosition = document.getElementById('quickTaskDrillingCurrentPosition') as HTMLInputElement;
const quickTaskDrillingRefreshPositionButton = document.getElementById('quickTaskDrillingRefreshPositionButton') as HTMLButtonElement;
const quickTaskDrillingZStartPosition = document.getElementById('quickTaskDrillingZStartPosition') as HTMLInputElement;

//Threading
const quickTaskThreadingType = document.getElementById('quickTaskThreadingType') as HTMLSelectElement;
const quickTaskThreadingSize = document.getElementById('quickTaskThreadingSize') as HTMLSelectElement;
const quickTaskThreadingDirection = document.getElementById('quickTaskThreadingDirection') as HTMLSelectElement;
const quickTaskThreadingExternalOrInternal = document.getElementById('quickTaskThreadingExternalOrInternal') as HTMLSelectElement;
const quickTaskThreadingLength = document.getElementById('quickTaskThreadingLength') as HTMLInputElement;
const quickTaskThreadingPasses = document.getElementById('quickTaskThreadingPasses') as HTMLInputElement;
const quickTaskThreadingCopyToClipboardButton = document.getElementById('quickTaskThreadingCopyToClipboardButton') as HTMLButtonElement;
const quickTaskThreadingMaxFirstPassDepth = document.getElementById('quickTaskThreadingMaxFirstPassDepth') as HTMLInputElement;

//Boring
const quickTaskBoringDepth = document.getElementById('quickTaskBoringDepth') as HTMLInputElement;
const quickTaskBoringDepthOfCut = document.getElementById('quickTaskBoringDepthOfCut') as HTMLInputElement;
const quickTaskBoringFeedRate = document.getElementById('quickTaskBoringFeedRate') as HTMLInputElement;
const quickTaskBoringRetractFeedRate = document.getElementById('quickTaskBoringRetractFeedRate') as HTMLInputElement;
const quickTaskBoringType = document.getElementById('quickTaskBoringType') as HTMLSelectElement;
const quickTaskBoringFinalDiameterContainer = document.getElementById('quickTaskBoringFinalDiameterContainer') as HTMLDivElement;
const quickTaskBoringDepthOfCutContainer = document.getElementById('quickTaskBoringDepthOfCutContainer') as HTMLDivElement;
const quickTaskBoringFinalDiameter = document.getElementById('quickTaskBoringFinalDiameter') as HTMLInputElement;
const quickTaskBoringDepthPerPass = document.getElementById('quickTaskBoringDepthPerPass') as HTMLInputElement;
const quickTaskBoringFinishingDepth = document.getElementById('quickTaskBoringFinishingDepth') as HTMLInputElement;
const quickTaskBoringPasses = document.getElementById('quickTaskBoringPasses') as HTMLInputElement;
const quickTaskBoringCopyToClipboardButton = document.getElementById('quickTaskBoringCopyToClipboardButton') as HTMLButtonElement;
const quickTaskBoringRefreshPositionButton = document.getElementById('quickTaskBoringRefreshPositionButton') as HTMLButtonElement;
const quickTaskBoringCurrentPosition = document.getElementById('quickTaskBoringCurrentPosition') as HTMLInputElement;
const quickTaskBoringXStartPosition = document.getElementById('quickTaskBoringXStartPosition') as HTMLInputElement;
const quickTaskBoringZStartPosition = document.getElementById('quickTaskBoringZStartPosition') as HTMLInputElement;

//Tool offsets
const quickTaskToolOffsetsProbeDiameter = document.getElementById('quickTaskToolOffsetsProbeDiameter') as HTMLInputElement;
const quickTaskToolOffsetsToolNumber = document.getElementById('quickTaskToolOffsetsToolNumber') as HTMLSelectElement;
const quickTaskToolOffsetsToolType = document.getElementById('quickTaskToolOffsetsToolType') as HTMLSelectElement;
const quickTaskToolOffsetsOffsetX = document.getElementById('quickTaskToolOffsetsOffsetX') as HTMLInputElement;
const quickTaskToolOffsetsOffsetZ = document.getElementById('quickTaskToolOffsetsOffsetZ') as HTMLInputElement;
const quickTaskToolOffsetGetXPosButton = document.getElementById('quickTaskToolOffsetGetXPosButton') as HTMLButtonElement;
const quickTaskToolOffsetGetZPosButton = document.getElementById('quickTaskToolOffsetGetZPosButton') as HTMLButtonElement;

document.addEventListener("DOMContentLoaded", () => {

  let activeQuickTaskConfig: { modal: HTMLDivElement, openButton: HTMLButtonElement, closeButton: HTMLButtonElement, executeButton: HTMLButtonElement, stopButton: HTMLButtonElement, progressBar: HTMLProgressElement, taskFunction: () => Promise<void> };
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

  let taskInProgress = false;

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
      let isConnected = sender?.isConnected();

      activeQuickTaskConfig = config;
      taskInProgress = false;

      //if its a cone task show an alert saying not implemented
      if (taskId === 'quickTaskCone' || taskId === 'quickTaskGrooving') {
        alert('Not Yet Implemented, coming soon!');
      } else if (taskId === 'quickTaskToolOffsets') {
        config.modal.style.display = 'none';
      } else {
        config.modal.style.display = 'block';
      }

      if (taskId === 'quickTaskProfiling') {
        //set current position to the current X and Z position
        //if not connected set position to 0,0
        if (!isConnected || !sender) {
          quickTaskProfilingCurrentPosition.value = `X: 0.000 Z: 0.000`;
          quickTaskProfilingXStartPosition.value = `0.000`;
        } else {
          const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
          const currentPosX = latestStatus?.x!;
          const currentPosZ = latestStatus?.z!;
          quickTaskProfilingCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
          quickTaskProfilingXStartPosition.value = currentPosX.toFixed(3);
          quickTaskProfilingZStartPosition.value = currentPosZ.toFixed(3);
        }
      }

      if (taskId === 'quickTaskFacing') {
        //set current position to the current X and Z position
        if (!isConnected || !sender) {
          quickTaskFacingCurrentPosition.value = `X: 0.000 Z: 0.000`;
          quickTaskFacingXStartPosition.value = `0.000`;
          quickTaskFacingZStartPosition.value = `0.000`;
        } else {
          const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
          const currentPosX = latestStatus?.x!;
          const currentPosZ = latestStatus?.z!;
          quickTaskFacingCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
          quickTaskFacingXStartPosition.value = currentPosX.toFixed(3);
          quickTaskFacingZStartPosition.value = currentPosZ.toFixed(3);
        }
      }

      if (taskId === 'quickTaskBoring') {
        //set current position to the current X and Z position
        if (!isConnected || !sender) {
          quickTaskBoringCurrentPosition.value = `X: 0.000 Z: 0.000`;
          quickTaskBoringXStartPosition.value = `0.000`;
        } else {
          const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
          const currentPosX = latestStatus?.x!;
          const currentPosZ = latestStatus?.z!;
          quickTaskBoringCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
          quickTaskBoringXStartPosition.value = currentPosX.toFixed(3);
        }
      }

      if (taskId === 'quickTaskDrilling') {
        //set current position to the current X and Z position
        if (!isConnected || !sender) {
          quickTaskDrillingCurrentPosition.value = `X: 0.000 Z: 0.000`;
          quickTaskDrillingZStartPosition.value = `0.000`;
        } else {
          const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
          const currentPosX = latestStatus?.x!;
          const currentPosZ = latestStatus?.z!;
          quickTaskDrillingCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
          quickTaskDrillingZStartPosition.value = currentPosZ.toFixed(3);
        }
      }

      //if task is tool offsets, populate the tool number select with the available tools
      if (taskId === 'quickTaskToolOffsets') {

        if (!isConnected || !sender) {
          alert('Please connect to the machine first');
          return;
        } else {

          config.modal.style.display = 'block';
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

            //clear tool offsets
            quickTaskToolOffsetsOffsetX.value = '';
            quickTaskToolOffsetsOffsetZ.value = '';

          }
        }
      }

    });

    // Execute button
    config.executeButton.addEventListener('click', async () => {
      //if not connected, show an alert
      if (!sender?.isConnected()) {
        alert('Please connect to the machine first');
        return;
      }
      taskInProgress = true;
      await config.taskFunction();
      taskInProgress = false;
    });

    // Stop button
    config.stopButton.addEventListener('click', () => {
      taskInProgress = false;
      sender?.stop();
    });

    // Close button
    config.closeButton.addEventListener('click', () => {
      taskInProgress = false;
      config.modal.style.display = 'none';
    });
  });

  //<---- Profiling event listeners ---->

  const checkProfilingFields = () => {
    // Enable button only if all required fields have values
    if ((quickTaskProfilingDepth.value || quickTaskBoringFinalDiameter) && quickTaskProfilingFeedRate.value && quickTaskProfilingRetractFeedRate.value && quickTaskProfilingPasses.value && quickTaskProfilingDepthPerPass.value && quickTaskProfilingFinishingDepth.value) {
      activeQuickTaskConfig.executeButton.disabled = false;
      activeQuickTaskConfig.executeButton.classList.remove('disabled-button');
      activeQuickTaskConfig.executeButton.classList.add('interaction-ready-button');
      quickTaskProfilingCopyToClipboardButton.disabled = false;
      quickTaskProfilingCopyToClipboardButton.classList.remove('disabled-button');
      quickTaskProfilingCopyToClipboardButton.classList.add('interaction-ready-button');
    } else {
      activeQuickTaskConfig.executeButton.disabled = true;
      activeQuickTaskConfig.executeButton.classList.add('disabled-button');
      activeQuickTaskConfig.executeButton.classList.remove('interaction-ready-button');
      quickTaskProfilingCopyToClipboardButton.disabled = true;
      quickTaskProfilingCopyToClipboardButton.classList.add('disabled-button');
      quickTaskProfilingCopyToClipboardButton.classList.remove('interaction-ready-button');
    }
  };

  quickTaskProfilingRefreshPositionButton.addEventListener('click', async () => {
    if (!sender?.isConnected()) {
      alert('Please connect to the machine first');
      return;
    }
    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
    const currentPosX = latestStatus?.x!;
    const currentPosZ = latestStatus?.z!;
    quickTaskProfilingCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
    quickTaskProfilingXStartPosition.value = currentPosX.toFixed(3);
    quickTaskProfilingZStartPosition.value = currentPosZ.toFixed(3);
  });

  quickTaskProfilingType.addEventListener('change', () => {
    if (quickTaskProfilingType.value === 'Absolute') {
      quickTaskProfilingDepthContainer!.style.display = 'none';
      quickTaskProfilingFinalDiameterContainer!.style.display = 'block';
    } else {
      quickTaskProfilingDepthContainer!.style.display = 'block';
      quickTaskProfilingFinalDiameterContainer!.style.display = 'none';
    }

    updateProfilingPassesFromDepthPerPass();
    updateProfilingDepthPerPassFromPasses();
    checkProfilingFields();
  });

  quickTaskProfilingFinalDiameter.addEventListener('input', () => {
    updateProfilingPassesFromDepthPerPass();
    updateProfilingDepthPerPassFromPasses();
    checkProfilingFields();
  });
  quickTaskProfilingDepth.addEventListener('input', () => {
    updateProfilingPassesFromDepthPerPass();
    updateProfilingDepthPerPassFromPasses();
    checkProfilingFields();
  });
  quickTaskProfilingPasses.addEventListener('input', () => {
    updateProfilingDepthPerPassFromPasses();
    checkProfilingFields();
  });
  quickTaskProfilingDepthPerPass.addEventListener('input', () => {
    updateProfilingPassesFromDepthPerPass();
    checkProfilingFields();
  });
  quickTaskProfilingFinishingDepth.addEventListener('input', () => {
    updateProfilingPassesFromDepthPerPass();
    updateProfilingDepthPerPassFromPasses();
    checkProfilingFields();
  });

  quickTaskProfilingCopyToClipboardButton.addEventListener('click', () => profilingTask(true));


  //<---- Facing event listeners ---->

  const checkFacingFields = () => {
    // Enable button only if all required fields have values
    if (quickTaskFacingEndDiameter.value && Number(quickTaskFacingFeedrate.value) > 0) {
      activeQuickTaskConfig.executeButton.disabled = false;
      activeQuickTaskConfig.executeButton.classList.remove('disabled-button');
      activeQuickTaskConfig.executeButton.classList.add('interaction-ready-button');
      quickTaskFacingCopyToClipboardButton.disabled = false;
      quickTaskFacingCopyToClipboardButton.classList.remove('disabled-button');
      quickTaskFacingCopyToClipboardButton.classList.add('interaction-ready-button');
    } else {
      activeQuickTaskConfig.executeButton.disabled = true;
      activeQuickTaskConfig.executeButton.classList.add('disabled-button');
      activeQuickTaskConfig.executeButton.classList.remove('interaction-ready-button');
      quickTaskFacingCopyToClipboardButton.disabled = true;
      quickTaskFacingCopyToClipboardButton.classList.add('disabled-button');
      quickTaskFacingCopyToClipboardButton.classList.remove('interaction-ready-button');
    }
  }

  quickTaskFacingRefreshPositionButton.addEventListener('click', async () => {
    if (!sender?.isConnected()) {
      alert('Please connect to the machine first');
      return;
    }
    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
    const currentPosX = latestStatus?.x!;
    const currentPosZ = latestStatus?.z!;
    quickTaskFacingCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
  });

  quickTaskFacingEndDiameter.addEventListener('input', checkFacingFields);
  quickTaskFacingFeedrate.addEventListener('input', checkFacingFields);
  quickTaskFacingTravelFeedRate.addEventListener('input', checkFacingFields);
  quickTaskFacingCopyToClipboardButton.addEventListener('click', () => facingTask(true));
  quickTaskFacingPeckingDepth.addEventListener('input', checkFacingFields);
  quickTaskFacingPeckingRetractionRate.addEventListener('input', checkFacingFields);

  quickTaskFacingUsePecking.addEventListener('change', () => {
    if (quickTaskFacingUsePecking.checked) {
      quickTaskFacingPeckingDepthContainer.style.display = 'block';
    } else {
      quickTaskFacingPeckingDepthContainer.style.display = 'none';
    }
  });

  //populate the stored values for the facing task
  const facingFeedrate = localStorage.getItem('facingFeedrate');
  if (facingFeedrate !== null) {
    quickTaskFacingFeedrate.value = facingFeedrate;
  }

  const facingEndDiameter = localStorage.getItem('facingEndDiameter');
  if (facingEndDiameter !== null) {
    quickTaskFacingEndDiameter.value = facingEndDiameter;
  }

  const facingTravelFeedRate = localStorage.getItem('facingTravelFeedRate');
  if (facingTravelFeedRate !== null) {
    quickTaskFacingTravelFeedRate.value = facingTravelFeedRate;
  }

  const facingPeckingDepth = localStorage.getItem('facingPeckingDepth');
  if (facingPeckingDepth !== null) {
    quickTaskFacingPeckingDepth.value = facingPeckingDepth;
  }

  const facingPeckingRetractionRate = localStorage.getItem('facingPeckingRetractionRate');
  if (facingPeckingRetractionRate !== null) {
    quickTaskFacingPeckingRetractionRate.value = facingPeckingRetractionRate;
  }

  const facingUsePecking = localStorage.getItem('facingUsePecking');
  if (facingUsePecking !== null) {
    quickTaskFacingUsePecking.checked = facingUsePecking === 'true';
    quickTaskFacingPeckingDepthContainer.style.display = quickTaskFacingUsePecking.checked ? 'block' : 'none';
  }


  //<---- Boring event listeners ---->

  const checkBoringFields = () => {
    // Get the current boring type
    const boringType = quickTaskBoringType.value;

    // Common required fields for both types
    const commonFieldsValid = quickTaskBoringDepth.value &&
      quickTaskBoringFeedRate.value &&
      quickTaskBoringRetractFeedRate.value &&
      quickTaskBoringPasses.value &&
      quickTaskBoringFinishingDepth.value;

    // Type-specific field validation
    let typeSpecificFieldValid = false;
    if (boringType === 'Absolute') {
      typeSpecificFieldValid = !!quickTaskBoringFinalDiameter.value;
    } else { // 'Relative'
      typeSpecificFieldValid = !!quickTaskBoringDepthOfCut.value;
    }

    // Enable/disable buttons based on validation result
    if (commonFieldsValid && typeSpecificFieldValid) {
      activeQuickTaskConfig.executeButton.disabled = false;
      activeQuickTaskConfig.executeButton.classList.remove('disabled-button');
      activeQuickTaskConfig.executeButton.classList.add('interaction-ready-button');
      quickTaskBoringCopyToClipboardButton.disabled = false;
      quickTaskBoringCopyToClipboardButton.classList.remove('disabled-button');
      quickTaskBoringCopyToClipboardButton.classList.add('interaction-ready-button');
    } else {
      activeQuickTaskConfig.executeButton.disabled = true;
      activeQuickTaskConfig.executeButton.classList.add('disabled-button');
      activeQuickTaskConfig.executeButton.classList.remove('interaction-ready-button');
      quickTaskBoringCopyToClipboardButton.disabled = true;
      quickTaskBoringCopyToClipboardButton.classList.add('disabled-button');
      quickTaskBoringCopyToClipboardButton.classList.remove('interaction-ready-button');
    }
  }

  quickTaskBoringRefreshPositionButton.addEventListener('click', async () => {
    //if not connected, show an alert
    if (!sender?.isConnected()) {
      alert('Please connect to the machine first');
      return;
    }
    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
    const currentPosX = latestStatus?.x!;
    const currentPosZ = latestStatus?.z!;
    quickTaskBoringCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
  });

  quickTaskBoringDepth.addEventListener('input', checkBoringFields);
  quickTaskBoringFeedRate.addEventListener('input', checkBoringFields);
  quickTaskBoringRetractFeedRate.addEventListener('input', checkBoringFields);


  quickTaskBoringType.addEventListener('change', () => {
    if (quickTaskBoringType.value === 'Absolute') {
      quickTaskBoringFinalDiameterContainer.style.display = 'block';
      quickTaskBoringDepthOfCutContainer.style.display = 'none';
    } else {
      quickTaskBoringFinalDiameterContainer.style.display = 'none';
      quickTaskBoringDepthOfCutContainer.style.display = 'block';
    }
    updatePassesFromDepthPerPass();
    updateDepthPerPassFromPasses();
    checkBoringFields();
  });

  quickTaskBoringFinalDiameter.addEventListener('input', () => {
    updatePassesFromDepthPerPass();
    updateDepthPerPassFromPasses();
    checkBoringFields();
  });
  quickTaskBoringDepthOfCut.addEventListener('input', () => {
    updatePassesFromDepthPerPass();
    updateDepthPerPassFromPasses();
    checkBoringFields();
  });
  quickTaskBoringPasses.addEventListener('input', () => {
    updateDepthPerPassFromPasses();
    checkBoringFields();
  });

  quickTaskBoringDepthPerPass.addEventListener('input', () => {
    updatePassesFromDepthPerPass();
    checkBoringFields()
  });

  quickTaskBoringFinishingDepth.addEventListener('input', () => {
    updatePassesFromDepthPerPass();
    updateDepthPerPassFromPasses();
    checkBoringFields()
  });

  quickTaskBoringCopyToClipboardButton.addEventListener('click', () => boringTask(true));

  //<---- drilling event listeners ---->
  quickTaskDrillingPeckCheckbox.addEventListener('change', () => {
    if (quickTaskDrillingPeckCheckbox.checked) {
      quickTaskDrillingPeckingDepthContainer.style.display = 'block';
    } else {
      quickTaskDrillingPeckingDepthContainer.style.display = 'none';
    }
  });

  const checkDrillingFields = () => {
    // Enable button only if all required fields have values
    if (quickTaskDrillingDepth.value && quickTaskDrillingFeedRate.value && quickTaskDrillingRetractFeedRate.value) {
      activeQuickTaskConfig.executeButton.disabled = false;
      activeQuickTaskConfig.executeButton.classList.remove('disabled-button');
      activeQuickTaskConfig.executeButton.classList.add('interaction-ready-button');
      quickTaskDrillingCopyToClipboardButton.disabled = false;
      quickTaskDrillingCopyToClipboardButton.classList.remove('disabled-button');
      quickTaskDrillingCopyToClipboardButton.classList.add('interaction-ready-button');
    } else {
      activeQuickTaskConfig.executeButton.disabled = true;
      activeQuickTaskConfig.executeButton.classList.add('disabled-button');
      activeQuickTaskConfig.executeButton.classList.remove('interaction-ready-button');
      quickTaskDrillingCopyToClipboardButton.disabled = true;
      quickTaskDrillingCopyToClipboardButton.classList.add('disabled-button');
      quickTaskDrillingCopyToClipboardButton.classList.remove('interaction-ready-button');
    }
  }

  quickTaskDrillingRefreshPositionButton.addEventListener('click', async () => {

    if (!sender?.isConnected()) {
      alert('Please connect to the machine first');
      return;
    }
    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
    const currentPosX = latestStatus?.x!;
    const currentPosZ = latestStatus?.z!;
    quickTaskDrillingCurrentPosition.value = `X: ${currentPosX.toFixed(3)} Z: ${currentPosZ.toFixed(3)}`;
    quickTaskDrillingZStartPosition.value = currentPosZ.toFixed(3);
  });

  quickTaskDrillingDepth.addEventListener('input', checkDrillingFields);
  quickTaskDrillingFeedRate.addEventListener('input', checkDrillingFields);
  quickTaskDrillingRetractFeedRate.addEventListener('input', checkDrillingFields);

  quickTaskDrillingCopyToClipboardButton.addEventListener('click', () => drillingTask(true));


  //<---- Threading event listeners ---->
  quickTaskThreadingSize.addEventListener('change', () => {
    calculateThreadDepthPerPass();
  });

  quickTaskThreadingMaxFirstPassDepth.addEventListener('input', () => {
    calculateThreadDepthPerPass();
    checkThreadingFields();
  });

  const calculateThreadDepthPerPass = () => {
    const threadSpec = Threading.getThreadSpecByName(quickTaskThreadingSize.value) as ThreadSpec;
    const threadingExternalOrInternal = quickTaskThreadingExternalOrInternal.value as ThreadingType;
    var maxFirstPassDepth = quickTaskThreadingMaxFirstPassDepth.value ? parseFloat(quickTaskThreadingMaxFirstPassDepth.value) : 0.3; //default to 0.3mm if not set

    //if no threadspec is selected, return
    if (!threadSpec) {
      quickTaskThreadingPasses.value = '';
      return;
    }

    //calculate number of passes assuming 0.1mm per pass
    const defaultPasses = threadSpec.getNumberOfPasses(threadingExternalOrInternal, maxFirstPassDepth);

    quickTaskThreadingPasses.value = defaultPasses.toString();
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

  const checkThreadingFields = () => {
    // Enable button only if all required fields have values
    if (quickTaskThreadingSize.value && quickTaskThreadingLength.value && quickTaskThreadingPasses.value && quickTaskThreadingMaxFirstPassDepth.value) {
      activeQuickTaskConfig.executeButton.disabled = false;
      activeQuickTaskConfig.executeButton.classList.remove('disabled-button');
      activeQuickTaskConfig.executeButton.classList.add('interaction-ready-button');
      quickTaskThreadingCopyToClipboardButton.disabled = false;
      quickTaskThreadingCopyToClipboardButton.classList.remove('disabled-button');
      quickTaskThreadingCopyToClipboardButton.classList.add('interaction-ready-button');
    } else {
      quickTaskThreadingCopyToClipboardButton.disabled = true;
      quickTaskThreadingCopyToClipboardButton.classList.add('disabled-button');
      quickTaskThreadingCopyToClipboardButton.classList.remove('interaction-ready-button');
      activeQuickTaskConfig.executeButton.disabled = true;
      activeQuickTaskConfig.executeButton.classList.add('disabled-button');
      activeQuickTaskConfig.executeButton.classList.remove('interaction-ready-button');
    }
  }

  quickTaskThreadingSize.addEventListener('change', checkThreadingFields);
  quickTaskThreadingLength.addEventListener('input', checkThreadingFields);
  quickTaskThreadingPasses.addEventListener('input', checkThreadingFields);
  quickTaskThreadingType.addEventListener('change', updateThreadSizes);
  quickTaskThreadingCopyToClipboardButton.addEventListener('click', () => threadingTask(true));

  //call on page load
  updateThreadSizes();

  //<---- Tool offset event listeners ---->
  const localStorageProbeDiameter = localStorage.getItem('probeDiameter');

  if (localStorageProbeDiameter !== null) {
    quickTaskToolOffsetsProbeDiameter.value = localStorageProbeDiameter;
  }

  quickTaskToolOffsetGetXPosButton.addEventListener('click', async () => {
    if (!sender?.isConnected()) {
      alert('Please connect to the machine first');
      return;
    }
    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
    const currentPosX = latestStatus?.x!;
    quickTaskToolOffsetsOffsetX.value = currentPosX.toFixed(3);
  });

  quickTaskToolOffsetGetZPosButton.addEventListener('click', async () => {
    if (!sender?.isConnected()) {
      alert('Please connect to the machine first');
      return;
    }
    const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
    const currentPosZ = latestStatus?.z!;
    quickTaskToolOffsetsOffsetZ.value = currentPosZ.toFixed(3);
  });

  //<---- Populate default retract values from local storage ---->
  const drillingRetractFeedRate = localStorage.getItem('drillingRetractFeedRate');
  if (drillingRetractFeedRate !== null) {
    quickTaskDrillingRetractFeedRate.value = drillingRetractFeedRate;
  }

  const boringRetractFeedrate = localStorage.getItem('boringRetractFeedrate');
  if (boringRetractFeedrate !== null) {
    quickTaskBoringRetractFeedRate.value = boringRetractFeedrate;
  }

  const profilingRetractFeedrate = localStorage.getItem('profilingRetractFeedrate');
  if (profilingRetractFeedrate !== null) {
    quickTaskProfilingRetractFeedRate.value = profilingRetractFeedrate;
  }

  //<---- Populate default feed values from local storage ---->
  const drillingFeedRate = localStorage.getItem('drillingFeedRate');
  if (drillingFeedRate !== null) {
    quickTaskDrillingFeedRate.value = drillingFeedRate;
  }

  const boringFeedRate = localStorage.getItem('boringFeedRate');
  if (boringFeedRate !== null) {
    quickTaskBoringFeedRate.value = boringFeedRate;
  }

  const profilingFeedRate = localStorage.getItem('profilingFeedRate');
  if (profilingFeedRate !== null) {
    quickTaskProfilingFeedRate.value = profilingFeedRate;
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
    const isStreaming = sender.isStreaming();
    const busy = isRun || isStreaming;

    if (!busy && !taskInProgress) {

      //show execute button
      activeQuickTaskConfig.executeButton.style.display = 'flex';

      //hide stop button
      activeQuickTaskConfig.stopButton.style.display = 'none';

      //reset progress bar
      activeQuickTaskConfig.progressBar.value = 0;

      //hide the parent div of the progress slider
      activeQuickTaskConfig.progressBar.parentElement!.style.display = 'none';

    } else {

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
async function profilingTask(copyToClipboard = false) {

  const isConnected = sender?.isConnected();

  const startPosX = parseFloat(quickTaskProfilingXStartPosition.value);
  const startPosZ = parseFloat(quickTaskProfilingZStartPosition.value);

  if (isNaN(startPosX) || isNaN(startPosZ)) {
    alert('Please enter a valid starting position');
    return;
  }

  // Profiling modal inputs with precise handling
  const profilingLength = Number(parseFloat((document.getElementById('quickTaskProfilingLength') as HTMLInputElement).value).toFixed(3));
  const profilingPasses = parseInt(quickTaskProfilingPasses.value, 10);
  const feedRate = Number(parseFloat(quickTaskProfilingFeedRate.value).toFixed(3));
  const retractFeedrate = Number(parseFloat(quickTaskProfilingRetractFeedRate.value).toFixed(3));
  const profilingType = quickTaskProfilingType.value;

  localStorage.setItem('profilingRetractFeedrate', retractFeedrate.toString());
  localStorage.setItem('profilingFeedRate', feedRate.toString());

  const commands: string[] = [];

  // Set initial position
  commands.push(`G90`); // Set to absolute positioning
  commands.push(`G1 X${startPosX} F100 ; move to start position`);
  commands.push(`G1 Z${startPosZ} F100 ; move to start position`);
  commands.push('G91'); // Set to relative positioning

  // Calculate target position and total depth required with exact precision
  let targetX = 0;
  let totalRequired = 0;

  if (profilingType === 'Absolute') {
    // For absolute, calculate based on final diameter
    const profilingFinalDiameter = Number(parseFloat(quickTaskProfilingFinalDiameter.value).toFixed(3));
    targetX = -profilingFinalDiameter / 2; // X position for the final diameter
    totalRequired = Math.abs(targetX - startPosX);
    totalRequired = Number(totalRequired.toFixed(3));
  } else {
    // For relative, use the specified depth
    totalRequired = Number(parseFloat(quickTaskProfilingDepth.value).toFixed(3));
  }

  // Get finishing depth - this will be used for the last pass
  let finishingDepth = Number(parseFloat(quickTaskProfilingFinishingDepth.value).toFixed(3));

  // Ensure finishing depth doesn't exceed total required depth
  if (finishingDepth > totalRequired) {
    finishingDepth = totalRequired;
  }

  // Calculate roughing depth
  const roughingDepth = Number((totalRequired - finishingDepth).toFixed(3));

  // Calculate depth per roughing pass with high precision
  let depthPerRoughingPass = 0;
  if (profilingPasses > 1) {
    if (finishingDepth > 0) {
      // If there's a finishing pass, we need to account for it
      depthPerRoughingPass = roughingDepth / (profilingPasses - 1);
    } else {
      depthPerRoughingPass = roughingDepth / (profilingPasses);
    }
    depthPerRoughingPass = Number(depthPerRoughingPass.toFixed(3));
  } else if (profilingPasses === 1) {
    depthPerRoughingPass = roughingDepth;
  }

  // Track the total depth cut with high precision
  let totalCut = 0;

  // Execute roughing passes

  let cuttingPasses = 0;
  if (profilingPasses > 1) {
    if (finishingDepth > 0) {
      cuttingPasses = profilingPasses - 1; // -1 for finishing pass
    } else {
      cuttingPasses = profilingPasses; // No finishing pass
    }
  } else {
    cuttingPasses = profilingPasses; // -1 for finishing pass
  }


  for (let i = 0; i < cuttingPasses; i++) {
    let thisPassDepth = depthPerRoughingPass;

    // Cutting move X (positive for profiling, outward)
    commands.push(`G1 X${thisPassDepth} F${feedRate} ; roughing cut ${i + 1}`);
    // Cutting move Z
    commands.push(`G1 Z${profilingLength} F${feedRate} ; cut`);
    // Retract move
    commands.push(`G1 X-0.2 F${retractFeedrate} ; retract`);
    // Retract move Z
    commands.push(`G1 Z-${profilingLength} F${retractFeedrate} ; retract`);
    // Unretract X
    commands.push(`G1 X0.2 F${retractFeedrate} ; travel`);

    // Update total cut with high precision
    totalCut += thisPassDepth;
    totalCut = Number(totalCut.toFixed(3));
  }

  // Calculate exact finishing pass depth to achieve target diameter
  let finalPass = 0;
  if (profilingType === 'Absolute') {
    const currentPosition = Number((startPosX + totalCut).toFixed(3));
    finalPass = Number(Math.abs(targetX - currentPosition).toFixed(3));
  } else {
    finalPass = finishingDepth;
  }

  // Only do the finishing pass if there's a meaningful amount to cut
  if (finalPass > 0.001) {
    // Finishing pass
    commands.push(`G1 X${finalPass} F${feedRate} ; finishing cut`);
    commands.push(`G1 Z${profilingLength} F${feedRate} ; cut`);
    // Retract move
    commands.push(`G1 X-0.2 F${retractFeedrate} ; retract`);
    commands.push(`G1 Z-${profilingLength} F${retractFeedrate} ; retract`);
  }

  //move back to start position
  commands.push(`G90`); // Set to absolute positioning
  commands.push(`G1 X${startPosX} F100 ; move to start position`);
  commands.push(`G1 Z${startPosZ} F100 ; move to start position`);


  if (copyToClipboard) {
    // Copy to clipboard
    navigator.clipboard.writeText(commands.join('\n')).then(() => {
      alert('G-code copied to clipboard');
    }).catch(() => {
      alert('Failed to copy G-code to clipboard');
    });
    return;
  }

  if (!isConnected) {
    alert('Please connect to the machine first');
    return;
  }

  // Send all commands at once
  sender?.sendCommands(commands, SenderClient.QUICKTASKS);
}

// Calculate passes based on depth per pass for profiling
async function updateProfilingPassesFromDepthPerPass() {
  const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
  const startPosX = latestStatus?.x!;
  let depthPerPass = 0;

  // Calculate total depth required
  let totalDepth: number;
  if (quickTaskProfilingType.value === 'Absolute') {
    const finalDiameter = Number(parseFloat(quickTaskProfilingFinalDiameter.value).toFixed(3));
    const targetX = -finalDiameter / 2;
    totalDepth = Math.abs(targetX - startPosX);
    totalDepth = Number(totalDepth.toFixed(3));
  } else {
    totalDepth = Number(parseFloat(quickTaskProfilingDepth.value).toFixed(3));
  }

  // Get current values with high precision
  depthPerPass = Number(parseFloat(quickTaskProfilingDepthPerPass.value).toFixed(3));
  let finishingDepth = Number(parseFloat(quickTaskProfilingFinishingDepth.value).toFixed(3));

  // Ensure finishing depth isn't greater than total depth
  if (finishingDepth > totalDepth) {
    finishingDepth = totalDepth;
    quickTaskProfilingFinishingDepth.value = finishingDepth.toFixed(3);
  }

  // Calculate roughing depth
  const roughingDepth = Number((totalDepth - finishingDepth).toFixed(3));

  // Calculate required passes (minimum 1)
  let requiredPasses = 1;  // Default to 1 pass

  if (depthPerPass > 0) {
    // Calculate how many complete passes we can do
    requiredPasses = Math.ceil(roughingDepth / depthPerPass) + 1; // +1 for finishing pass
  }

  // Update the passes input
  quickTaskProfilingPasses.value = requiredPasses.toString();
}

// Calculate depth per pass based on passes for profiling
async function updateProfilingDepthPerPassFromPasses() {
  const latestStatus = await sender?.getPosition(SenderClient.QUICKTASKS);
  const startPosX = latestStatus?.x!;

  // Calculate total depth required with high precision
  let totalDepth: number;
  if (quickTaskProfilingType.value === 'Absolute') {
    const finalDiameter = Number(parseFloat(quickTaskProfilingFinalDiameter.value).toFixed(3));
    const targetX = -finalDiameter / 2;
    totalDepth = Math.abs(targetX - startPosX);
    totalDepth = Number(totalDepth.toFixed(3));
  } else {
    totalDepth = Number(parseFloat(quickTaskProfilingDepth.value).toFixed(3));
  }

  // Get current values
  const passes = parseInt(quickTaskProfilingPasses.value, 10);
  let finishingDepth = Number(parseFloat(quickTaskProfilingFinishingDepth.value).toFixed(3));

  // Ensure finishing depth isn't greater than total depth
  if (finishingDepth > totalDepth) {
    finishingDepth = totalDepth;
    quickTaskProfilingFinishingDepth.value = finishingDepth.toFixed(3);
  }

  // Calculate roughing depth with high precision
  const roughingDepth = Number((totalDepth - finishingDepth).toFixed(3));

  // Calculate depth per pass based on number of passes
  let depthPerPass = 0;
  if (passes > 1) {
    if (finishingDepth > 0) {
      // Calculate depth per pass for roughing passes
      depthPerPass = roughingDepth / (passes - 1);
    } else {
      // If no finishing depth, use total depth for all passes
      depthPerPass = roughingDepth / (passes);
    }

    depthPerPass = Number(depthPerPass.toFixed(3));
  } else {
    // If only one pass, it's just the finishing pass
    depthPerPass = totalDepth;
  }

  // Update the depth per pass input
  quickTaskProfilingDepthPerPass.value = depthPerPass.toFixed(3);
}

//other quick task functions
async function facingTask(copyToClipboard: boolean = false) {

  let isConnected = sender?.isConnected();

  let commands: string[] = [];

  const startPosX = Number(parseFloat(quickTaskFacingXStartPosition.value).toFixed(3));
  const startPosZ = Number(parseFloat(quickTaskFacingZStartPosition.value).toFixed(3));

  if (isNaN(startPosX) || isNaN(startPosZ)) {
    alert('Please enter a valid starting position');
    return;
  }

  const startDiameter = Math.abs(startPosX!) * 2; // e.g. 16
  const endDiameter = Number(parseFloat(quickTaskFacingEndDiameter.value).toFixed(3)); // e.g. 2
  const feedrate = Number(parseFloat(quickTaskFacingFeedrate.value).toFixed(3));    // mm/min, e.g. 70
  const travelFeedRate = Number(parseFloat(quickTaskFacingTravelFeedRate.value).toFixed(3));   // mm/min, e.g. 200
  const usePecking = quickTaskFacingUsePecking.checked;
  const peckingDepth = Number(parseFloat(quickTaskFacingPeckingDepth.value).toFixed(3)); // mm, e.g. 2
  const peckingRetractionRate = Number(parseFloat(quickTaskFacingPeckingRetractionRate.value).toFixed(3));

  localStorage.setItem('facingFeedrate', feedrate.toString());
  localStorage.setItem('facingPeckingDepth', peckingDepth.toString());
  localStorage.setItem('facingEndDiameter', endDiameter.toString());
  localStorage.setItem('facingTravelFeedRate', travelFeedRate.toString());
  localStorage.setItem('facingPeckingRetractionRate', peckingRetractionRate.toString());
  localStorage.setItem('facingUsePecking', usePecking.toString());

  commands.push(`G90`); // Set to absolute positioning
  commands.push(`G1 X${startPosX} F100 ; move to start position`);
  commands.push(`G1 Z${startPosZ} F100 ; move to start position`);
  commands.push('G91'); // Set to relative positioning

  const xStart = startDiameter / 2;
  const xEnd = endDiameter / 2;
  const plungeDepth = Math.abs(xStart - xEnd);

  //calculate tool path for parting or grooving to the end diameter taking into account the pecking depth
  if (usePecking) {
    //calculate the number of pecks required to reach the end diameter
    const numberOfPecks = Math.ceil((plungeDepth) / peckingDepth);

    //calculate the depth of each peck
    const depthOfEachPeck = (plungeDepth) / numberOfPecks;

    //keep track of current depth
    let currentDepth = 0;

    for (let i = 0; i < numberOfPecks; i++) {
      commands.push(`G0 X${depthOfEachPeck} F${feedrate} ; cut`);

      //update current depth
      currentDepth += depthOfEachPeck;
      currentDepth = Number(currentDepth.toFixed(3));

      //if at end diameter retract to start position
      if (currentDepth >= plungeDepth) {
        commands.push(`G1 X-${currentDepth} F${travelFeedRate} ; retract to start position`);
        break;
      }

      //every X pecks retract to start position
      if ((i + 1) % peckingRetractionRate === 0) {
        //work out distance to start position
        commands.push(`G1 X-${currentDepth} F${travelFeedRate} ; retract to start position`);
        commands.push(`G1 X${currentDepth} F${travelFeedRate} ; travel back to cut position`)
      } else {
        commands.push(`G1 X-${depthOfEachPeck} F${travelFeedRate} ; retract short distance`);
        commands.push(`G1 X${depthOfEachPeck} F${feedrate} ; travel back to surface`);
      }
    }
  } else {
    //cut to the end diameter
    commands.push(`G1 X${plungeDepth} F${feedrate} ; cut`);
    commands.push(`G1 X-${plungeDepth} F${travelFeedRate} ; retract to start position`);
  }

  if (copyToClipboard) {
    // Copy to clipboard
    navigator.clipboard.writeText(commands.join('\n')).then(() => {
      alert('G-code copied to clipboard');
    }).catch(() => {
      alert('Failed to copy G-code to clipboard');
    });
    return;
  }

  if (!isConnected) {
    alert('Please connect to the machine first');
    return;
  }

  sender?.sendCommands(commands, SenderClient.QUICKTASKS);
}


async function drillingTask(copyToClipboard: boolean = false) {

  let isConnected = sender?.isConnected();

  //drilling modal inputs
  const drillingDepth = parseFloat(quickTaskDrillingDepth.value);
  const drillingFeedRate = parseFloat(quickTaskDrillingFeedRate.value);
  const drillingPeckCheckbox = quickTaskDrillingPeckCheckbox.checked;
  let drillingPeckDepth = parseFloat(quickTaskDrillingPeckingDepth.value);
  const retractFeedrate = parseFloat(quickTaskDrillingRetractFeedRate.value);
  const slowRetractFeedrate = 50;
  const numberOfPecksUntilFullClearance = 3;
  const chipClearanceDistance = 3;
  let clearChips = false;
  let numberOfPecksPerformed = 0;

  const startPosZ = parseFloat(quickTaskDrillingZStartPosition.value);
  if (isNaN(startPosZ)) {
    alert('Please enter a valid starting Z position');
    return;
  }

  localStorage.setItem('drillingRetractFeedRate', retractFeedrate.toString());
  localStorage.setItem('drillingFeedRate', drillingFeedRate.toString());

  let commands: string[] = [];


  //go to centre line of the part
  commands.push(`G90`); // Set to absolute positioning
  commands.push(`G1 X0 F100 ; move to start position`);
  commands.push(`G1 Z${startPosZ} F100 ; move to start position`);
  commands.push('G91'); // Set to relative positioning

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

      if (clearChips) {
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

  //if copy to clipboard is true then copy the gcode to the clipboard

  if (copyToClipboard) {
    // Copy to clipboard
    navigator.clipboard.writeText(commands.join('\n')).then(() => {
      alert('G-code copied to clipboard');
    }).catch(() => {
      alert('Failed to copy G-code to clipboard');
    });
    return;
  }

  if (!isConnected) {
    alert('Please connect to the machine first');
    return;
  }

  sender?.sendCommands(commands, SenderClient.QUICKTASKS);

}

async function groovingTask() {
  alert('Not Yet Implemented');
}

async function coneTask() {
  alert('Not Yet Implemented');
}

async function boringTask(copyToClipboard: boolean = false) {

  let isConnected = sender?.isConnected();

  // Boring modal inputs with precise handling
  const boringDepth = Number(parseFloat(quickTaskBoringDepth.value).toFixed(3));
  const boringFeedRate = Number(parseFloat(quickTaskBoringFeedRate.value).toFixed(3));
  const boringType = quickTaskBoringType.value;
  const boringPasses = parseInt(quickTaskBoringPasses.value, 10);
  const retractFeedrate = Number(parseFloat(quickTaskBoringRetractFeedRate.value).toFixed(3));
  const startX = Number(parseFloat(quickTaskBoringXStartPosition.value).toFixed(3));
  const startZ = Number(parseFloat(quickTaskBoringZStartPosition.value).toFixed(3));

  localStorage.setItem('boringRetractFeedrate', retractFeedrate.toString());
  localStorage.setItem('boringFeedRate', boringFeedRate.toString());

  const commands: string[] = [];

  commands.push(`G90`); // Set to absolute positioning
  commands.push(`G1 X${startX} F100 ; move to start position`);
  commands.push(`G1 Z${startZ} F100 ; move to start position`);
  commands.push('G91'); // Set to relative positioning

  // Calculate target position and total depth required with exact precision
  let targetX = 0;
  let totalRequired = 0;

  if (boringType === 'Absolute') {
    // For absolute, calculate based on final diameter with exact precision
    const boringFinalDiameter = Number(parseFloat(quickTaskBoringFinalDiameter.value).toFixed(3));
    targetX = -boringFinalDiameter / 2;
    totalRequired = Math.abs(startX - targetX);
    totalRequired = Number(totalRequired.toFixed(3));
  } else {
    // For relative, use the specified depth of cut
    totalRequired = Number(parseFloat(quickTaskBoringDepthOfCut.value).toFixed(3));
  }

  // Get finishing depth - this will be used for the last pass
  let finishingDepth = Number(parseFloat(quickTaskBoringFinishingDepth.value).toFixed(3));

  // Ensure finishing depth doesn't exceed total required depth
  if (finishingDepth > totalRequired) {
    finishingDepth = totalRequired;
  }

  // Calculate roughing depth
  const roughingDepth = Number((totalRequired - finishingDepth).toFixed(3));

  // Calculate depth per roughing pass with high precision
  let depthPerRoughingPass = 0;
  if (boringPasses > 1) {
    if (finishingDepth > 0) {
      // Calculate depth per pass for roughing passes
      depthPerRoughingPass = roughingDepth / (boringPasses - 1);
    } else {
      // If no finishing depth, use total depth for all passes
      depthPerRoughingPass = roughingDepth / (boringPasses);
    }
    depthPerRoughingPass = Number(depthPerRoughingPass.toFixed(3));
  } else if (boringPasses === 1) {
    depthPerRoughingPass = roughingDepth;
  }

  // Track the total depth cut with high precision
  let totalCut = 0;

  let cuttingPasses = 0;
  if (boringPasses > 1) {
    if (finishingDepth > 0) {
      cuttingPasses = boringPasses - 1; // -1 for finishing pass
    }
    else {
      cuttingPasses = boringPasses;
    }
  } else {
    cuttingPasses = boringPasses;
  }

  // Execute roughing passes
  for (let i = 0; i < cuttingPasses; i++) {
    // For the last roughing pass, adjust to ensure we're at the right position for finishing
    let thisPassDepth = depthPerRoughingPass;

    // Cutting move X
    commands.push(`G1 X-${thisPassDepth} F${boringFeedRate} ; roughing cut ${i + 1}`);
    // Cutting move Z
    commands.push(`G1 Z${boringDepth} F${boringFeedRate} ; cut`);
    // Retract move
    commands.push(`G0 X0.2 F${retractFeedrate} ; retract`);
    // Retract move Z
    commands.push(`G0 Z-${boringDepth} F${retractFeedrate} ; retract`);
    // Unretract X
    commands.push(`G0 X-0.2 F${retractFeedrate} ; travel`);

    // Update total cut with high precision
    totalCut += thisPassDepth;
    totalCut = Number(totalCut.toFixed(3));
  }

  // Calculate exact finishing pass depth to achieve target diameter
  let finalPass = 0;
  if (boringType === 'Absolute') {
    const currentPosition = Number((startX - totalCut).toFixed(3));
    finalPass = Number(Math.abs(currentPosition - targetX).toFixed(3));
  } else {
    finalPass = finishingDepth;
  }

  // Only do the finishing pass if there's a meaningful amount to cut
  if (finalPass > 0.001) {
    // Finishing pass
    commands.push(`G1 X-${finalPass} F${boringFeedRate} ; finishing cut`);
    commands.push(`G1 Z${boringDepth} F${boringFeedRate} ; cut`);
    // Retract move
    commands.push(`G0 X0.2 F${retractFeedrate} ; retract`);
    commands.push(`G0 Z-${boringDepth} F${retractFeedrate} ; retract`);
  }

  // Move back to start position
  commands.push(`G90`); // Set to absolute positioning
  commands.push(`G1 X${startX} F100 ; move to start position`);
  commands.push(`G1 Z${startZ} F100 ; move to start position`);

  if (copyToClipboard) {
    // Copy to clipboard
    navigator.clipboard.writeText(commands.join('\n')).then(() => {
      alert('G-code copied to clipboard');
    }).catch(() => {
      alert('Failed to copy G-code to clipboard');
    });
    return;
  }

  if (!isConnected) {
    alert('Please connect to the machine first');
    return;
  }

  // Send all commands at once
  sender?.sendCommands(commands, SenderClient.QUICKTASKS);
}

//<---- Boring functions ---->
async function updatePassesFromDepthPerPass() {

  const startPosX = Number(parseFloat(quickTaskBoringXStartPosition.value).toFixed(3));

  // Calculate total depth required with high precision
  let totalDepth: number;
  if (quickTaskBoringType.value === 'Absolute') {
    const finalDiameter = Number(parseFloat(quickTaskBoringFinalDiameter.value).toFixed(3));
    const targetX = -finalDiameter / 2;
    totalDepth = Math.abs(startPosX - targetX);
    totalDepth = Number(totalDepth.toFixed(3));
  } else {
    totalDepth = Number(parseFloat(quickTaskBoringDepthOfCut.value).toFixed(3));
  }

  // Get current values with high precision
  const depthPerPass = Number(parseFloat(quickTaskBoringDepthPerPass.value).toFixed(3));
  let finishingDepth = Number(parseFloat(quickTaskBoringFinishingDepth.value).toFixed(3));

  // Ensure finishing depth isn't greater than total depth
  if (finishingDepth > totalDepth) {
    finishingDepth = totalDepth;
    quickTaskBoringFinishingDepth.value = finishingDepth.toFixed(3);
  }

  // Calculate roughing depth
  const roughingDepth = Number((totalDepth - finishingDepth).toFixed(3));

  // Calculate required passes (minimum 1)
  let requiredPasses = 1;  // Default to 1 pass

  if (depthPerPass > 0) {
    // Calculate how many complete passes we can do
    requiredPasses = Math.ceil(roughingDepth / depthPerPass) + 1; // +1 for finishing pass
  }

  // Update the passes input
  quickTaskBoringPasses.value = requiredPasses.toString();
}

// Function to handle when passes are manually changed
async function updateDepthPerPassFromPasses() {

  const startPosX = Number(parseFloat(quickTaskBoringXStartPosition.value).toFixed(3));

  // Calculate total depth required with high precision
  let totalDepth: number;
  if (quickTaskBoringType.value === 'Absolute') {
    const finalDiameter = Number(parseFloat(quickTaskBoringFinalDiameter.value).toFixed(3));
    const targetX = -finalDiameter / 2;
    totalDepth = Math.abs(startPosX - targetX);
    totalDepth = Number(totalDepth.toFixed(3));
  } else {
    totalDepth = Number(parseFloat(quickTaskBoringDepthOfCut.value).toFixed(3));
  }

  // Get current values
  const passes = parseInt(quickTaskBoringPasses.value, 10);
  let finishingDepth = Number(parseFloat(quickTaskBoringFinishingDepth.value).toFixed(3));

  // Ensure finishing depth isn't greater than total depth
  if (finishingDepth > totalDepth) {
    finishingDepth = totalDepth;
    quickTaskBoringFinishingDepth.value = finishingDepth.toFixed(3);
  }

  // Calculate roughing depth with high precision
  const roughingDepth = Number((totalDepth - finishingDepth).toFixed(3));

  // Calculate depth per pass based on number of passes
  let depthPerPass = 0;
  if (passes > 1) {
    if (finishingDepth > 0) {
      // Calculate depth per pass for roughing passes
      depthPerPass = roughingDepth / (passes - 1);
    } else {
      // If no finishing depth, use total depth for all passes
      depthPerPass = roughingDepth / (passes);
    }
    depthPerPass = Number(depthPerPass.toFixed(3));
  } else {
    // If only one pass, it's just the finishing pass
    // Depth per pass is irrelevant, but we'll set a reasonable value
    depthPerPass = totalDepth;
  }

  // Update the depth per pass input
  quickTaskBoringDepthPerPass.value = depthPerPass.toFixed(3);
}

async function threadingTask(copyToClipboard: boolean = false) {

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

  if (copyToClipboard) {
    // Copy to clipboard
    navigator.clipboard.writeText(gcode).then(() => {
      alert('G-code copied to clipboard');
    }).catch(() => {
      alert('Failed to copy G-code to clipboard');
    });
    return;
  }

  if (!sender?.isConnected()) {
    alert('Please connect to the machine first');
    return;
  }

  const commands: string[] = [];
  commands.push('G90'); //set to absolute positioning
  commands.push(gcode);
  sender?.sendCommands(commands, SenderClient.QUICKTASKS);


}

async function toolOffsetsTask() {

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