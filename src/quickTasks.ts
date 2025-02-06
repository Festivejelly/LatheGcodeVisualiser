import { Sender, SenderClient } from './sender';


let sender: Sender | null;

document.addEventListener("DOMContentLoaded", () => {

    sender = Sender.getInstance();
    sender.addStatusChangeListener(() => handleStatusChange(), SenderClient.QUICKTASKS);

    //Connect button
    const connectButton = document.getElementById('connectButton') as HTMLButtonElement;

    //quick tasks buttons
    const quickTaskFacingButton = document.getElementById('facingButton') as HTMLButtonElement;
    const quickTaskGroovingButton = document.getElementById('groovingButton') as HTMLButtonElement;
    const quickTaskProfilingButton = document.getElementById('profilingButton') as HTMLButtonElement;
    const quickTaskConeButton = document.getElementById('coneButton') as HTMLButtonElement;
    const quickTaskBoringButton = document.getElementById('boringButton') as HTMLButtonElement;
    const quickTaskThreadingButton = document.getElementById('threadingButton') as HTMLButtonElement;

    //execute button
    const allQuickTaskButtons = document.getElementsByClassName('execute');

    //quick tasks modals
    const quickTaskFacingModal = document.getElementById('quickTaskFacingModal') as HTMLDivElement;
    const quickTaskGroovingModal = document.getElementById('quickTaskGroovingModal') as HTMLDivElement;
    const quickTaskProfilingModal = document.getElementById('quickTaskProfilingModal') as HTMLDivElement;
    const quickTaskConeModal = document.getElementById('quickTaskConeModal') as HTMLDivElement;
    const quickTaskBoringModal = document.getElementById('quickTaskBoringModal') as HTMLDivElement;
    const quickTaskThreadingModal = document.getElementById('quickTaskThreadingModal') as HTMLDivElement;

    //quick tasks modal close buttons
    const quickTaskFacingClose = document.getElementById('quickTaskFacingCloseButton') as HTMLButtonElement;
    const quickTaskGroovingClose = document.getElementById('quickTaskGroovingCloseButton') as HTMLButtonElement;
    const quickTaskProfilingClose = document.getElementById('quickTaskProfilingCloseButton') as HTMLButtonElement;
    const quickTaskConeClose = document.getElementById('quickTaskConeCloseButton') as HTMLButtonElement;
    const quickTaskBoringClose = document.getElementById('quickTaskBoringCloseButton') as HTMLButtonElement;
    const quickTaskThreadingClose = document.getElementById('quickTaskThreadingCloseButton') as HTMLButtonElement;

    //active execute button
    let activeQuickTaskButton: HTMLButtonElement;

    //Quick task open buttons
    Array.from(allQuickTaskButtons).forEach((button) => {
        button.addEventListener('click', () => {
            if (!sender?.isConnected()) {
                alert('Please connect to the machine first');
            } else {
                activeQuickTaskButton = button as HTMLButtonElement;
                sender?.start("#", SenderClient.QUICKTASKS);
            }
        });
    });

    quickTaskFacingButton.addEventListener('click', () => {
        quickTaskFacingModal.style.display = 'block';

    });

    quickTaskGroovingButton.addEventListener('click', () => {
        quickTaskGroovingModal.style.display = 'block';
    });

    quickTaskProfilingButton.addEventListener('click', () => {
        quickTaskProfilingModal.style.display = 'block';
    });

    quickTaskConeButton.addEventListener('click', () => {
        quickTaskConeModal.style.display = 'block';
    });

    quickTaskBoringButton.addEventListener('click', () => {
        quickTaskBoringModal.style.display = 'block';
    });

    quickTaskThreadingButton.addEventListener('click', () => {
        quickTaskThreadingModal.style.display = 'block';
    });

    //Quick task close buttons
    quickTaskFacingClose.addEventListener('click', () => {
        quickTaskFacingModal.style.display = "none";
    });

    quickTaskGroovingClose.addEventListener('click', () => {
        quickTaskGroovingModal.style.display = "none";
    });

    quickTaskProfilingClose.addEventListener('click', () => {
        quickTaskProfilingModal.style.display = "none";
    });

    quickTaskConeClose.addEventListener('click', () => {
        quickTaskConeModal.style.display = 'none';
    });

    quickTaskBoringClose.addEventListener('click', () => {
        quickTaskBoringModal.style.display = "none";
    });

    quickTaskThreadingClose.addEventListener('click', () => {
        quickTaskThreadingModal.style.display = "none";
    });

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
            activeQuickTaskButton.disabled = false;
    
        } else if (isRun) {
            activeQuickTaskButton.disabled = true;
        }
    
      }
});