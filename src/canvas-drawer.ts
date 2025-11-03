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
const negativeZRenderLimit = 10; // Allow rendering up to Z-10mm

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
    private stockDiameterInMM: number = 0; // Store the stock diameter for later use
    private isBoringOperation: boolean = false; // Track if the operation is boring
    private hasOperationType: boolean = false; // Track if the operation type has been found
    private hasToolWidth: boolean = false; // Track if the tool width has been found
    private extToolWidthInMM: number = 2;
    private intToolWidthInMM: number = 1.5;
    private actualNegativeZOffset: number = 0; // Store the actual negative Z offset used for this drawing

    constructor() { }

    parseGCode(data: string): GCodeCommand[] {
        const commands: GCodeCommand[] = [];
        let isRelative = false; // Track the relative positioning mode
        const drawableCommands: GCodeCommand[] = [];
        const absolutePosition: AbsolutePosition = { z: 0, x: 0 };

        let stockDiameterInMM = 0;
        let hasFoundAbsoluteX = false;

        this.isBoringOperation = false; // Reset boring operation status
        this.hasOperationType = false; // Reset operation type status
        this.hasToolWidth = false; // Reset tool width status

        const lines = data.split('\n');
        lines.forEach((line, index) => {
            const movementType: MovementType = this.determineMovementType(line);

            if (!this.hasOperationType) {
                if (line.toLowerCase().includes('; op type boring') || line.toLowerCase().includes('; op type drilling')) {
                    this.isBoringOperation = true;
                    this.hasOperationType = true;
                } else if (line.toLowerCase().includes('; op type turning') || line.toLowerCase().includes('; op type profiling') || line.toLowerCase().includes('; op type facing')) {
                    this.isBoringOperation = false;
                    this.hasOperationType = true;
                }
            }

        if (!this.hasToolWidth && this.hasOperationType) {
            if (line.includes('; tool width')) {
                const toolWidthMatch = line.match(/; tool width\s*([0-9.]+)/i);
                if (toolWidthMatch && toolWidthMatch[1]) {
                    if (!this.isBoringOperation) {
                        this.extToolWidthInMM = parseFloat(toolWidthMatch[1]);
                        this.hasToolWidth = true;
                    } else {
                        this.intToolWidthInMM = parseFloat(toolWidthMatch[1]);
                        this.hasToolWidth = true;
                    }
                }
            }
        }

            const command: GCodeCommand = { isRelative: isRelative, movementType };
            
            // Extract the G-code part (before any comment)
            const codePart = line.includes(';') ? line.substring(0, line.indexOf(';')).trim() : line.trim();
            
            // First, check for stock diameter in comments before processing the command
            if (!hasFoundAbsoluteX && line.includes(';')) {
                const commentPart = line.substring(line.indexOf(';'));

                // Look for patterns like "STOCK D20", "STOCK 16mm", "STOCK DIAMETER 25", etc.
                const diameterPatterns = [
                    /stock\s+d(?:iameter)?\s*[=:]?\s*(\d+\.?\d*)(?:mm)?/i,
                    /stock\s+(?:diameter|dia|diam)?\s*[=:]?\s*(\d+\.?\d*)(?:mm)?/i,
                    /diameter\s*[=:]?\s*(\d+\.?\d*)(?:mm)?/i,
                    /dia\s*[=:]?\s*(\d+\.?\d*)(?:mm)?/i
                ];

                for (const pattern of diameterPatterns) {
                    const match = commentPart.match(pattern);
                    if (match && match[1]) {
                        stockDiameterInMM = parseFloat(match[1]);
                        hasFoundAbsoluteX = true; // We found stock info in comments
                        this.stockDiameterInMM = stockDiameterInMM; // Store the stock diameter for later use
                        break;
                    }
                }
            }
            
            // Skip if there's no actual code (empty line or comment-only line)
            if (!codePart) {
                commands.push({
                    isRelative: isRelative,
                    movementType,
                    lineNumber: index + 1,
                    originalLine: line,
                    absolutePosition: { ...absolutePosition }
                });
                return;
            }
            
            // Check if this line contains a movement command (G0, G1, G2, G3)
            const hasMovementCommand = /\b(G0|G1|G2|G3)\b/i.test(codePart);
            
            // Check if line starts with X or Z (standalone movement coordinates)
            const startsWithMovementCoord = /^[XZ]/i.test(codePart);
            
            // Only parse coordinates if there's a movement command OR line starts with X/Z
            const shouldParseCoordinates = hasMovementCommand || startsWithMovementCoord;
            
            const parts = shouldParseCoordinates ? codePart.match(/([GXYZF])([0-9.-]+)/g) : null;

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
                            if (!hasFoundAbsoluteX) {
                                stockDiameterInMM = Math.abs(absolutePosition.x) * 2;
                                this.stockDiameterInMM = stockDiameterInMM; // Store the stock diameter for later use
                                hasFoundAbsoluteX = true;
                            }
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

        if (!this.hasToolWidth) {

            this.extToolWidthInMM = 2; // (for turning/profiling/facing operations)
            this.intToolWidthInMM = 1.5; // (for boring/drilling operations)
        }

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
        let minZ = 0;

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
                    if (command.z < minZ) {
                        minZ = command.z;
                    }
                }
            }
        });

        const stockRadius = this.stockDiameterInMM / 2;

        // Object size in mm
        const objectSizeX = Math.max(Math.abs(minX), stockRadius);
        const effectiveMinZ = Math.max(minZ, -negativeZRenderLimit); // Don't scale for Z beyond the limit
        // Total Z range: from effectiveMinZ to maxZ
        const objectSizeZ = maxZ - effectiveMinZ; // This handles the full range including negative Z

        // Calculate the actual negative Z space we need (only as much as actually used)
        const actualNegativeZSpace = Math.abs(effectiveMinZ); // e.g., if minZ is -5, this is 5
        
        // Store this for use in drawing methods
        this.actualNegativeZOffset = actualNegativeZSpace;

        // Calculate available screen size, taking into account the margin and actual negative Z buffer
        const availableScreenSizeX = (canvas.height / 2) - screenEdgeMargin;
        // Include only the actual negative Z space needed, not the full limit
        const totalZSizeWithBuffer = objectSizeZ + actualNegativeZSpace;
        const availableScreenSizeZ = canvas.width - screenEdgeMargin - offSetFromScreenEdgeZ;

        // Adjust scale for larger objects to fit within canvas
        const scaleX = availableScreenSizeX / objectSizeX;
        const scaleZ = availableScreenSizeZ / totalZSizeWithBuffer;

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
        // Shift Z origin to allow for negative Z rendering
        this.previousCanvasZ = canvas.width - offSetFromScreenEdgeZ - (this.actualNegativeZOffset * scalingFactor);

        // Find the stock diameter from the first absolute X position
        let stockDiameterInMM = this.stockDiameterInMM; // Use the stored stock diameter

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
            // Shift Z origin to allow for negative Z rendering
            this.canvasZ = canvas.width - (this.currentZ * scalingFactor) - offSetFromScreenEdgeZ - (this.actualNegativeZOffset * scalingFactor);

            // Remove stock for this cut, but only if it's an actual cutting operation
            if (showCuts) {
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
        // Shift Z origin to allow for negative Z rendering
        this.previousCanvasZ = canvas.width - offSetFromScreenEdgeZ - (this.actualNegativeZOffset * scalingFactor);

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
        // Stock should extend from Z0 leftwards (towards positive Z)
        const z0Position = canvas.width - offSetFromScreenEdgeZ - (this.actualNegativeZOffset * scaleFactor);
        const rectStartPointZ = 0; // Start from left edge
        const rectStartPointX = (canvas.height / 2) - stockRadiusInPixels;
        const rectHeight = stockDiameterInMM * scaleFactor;
        // Stock width: from left edge to Z0
        const rectWidth = z0Position;

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

        const doActualCut = () => {

            let toolWidthMM = this.extToolWidthInMM;
            let toolWidthPixels = toolWidthMM * scaleFactor;

            if (this.isBoringOperation) {

                let toolWidthMM = this.intToolWidthInMM;
                let toolWidthPixels = toolWidthMM * scaleFactor;

                // Logic for Boring Operation
                const dirZ = this.canvasZ - this.previousCanvasZ;
                // dirX is calculated based on canvasX/previousCanvasX which are CH/2 - (gcodeX * S)
                // So, dirX = (prevGcodeX - currentGcodeX) * S, correctly reflecting change in radius
                const dirX = this.canvasX - this.previousCanvasX;
                const moveLength = Math.sqrt(dirZ * dirZ + dirX * dirX);

                ctx.globalCompositeOperation = "destination-out";
                ctx.fillStyle = 'black';

                const centerY = stockCanvas.height / 2;

                // this.currentX is the G-code X value (e.g., -2 for 2mm radius bore)
                const currentRadiusGcode = Math.abs(this.currentX);
                const currentRadiusPixels = currentRadiusGcode * scaleFactor;
                // Y-coordinate of the bore's inner surface for the current half (e.g., upper half)
                const currentToolEdgeY = centerY - currentRadiusPixels;

                let previousRadiusPixels;
                if (scaleFactor !== 0) {
                    // this.previousCanvasX was (CH/2) - (previous_raw_gcode_X * scaleFactor)
                    const previousRawXGcode = ((stockCanvas.height / 2) - this.previousCanvasX) / (-scaleFactor);
                    const previousRadiusGcode = Math.abs(previousRawXGcode);
                    previousRadiusPixels = previousRadiusGcode * scaleFactor;
                } else {
                    // Should not happen if scaleFactor is always positive
                    previousRadiusPixels = currentRadiusPixels;
                }
                // Y-coordinate of the previous bore's inner surface
                const previousToolEdgeY = centerY - previousRadiusPixels;

                // --- Plunge cut or pure X-axis move (boring):
                // A pure X-axis move in boring changes the radius at a constant Z.
                // A plunge is a Z-move at a constant radius.
                // The original moveLength condition should distinguish these.
                if (moveLength < 0.001 || Math.abs(dirZ) < 0.001) { // handles X-only moves or very small moves
                    ctx.beginPath();
                    ctx.rect(
                        this.canvasZ,       // Z-position of the tool face
                        currentToolEdgeY,   // Top edge of cut (bore's inner surface)
                        toolWidthPixels,    // Tool width (Z direction)
                        currentRadiusPixels // Height of cut (from bore inner surface to centerline)
                    );
                    ctx.fill();
                } else {
                    // Angled or Z-axis dominant move (boring)

                    // 1) Tool path polygon (erases the tool's direct path)
                    ctx.beginPath();
                    ctx.moveTo(this.previousCanvasZ, previousToolEdgeY);
                    ctx.lineTo(this.canvasZ, currentToolEdgeY);
                    ctx.lineTo(this.canvasZ + toolWidthPixels, currentToolEdgeY);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, previousToolEdgeY);
                    ctx.closePath();
                    ctx.fill();

                    // 2) Fill area between tool path and centerline - left part of tool
                    ctx.beginPath();
                    ctx.moveTo(this.previousCanvasZ, previousToolEdgeY);
                    ctx.lineTo(this.canvasZ, currentToolEdgeY);
                    ctx.lineTo(this.canvasZ, centerY); // Fill towards centerline
                    ctx.lineTo(this.previousCanvasZ, centerY); // Fill towards centerline
                    ctx.closePath();
                    ctx.fill();

                    // 3) Fill area on the right edge of the tool towards centerline
                    ctx.beginPath();
                    ctx.moveTo(this.canvasZ + toolWidthPixels, currentToolEdgeY);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, previousToolEdgeY);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, centerY); // Fill towards centerline
                    ctx.lineTo(this.canvasZ + toolWidthPixels, centerY); // Fill towards centerline
                    ctx.closePath();
                    ctx.fill();
                }

                // Reset composite operation
                ctx.globalCompositeOperation = "source-over";

            } else {
                // Existing, working logic for Turning/Facing/Profiling operations

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
        }

        doActualCut();

        ctx.save();

        // Flip vertically around the top edge (y=0).
        ctx.scale(1, -1);
        ctx.translate(0, -stockCanvas.height);
        doActualCut();
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

        // Clamp Z to the negative render limit
        const clampedZ = Math.max(this.currentZ, -negativeZRenderLimit);

        this.canvasX = (canvas.height / 2) - (this.currentX * scaleFactor);
        // Shift Z origin to allow for negative Z rendering
        this.canvasZ = canvas.width - (clampedZ * scaleFactor) - offSetFromScreenEdgeZ - (this.actualNegativeZOffset * scaleFactor);

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
}