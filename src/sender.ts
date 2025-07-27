import { gcodeResponseEditor } from './main';

export enum SenderClient {
    GCODE = 'gcode',
    PLANNER = 'planner',
    QUICKTASKS = 'quicktasks'
}

export enum StatusType {
    CONNECTION,
    COMMAND
}

export class SenderStatus {
    constructor(
        readonly isConnected: boolean,
        readonly condition: 'disconnected' | 'idle' | 'run',
        readonly error: string,
        readonly progress: number,
        readonly currentLine: string,
        readonly feedRate: number,
        readonly z: number,
        readonly x: number,
        readonly y: number,
        readonly mZ: number,
        readonly mX: number,
        readonly mY: number,
        readonly feed: number,
        readonly rpm: number,
        readonly version: string,
        readonly lastResponse: string) { }
}

type StatusChangeListener = {
    callback: () => void;
    client: SenderClient;
}

export class Sender {
    private static instance: Sender | null = null;
    private listeners: StatusChangeListener[] = [];
    private activeClient: SenderClient | null = null;
    private port: SerialPort | null = null;
    private readTimeout = 0;
    private reader: ReadableStreamDefaultReader<string> | null = null;
    private writer: WritableStreamDefaultWriter<string> | null = null;
    private isOn = false;
    private waitForOkOrError = false;
    private lines: string[] = [];
    private lineIndex = 0;
    private unparsedResponse = '';
    private remainingResponse = '';
    private error = '';
    private statusReceived = false;
    private currentLine = '';
    private feedRate = 0;
    private z = 0;
    private x = 0;
    private y = 0;
    private mZ = 0;
    private mX = 0;
    private mY = 0;
    private feed = 0;
    private rpm = 0;
    private isDisconnecting = false;
    private lastStatus: SenderStatus | null = null;
    private version = '';
    private lastResponse = '';

    public static getInstance(): Sender {
        if (!Sender.instance) {
            Sender.instance = new Sender();
        }
        return Sender.instance;
    }

    constructor() { }

    public setActiveClient(client: SenderClient) {
        this.activeClient = client;
        console.log(`Active client set to: ${client}`);
    }

    public clearActiveClient() {
        this.activeClient = null;
        console.log('Active client cleared');
    }

    getStatus() {
        this.lastStatus = new SenderStatus(
            this.port !== null,
            this.isOn ? 'run' : 'idle',
            this.error,
            this.lines.length ? this.lineIndex / this.lines.length : 0,
            this.currentLine,
            this.feedRate,
            this.z,
            this.x,
            this.y,
            this.mZ,
            this.mX,
            this.mY,
            this.feed,
            this.rpm,
            this.version,
            this.lastResponse
        );
        return this.lastStatus;
    }

    public getCurrentCommand(): string {
        return this.currentLine;
    }

    public addStatusChangeListener(callback: () => void, client: SenderClient): void {
        this.listeners.push({ callback, client });
    }

    private notifyStatusChange() {
        this.listeners.forEach(listener => {
            if (listener.client === this.activeClient) {
                console.debug(`Notifying ${listener.client} listener`);
                listener.callback();
            } else {
                console.debug(`Skipping ${listener.client} listener (not active)`);
            }
        });
    }

    private currentCommandListeners: Array<(command: string) => void> = [];

    public addCurrentCommandListener(listener: (command: string) => void): void {
        this.currentCommandListeners.push(listener);
    }

    private notifyCurrentCommand(command: string) {
        // Notify current command listeners about the current command
        this.currentCommandListeners.forEach(listener => listener(command));
    }

    private remainingStatus: string = '';

    private setStatus(s: string, ) {
        s = this.remainingStatus + s;
        this.remainingStatus = '';

        if (s.startsWith('<')) s = s.substring(1);
        if (s.endsWith('>')) {
            s = s.slice(0, -1);
        } else {
            // Status message is not complete, store it and wait for the next part
            this.remainingStatus = s;
            return;
        }
        const parts = s.split('|');
        if (parts.length >= 3) {
            this.statusReceived = true;
            if (parts[1].startsWith('WPos:')) {
                const coords = parts[1].substring('WPos:'.length).split(',');
                this.x = Number(coords[0]);
                this.y = Number(coords[1]);
                this.z = Number(coords[2]);

            }
            if (parts[2].startsWith('MPos:')) {
                const coords = parts[2].substring('MPos:'.length).split(',');
                this.mX = Number(coords[0]);
                this.mY = Number(coords[1]);
                this.mZ = Number(coords[2]);

            }
            if (parts[3].startsWith('FS:')) {
                const coords = parts[3].substring('FS:'.length).split(',');
                this.feed = Number(coords[0]);
                this.rpm = Number(coords[1]);
            }
            if (parts[4].startsWith('Id:')) {
                this.version = String(parts[4].substring('Id:'.length));
            }
        }
        this.notifyStatusChange();

        appendLineToResponseEditor(`response: ${s}`);
        console.log(`response: "${s}"`);
    }

