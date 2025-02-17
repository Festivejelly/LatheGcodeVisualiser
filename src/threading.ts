// threading.ts

export type ThreadingType = 'Internal' | 'External';
export type ThreadingDirection = 'Left' | 'Right';

export interface ThreadSpec {
    name: string;           
    nominalDiameter: number;
    pitch: number;         
    isCoarse: boolean;     
    getInternalMajorDiameter: () => number;
    getExternalMajorDiameter: () => number;
    getThreadDepth: (type: ThreadingType) => number;
    getMajorDiameter: (type: ThreadingType) => number;
}

export interface ThreadGroup {
    name: string;          
    threads: ThreadSpec[];
}

export class Threading {
    private static createThreadSpec(
        name: string, 
        nominalDiameter: number, 
        pitch: number, 
        isCoarse: boolean
    ): ThreadSpec {
        return {
            name,
            nominalDiameter,
            pitch,
            isCoarse,
            getInternalMajorDiameter(): number {
                return Number((this.nominalDiameter - (1.082532 * this.pitch)).toFixed(3));
            },
            getExternalMajorDiameter(): number {
                return this.nominalDiameter;
            },
            getThreadDepth(type: ThreadingType): number {
                if (type === 'External') {
                    return Number((this.pitch * 0.61343).toFixed(3));
                } else {
                    return Number((this.pitch * 0.54127).toFixed(3));
                }
            },
            getMajorDiameter(type: ThreadingType): number {
                return type === 'External' ? 
                    this.getExternalMajorDiameter() : 
                    this.getInternalMajorDiameter();
            }
        };
    }

    public static readonly threadTypes: ThreadGroup[] = [
        {
            name: "Metric",
            threads: [
                // M3 threads
                Threading.createThreadSpec("M3 x 0.35 (Fine)", 3, 0.35, false),
                Threading.createThreadSpec("M3 x 0.5 (Coarse)", 3, 0.5, true),
                
                // M4 threads
                Threading.createThreadSpec("M4 x 0.5 (Fine)", 4, 0.5, false),
                Threading.createThreadSpec("M4 x 0.7 (Coarse)", 4, 0.7, true),
                
                // M5 threads
                Threading.createThreadSpec("M5 x 0.5 (Fine)", 5, 0.5, false),
                Threading.createThreadSpec("M5 x 0.8 (Coarse)", 5, 0.8, true),
                
                // M6 threads
                Threading.createThreadSpec("M6 x 0.75 (Fine)", 6, 0.75, false),
                Threading.createThreadSpec("M6 x 1.0 (Coarse)", 6, 1.0, true),
                
                // M8 threads
                Threading.createThreadSpec("M8 x 1.0 (Fine)", 8, 1.0, false),
                Threading.createThreadSpec("M8 x 1.25 (Coarse)", 8, 1.25, true),
                
                // M10 threads
                Threading.createThreadSpec("M10 x 1.0 (Fine)", 10, 1.0, false),
                Threading.createThreadSpec("M10 x 1.5 (Coarse)", 10, 1.5, true),

                //M11 threads
                Threading.createThreadSpec("M11 x 1.0 (Fine)", 11, 1.0, false),
                Threading.createThreadSpec("M11 x 1.5 (Coarse)", 11, 1.5, true),
                
                // M12 threads
                Threading.createThreadSpec("M12 x 1.25 (Fine)", 12, 1.25, false),
                Threading.createThreadSpec("M12 x 1.75 (Coarse)", 12, 1.75, true)
            ]
        }
    ];


    // G33 Threading command handler
    // Format: G33 Z[end] X[end] P[pitch] H[passes] Q[start_z] R[start_x] I
    // Parameters:
    //   Z - End Z position
    //   X - End X position
    //   P - Thread pitch in mm
    //   H - Number of passes (optional, default 3)
    //   Q - Start Z position (optional, defaults to current position)
    //   R - Start X position (optional, defaults to current position)
    public static generateThreadingGcode(thread: ThreadSpec, type: ThreadingType, direction: ThreadingDirection, length: number): string {
        const depth = thread.getThreadDepth(type);
        const majorDiameter = thread.getMajorDiameter(type);


        let startRadius: number;
        let endRadius: number;

        if (type === 'External') {
            startRadius = majorDiameter / 2;
            endRadius = startRadius - depth;  // Cut inward
            endRadius = Math.round(endRadius * 1000) / 1000;
        } else {
            startRadius = (majorDiameter / 2) - depth;  // Starting at bore
            startRadius = Math.round(startRadius * 1000) / 1000;
            endRadius = (majorDiameter / 2);  // Cut outward to major diameter
        }

        const zEnd = direction === 'Right' ? length : -length;

        return `G33 Z${zEnd} X${-endRadius} P${thread.pitch} R${-startRadius}`;
    }

    public static getThreadSpecByName(name: string): ThreadSpec | undefined {
        for (const group of this.threadTypes) {
            const thread = group.threads.find(t => t.name === name);
            if (thread) return thread;
        }
        return undefined;
    }

    public static getThreadGroups(): string[] {
        return this.threadTypes.map(group => group.name);
    }

    public static getThreadsForGroup(groupName: string): ThreadSpec[] {
        const group = this.threadTypes.find(g => g.name === groupName);
        return group ? group.threads : [];
    }
}