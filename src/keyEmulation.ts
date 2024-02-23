export class KeyEmulation {
    
    static readonly buttons: { name: string, id: string, number: number }[] = [
        { name: 'arrow_left_alt', id: 'B_LEFT', number: 57 },
        { name: 'arrow_right_alt', id: 'B_RIGHT', number: 37 },
        { name: 'arrow_upward_alt', id: 'B_UP', number: 47 },
        { name: 'arrow_downward_alt', id: 'B_DOWN', number: 67 },
        { name: '+', id: 'B_MINUS', number: 5 },
        { name: '-', id: 'B_PLUS', number: 64 },
        { name: 'play_arrow', id: 'B_ON', number: 17 },
        { name: 'crop_square', id: 'B_OFF', number: 27 },
        { name: 'keyboard_tab_rtl', id: 'B_STOPL', number: 7 },
        { name: 'keyboard_tab', id: 'B_STOPR', number: 15 },
        { name: 'vertical_align_top', id: 'B_STOPU', number: 6 },
        { name: 'vertical_align_bottom', id: 'B_STOPD', number: 16 },
        { name: 'rotate_left', id: 'B_DISPL', number: 14 },
        { name: 'signal_cellular_alt', id: 'B_STEP', number: 24 },
        { name: 'settings', id: 'B_SETTINGS', number: 34 },
        { name: 'space_bar', id: 'B_MEASURE', number: 54 },
        { name: 'sync_alt', id: 'B_REVERSE', number: 44 },
        { name: '1', id: 'B_0', number: 51 },
        { name: '2', id: 'B_1', number: 41 },
        { name: '3', id: 'B_2', number: 61 },
        { name: '4', id: 'B_3', number: 31 },
        { name: '5', id: 'B_4', number: 2 },
        { name: '6', id: 'B_5', number: 21 },
        { name: '7', id: 'B_6', number: 12 },
        { name: '8', id: 'B_7', number: 11 },
        { name: '9', id: 'B_8', number: 22 },
        { name: '10', id: 'B_9', number: 1 },
        { name: 'backspace', id: 'B_BACKSPACE', number: 32 },
        { name: 'manufacturing', id: 'B_MODE_GEARS', number: 42 },
        { name: 'reply', id: 'B_MODE_TURN', number: 52 },
        { name: 'turn_slight_left', id: 'B_MODE_FACE', number: 62 },
        { name: 'arrow_forward_ios', id: 'B_MODE_CONE', number: 3 },
        { name: 'publish', id: 'B_MODE_CUT', number: 13 },
        { name: 'home_improvement_and_tools', id: 'B_MODE_THREAD', number: 23 },
        { name: 'M', id: 'B_MODE_OTHER', number: 33 },
        { name: 'X', id: 'B_X', number: 53 },
        { name: 'Z', id: 'B_Z', number: 43 },
        { name: 'A', id: 'B_A', number: 4 },
        { name: 'B', id: 'B_B', number: 63 }
    ];

    static getButtonName(buttonId: string): string {
        const button = this.buttons.find(button => button.id === buttonId);
        return button ? button.name : '';
    }

    static createKeyPressEvent(buttonId: string, isPress: boolean): number {

        const button = this.buttons.find(button => button.id === buttonId);

        // If no button was found, throw an error
        if (!button) {
            throw new Error(`No button found with id: ${buttonId}`);
        }
    
        let keyCode = button.number;
    
        // Ensure keyCode is within 7 bits
        keyCode &= 0x7F;
    
        if (isPress) {
            // Set the 8th bit if isPress is true
            keyCode |= 0x80;
        }
    
        return keyCode;
    }
}