    private setError(e: string, ) {
        this.error = e;
        appendLineToResponseEditor(e);
        this.notifyStatusChange();
    }

    isConnected() {
        return this.lastStatus !== null && this.lastStatus.isConnected;
    }

    async connect() {
        try {
            this.setActiveClient(SenderClient.GCODE);  // Connection is owned by GCODE
            if (!this.port) {
                await this.selectPort();

                this.write('!'); // Stop any running job

                await this.askForStatus();
                if (!(await waitForTrue(() => this.statusReceived))) {
                    this.setError('Device is not reponding, is it in GCODE mode?');
                    return;
                }
                this.isDisconnecting = false;
                this.isOn = false; //idle
                this.setError('');
                this.waitForOkOrError = false;
                this.unparsedResponse = '';
            } else {
                this.closePort();
            }

        } catch (error) {
            console.log(error);
        }
        this.notifyStatusChange();
    }

    async disconnect() {
        this.isDisconnecting = true;
        if (this.port)
            this.closePort();
    }

    getDisconnectingStatus() {
        return this.isDisconnecting;
    }

    async start(text: string, client: SenderClient) {
        if (!text) return;
        this.setActiveClient(client);

        this.isOn = true;
        this.lines = text.split('\n');
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        this.write('~');
        this.writeCurrentLine();

        this.notifyStatusChange();
    }

