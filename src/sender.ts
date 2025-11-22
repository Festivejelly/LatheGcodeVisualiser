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
        readonly zEna: number,
        readonly xEna: number,
        readonly yEna: number,
        readonly feed: number,
        readonly rpm: number,
        readonly version: string,
        readonly lastResponse: string,
        readonly isStreaming: boolean) { }
}

type StatusChangeListener = {
    callback: () => void;
    client: SenderClient;
}

let isDebug = false;

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
    private zEna = 0;
    private xEna = 0;
    private yEna = 0;
    private feed = 0;
    private rpm = 0;
    private isDisconnecting = false;
    private lastStatus: SenderStatus | null = null;
    private version = '';
    private lastResponse = '';

    private statusPollInterval: number | null = null;

    public static getInstance(): Sender {
        if (!Sender.instance) {
            Sender.instance = new Sender();
        }
        return Sender.instance;
    }

    constructor() {
        if (localStorage.getItem("SenderDebug") === 'true') {
            isDebug = true;
        }
        else if (localStorage.getItem("SenderDebug") === 'false') {
            isDebug = false;
        } else {
            isDebug = false; // default to false
        }
    }

    //getters for debugging
    public getIsOn(): boolean {
        return this.isOn;
    }

    public getLineIndex(): number {
        return this.lineIndex;
    }

    public getLinesLength(): number {
        return this.lines.length;
    }

    public setActiveClient(client: SenderClient) {
        this.activeClient = client;
        this.log(`Active client set to: ${client}`);
    }

    public clearActiveClient() {
        this.activeClient = null;
        this.log('Active client cleared');
    }

    getStatus() {

        const total = this.lines?.length ?? 0;
        const idx = this.lineIndex ?? 0;

        // Streaming = we’ve started a batch and haven’t finished acking all lines yet
        const streaming = this.waitForOkOrError || (total > 0 && idx < total);

        // Keep progress as 0..1 (your handler already uses it this way)
        const progress = total ? idx / total : 0;

        this.lastStatus = new SenderStatus(
            this.port !== null,
            this.isOn ? 'run' : 'idle',
            this.error,
            progress,
            this.currentLine,
            this.feedRate,
            this.z,
            this.x,
            this.y,
            this.mZ,
            this.mX,
            this.mY,
            this.zEna,
            this.xEna,
            this.yEna,
            this.feed,
            this.rpm,
            this.version,
            this.lastResponse,
            streaming
        );
        return this.lastStatus;
    }

    public getCurrentCommand(): string {
        return this.currentLine;
    }

    public shouldShowResume(): boolean {
        return !this.isOn &&                      // Controller is paused/idle
            this.lineIndex < this.lines.length && // Still have lines to send
            this.lines.length > 0;                // There is actually a job loaded
    }

    public addStatusChangeListener(callback: () => void, client: SenderClient): void {
        this.listeners.push({ callback, client });
    }

    private notifyStatusChange() {
        this.listeners.forEach(listener => {
            if (listener.client === this.activeClient) {
                this.log(`Notifying ${listener.client} listener`);
                listener.callback();
            } else {
                this.log(`Skipping ${listener.client} listener (not active)`);
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
    // private previousIsOn: boolean | null = null;

    private setStatus(fragment: string) {
        // Append new data to any partial we already had
        let buf = this.remainingStatus + fragment;
        this.remainingStatus = '';

        // Extract zero or more complete <...> packets
        while (true) {
            const start = buf.indexOf('<');
            if (start === -1) {
                // No start marker at all -> discard any noise before next call
                return;
            }
            const end = buf.indexOf('>', start + 1);
            if (end === -1) {
                // Incomplete: keep from '<' onward for the next fragment
                this.remainingStatus = buf.slice(start);
                return;
            }

            // We have a complete packet: parse its payload (between < and >)
            const payload = buf.slice(start + 1, end);
            this.parseStatusPayload(payload);

            // Advance and continue (there might be more packets in this buf)
            buf = buf.slice(end + 1);
            if (!buf.length) return;
        }
    }

    /*private lastLoggedStatus?: {
        state: string; x: number; y: number; z: number;
        feed: number; rpm: number; steppers: string;
    }; */

    // Parses one complete payload like "Idle|WPos:...|Steppers:...|FS:...|Id:..."
    private parseStatusPayload(payload: string) {
        const parts = payload.split('|');
        if (!parts.length) return;

        const state = (parts[0] ?? '').trim();        // "Idle" or "Run"
        this.statusReceived = true;
        this.isOn = state !== 'Idle';

        this.log(`Status received: <${payload}>`);

        for (let i = 1; i < parts.length; i++) {
            const p = parts[i];

            if (p.startsWith('WPos:')) {
                const c = p.slice(5).split(',');
                if (c[0] !== undefined && c[0] !== '') this.x = Number(c[0]);
                if (c[1] !== undefined && c[1] !== '') this.y = Number(c[1]);
                if (c[2] !== undefined && c[2] !== '') this.z = Number(c[2]);
                continue;
            }

            if (p.startsWith('Steppers:')) {
                const e = p.slice(9).split(',');
                if (e[0] !== undefined && e[0] !== '') this.xEna = Number(e[0]);
                if (e[1] !== undefined && e[1] !== '') this.yEna = Number(e[1]);
                if (e[2] !== undefined && e[2] !== '') this.zEna = Number(e[2]);
                continue;
            }

            if (p.startsWith('FS:')) {
                const f = p.slice(3).split(',');
                if (f[0] !== undefined && f[0] !== '') this.feed = Number(f[0]);
                if (f[1] !== undefined && f[1] !== '') this.rpm = Number(f[1]);
                continue;
            }

            if (p.startsWith('Id:')) {
                this.version = String(p.slice(3));
                continue;
            }
            // ignore unknowns
        }

        this.notifyStatusChange();
    }

    async resume() {
        if (this.port && this.writer) {
            await this.write('~');
            this.heldByHost = false;
            this.m0Waiting = false;
            this.pauseReason = undefined;
        }
    }

    public isWaitingForOk(): boolean {
        return this.waitForOkOrError;
    }
    public hasPendingLines(): boolean {
        const total = this.lines?.length ?? 0;
        return this.lineIndex < total;
    }

    private log(message?: any, ...optionalParams: any[]) {
        if (isDebug) {
            console.log(message, ...optionalParams);
        }
    }

    private setError(e: string,) {
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

                this.statusBuf = "";
                this.textBuf = "";
                this.remainingResponse = "";
                this.statusReceived = false;

                await this.selectPort();

                this.startContinuousReading();

                this.write('!'); // Stop any running job

                await this.askForStatus();
                if (!(await waitForTrue(() => this.statusReceived))) {
                    this.setError('Device is not reponding, is it in GCODE mode?');
                    return;
                }
                this.isDisconnecting = false;

                this.setError('');
                this.waitForOkOrError = false;

                this.startStatusPolling();
            } else {
                this.closePort();
            }

        } catch (error) {
            console.error(error);
        }
        this.notifyStatusChange();
    }

    private startStatusPolling() {
        // Stop any existing polling first
        this.stopStatusPolling();

        // Poll every 250ms
        this.statusPollInterval = window.setInterval(() => {
            if (this.port && this.writer && !this.isDisconnecting && !this.isProcessingResponse && !this.waitForOkOrError) {
                this.write('?');
            }
        }, 250);
    }

    private stopStatusPolling() {
        if (this.statusPollInterval !== null) {
            window.clearInterval(this.statusPollInterval);
            this.statusPollInterval = null;
        }
    }

    public isStreaming(): boolean {
        const total = this.lines?.length ?? 0;
        const idx = Math.min(this.lineIndex ?? 0, total);
        return this.waitForOkOrError || (total > 0 && idx < total);
    }

    private m0Waiting = false;   // true while an M0 is pending resume
    private heldByHost = false;  // true after we send '!' (feed hold)
    private pauseReason: string | undefined;

    public getPauseReason(): string | undefined {
        return this.pauseReason;
    }

    private extractPauseReasonFromM0(raw: string): string | undefined {
        // prefer a semicolon comment on the same line
        const semi = raw.indexOf(';');
        if (semi >= 0) {
            const txt = raw.slice(semi + 1).trim();
            if (txt) return txt;
        }
        // optional fallbacks:
        const mMsg = raw.match(/\(\s*MSG\s*,\s*([^)]+)\)/i);
        if (mMsg) return mMsg[1].trim();

        const mPar = raw.match(/\(([^)]+)\)/);
        if (mPar) return mPar[1].trim();

        const mFree = raw.match(/^\s*M0\b\s+([^;()]+)\s*(?:[;(].*)?$/i);
        if (mFree) return mFree[1].trim();

        return undefined;
    }

    public canResume(): boolean {
        // Only show Resume when we truly paused: M0 hold or feed-hold
        return this.m0Waiting || this.heldByHost;
    }

    //not used currently
    /*     private isRealtime(line: string) {
            return /^\s*[!?~]\s*$/.test(line);
        } */

    async disconnect() {
        this.statusBuf = "";
        this.textBuf = "";
        this.remainingResponse = "";
        this.isDisconnecting = true;
        this.isReading = false;
        this.stopStatusPolling();
        this.statusReceived = false;
        if (this.port)
            this.closePort();
    }

    getDisconnectingStatus() {
        return this.isDisconnecting;
    }

    async start(text: string, client: SenderClient) {
        if (!text) return;
        this.setActiveClient(client);

        this.lines = text.split('\n');
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        await this.write('~');
        await this.writeCurrentLine();

        this.notifyStatusChange();
    }

    async sendCommand(command: string, client: SenderClient) {
        this.setActiveClient(client);

        this.lines = [command];
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        await this.write('~');
        await this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async sendCommands(commands: string[], client: SenderClient) {
        this.setActiveClient(client);

        this.lines = commands;
        this.lineIndex = 0;
        this.waitForOkOrError = false;
        await this.write('~');
        await this.writeCurrentLine();
        this.notifyStatusChange();
    }

    async getPosition(client: SenderClient) {
        this.setActiveClient(client);
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

    private async done() {
        this.waitForOkOrError = false;

        // Clear batch/bookkeeping so “streaming” logic won’t stick true
        this.lines = [];
        this.lineIndex = 0;
        this.currentLine = '';
        this.notifyStatusChange();
    }

    async stop() {
        this.error = '';
        await this.write('!');
        this.heldByHost = true;
        this.lines = [];
        this.lineIndex = 0;
        this.currentLine = '';
        this.notifyStatusChange();
    }

    async unhold() {
        if (this.port && this.writer) {
            await this.write('~');
            this.heldByHost = false;
            this.m0Waiting = false;
            this.pauseReason = undefined;
            this.notifyStatusChange();
        }
    }

    private async write(sequence: string) {
        if (!this.port) return;
        this.log('command: ', sequence);
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
        if (this.waitForOkOrError) return;
        if (this.lineIndex >= this.lines.length) {
            this.done();
            return;
        }

        const raw = this.lines[this.lineIndex];
        const line = raw.split(';')[0].trim();
        if (!line) {
            this.lineIndex++;
            this.writeCurrentLine();
            return;
        }

        this.m0Waiting = /^\s*M0\b/i.test(line);
        this.pauseReason = this.m0Waiting ? this.extractPauseReasonFromM0(raw) : undefined;

        this.currentLine = line;
        this.notifyCurrentCommand(this.currentLine);

        this.waitForOkOrError = true;
        //this.log(`command: "${line}"`);
        appendLineToResponseEditor(`command: ${line}`);
        await this.write(line + '\n');
    };

    private isProcessingResponse: boolean = false;
    private statusBuf = '';   // holds a partial "<..."
    private textBuf = '';     // holds a partial line

    private async processResponse(response: string) {
        // 0) Normalize CRs and prepend any partial status from last time
        let s = (this.statusBuf + response).replace(/\r/g, "");
        this.statusBuf = "";

        // 1) Extract zero or more COMPLETE <...> packets; keep trailing partial in statusBuf
        const completeStatuses: string[] = [];
        while (true) {
            const start = s.indexOf("<");
            if (start === -1) break;
            const end = s.indexOf(">", start + 1);
            if (end === -1) {
                // stash the partial "<..."; leave the text before it as remainder
                this.statusBuf = s.slice(start);
                s = s.slice(0, start);
                break;
            }
            completeStatuses.push(s.slice(start, end + 1)); // includes < and >
            s = s.slice(0, start) + s.slice(end + 1);       // remove that packet and continue
        }

        // 2) Feed all complete statuses to your parser
        for (const st of completeStatuses) this.setStatus(st);

        // 3) Append remaining NON-status text to a carry-over buffer,
        //    then process ONLY COMPLETE lines; keep the trailing partial for next call
        this.textBuf += s;

        while (true) {
            const nl = this.textBuf.indexOf("\n");
            if (nl === -1) break;                      // no complete line yet; wait for next chunk
            const raw = this.textBuf.slice(0, nl).trim();
            this.textBuf = this.textBuf.slice(nl + 1); // drop the processed line

            if (!raw) continue;

            if (/^error:/i.test(raw)) {
                this.remainingResponse += (this.remainingResponse ? "\n" : "") + raw;
                appendLineToResponseEditor(`response: ${this.remainingResponse}`);
                this.log(`response: "${this.remainingResponse}"`);
                this.setError(raw);
                this.remainingResponse = "";
                this.stop();
                continue;
            }

            if (/^\s*ok\b/i.test(raw) || /\bok\b/i.test(raw)) {
                this.remainingResponse += (this.remainingResponse ? "\n" : "") + raw;


                const formattedResponse = this.formatToolOffsets(this.remainingResponse);


                appendLineToResponseEditor(`response: ${formattedResponse}`);
                this.lastResponse = this.remainingResponse;
                this.log(`response: "${this.remainingResponse}"`);
                this.remainingResponse = "";

                this.waitForOkOrError = false;
                this.lineIndex++;

                this.notifyStatusChange();

                if (this.m0Waiting) {
                    this.m0Waiting = false;
                    this.pauseReason = undefined;
                }

                // optional: immediate status ping (guarded)
                if (this.port && this.writer && !this.isDisconnecting && !this.waitForOkOrError) {
                    void this.write('?');
                }

                // send next line (don’t gate on this.isOn anymore)
                await this.writeCurrentLine();
                continue;
            }

            // Not ok/error: accumulate/log if you want
            this.remainingResponse += (this.remainingResponse ? "\n" : "") + raw;
        }
    }

    private formatToolOffsets(raw: string): string {
        // Check if this is a tool offsets response
        if (!raw.startsWith('toolOffsets:')) {
            return raw;
        }

        // Extract the data after "toolOffsets:"
        const data = raw.substring('toolOffsets:'.length);

        // Split by pipe to get individual tools
        const tools = data.split('|');

        let formatted = 'Tool Offsets:\n';
        formatted += '─'.repeat(60) + '\n';
        formatted += 'Tool | Z Offset | X Offset | W Comp   | U Comp\n';
        formatted += '─'.repeat(60) + '\n';

        tools.forEach((tool) => {
            if (!tool.trim()) return;

            // Parse the tool data (format: T0:Z=0.000,X=0.000,W=0.000,U=0.000)
            const match = tool.match(/T(\d+):Z=([-\d.]+),X=([-\d.]+),W=([-\d.]+),U=([-\d.]+)/);
            if (match) {
                const [, toolNum, z, x, w, u] = match;
                formatted += `T${toolNum?.padStart(2)}  | ${z?.padStart(8)} | ${x?.padStart(8)} | ${w?.padStart(8)} | ${u?.padStart(8)}\n`;
            }
        });

        formatted += '─'.repeat(60);
        return formatted;
    }


    private isReading: boolean = false;

    private async startContinuousReading() {
        console.log('=== startContinuousReading: STARTED ===')

        if (this.isReading) {
            console.log('Already reading, returning');
            return;
        }
        this.isReading = true;

        while (this.port && !this.isDisconnecting && this.isReading) {
            try {
                if (!this.port.readable) {
                    console.log('Port not readable, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                if (!this.reader) {
                    console.log('Creating reader...');
                    const textDecoder = new TextDecoderStream();
                    this.port.readable.pipeTo(textDecoder.writable);
                    this.reader = textDecoder.readable.getReader();
                }
                //console.log('Waiting for read...');
                const { value, done } = await this.reader.read();
                //console.log('Read complete - done:', done, 'value:', value);
                if (done) break;
                //console.log('Read result - done:', done, 'value length:', value?.length);
                if (value) {
                    await this.processResponse(value);
                }
            } catch (e: any) {
                this.setError(e.message || String(e));
                this.closePort();
                break;
            }
        }
        this.isReading = false;
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
                //this.readSoon();
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
