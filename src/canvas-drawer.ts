export enum MovementType {
    Cut,
    Travel,
    Retract
}

export type GCodeCommand = {
    x?: number;
    z?: number;
    isRelative: boolean;
    absolutePosition?: AbsolutePosition;
    movementType?: MovementType;
    lineNumber?: number; // Line number in the original G-code file
    originalLine?: string; // Original line text from the G-code file
};

export type AbsolutePosition = { z: number, x: number };

// Constants for drawing colors and offsets
const cutLineColour = '#DC143C'
const travelLineColour = '#6B8E23'
const retractLineColour = '#FFA500'
const currentLineColour = '#242424'
const offSetFromScreenEdgeZ = 5;

export class CanvasDrawer {
    private currentX: number = 0;
    private currentZ: number = 0;
    private absX: number = 0;
    private absZ: number = 0;
    private previousCanvasX: number = 0;
    private previousCanvasZ: number = 0;
    private canvasX: number = 0;
    private canvasZ: number = 0;
    private ctx: CanvasRenderingContext2D | null = null;

    constructor() { }

    parseGCode(data: string): GCodeCommand[] {
        const commands: GCodeCommand[] = [];
        let isRelative = false; // Track the relative positioning mode
        const drawableCommands: GCodeCommand[] = [];
        const absolutePosition: AbsolutePosition = { z: 0, x: 0 };

        const lines = data.split('\n');
        lines.forEach((line, index) => {
            const movementType: MovementType = this.determineMovementType(line);

            const command: GCodeCommand = { isRelative: isRelative, movementType };
            const parts = line.match(/([GXYZF])([0-9.-]+)/g);

            parts?.forEach(part => {
                const value = parseFloat(part.slice(1));
                switch (part[0]) {
                    case 'G':
                        if (value === 90) {
                            command.isRelative = false;
                            isRelative = false;
                        }
                        if (value === 91) {
                            command.isRelative = true;
                            isRelative = true;
                        }
                        break;
                    case 'X':
                        command.x = parseFloat(value.toFixed(3));
                        if (!isRelative) {
                            absolutePosition.x = parseFloat(value.toFixed(3));
                        } else {
                            absolutePosition.x = parseFloat((absolutePosition.x + value).toFixed(3));
                        }
                        break;
                    case 'Z':
                        command.z = parseFloat(value.toFixed(3));
                        if (!isRelative) {
                            absolutePosition.z = parseFloat(value.toFixed(3));
                        } else {
                            absolutePosition.z = parseFloat((absolutePosition.z + value).toFixed(3));
                        }
                        break;
                }
            });

            const newCommand: GCodeCommand = {
                ...command,
                lineNumber: index + 1,
                originalLine: line,
                absolutePosition: { ...absolutePosition } // Add the 'absolutePosition' property
            };

            if ((command.z !== undefined) || (command.x !== undefined)) {
                drawableCommands.push(newCommand);
            }
            commands.push(newCommand);
        });

        return drawableCommands;
    }

    determineMovementType(line: string): MovementType {
        // Convert to lowercase and get the comment part (if any)
        const lowerLine = line.toLowerCase();
        const commentPart = lowerLine.includes(';') ? lowerLine.substring(lowerLine.indexOf(';')).trim() : '';

        // Check for various cutting-related terms
        if (commentPart.includes('cut') ||
            commentPart.includes('rough') ||
            commentPart.includes('finish') ||
            commentPart.includes('facing') ||
            commentPart.includes('turn')) {
            return MovementType.Cut;
        }

        // Check for retract operations
        if (commentPart.includes('retract') ||
            commentPart.includes('return') ||
            commentPart.includes('safe')) {
            return MovementType.Retract;
        }

        // Default to travel movement
        return MovementType.Travel;
    }

