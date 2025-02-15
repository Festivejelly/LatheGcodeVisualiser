import { Sender, SenderClient } from './sender';
import { gcodeResponseEditor } from './main';
import { gcodeSenderEditor } from './main';


export class GCode {

    private sendButton: HTMLButtonElement;
    private sendSingleCommandButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private senderError: HTMLDivElement;
    private runProgress: HTMLProgressElement;
    private runProgressLabel: HTMLSpanElement;
    private connectButton: HTMLButtonElement;
    private gcodeResponseContainer: HTMLDivElement;
    private jogButtons: NodeListOf<HTMLButtonElement>;
    private toolButtons: NodeListOf<HTMLButtonElement>;
    private sender: Sender | null;
    private singleCommandSender: HTMLInputElement;
    private  minimumVersion: string;

    constructor() {

        this.minimumVersion = 'H4V12FJ';

        let fastFeedrateInput: HTMLInputElement;
        let slowFeedrateInput: HTMLInputElement;
        let moveDistanceInput: HTMLInputElement;

        this.senderError = document.querySelector<HTMLDivElement>('.senderError')!;
        this.runProgress = document.getElementById('senderProgress') as HTMLProgressElement
        this.runProgressLabel = document.getElementById('senderProgressLabel') as HTMLSpanElement;
        this.connectButton = document.getElementById('connectButton') as HTMLButtonElement;
        this.gcodeResponseContainer = document.getElementById('gcodeResponseContainer') as HTMLDivElement;
        moveDistanceInput = document.getElementById('moveDistance') as HTMLInputElement;
        fastFeedrateInput = document.getElementById('fastFeedrate') as HTMLInputElement;
        slowFeedrateInput = document.getElementById('slowFeedrate') as HTMLInputElement;

        this.jogButtons = document.querySelectorAll('#latheControls .jog-btn') as NodeListOf<HTMLButtonElement>;
        this.toolButtons = document.querySelectorAll('#latheControls .tool-btn') as NodeListOf<HTMLButtonElement>;

        this.sendButton = document.getElementById('gcodeSenderButton') as HTMLButtonElement;
        this.sendSingleCommandButton = document.getElementById('gcodeSendSingleCommandButton') as HTMLButtonElement;
        this.singleCommandSender = document.getElementById('singleCommandSender') as HTMLInputElement;

        this.sender = Sender.getInstance();
        this.sender.addStatusChangeListener(() => this.handleStatusChange(), SenderClient.GCODE);

        this.jogButtons.forEach((btn) => {
            btn.addEventListener('click', () => {

                //if sender is not connected show alert and return
                if (!this.sender?.isConnected()) {
                    alert("Please connect to the controller first.");
                    return;
                }

                let feedrate = "";
                let axis = "";
                let distance = "";
                let positive = true;

                if (btn.id == 'fastForward') {
                    feedrate = fastFeedrateInput.value;
                    axis = 'X';
                    distance = moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'slowForward') {
                    feedrate = slowFeedrateInput.value;
                    axis = 'X';
                    distance = moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'fastBackward') {
                    feedrate = fastFeedrateInput.value;
                    axis = 'X';
                    distance = moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'slowBackward') {
                    feedrate = slowFeedrateInput.value;
                    axis = 'X';
                    distance = moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'fastLeft') {
                    feedrate = fastFeedrateInput.value;
                    axis = 'Z';
                    distance = moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'slowLeft') {
                    feedrate = slowFeedrateInput.value;
                    axis = 'Z';
                    distance = moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'fastRight') {
                    feedrate = fastFeedrateInput.value;
                    axis = 'Z';
                    distance = moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'slowRight') {
                    feedrate = slowFeedrateInput.value;
                    axis = 'Z';
                    distance = moveDistanceInput.value;
                    positive = false;
                }

                let positiveModifier = positive === true ? '' : '-';
                let command = `${axis}${positiveModifier}${distance} F${feedrate}`;
                if (this.sender) {
                    let commands = new Array(3);
                    commands[0] = 'G91'; //set to relative positioning
                    commands[1] = command;
                    commands[2] = 'G90'; //set to absolute positioning

                    this.sender.sendCommands(commands, SenderClient.GCODE);
                }
            });
        });

        this.toolButtons.forEach((btn) => {
            btn.addEventListener('click', () => {

                if (!this.sender?.isConnected()) {
                    alert("Please connect to the controller first.");
                    return;
                }

                if(this.sender.getStatus().version != this.minimumVersion){
                    alert(`This feature is only available on firmware version ${this.minimumVersion} or later. Please see help tab for more information.`);
                    return;
                }

                let toolId = btn.id;
                let tCommand = toolId.replace('tool', 'T');

                //remove selected class from all other tool buttons that are not the one that was just clicked
                let toolButtons = document.querySelectorAll('#latheControls .tool-btn') as NodeListOf<HTMLButtonElement>;
                toolButtons.forEach(function (btn) {
                    if (btn.id != toolId) {
                        btn.classList.remove('tool-selected');
                    }
                    else {
                        btn.classList.add('tool-selected');
                    }
                });


                let commandArray = new Array(1);
                commandArray[0] = tCommand

                if (this.sender) {
                    this.sender.sendCommands(commandArray, SenderClient.GCODE);
                }
            });
        });

        this.connectButton.addEventListener('click', () => {
            this.gcodeResponseContainer.style.display = 'block';
            if (!this.sender?.isConnected() && this.sender) this.sender.connect();
        });

        this.sendButton.addEventListener('click', () => {

            //if sender is not connected show alert and return
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            if (this.sender) {
                this.sendButton.disabled = true;
                this.sendSingleCommandButton.disabled = true;

                //disable jogging controlls
                this.jogButtons.forEach((btn) => {
                    btn.disabled = true;
                });

                //disable tool change buttons
                this.toolButtons.forEach((btn) => {
                    btn.disabled = true;
                });
                this.sender.start(gcodeSenderEditor.getValue(), SenderClient.GCODE);
            }
        });

        this.sendSingleCommandButton.addEventListener('click', () => {

            //if sender is not connected show alert and return
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            if (this.sender) {
                this.sendButton.disabled = true;
                this.sendSingleCommandButton.disabled = true;

                //disable jogging controlls
                this.jogButtons.forEach((btn) => {
                    btn.disabled = true;
                });

                //disable tool change buttons
                this.toolButtons.forEach((btn) => {
                    btn.disabled = true;
                });

                this.sender.sendCommand(this.singleCommandSender.value, SenderClient.GCODE);
            }
        });

        this.stopButton = document.getElementById('stopButton') as HTMLButtonElement;
        this.stopButton.addEventListener('click', () => this.sender!.stop());
        this.stopButton.style.display = 'none';
    }

