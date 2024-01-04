import { Sender } from './sender';
import { editor } from './main';
import { gcodeResponseEditor } from './main';

export class GCode {

    private sendButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private senderError: HTMLDivElement;
    private runProgress: HTMLProgressElement;
    private connectButton: HTMLButtonElement;

    private sender: Sender | null = null;

    constructor() {

        this.senderError = document.querySelector<HTMLDivElement>('.senderError')!;
        this.runProgress = document.getElementsByTagName('progress')[0];
        this.connectButton = document.getElementById('connectButton') as HTMLButtonElement;

        this.sendButton = document.getElementById('gcodeSenderButton') as HTMLButtonElement;

        this.connectButton.addEventListener('click', () => {
            if (!this.sender) this.sender = new Sender(() => this.senderStatusChange());
            this.sender.connect();
        });

        this.sendButton.addEventListener('click', () => {
            if (!this.sender) this.sender = new Sender(() => this.senderStatusChange());
            this.sender.start(editor.getValue());
        });

        this.stopButton = document.getElementById('stopButton') as HTMLButtonElement;
        this.stopButton.addEventListener('click', () => this.sender!.stop());
        this.stopButton.style.display = 'none';
    }

    hide() {
        //this.container.style.display = 'none';
    }

    private senderStatusChange() {
        if (!this.sender) return;
        const status = this.sender.getStatus();
        if (status.condition === 'disconnected') {
            this.sendButton.style.display = 'none';
            return;
        }else{  
            this.sendButton.style.display = 'inline-block';
        }

        const isRun = status.condition === 'run';
        if (this.runProgress) {
            this.runProgress.value = status.progress;
            this.runProgress.style.display = isRun ? 'block' : 'none';
        }

        if (this.stopButton) this.stopButton.style.display = isRun ? 'inline-block' : 'none';
        if (this.sendButton) this.sendButton.style.display = isRun ? 'none' : 'inline-block';
        if (this.senderError) {
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
