import { Sender, SenderClient, SenderStatus } from './sender';
import { gcodeResponseEditor } from './main';
import { gcodeSenderEditor } from './main';

const gcodeCommands = [
    { command: '?', description: 'Get position and version info' },
    { command: '#', description: 'Display tool offsets' },
    { command: '!', description: 'Stop running Gcode' },
    { command: '~', description: 'Continue running Gcode' },
    { command: 'M17 Y', description: 'Enable Y axis' },
    { command: 'M18 Y', description: 'Disable Y axis' },
    { command: 'G90', description: 'Set to absolute positioning' },
    { command: 'G91', description: 'Set to relative positioning' },
    { command: 'G92 X0 Z0', description: 'Sets X and Z axis to 0 at current position' },
    { command: 'M905 X0.05 Z0.04', description: 'Sets backlash compensation values in mm' }
];

export class GCode {

    private sendButton: HTMLButtonElement;
    private resumeButton: HTMLButtonElement;
    private clearConsoleButton: HTMLButtonElement;
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
    private editTools: HTMLButtonElement;
    private editToolsModal: HTMLDivElement;
    private editToolsClose: HTMLButtonElement;
    private editToolSaveAll: HTMLButtonElement;
    private fastFeedrateInput: HTMLInputElement;
    private slowFeedrateInput: HTMLInputElement;
    private moveDistanceInput: HTMLInputElement;
    private wposCurrentPositionValue: HTMLInputElement;
    private getPositionButton: HTMLButtonElement;
    private motorZToggleBtn: HTMLButtonElement;
    private motorXToggleBtn: HTMLButtonElement;
    private motorYToggleBtn: HTMLButtonElement;