    calculateDynamicScaleFactor(commands: GCodeCommand[], canvas: HTMLCanvasElement): number {
        let maxZ = 0;
        let minX = 0;

        let initialCommand = commands.find(command => !command.isRelative);
        let cumulativeXRelative = initialCommand && initialCommand.x ? initialCommand.x : 0;
        let cumulativeZRelative = initialCommand && initialCommand.z ? initialCommand.z : 0;

        const screenEdgeMargin = 5;

        commands.forEach(command => {
            if (command.x !== undefined) {
                if (command.isRelative) {
                    // For relative moves, add to the current position
                    cumulativeXRelative += command.x;
                    if (cumulativeXRelative < minX) {
                        minX = cumulativeXRelative;
                    }
                } else {
                    // For absolute moves, update minX directly
                    if (command.x < minX) {
                        minX = command.x;
                    }
                }
            }
            if (command.z !== undefined) {
                if (command.isRelative) {
                    // For relative moves, add to the current position
                    cumulativeZRelative += command.z;
                    if (cumulativeZRelative > maxZ) {
                        maxZ = cumulativeZRelative;
                    }
                } else {
                    // For absolute moves, update maxZ directly
                    if (command.z > maxZ) {
                        maxZ = command.z;
                    }
                }
            }
        });

        // Object size in mm
        const objectSizeX = Math.abs(minX);
        const objectSizeZ = Math.abs(maxZ);

        // Calculate available screen size, taking into account the margin
        const availableScreenSizeX = (canvas.height / 2) - screenEdgeMargin;
        const availableScreenSizeZ = canvas.width - screenEdgeMargin - offSetFromScreenEdgeZ;

        // Adjust scale for larger objects to fit within canvas
        const scaleX = availableScreenSizeX / objectSizeX;
        const scaleZ = availableScreenSizeZ / objectSizeZ;

        // Choose the smaller scale factor to ensure the object fits within the canvas
        let scale = Math.min(scaleX, scaleZ);

        return scale;
    }

    draw(canvas: HTMLCanvasElement, drawableCommands: GCodeCommand[], scalingFactor: number, progress?: number, showCuts: boolean = true, showNonCuts: boolean = true) {
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Reset all position tracking variables
        this.currentX = 0;
        this.currentZ = 0;
        this.absX = 0;
        this.absZ = 0;

        // These values will always be the ABS Zero from the start of the program
        this.previousCanvasX = (canvas.height / 2);
        this.previousCanvasZ = canvas.width - offSetFromScreenEdgeZ;

        var stockDiameterInMM = 16;

        // Create an offscreen canvas for the stock material
        const stockCanvas = document.createElement('canvas');
        stockCanvas.width = canvas.width;
        stockCanvas.height = canvas.height;

        // Draw the initial stock material on the offscreen canvas
        this.drawStockOnCanvas(stockCanvas, stockDiameterInMM, scalingFactor);

        const maxCount = progress !== undefined ? Math.min(progress + 1, drawableCommands.length) : drawableCommands.length;

        // Remove material from the stock based on cutting operations
        for (let i = 0; i < maxCount; i++) {
            // Setup for this command (whether it's a cut or not)
            if (drawableCommands[i].isRelative) {
                this.currentX += drawableCommands[i].x ?? 0;
                this.currentZ += drawableCommands[i].z ?? 0;
            } else {
                this.currentX = drawableCommands[i].x ?? this.absX;
                this.currentZ = drawableCommands[i].z ?? this.absZ;
                this.absX = this.currentX;
                this.absZ = this.currentZ;
            }

            this.canvasX = (canvas.height / 2) - (this.currentX * scalingFactor);
            this.canvasZ = canvas.width - (this.currentZ * scalingFactor) - offSetFromScreenEdgeZ;

            // Remove stock for this cut, but only if it's an actual cutting operation
            if (drawableCommands[i].movementType === MovementType.Cut && showCuts) {
                this.removeStockMaterial(stockCanvas, scalingFactor);
            }

            // Update previous position for next command (whether it was a cut or not)
            this.previousCanvasX = this.canvasX;
            this.previousCanvasZ = this.canvasZ;
        }

        // Draw the modified stock onto the main canvas
        this.ctx.drawImage(stockCanvas, 0, 0);

        // Reset for drawing the tool paths
        this.currentX = 0;
        this.currentZ = 0;
        this.absX = 0;
        this.absZ = 0;
        this.previousCanvasX = (canvas.height / 2);
        this.previousCanvasZ = canvas.width - offSetFromScreenEdgeZ;

        // Draw the reference lines on top of the stock
        this.drawReferenceLines(canvas);

        // Draw all the tool paths
        for (let i = 0; i < maxCount; i++) {
            this.drawLinesCommand(canvas, drawableCommands[i], scalingFactor, i === (progress ?? -1), showCuts, showNonCuts);
        }
    }

    drawStockOnCanvas(canvas: HTMLCanvasElement, stockDiameterInMM: number, scaleFactor: number) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.lineWidth = 2;

        // Calculate stock dimensions
        let stockRadiusInPixels = stockDiameterInMM * scaleFactor / 2;

        // Calculate rectangle starting points and dimensions
        const rectStartPointZ = 0;
        const rectStartPointX = (canvas.height / 2) - stockRadiusInPixels;
        const rectHeight = stockDiameterInMM * scaleFactor;
        const rectWidth = canvas.width;

