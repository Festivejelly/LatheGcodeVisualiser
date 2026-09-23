export enum MovementType {
    Cut,
    Travel,
    Retract
}

export enum ToolType {
    External,  // Turning, profiling, facing tools (default)
    Internal,  // Boring bars, internal grooving tools, drills
}

export type GCodeCommand = {
    x?: number;
    z?: number;
    isRelative: boolean;
    absolutePosition?: AbsolutePosition;
    movementType?: MovementType;
    toolType?: ToolType;
    toolWidth?: number;
    toolTaperAngle?: number; // Full included angle of the tool tip cone (degrees), 0 = flat
    lineNumber?: number; // Line number in the original G-code file
    originalLine?: string; // Original line text from the G-code file
};

type ToolDefinition = {
    diameter: number;
    taperAngle: number;
    toolType: ToolType;
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
    private currentToolType: ToolType = ToolType.External; // Default to external
    private currentToolWidth: number = 2; // Default tool width
    private currentToolTaperAngle: number = 0; // Full included angle of tool tip cone (degrees), 0 = flat
    private toolDefinitions: Map<number, ToolDefinition> = new Map();
    private actualNegativeZOffset: number = 0; // Store the actual negative Z offset used for this drawing

    constructor() { }

    parseGCode(data: string): GCodeCommand[] {
        const commands: GCodeCommand[] = [];
        let isRelative = false; // Track the relative positioning mode
        const drawableCommands: GCodeCommand[] = [];
        const absolutePosition: AbsolutePosition = { z: 0, x: 0 };

        let stockDiameterInMM = 0;
        let hasFoundAbsoluteX = false;

        // Parse tool definitions from header comments (e.g. "(T18 D=3.7 CR=0. TAPER=118DEG - DRILL)")
        this.parseToolDefinitions(data);

        // Track current tool type and width through the parsing
        let currentToolType = ToolType.External; // Default to external
        let currentToolWidth = 2; // Default width
        let currentToolTaperAngle = 0; // Degrees, 0 = flat

        const lines = data.split('\n');
        lines.forEach((line, index) => {
            const movementType: MovementType = this.determineMovementType(line);

            // Check for tool change commands
            const toolInfo = this.parseToolChange(line);
            if (toolInfo) {
                currentToolType = toolInfo.toolType;
                currentToolWidth = toolInfo.toolWidth;
                currentToolTaperAngle = toolInfo.taperAngle;
            }

            const command: GCodeCommand = {
                isRelative: isRelative,
                movementType,
                toolType: currentToolType,
                toolWidth: currentToolWidth,
                toolTaperAngle: currentToolTaperAngle
            };

            // Extract the G-code part (before any comment)
            const codePart = line.includes(';') ? line.substring(0, line.indexOf(';')).trim() : line.trim();

            // First, check for stock diameter in comments before processing the command
            if (!hasFoundAbsoluteX && line.includes(';')) {
                const commentPart = line.substring(line.indexOf(';'));

                // Look for patterns like "STOCK D20", "STOCK 16mm", "STOCK DIAMETER 25", etc.
                const diameterPatterns = [
                    /stock\s+d(?:iameter)?\s*[=:]?\s*(\d+\.?\d*)(?:mm)?/i,
                    /stock\s+(?:diameter|dia|diam)?\s*[=:]?\s*(\d+\.?\d*)(?:mm)?/i,
                    /STOCK\s*D?\s*(\d+\.?\d*)(?:mm)?/i,
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

            } else if (!hasFoundAbsoluteX && line.trim().startsWith('(') && line.trim().endsWith(')')) {
                    // Handle parenthetical comments like (STOCK D16.)
                    const commentPart = line.trim();
                    
                    // Look for patterns like "STOCK D20", "STOCK 16mm", "STOCK DIAMETER 25", etc.
                    const diameterPatterns = [
                        /STOCK\s*D?\s*(\d+\.?\d*)(?:mm)?/i
                    ];

                    for (const pattern of diameterPatterns) {
                        const match = commentPart.match(pattern);
                        if (match && match[1]) {
                            stockDiameterInMM = parseFloat(match[1]);
                            hasFoundAbsoluteX = true;
                            this.stockDiameterInMM = stockDiameterInMM;
                            break;
                        }
                    }
                }



            // Skip if there's no actual code (empty line or comment-only line)
            if (!codePart) {
                commands.push({
                    isRelative: isRelative,
                    movementType,
                    toolType: currentToolType,
                    toolWidth: currentToolWidth,
                    toolTaperAngle: currentToolTaperAngle,
                    lineNumber: index + 1,
                    originalLine: line,
                    absolutePosition: { ...absolutePosition }
                });
                return;
            }

            // Check if this line contains a movement command (G0, G1, G2, G3)
            const hasMovementCommand = /\b(G0|G1|G2|G3)\b/i.test(codePart);

            // Check for positioning mode commands (G90, G91)
            const hasPositioningMode = /\b(G90|G91)\b/i.test(codePart);

            // Check if line starts with X or Z (standalone movement coordinates)
            const startsWithMovementCoord = /^[XZ]/i.test(codePart);

            // Only parse coordinates if there's a movement command OR positioning mode OR line starts with X/Z
            const shouldParseCoordinates = hasMovementCommand || hasPositioningMode || startsWithMovementCoord;

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

        return drawableCommands;
    }

    parseToolDefinitions(data: string): void {
        this.toolDefinitions.clear();
        for (const line of data.split('\n')) {
            const trimmed = line.trim();
            // Only process parenthetical comment lines that start with a tool number definition
            if (!trimmed.match(/^\(T\d+\s+D=/i)) continue;

            const toolNumMatch = trimmed.match(/^\(T(\d+)/i);
            const diameterMatch = trimmed.match(/\bD=(\d+\.?\d*)/i);
            const taperMatch = trimmed.match(/\bTAPER=(\d+\.?\d*)DEG/i);
            const typeMatch = trimmed.match(/[-–]\s*(DRILL|SPOT DRILL|FLAT END MILL|BORING|GROOVE TURNING|GROOVING|TURNING)\s*[)]/i);

            if (!toolNumMatch || !diameterMatch) continue;

            const toolNum = parseInt(toolNumMatch[1]);
            const diameter = parseFloat(diameterMatch[1]);
            const taperAngle = taperMatch ? parseFloat(taperMatch[1]) : 0;

            let toolType = ToolType.External;
            if (typeMatch) {
                const label = typeMatch[1].toUpperCase();
                if (label.includes('DRILL') || label.includes('END MILL') || label.includes('BORING')) {
                    toolType = ToolType.Internal;
                }
            }

            this.toolDefinitions.set(toolNum, { diameter, taperAngle, toolType });
        }
    }

    parseToolChange(line: string): { toolType: ToolType, toolWidth: number, taperAngle: number } | null {
        // Check for T+M6 tool change (e.g. "T18 M6" or "M6 T18")
        const tM6Match = line.match(/T(\d+)\s*M6|M6\s*T(\d+)/i);
        if (tM6Match) {
            const toolNum = parseInt(tM6Match[1] ?? tM6Match[2]);
            return this.lookupToolOrDefault(toolNum, line);
        }

        // Check for M0 tool change comment
        const m0Match = line.match(/M0\s*\(CHANGE TO .+?\)/i);
        if (m0Match) {
            const tNumMatch = line.match(/T(\d+)/i);
            if (tNumMatch) {
                return this.lookupToolOrDefault(parseInt(tNumMatch[1]), line);
            }
            return this.detectToolFromKeywords(line);
        }

        return null;
    }

    private lookupToolOrDefault(toolNum: number, line: string): { toolType: ToolType, toolWidth: number, taperAngle: number } {
        const def = this.toolDefinitions.get(toolNum);
        if (def) {
            return { toolType: def.toolType, toolWidth: def.diameter, taperAngle: def.taperAngle };
        }
        return this.detectToolFromKeywords(line);
    }

    private detectToolFromKeywords(line: string): { toolType: ToolType, toolWidth: number, taperAngle: number } {
        const lowerLine = line.toLowerCase();
        const widthMatch = line.match(/(\d+(?:\.\d+)?)\s*mm/i);
        const toolWidth = widthMatch ? parseFloat(widthMatch[1]) : 2;

        if (lowerLine.includes('drill') || lowerLine.includes('endmill') ||
            lowerLine.includes('boring') || lowerLine.includes('internal') ||
            lowerLine.includes('grooving tool')) {
            return { toolType: ToolType.Internal, toolWidth, taperAngle: 0 };
        }
        return { toolType: ToolType.External, toolWidth, taperAngle: 0 };
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

        // Track cumulative position for relative moves
        let cumulativeX = 0;
        let cumulativeZ = 0;

        const screenEdgeMargin = 5;

        commands.forEach(command => {
            if (command.x !== undefined) {
                if (command.isRelative) {
                    // For relative moves, add to the current position
                    cumulativeX += command.x;
                } else {
                    // For absolute moves, update the cumulative position
                    cumulativeX = command.x;
                }
                if (cumulativeX < minX) {
                    minX = cumulativeX;
                }
            }
            if (command.z !== undefined) {
                if (command.isRelative) {
                    // For relative moves, add to the current position
                    cumulativeZ += command.z;
                } else {
                    // For absolute moves, update the cumulative position
                    cumulativeZ = command.z;
                }
                if (cumulativeZ > maxZ) {
                    maxZ = cumulativeZ;
                }
                if (cumulativeZ < minZ) {
                    minZ = cumulativeZ;
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
            const cmd = drawableCommands[i];

            // Update current tool type, width and taper from the command
            this.currentToolType = cmd.toolType ?? ToolType.External;
            this.currentToolWidth = cmd.toolWidth ?? 2;
            this.currentToolTaperAngle = cmd.toolTaperAngle ?? 0;

            // Setup for this command (whether it's a cut or not)
            if (cmd.isRelative) {
                this.currentX += cmd.x ?? 0;
                this.currentZ += cmd.z ?? 0;
            } else {
                this.currentX = cmd.x ?? this.absX;
                this.currentZ = cmd.z ?? this.absZ;
                this.absX = this.currentX;
                this.absZ = this.currentZ;
            }

            // Always update absX and absZ to track current absolute position
            this.absX = this.currentX;
            this.absZ = this.currentZ;

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

        const toolWidthMM = this.currentToolWidth;
        const toolWidthPixels = toolWidthMM * scaleFactor;
        const isInternalCut = this.currentToolType === ToolType.Internal;

        const doActualCut = () => {
            if (isInternalCut) {
                // Internal cutting logic (boring, drilling, internal grooving)
                const centerY = stockCanvas.height / 2;
                const isOnCenterline = Math.abs(this.currentX) < 0.001 &&
                    Math.abs(this.previousCanvasX - centerY) < 2;
                const taperAngleDeg = this.currentToolTaperAngle;

                if (taperAngleDeg > 0 && taperAngleDeg < 180 && isOnCenterline) {
                    // Tapered drill: draw the full drill profile at the current depth.
                    // Each plunge draws cone-tip + full cylinder to the stock surface.
                    // destination-out is idempotent, so the union across all steps gives:
                    // one clean cone at the deepest point + full cylinder back to surface.
                    const moveZ = this.previousCanvasZ - this.canvasZ; // positive = moved deeper
                    if (moveZ > 0.001) {
                        const halfAngleRad = (taperAngleDeg / 2) * (Math.PI / 180);
                        const radiusPixels = (toolWidthMM / 2) * scaleFactor;
                        const coneLengthPixels = radiusPixels / Math.tan(halfAngleRad);
                        const coneBaseZ = this.canvasZ + coneLengthPixels;

                        ctx.globalCompositeOperation = "destination-out";
                        ctx.fillStyle = 'black';

                        // Draw upper half: cone from tip to cone base, then full cylinder
                        // to the stock surface. The vertical flip in doActualCut handles
                        // the lower half automatically.
                        ctx.beginPath();
                        ctx.moveTo(this.canvasZ, centerY);                       // tip
                        ctx.lineTo(coneBaseZ, centerY - radiusPixels);            // top of cone base
                        ctx.lineTo(stockCanvas.width, centerY - radiusPixels);    // top of cylinder at surface
                        ctx.lineTo(stockCanvas.width, centerY);                   // center at surface
                        ctx.closePath();
                        ctx.fill();

                        ctx.globalCompositeOperation = "source-over";
                    }
                } else {
                // Flat internal tool (boring bar, grooving, or non-centerline drill)
                const dirZ = this.canvasZ - this.previousCanvasZ;
                const dirX = this.canvasX - this.previousCanvasX;
                const moveLength = Math.sqrt(dirZ * dirZ + dirX * dirX);

                ctx.globalCompositeOperation = "destination-out";
                ctx.fillStyle = 'black';

                const currentRadiusGcode = Math.abs(this.currentX);
                const currentRadiusPixels = currentRadiusGcode * scaleFactor;

                // For drilling on centerline (X=0), use half the tool diameter instead
                const effectiveCurrentRadius = currentRadiusGcode === 0 ? (toolWidthMM / 2) * scaleFactor : currentRadiusPixels;
                const currentToolEdgeY = centerY - effectiveCurrentRadius;

                let previousRadiusPixels;
                if (scaleFactor !== 0) {
                    const previousRawXGcode = ((stockCanvas.height / 2) - this.previousCanvasX) / (-scaleFactor);
                    const previousRadiusGcode = Math.abs(previousRawXGcode);
                    previousRadiusPixels = previousRadiusGcode * scaleFactor;
                } else {
                    previousRadiusPixels = effectiveCurrentRadius;
                }

                // For drilling on centerline at previous position, use half the tool diameter
                const effectivePreviousRadius = previousRadiusPixels === 0 ? (toolWidthMM / 2) * scaleFactor : previousRadiusPixels;
                const previousToolEdgeY = centerY - effectivePreviousRadius;

                if (moveLength < 0.001 || Math.abs(dirZ) < 0.001) {
                    ctx.beginPath();
                    ctx.rect(
                        this.canvasZ,
                        currentToolEdgeY,
                        toolWidthPixels,
                        currentRadiusPixels
                    );
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(this.previousCanvasZ, previousToolEdgeY);
                    ctx.lineTo(this.canvasZ, currentToolEdgeY);
                    ctx.lineTo(this.canvasZ + toolWidthPixels, currentToolEdgeY);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, previousToolEdgeY);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(this.previousCanvasZ, previousToolEdgeY);
                    ctx.lineTo(this.canvasZ, currentToolEdgeY);
                    ctx.lineTo(this.canvasZ, centerY);
                    ctx.lineTo(this.previousCanvasZ, centerY);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(this.canvasZ + toolWidthPixels, currentToolEdgeY);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, previousToolEdgeY);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, centerY);
                    ctx.lineTo(this.canvasZ + toolWidthPixels, centerY);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.globalCompositeOperation = "source-over";
                }
            } else {
                // External cutting logic (turning, profiling, facing)
                // Only remove material if the tool is inside the stock envelope
                // Check if current position is beyond the stock (positive Z direction)
                const centerY = stockCanvas.height / 2;
                const stockRadiusPixels = (this.stockDiameterInMM / 2) * scaleFactor;
                
                // Skip cutting if tool is outside the stock diameter (canvasX is further from center than stock radius)
                const currentDistanceFromCenter = Math.abs(this.canvasX - centerY);
                const previousDistanceFromCenter = Math.abs(this.previousCanvasX - centerY);
                
                // Only cut if at least one position is within or at the stock surface
                if (currentDistanceFromCenter > stockRadiusPixels && previousDistanceFromCenter > stockRadiusPixels) {
                    // Both positions are outside stock, no cutting
                    return;
                }
                
                const dirZ = this.canvasZ - this.previousCanvasZ;
                const dirX = this.canvasX - this.previousCanvasX;
                const moveLength = Math.sqrt(dirZ * dirZ + dirX * dirX);

                ctx.globalCompositeOperation = "destination-out";
                ctx.fillStyle = 'black';

                if (moveLength < 0.001 || Math.abs(dirZ) < 0.001) {
                    ctx.beginPath();
                    ctx.rect(
                        this.canvasZ,
                        this.canvasX,
                        toolWidthPixels,
                        stockCanvas.height - this.canvasX
                    );
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(this.previousCanvasZ, this.previousCanvasX);
                    ctx.lineTo(this.canvasZ, this.canvasX);
                    ctx.lineTo(this.canvasZ + toolWidthPixels, this.canvasX);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, this.previousCanvasX);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(this.previousCanvasZ, this.previousCanvasX);
                    ctx.lineTo(this.canvasZ, this.canvasX);
                    ctx.lineTo(this.canvasZ, stockCanvas.height);
                    ctx.lineTo(this.previousCanvasZ, stockCanvas.height);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(this.canvasZ + toolWidthPixels, this.canvasX);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, this.previousCanvasX);
                    ctx.lineTo(this.previousCanvasZ + toolWidthPixels, stockCanvas.height);
                    ctx.lineTo(this.canvasZ + toolWidthPixels, stockCanvas.height);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.globalCompositeOperation = "source-over";
            }
        };

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

        } else {
            this.currentX = drawableCommand.x ?? this.absX;
            this.currentZ = drawableCommand.z ?? this.absZ;
        }
        // Always update absX and absZ to track current absolute position
        this.absX = this.currentX;
        this.absZ = this.currentZ;

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