    constructor() {

        const commandInput = document.getElementById('singleCommandSender') as HTMLInputElement;
        commandInput.placeholder = "Type or select G-code command...";

        // Add dropdown behavior
        commandInput.addEventListener('click', () => {
            // Create or show dropdown
            let dropdown = document.getElementById('gcode-dropdown');

            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.id = 'gcode-dropdown';
                dropdown.className = 'gcode-dropdown';

                gcodeCommands.forEach(({ command, description }) => {
                    const option = document.createElement('div');
                    option.textContent = `${command} - ${description}`;
                    option.className = 'gcode-option';

                    option.addEventListener('click', () => {
                        commandInput.value = command;
                        dropdown!.remove();
                    });

                    dropdown!.appendChild(option);
                });

                // Position dropdown below input
                const rect = commandInput.getBoundingClientRect();
                dropdown.style.left = rect.left + 'px';
                dropdown.style.top = (rect.bottom + 2) + 'px';
                dropdown.style.width = rect.width + 'px';

                document.body.appendChild(dropdown);
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('gcode-dropdown');
            if (dropdown && !commandInput.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
                dropdown.remove();
            }
        });

        this.senderError = document.querySelector<HTMLDivElement>('.senderError')!;
        this.runProgress = document.getElementById('senderProgress') as HTMLProgressElement
        this.runProgressLabel = document.getElementById('senderProgressLabel') as HTMLSpanElement;
        this.connectButton = document.getElementById('connectButton') as HTMLButtonElement;
        this.gcodeResponseContainer = document.getElementById('gcodeResponseContainer') as HTMLDivElement;
        this.moveDistanceInput = document.getElementById('moveDistance') as HTMLInputElement;
        this.fastFeedrateInput = document.getElementById('fastFeedrate') as HTMLInputElement;
        this.slowFeedrateInput = document.getElementById('slowFeedrate') as HTMLInputElement;

        this.jogButtons = document.querySelectorAll('#latheControls .jog-btn') as NodeListOf<HTMLButtonElement>;
        this.toolButtons = document.querySelectorAll('#latheControls .tool-btn') as NodeListOf<HTMLButtonElement>;

        this.sendButton = document.getElementById('gcodeSenderButton') as HTMLButtonElement;
        this.sendSingleCommandButton = document.getElementById('gcodeSendSingleCommandButton') as HTMLButtonElement;
        this.singleCommandSender = document.getElementById('singleCommandSender') as HTMLInputElement;
        this.getPositionButton = document.getElementById('getPositionButton') as HTMLButtonElement;
        this.wposCurrentPositionValue = document.getElementById('wposCurrentPositionValue') as HTMLInputElement;

        this.motorZToggleBtn = document.getElementById('MotorZToggleBtn') as HTMLButtonElement;
        this.motorXToggleBtn = document.getElementById('MotorXToggleBtn') as HTMLButtonElement;
        this.motorYToggleBtn = document.getElementById('MotorYToggleBtn') as HTMLButtonElement;

        this.sender = Sender.getInstance();
        this.sender.addStatusChangeListener(() => this.handleStatusChange(), SenderClient.GCODE);

        this.resumeButton = document.getElementById('resumeButton') as HTMLButtonElement;
        this.resumeButton.addEventListener('click', async () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }
            await this.sender?.resume();
        });

        this.clearConsoleButton = document.getElementById('clearConsoleButton') as HTMLButtonElement;
        this.clearConsoleButton.addEventListener('click', () => {
            gcodeResponseEditor.setValue('');
        });

        this.getPositionButton.addEventListener('click', async () => {

            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            const status = await this.sender!.getPosition(SenderClient.GCODE);
            if (status) {
                this.wposCurrentPositionValue.value = `X${status.x.toFixed(3)} Y${status.y.toFixed(3)} Z${status.z.toFixed(3)}`;

                //update the steppers enabled status
                this.updateMotorStatus(status);
            }
        });

        //get feedrate from local storage
        let fastFeedrate = localStorage.getItem('fastFeedrate');
        let slowFeedrate = localStorage.getItem('slowFeedrate');
        let moveDistance = localStorage.getItem('moveDistance');

        if (fastFeedrate) {
            this.fastFeedrateInput.value = fastFeedrate;
            localStorage.setItem('fastFeedrate', fastFeedrate);
        }

        if (slowFeedrate) {
            this.slowFeedrateInput.value = slowFeedrate;
            localStorage.setItem('slowFeedrate', slowFeedrate);
        }

        if (moveDistance) {
            this.moveDistanceInput.value = moveDistance;
            localStorage.setItem('moveDistance', moveDistance);
        }

        //if user changes feedrate save to local storage
        this.fastFeedrateInput.addEventListener('change', () => {
            localStorage.setItem('fastFeedrate', this.fastFeedrateInput.value);
        });

        this.slowFeedrateInput.addEventListener('change', () => {
            localStorage.setItem('slowFeedrate', this.slowFeedrateInput.value);
        });

        this.moveDistanceInput.addEventListener('change', () => {
            localStorage.setItem('moveDistance', this.moveDistanceInput.value);
        });

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
                    feedrate = this.fastFeedrateInput.value;
                    axis = 'X';
                    distance = this.moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'slowForward') {
                    feedrate = this.slowFeedrateInput.value;
                    axis = 'X';
                    distance = this.moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'fastBackward') {
                    feedrate = this.fastFeedrateInput.value;
                    axis = 'X';
                    distance = this.moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'slowBackward') {
                    feedrate = this.slowFeedrateInput.value;
                    axis = 'X';
                    distance = this.moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'fastLeft') {
                    feedrate = this.fastFeedrateInput.value;
                    axis = 'Z';
                    distance = this.moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'slowLeft') {
                    feedrate = this.slowFeedrateInput.value;
                    axis = 'Z';
                    distance = this.moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'fastRight') {
                    feedrate = this.fastFeedrateInput.value;
                    axis = 'Z';
                    distance = this.moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'slowRight') {
                    feedrate = this.slowFeedrateInput.value;
                    axis = 'Z';
                    distance = this.moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'fastUp') {
                    feedrate = this.fastFeedrateInput.value;
                    axis = 'Y';
                    distance = this.moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'slowUp') {
                    feedrate = this.slowFeedrateInput.value;
                    axis = 'Y';
                    distance = this.moveDistanceInput.value;
                    positive = true;
                } else if (btn.id == 'fastDown') {
                    feedrate = this.fastFeedrateInput.value;
                    axis = 'Y';
                    distance = this.moveDistanceInput.value;
                    positive = false;
                } else if (btn.id == 'slowDown') {
                    feedrate = this.slowFeedrateInput.value;
                    axis = 'Y';
                    distance = this.moveDistanceInput.value;
                    positive = false;
                }

                let positiveModifier = positive === true ? '' : '-';
                let command = `G0 ${axis}${positiveModifier}${distance} F${feedrate}`;
                if (this.sender) {
                    let commands = new Array(3);
                    commands[0] = 'G91'; //set to relative positioning
                    commands[1] = command;
                    commands[2] = 'G90'; //set to absolute positioning

                    this.sender.sendCommands(commands, SenderClient.GCODE);
                }
            });
        });

        const toolChangeButton = document.getElementById('toolChange') as HTMLButtonElement;
        const toolSelector = document.getElementById('toolSelector') as HTMLSelectElement;

        toolChangeButton.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            let commandArray = new Array(1);
            commandArray[0] = toolSelector.value;

            if (this.sender) {
                this.sender.sendCommands(commandArray, SenderClient.GCODE);
            }

        });

        // Zeroing buttons

        const wposZeroZ = document.getElementById('WposZeroZ') as HTMLButtonElement;
        const wposZeroX = document.getElementById('WposZeroX') as HTMLButtonElement;
        const wposZeroY = document.getElementById('WposZeroY') as HTMLButtonElement;

        //event handlers for zeroing buttons
        wposZeroZ.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            this.sender.sendCommand('G92 Z0', SenderClient.GCODE);
        });

        wposZeroX.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            this.sender.sendCommand('G92 X0', SenderClient.GCODE);
        });

        wposZeroY.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            this.sender.sendCommand('G92 Y0', SenderClient.GCODE);
        });


        this.motorZToggleBtn.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            const isEnabled = this.motorZToggleBtn.classList.contains('motor-enable');
            //if isEnabled remove motor-enabled class and add motor-disabled class
            if (isEnabled) {
                this.motorZToggleBtn.classList.remove('motor-enable');
                this.motorZToggleBtn.classList.add('motor-disable');
                this.motorZToggleBtn.title = 'Click to disable X axis';
            } else {
                this.motorZToggleBtn.classList.add('motor-enable');
                this.motorZToggleBtn.classList.remove('motor-disable');
                this.motorZToggleBtn.title = 'Click to enable X axis';
            }
            const command = isEnabled ? 'M18 Z' : 'M17 Z';
            this.sender.sendCommand(command, SenderClient.GCODE);
        });

        this.motorXToggleBtn.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            const isEnabled = this.motorXToggleBtn.classList.contains('motor-enable');
            //if isEnabled remove motor-enabled class and add motor-disabled class
            if (isEnabled) {
                this.motorXToggleBtn.classList.remove('motor-enable');
                this.motorXToggleBtn.classList.add('motor-disable');
                this.motorXToggleBtn.title = 'Click to enable X axis';
            } else {
                this.motorXToggleBtn.classList.add('motor-enable');
                this.motorXToggleBtn.classList.remove('motor-disable');
                this.motorXToggleBtn.title = 'Click to disable X axis';
            }
            const command = isEnabled ? 'M18 X' : 'M17 X';
            this.sender.sendCommand(command, SenderClient.GCODE);
        });

        this.motorYToggleBtn.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            const isEnabled = this.motorYToggleBtn.classList.contains('motor-enable');
            //if isEnabled remove motor-enabled class and add motor-disabled class
            if (isEnabled) {
                this.motorYToggleBtn.classList.remove('motor-enable');
                this.motorYToggleBtn.classList.add('motor-disable');
                this.motorYToggleBtn.title = 'Click to enable Y axis';
            } else {
                this.motorYToggleBtn.classList.add('motor-enable');
                this.motorYToggleBtn.classList.remove('motor-disable');
                this.motorYToggleBtn.title = 'Click to disable Y axis';
            }
            const command = isEnabled ? 'M18 Y' : 'M17 Y';
            this.sender.sendCommand(command, SenderClient.GCODE);
        });

        this.editTools = document.getElementById('editToolsButton') as HTMLButtonElement;
        this.editToolsModal = document.getElementById('editToolsModal') as HTMLDivElement;
        this.editToolsClose = document.getElementById('editToolsModalCloseButton') as HTMLButtonElement;
        this.editToolSaveAll = document.getElementById('editToolSaveAll') as HTMLButtonElement;

        this.editTools.addEventListener('click', async () => {

            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            this.editToolsModal.style.display = 'block';

            // Fetch tool offsets
            if (this.sender) {

                const tbody = document.getElementById('toolOffsetTableBody');
                if (tbody) tbody.innerHTML = '';

                const response = await this.sender.getToolOffsets(SenderClient.GCODE);
                const toolOffsets = parseToolOffsets(response);

                toolOffsets.forEach(offset => {
                    if (offset.tool == 0) return;
                    this.addToolRow(offset.tool, offset.z, offset.x, offset.w, offset.u);
                });

                //log to console
                console.log("Tool Offsets As Response: " + response);
            }
        });

        this.editToolSaveAll.addEventListener('click', () => {
            if (!this.sender?.isConnected()) {
                alert("Please connect to the controller first.");
                return;
            }

            const tbody = document.getElementById('toolOffsetTableBody');
            if (!tbody) return;

            const rows = tbody.children;
            const commands = new Array(rows.length);
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i] as HTMLTableRowElement;
                const toolNumber = parseInt((row.children[0].children[0] as HTMLInputElement).value.replace('T', ''));
                const zOffset = parseFloat((row.children[1].children[0] as HTMLInputElement).value);
                const wOffset = parseFloat((row.children[2].children[0] as HTMLInputElement).value);
                const xOffset = parseFloat((row.children[3].children[0] as HTMLInputElement).value);
                const uOffset = parseFloat((row.children[4].children[0] as HTMLInputElement).value);


                commands[i] = `G10 P${toolNumber} Z${zOffset} X${xOffset} W${wOffset} U${uOffset}`;
            }

            if (this.sender) {
                this.sender.sendCommands(commands, SenderClient.GCODE);
            }
        });


        interface ToolOffset {
            tool: number;
            z: number;
            x: number;
            w: number;  // Z-axis compensation
            u: number;  // X-axis compensation
        }

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

        this.editToolsClose.addEventListener('click', () => {
            this.editToolsModal.style.display = 'none';
        });

        this.connectButton.addEventListener('click', async () => {
            this.gcodeResponseContainer.style.display = 'block';
            if (!this.sender?.isConnected() && this.sender) {
                await this.sender.connect();
            }

            const status = await this.sender!.getPosition(SenderClient.GCODE);
            if (status) {
                this.wposCurrentPositionValue.value = `X${status.x.toFixed(3)} Y${status.y.toFixed(3)} Z${status.z.toFixed(3)}`;

                //update the steppers enabled status
                this.updateMotorStatus(status);
            }
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

    updateMotorStatus(status: SenderStatus) {
        if (status.xEna === 1) {
            this.motorXToggleBtn.classList.add('motor-enable');
            this.motorXToggleBtn.classList.remove('motor-disable');
            this.motorXToggleBtn.title = 'Click to disable X axis';
        } else {
            this.motorXToggleBtn.classList.remove('motor-enable');
            this.motorXToggleBtn.classList.add('motor-disable');
            this.motorXToggleBtn.title = 'Click to enable X axis';
        }

        if (status.yEna === 1) {
            this.motorYToggleBtn.classList.add('motor-enable');
            this.motorYToggleBtn.classList.remove('motor-disable');
            this.motorYToggleBtn.title = 'Click to disable Y axis';
        } else {
            this.motorYToggleBtn.classList.remove('motor-enable');
            this.motorYToggleBtn.classList.add('motor-disable');
            this.motorYToggleBtn.title = 'Click to enable Y axis';
        }

        if (status.zEna === 1) {
            this.motorZToggleBtn.classList.add('motor-enable');
            this.motorZToggleBtn.classList.remove('motor-disable');
            this.motorZToggleBtn.title = 'Click to disable Z axis';
        } else {
            this.motorZToggleBtn.classList.remove('motor-enable');
            this.motorZToggleBtn.classList.add('motor-disable');
            this.motorZToggleBtn.title = 'Click to enable Z axis';
        }
    }

    addToolRow(toolNumber: number, zOffset: number, xOffset: number, wOffset: number, uOffset: number) {
        const tbody = document.getElementById('toolOffsetTableBody');
        if (!tbody) return;

        const row = document.createElement('tr');

        // Tool number cell
        const toolCell = document.createElement('td');
        toolCell.className = 'tool-cell';
        const toolInput = document.createElement('input');
        toolInput.type = 'text';
        toolInput.value = `T${toolNumber}`;
        toolInput.readOnly = true;
        toolInput.className = 'tool-input'
        toolCell.appendChild(toolInput);

        // Z Offset cell
        const zCell = document.createElement('td');
        zCell.className = 'data-cell';
        const zInput = document.createElement('input');
        zInput.type = 'number';
        zInput.value = zOffset.toString();
        zInput.step = "0.001";  // Added step for precision
        zInput.className = 'input-cell';
        zCell.appendChild(zInput);

        // X Offset cell
        const xCell = document.createElement('td');
        xCell.className = 'data-cell';
        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.value = xOffset.toString();
        xInput.step = "0.001";
        xInput.className = 'input-cell';
        xCell.appendChild(xInput);

        // W Offset cell
        const wCell = document.createElement('td');
        wCell.className = 'data-cell';
        const wInput = document.createElement('input');
        wInput.type = 'number';
        wInput.value = wOffset.toString();
        wInput.step = "0.001";
        wInput.className = 'input-cell';
        wCell.appendChild(wInput);

        // U Offset cell
        const uCell = document.createElement('td');
        uCell.className = 'data-cell';
        const uInput = document.createElement('input');
        uInput.type = 'number';
        uInput.value = uOffset.toString();
        uInput.step = "0.001";
        uInput.className = 'input-cell';
        uCell.appendChild(uInput);

        // Save button cellS
        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell';
        const saveButton = document.createElement('button');
        saveButton.className = 'tool-save-button';  // Added width constraint
        saveButton.title = `Save Tool T${toolNumber} Offsets`;
        saveButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24" height="24">
                <path d="M10 5 L40 5 L45 10 L45 40 L40 45 L10 45 L5 40 L5 10 Z" fill="none" stroke="white" stroke-width="2" />
                <rect x="15" y="5" width="20" height="15" fill="none" stroke="white" stroke-width="2" />
                <circle cx="25" cy="30" r="8" fill="none" stroke="white" stroke-width="2" />
            </svg>
        `;

        saveButton.addEventListener('click', () => {
            const x = xInput.value;
            const z = zInput.value;
            const w = wInput.value;
            const u = uInput.value;
            const command = `G10 P${toolNumber} Z${z} X${x} W${w} U${u}`;
            if (this.sender) {
                this.sender.sendCommand(command, SenderClient.GCODE);
            }
        });

        actionCell.appendChild(saveButton);

        row.append(toolCell, zCell, xCell, wCell, uCell, actionCell);
        tbody.appendChild(row);
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
        const isStreaming = this.sender.isStreaming();
        const busy = isRun || isStreaming;

        this.runProgress.value = status.progress;
        this.runProgress.style.display = isStreaming ? 'block' : 'none';
        this.runProgressLabel.style.display = isStreaming ? 'block' : 'none';

        this.sendButton.disabled = busy;
        this.sendButton.style.display =  busy ? 'none' : 'inline-block';
        this.sendSingleCommandButton.disabled = busy;

        //enable jogging controls
        this.jogButtons.forEach((btn) => {
            btn.disabled = busy;
        });

        //enable tool change buttons
        this.toolButtons.forEach((btn) => {
            btn.disabled = busy;
        });

        

        if (this.stopButton) this.stopButton.style.display = busy ? 'inline-block' : 'none';

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