    async sendCommand(command: string, client: SenderClient) {
        this.setActiveClient(client);

        this.isOn = true;
        this.lines = [command];
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        this.write('~');
        this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async sendCommands(commands: string[], client: SenderClient) {
        this.setActiveClient(client);

        this.isOn = true;
        this.lines = commands;
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        this.write('~');
        this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async getPosition(client: SenderClient) {
        this.setActiveClient(client);

        // Reset the statusReceived flag before requesting new status
        this.statusReceived = false;

        await this.write('?');

        const received = await waitForTrue(() => this.statusReceived);
        if (!received) {
            throw new Error('Failed to get position update');
        } 

        this.notifyStatusChange();
        return this.getStatus();
    }
    
    async getToolOffsets(client: SenderClient) {
        this.setActiveClient(client);
        this.lastResponse = ''; // Reset last response

        await this.sendCommand('#', client);
        
        const received = await waitForTrueWithTimeout(() => 
            this.lastResponse.includes('toolOffsets:') && 
            this.lastResponse.includes('ok'), 50, 100
        );
    
        if (!received) {
            throw new Error('Failed to get tool offsets');
        }

        this.stop();
    
        return this.lastResponse;
    }

    async stop() {
        this.error = '';
        await this.write('!',);
        if (!this.isOn) return;
        this.isOn = false;
        this.notifyStatusChange();
        this.clearActiveClient();
    }

    private async write(sequence: string) {
        if (!this.port) return;
        console.log('command: ', sequence);
        if (!this.port.writable) {
            if (sequence != '?') {
                this.setError('Port is not writable, try reconnecting the USB and switching to GCODE mode.');
            }
            return;
        }
        if (!this.writer) {
            try {
                const textEncoder = new TextEncoderStream();
                textEncoder.readable.pipeTo(this.port.writable);
                this.writer = textEncoder.writable.getWriter();
            } catch (e) {
                this.setError('Failed to write: ' + e);
                return;
            }
        }
        await this.writer.write(sequence);
    }

    private async writeCurrentLine() {
        if (!this.isOn || this.waitForOkOrError) return;
        if (this.lineIndex >= this.lines.length) {
            this.stop();
            return;
        }
        const line = this.lines[this.lineIndex].split(';')[0].trim();
        if (!line) {
            this.lineIndex++;
            this.writeCurrentLine();
            return;
        }

        this.currentLine = line;
        this.notifyCurrentCommand(this.currentLine);

        this.waitForOkOrError = true;
        //console.log(`command: "${line}"`);
        appendLineToResponseEditor(`command: ${line}`);
        await this.write(line + '\n');
        await this.readFromPort();
    };

    private async processResponse(response: string) {
        this.unparsedResponse = (this.remainingResponse + response).trimStart();
        this.remainingResponse = '';

        // Split the response into lines
        const lines = this.unparsedResponse.split(/\r?\n/).map(line => line.replace(/\r/g, ''));

        for (let line of lines) {
            // Cut out status message.
            const statuses = line.match(/(<[^>]+>)/);
            if (statuses && statuses.length > 1) {
                statuses.shift();
                for (const s of statuses) {
                    line = line.replace(s, '');
                }
                this.setStatus(statuses.pop()!);
            }

            if (line.startsWith('error:')) {
                this.remainingResponse += line;
                appendLineToResponseEditor(`response: ${this.remainingResponse}`);
                console.log(`response: "${this.remainingResponse}"`);
                this.setError(line);
                this.remainingResponse = '';
                this.stop();
            } else if (line.startsWith('ok')||line.endsWith('ok')) {
                this.remainingResponse += line;
                appendLineToResponseEditor(`response: ${this.remainingResponse}`);
                this.lastResponse = this.remainingResponse;
                console.log(`response: "${this.remainingResponse}"`);
                this.remainingResponse = '';
                this.waitForOkOrError = false;
                this.lineIndex++;
                this.notifyStatusChange();
                if (this.isOn) await this.writeCurrentLine();
            } else {
                //some response is not complete, accumulate it
                this.remainingResponse += line;
            }
        }

        this.unparsedResponse = '';
    }

    private async selectPort() {
        if (this.port) {
            this.closePort();
        }
        if (navigator.serial) {
            this.port = await navigator.serial.requestPort();
        } else {
            this.error = 'This browser does not support Serial API, try Chrome or Edge';
            this.notifyStatusChange();
        }
        if (this.port) {
            try {
                await this.port.open({ baudRate: 115200 });
                this.notifyStatusChange();
                this.readSoon();
            } catch (e) {
                this.setError(`Unable to open port - likely some other app is using it - try closing Arduino IDE.\n${e}`);
                this.closePort();
            }
        }
    }

    private async askForStatus() {
        try {
            await this.write('?');
        } catch (e) {
            this.setError(`Device disconnected? ${e}`);
            this.closePort();
        }
    }

    private readSoon() {
        clearTimeout(this.readTimeout);
        this.readTimeout = window.setTimeout(() => this.readFromPort(), 200);
    }

    private async readFromPort() {
        if (!this.port) return;
        try {
            if (!this.port.readable) {
                this.readSoon();
                return;
            }
            if (!this.reader) {
                const textDecoder = new TextDecoderStream();
                this.port.readable.pipeTo(textDecoder.writable);
                this.reader = textDecoder.readable.getReader();
            }
            const { value } = await this.reader.read();
            if (!value) {
                this.readSoon();
                return;
            }
            await this.processResponse(value);
            this.readSoon();
        } catch (e: any) {
            this.setError(e.message || String(e));
            this.closePort();
        }
    }

    private async closePort() {
        if (!this.port) return;

        clearTimeout(this.readTimeout);

        // Attempt to cancel the reader and release the lock
        if (this.reader) {
            try {
                await this.reader.cancel();
                this.reader.releaseLock();
            } catch (e) {
                console.error("Error cancelling reader: ", e);
            }
            this.reader = null;
        }

        // Attempt to close the writer and release the lock
        if (this.writer) {
            try {
                await this.writer.close();
                this.writer.releaseLock();
            } catch (e) {
                console.error("Error closing writer: ", e);
            }
            this.writer = null;
        }

        // Wait for a moment to allow the port to process the lock release
        await new Promise(resolve => setTimeout(resolve, 500));

        // Finally, try to close the port
        try {
            await this.port.close();
        } catch (e) {
            console.error("Error closing port: ", e);
        }


        this.port = null;
        this.statusReceived = false;
        this.z = 0;
        this.x = 0;
        this.feed = 0;
        this.rpm = 0;
    }
}

function appendLineToResponseEditor(text: string) {
    var editorSession = gcodeResponseEditor.getSession();
    var lastRow = editorSession.getLength();
    var timestamp = new Date().toLocaleTimeString(); // Get current time
    var textWithTimestamp = `[${timestamp}] ${text}\n`; // Format the string with timestamp

    editorSession.insert({ row: lastRow, column: 0 }, textWithTimestamp);
}

function waitForTrue(checkFunction: () => boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        let iteration = 0;

        function check() {
            if (checkFunction()) {
                resolve(true);
            } else if (iteration >= 10) {
                resolve(false);
            } else {
                iteration++;
                setTimeout(check, 100);
            }
        }

        check();
    });
}

function waitForTrueWithTimeout(
    checkFunction: () => boolean, 
    maxIterations: number = 50,
    delayMs: number = 100
): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        let iteration = 0;

        function check() {
            if (checkFunction()) {
                resolve(true);
            } else if (iteration >= maxIterations) {
                resolve(false);
            } else {
                iteration++;
                setTimeout(check, delayMs);
            }
        }

        check();
    });
}