        // Draw the stock material
        ctx.beginPath();
        ctx.rect(rectStartPointZ, rectStartPointX, rectWidth, rectHeight);
        ctx.fillStyle = 'lightgrey';
        ctx.fill();
        ctx.strokeStyle = '#666666';
        ctx.stroke();
    }

    drawReferenceLines(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw center line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = 'blue';
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        // Draw zero position line
        ctx.beginPath();
        ctx.moveTo(canvas.width - offSetFromScreenEdgeZ, 0);
        ctx.lineTo(canvas.width - offSetFromScreenEdgeZ, canvas.height);
        ctx.strokeStyle = '#888888';
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    removeStockMaterial(stockCanvas: HTMLCanvasElement, scaleFactor: number) {
        const ctx = stockCanvas.getContext('2d');
        if (!ctx) return;
        
        // This helper performs the EXACT same cutting logic you already have:
        const doActualCut = () => {
            const toolWidthMM = 2;
            const toolWidthPixels = toolWidthMM * scaleFactor;
            
            // Calculate movement direction
            const dirZ = this.canvasZ - this.previousCanvasZ;
            const dirX = this.canvasX - this.previousCanvasX;
            const moveLength = Math.sqrt(dirZ * dirZ + dirX * dirX);
            
            // Remove material
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = 'black';
            
            // --- Plunge cut or pure X-axis move:
            if (moveLength < 0.001 || Math.abs(dirZ) < 0.001) {
                ctx.beginPath();
                ctx.rect(
                    this.canvasZ,                     // Left edge (Z-axis)
                    this.canvasX,                     // Top edge (radius)
                    toolWidthPixels,                  // Tool width (Z direction)
                    stockCanvas.height - this.canvasX // Down to bottom
                );
                ctx.fill();
            }
            // --- Normal cutting move:
            else {
                // 1) Tool path polygon
                ctx.beginPath();
                ctx.moveTo(this.previousCanvasZ, this.previousCanvasX);
                ctx.lineTo(this.canvasZ, this.canvasX);
                ctx.lineTo(this.canvasZ + toolWidthPixels, this.canvasX);
                ctx.lineTo(this.previousCanvasZ + toolWidthPixels, this.previousCanvasX);
                ctx.closePath();
                ctx.fill();
                
                // 2) Fill area between tool path and bottom of stock
                ctx.beginPath();
                ctx.moveTo(this.previousCanvasZ, this.previousCanvasX);
                ctx.lineTo(this.canvasZ, this.canvasX);
                ctx.lineTo(this.canvasZ, stockCanvas.height);
                ctx.lineTo(this.previousCanvasZ, stockCanvas.height);
                ctx.closePath();
                ctx.fill();
                
                // 3) Fill area on the right edge of the tool
                ctx.beginPath();
                ctx.moveTo(this.canvasZ + toolWidthPixels, this.canvasX);
                ctx.lineTo(this.previousCanvasZ + toolWidthPixels, this.previousCanvasX);
                ctx.lineTo(this.previousCanvasZ + toolWidthPixels, stockCanvas.height);
                ctx.lineTo(this.canvasZ + toolWidthPixels, stockCanvas.height);
                ctx.closePath();
                ctx.fill();
            }
            
            // Reset composite
            ctx.globalCompositeOperation = "source-over";
        };
        
        // --- 1) Normal “bottom” cut (unchanged)
        doActualCut();
        
        // --- 2) Mirror the same cut “above” y=0
        // Save canvas state
        ctx.save();
        
        // Flip vertically around the top edge (y=0).
        // That means if your shapes originally drew at y=100, 
        // they now appear at y=-100 (above the top).
        ctx.scale(1, -1);
        
        // If you want the mirrored cut *visible* in the same canvas,
        // you usually need to shift it “down” by the canvas height 
        // so that negative coords map back into the visible region:
        ctx.translate(0, -stockCanvas.height);
        
        // Now do the same cutting logic again:
        doActualCut();
        
        // Restore transform
        ctx.restore();
    }

    drawLinesCommand(canvas: HTMLCanvasElement, drawableCommand: GCodeCommand, scaleFactor: number, isCurrentLine: boolean, drawCuts: boolean, drawNonCuts: boolean) {
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;

        this.ctx.lineWidth = 2;
        if (drawableCommand.isRelative) {
            this.currentX += drawableCommand.x ?? 0;
            this.currentZ += drawableCommand.z ?? 0;
        }
        else {
            this.currentX = drawableCommand.x ?? this.absX;
            this.currentZ = drawableCommand.z ?? this.absZ;
            this.absX = this.currentX;
            this.absZ = this.currentZ;
        }

        this.canvasX = (canvas.height / 2) - (this.currentX * scaleFactor);
        this.canvasZ = canvas.width - (this.currentZ * scaleFactor) - offSetFromScreenEdgeZ;

        let lineColor = "";

        if ((drawableCommand.movementType == MovementType.Cut && drawCuts) ||
            (drawableCommand.movementType == MovementType.Travel && drawNonCuts) ||
            (drawableCommand.movementType == MovementType.Retract && drawNonCuts)) {

            this.ctx.beginPath();
            lineColor = drawableCommand.movementType == MovementType.Cut ? cutLineColour :
                drawableCommand.movementType == MovementType.Travel ? travelLineColour :
                    retractLineColour;

            this.ctx.moveTo(this.previousCanvasZ, this.previousCanvasX);
            this.ctx.lineTo(this.canvasZ, this.canvasX);

            if (isCurrentLine) {
                this.ctx.strokeStyle = lineColor;
                this.ctx.setLineDash([5, 5]); // set the line to be dashed for the current line
                this.ctx.lineDashOffset = 0;

                this.ctx.stroke();

                // draw a dashed line with the color of the gaps
                this.ctx.strokeStyle = currentLineColour;
                this.ctx.setLineDash([5, 5]); // set the line to be dashed
                this.ctx.lineDashOffset = -5; // start the dash pattern 5 pixels into the gaps of the first line
                this.ctx.stroke();
            } else {
                this.ctx.strokeStyle = lineColor;
                this.ctx.setLineDash([]); // reset the line to be solid for other lines
                this.ctx.stroke();
            }

            // draw markers for the start and end points of the current line
            if (isCurrentLine) {
                // calculate the angle of the line
                let dx = this.canvasZ - this.previousCanvasZ;
                let dy = this.canvasX - this.previousCanvasX;
                let angle = Math.atan2(dy, dx);

                // draw a green triangle for the start point, rotated to the direction of travel
                this.ctx.save(); // save the current state of the context
                this.ctx.translate(this.previousCanvasZ, this.previousCanvasX); // move the origin to the start point
                this.ctx.rotate(angle + Math.PI / 2); // rotate the context to the angle of the line
                this.ctx.beginPath();
                this.ctx.moveTo(0, -5); // top vertex of the triangle
                this.ctx.lineTo(-5, 5); // bottom left vertex of the triangle
                this.ctx.lineTo(5, 5); // bottom right vertex of the triangle
                this.ctx.closePath(); // close the path to create a complete triangle
                this.ctx.fillStyle = 'green';
                this.ctx.fill();
                this.ctx.restore(); // restore the context to its original state

                // draw a red circle for the end point
                this.ctx.beginPath();
                this.ctx.rect(this.canvasZ - 3, this.canvasX - 3, 6, 6); // square with side length of 6
                this.ctx.fillStyle = 'red';
                this.ctx.fill();
            }
        }

        this.previousCanvasX = this.canvasX;
        this.previousCanvasZ = this.canvasZ;
    }


    //TODO: draw the stock material
    drawStock(canvas: HTMLCanvasElement, stockDiameterInMM: number, scaleFactor: number) {
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;

        this.ctx.lineWidth = 2;

        // Calculate stock dimensions in pixels
        let stockRadiusInPixels = stockDiameterInMM * scaleFactor / 2;

        // Calculate rectangle starting points and dimensions
        // Start from the zero position (right side of canvas minus offset)
        const rectStartPointZ = canvas.width - offSetFromScreenEdgeZ - canvas.width;
        // Center vertically, then move up by radius to draw centered on the middle line
        const rectStartPointX = (canvas.height / 2) - stockRadiusInPixels;
        // Total diameter for height (full stock diameter)
        const rectHeight = stockDiameterInMM * scaleFactor;
        // Full width of canvas for width
        const rectWidth = canvas.width;

        // Draw the stock material with solid border
        this.ctx.beginPath();
        this.ctx.rect(rectStartPointZ, rectStartPointX, rectWidth, rectHeight);
        this.ctx.fillStyle = 'lightgrey';
        this.ctx.fill();
        this.ctx.strokeStyle = '#666666';  // Slightly darker for border contrast
        this.ctx.setLineDash([]);  // Ensure solid line for stock border
        this.ctx.stroke();

        // Draw center line for reference (dashed)
        this.ctx.beginPath();
        this.ctx.moveTo(0, canvas.height / 2);
        this.ctx.lineTo(canvas.width, canvas.height / 2);
        this.ctx.strokeStyle = 'blue';
        this.ctx.setLineDash([5, 5]);  // Dashed for center line
        this.ctx.stroke();

        // Draw the zero position line (where Z=0) (dashed)
        this.ctx.beginPath();
        this.ctx.moveTo(canvas.width - offSetFromScreenEdgeZ, 0);
        this.ctx.lineTo(canvas.width - offSetFromScreenEdgeZ, canvas.height);
        this.ctx.strokeStyle = '#888888';
        this.ctx.setLineDash([5, 5]);  // Dashed for zero position line
        this.ctx.stroke();

        this.ctx.setLineDash([]); // Reset line dash setting
    }

}