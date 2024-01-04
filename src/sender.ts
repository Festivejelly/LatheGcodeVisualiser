import { gcodeResponseEditor } from './main';

export class SenderStatus {
    constructor(
        readonly condition: 'disconnected' | 'idle' | 'run',
        readonly error: string,
        readonly progress: number,
        readonly z: number,
        readonly x: number,
        readonly feed: number,
        readonly rpm: number) { }
}

export class Sender {
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
    //private keyCodes: string[] = [];

    constructor(readonly statusChangeCallback: () => void) { }

    getStatus() {
        return {
            condition: this.port ? (this.isOn ? 'run' : 'idle') : 'disconnected',
            error: this.error,
            progress: this.lines.length ? this.lineIndex / this.lines.length : 0,
            z: this.z,
            x: this.x,
            feed: this.feed,
            rpm: this.rpm,
        }
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
        this.statusChangeCallback();
    }

    private setError(e: string) {
        this.error = e;
        this.statusChangeCallback();
    }

    private isCommand(command: string[]) {
        const commandPrefixes = ['!', '~', '?', '='];
        return commandPrefixes.some(prefix => command[0].startsWith(prefix));
    }

    async connect() {
        try {
            if (!this.port) {
                await this.selectPort();
            } else {
                this.closePort();
            }

        } catch (error) {
            console.log(error);
        }
        this.statusChangeCallback();
    }

    async start(text: string) {
        if (!text) return;

        this.lines = text.split('\n');

        if (!this.isCommand(this.lines) && !this.rpm) {
            this.setError('Spindle is not running, turn it on first');
            return;
        }
        if (this.isOn) {
            this.stop();
        }
        if (!this.port) {
            await this.selectPort();
            if (!this.port) return;
        }
        await this.askForStatus();
        if (!(await waitForTrue(() => this.statusReceived))) {
            this.setError('Device is not reponding, is it in GCODE mode?');
            return;
        }


        this.lineIndex = 0;
        this.isOn = true;
        this.setError('');
        this.waitForOkOrError = false;
        this.unparsedResponse = '';
        this.write('~');
        this.writeCurrentLine();
        this.statusChangeCallback();
    }

    async stop() {
        await this.write('!');
        if (!this.isOn) return;
        this.isOn = false;
        this.askForStatus();
        this.statusChangeCallback();
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
            this.statusChangeCallback();
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
            this.statusChangeCallback();
        }
        if (this.port) {
            try {
                await this.port.open({ baudRate: 115200 });
                this.statusChangeCallback();
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
        this.readTimeout = 0;
        if (this.reader) {
            if (this.reader.releaseLock) this.reader.releaseLock();
            this.reader = null;
        }
        if (this.writer) {
            if (this.writer.releaseLock) this.writer.releaseLock();
            this.writer = null;
        }
        try {
            await this.port.close();
        } catch (e) {
            // Ignore close errors.
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