    hide() {
        //this.container.style.display = 'none';
    }

    private handleStatusChange() {

        if (!this.sender) return;
        const status = this.sender.getStatus();
        if (status.isConnected === false) {
            this.connectButton.innerText = 'Connect';
            this.connectButton.disabled = false;
            //clear the button colour
            this.connectButton.style.backgroundColor = '';
            return;
        } else {
            this.connectButton.innerText = 'Connected';
            this.connectButton.disabled = true;
            //colour button green
            this.connectButton.style.backgroundColor = 'green';
        }

        const isRun = status.condition === 'run';
        if (this.runProgress) {
            this.runProgress.value = status.progress;
            this.runProgress.style.display = isRun ? 'block' : 'none';
            this.runProgressLabel.style.display = isRun ? 'block' : 'none';

            if (!isRun) {
                this.sendButton.disabled = false;
                this.sendButton.style.display = 'inline-block';
                this.sendSingleCommandButton.disabled = false;

                //enable jogging controls
                this.jogButtons.forEach((btn) => {
                    btn.disabled = false;
                });

                //enable tool change buttons
                this.toolButtons.forEach((btn) => {
                    btn.disabled = false;
                });

            } else if (isRun) {
                this.sendButton.style.display = 'none';
            }
        }

        if (this.stopButton) this.stopButton.style.display = isRun ? 'inline-block' : 'none';

        const isDisconnecting = this.sender.getDisconnectingStatus();
        if (this.senderError && !isDisconnecting) {
            if (status.error) {
                this.senderError.style.display = 'block';
                this.senderError.innerText = status.error;
                this.showError();
                this.appendLineToResponseEditor(status.error);
            }
            else {
                this.hideError();
                this.senderError.innerText = '';
            }
        }
    }

    appendLineToResponseEditor(text: string) {
        var editorSession = gcodeResponseEditor.getSession();
        var lastRow = editorSession.getLength();
        var timestamp = new Date().toLocaleTimeString(); // Get current time
        var textWithTimestamp = `[${timestamp}] ${text}\n`; // Format the string with timestamp

        editorSession.insert({ row: lastRow, column: 0 }, textWithTimestamp);
    }

    showError() {
        this.senderError.style.display = 'block'; // Show the error div
    }

    hideError() {
        this.senderError.style.display = 'none'; // Hide the error div
    }
}
