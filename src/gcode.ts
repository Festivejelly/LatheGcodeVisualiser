import { Sender } from './sender';
import { gcodeResponseEditor } from './main';
import { gcodeSenderEditor } from './main';


export class GCode {

    private sendButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private senderError: HTMLDivElement;
    private runProgress: HTMLProgressElement;
    private runProgressLabel: HTMLSpanElement;
    private connectButton: HTMLButtonElement;
    private isConnected: boolean = false;
    private gcodeResponseContainer: HTMLDivElement;
    private jogButtons: NodeListOf<HTMLButtonElement>;
    private toolButtons: NodeListOf<HTMLButtonElement>;
    private sender: Sender | null;

    constructor() {

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

        this.sender = Sender.getInstance();
        this.sender.addStatusChangeListener(() => this.handleStatusChange());

        this.jogButtons.forEach( (btn) => {
            btn.addEventListener('click', () => {

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
                    this.sender.sendCommand(command);
                }
            });
        });

        this.toolButtons.forEach((btn)  => {
            btn.addEventListener('click', () => {
                let toolId = btn.id;
                let tCommand = 'T';

                if(toolId == 'tool0') {
                    tCommand += '0';
                } else if(toolId == 'tool1') {
                    tCommand += '1';
                } else if(toolId == 'tool2') {
                    tCommand += '2';
                } else if(toolId == 'tool3') {
                    tCommand += '3';
                }

                //remove selected class from all other tool buttons that are not the one that was just clicked
                let toolButtons = document.querySelectorAll('#latheControls .tool-btn') as NodeListOf<HTMLButtonElement>;
                toolButtons.forEach(function (btn) {
                    if(btn.id != toolId) {
                        btn.classList.remove('tool-selected');
                    }
                    else {
                        btn.classList.add('tool-selected');
                    }
                });


                let commandArray = new Array(2);
                commandArray[0] = 'G91';
                commandArray[1] = tCommand;

                if (this.sender) {
                    this.sender.sendCommands(commandArray);
                }
            });
        });

        this.connectButton.addEventListener('click', () => {
            this.gcodeResponseContainer.style.display = 'block';
            if (!this.isConnected && this.sender) this.sender.connect();
        });

        this.sendButton.addEventListener('click', () => {
            if (this.sender) {
                this.sender.start(gcodeSenderEditor.getValue());
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
            this.sendButton.style.display = 'none';
            this.connectButton.innerText = 'Connect';
            this.isConnected = false;
            return;
        } else {
            this.isConnected = true;
            this.sendButton.style.display = 'inline-block';
            this.connectButton.innerText = 'Connected';
            this.connectButton.disabled = true;
        }

        const isRun = status.condition === 'run';
        if (this.runProgress) {
            this.runProgress.value = status.progress;
            this.runProgress.style.display = isRun ? 'block' : 'none';
            this.runProgressLabel.style.display = isRun ? 'block' : 'none';
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
