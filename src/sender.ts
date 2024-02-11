import { gcodeResponseEditor } from './main';

export class SenderStatus {
    constructor(
        readonly isConnected: boolean,
        readonly condition: 'disconnected' | 'idle' | 'run',
        readonly error: string,
        readonly progress: number,
        readonly z: number,
        readonly x: number,
        readonly feed: number,
        readonly rpm: number,) { }
}

export class Sender {
    private static instance: Sender | null = null;
    private listeners: (() => void)[] = [];
    private port: SerialPort | null = null;
    private readTimeout = 0;
    private reader: ReadableStreamDefaultReader<string> | null = null;
    private writer: WritableStreamDefaultWriter<string> | null = null;
    private isOn = false;
    private waitForOkOrError = false;
    private lines: string[] = [];
    private lineIndex = 0;
    private unparsedResponse = '';
    private error = '';
    private statusReceived = false;
    private z = 0;
    private x = 0;
    private feed = 0;
    private rpm = 0;
    private isDisconnecting = false;
    private lastStatus: SenderStatus | null = null;

    public static getInstance(): Sender {
        if (!Sender.instance) {
            Sender.instance = new Sender();
        }
        return Sender.instance;
    }

    constructor() { }

    getStatus() {
        this.lastStatus = new SenderStatus(
            this.port !== null,
            this.isOn ? 'run' : 'idle',
            this.error,
            this.lines.length ? this.lineIndex / this.lines.length : 0,
            this.z,
            this.x,
            this.feed,
            this.rpm
        );
        return this.lastStatus;
    }

    public addStatusChangeListener(listener: () => void): void {
        this.listeners.push(listener);
    }

    private notifyStatusChange() {
        this.listeners.forEach(listener => listener());
    }

    private setStatus(s: string) {
        if (s.startsWith('<')) s = s.substring(1);
        if (s.endsWith('>')) {
            s = s.slice(0, -1);
        }
        const parts = s.split('|');
        if (parts.length >= 3) {
            this.statusReceived = true;
            if (parts[1].startsWith('WPos:')) {
                const coords = parts[1].substring('WPos:'.length).split(',');
                this.z = Number(coords[2]);
                this.x = Number(coords[0]);
            }
            if (parts[2].startsWith('FS:')) {
                const coords = parts[2].substring('FS:'.length).split(',');
                this.feed = Number(coords[0]);
                this.rpm = Number(coords[1]);
            }
        }
        this.notifyStatusChange();
    }

    private setError(e: string) {
        this.error = e;
        appendLineToResponseEditor(e);
        this.notifyStatusChange();
    }

    isConnected() {
        return this.lastStatus !== null && this.lastStatus.isConnected;
    }

    async connect() {
        try {
            if (!this.port) {
                await this.selectPort();

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

    async start(text: string) {
        if (!text) return;

        this.isOn = true;
        this.lines = text.split('\n');
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        this.write('~');
        this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async sendCommand(command: string) {
        this.isOn = true;

        let commandArray = new Array(3);
        commandArray[0] = 'G91';
        commandArray[1] = command;
        commandArray[2] = 'G90';

        this.lines = commandArray;
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        this.write('~');
        this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async sendCommands(commands: string[]) {
        this.isOn = true;
        this.lines = commands;
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        this.write('~');
        this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async stop() {
        await this.write('!');
        if (!this.isOn) return;
        this.isOn = false;
        this.askForStatus();
        this.notifyStatusChange();
    }


    private async write(sequence: string) {
        if (!this.port) return;
        appendLineToResponseEditor(`command: ${sequence}`);
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
        this.waitForOkOrError = true;
        await this.write(line + '\n');
        await this.readFromPort();
    };

    private async processResponse(response: string) {
        this.unparsedResponse = (this.unparsedResponse + response).trimStart();
        appendLineToResponseEditor(`command: ${response}`);
        console.log(`response: "${response}"`);

        // Cut out status message.
        const statuses = this.unparsedResponse.match(/(<[^>]+>)/);
        if (statuses && statuses.length > 1) {
            statuses.shift();
            for (const s of statuses) {
                this.unparsedResponse = this.unparsedResponse.replace(s, '');
            }
            this.setStatus(statuses.pop()!);
        }

        if (this.unparsedResponse.startsWith('error:')) {
            this.setError(this.unparsedResponse);
            this.unparsedResponse = '';
            this.stop();
        } else if (this.unparsedResponse.startsWith('ok')) {
            this.unparsedResponse = '';
            this.waitForOkOrError = false;
            this.lineIndex++;
            this.notifyStatusChange();
            if (this.isOn) await this.writeCurrentLine();
        }
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
