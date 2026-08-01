import { GameObject } from '../game/Game';

interface StageData {
    structures: GameObject[];
    pigs: GameObject[];
    birds: number;
}

function getStageData(stage: number): StageData {
    const baseStructures: { [key: number]: GameObject[] } = {
        1: [
            { id: '', x: 350, y: 300, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 400, y: 300, width: 40, height: 80, type: 'wood', radius: 0, health: 1 }
        ],
        2: [
            { id: '', x: 300, y: 320, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 350, y: 280, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 400, y: 320, width: 40, height: 80, type: 'wood', radius: 0, health: 1 }
        ],
        3: [
            { id: '', x: 350, y: 340, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 350, y: 240, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 400, y: 340, width: 40, height: 80, type: 'wood', radius: 0, health: 1 }
        ],
        4: [
            { id: '', x: 300, y: 350, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 350, y: 300, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 400, y: 350, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 350, y: 200, width: 40, height: 80, type: 'wood', radius: 0, health: 1 }
        ],
        5: [
            { id: '', x: 280, y: 340, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 330, y: 300, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 380, y: 340, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 330, y: 200, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 330, y: 100, width: 40, height: 80, type: 'stone', radius: 0, health: 2 }
        ],
        6: [
            { id: '', x: 300, y: 350, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 350, y: 310, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 400, y: 350, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 350, y: 200, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 350, y: 80, width: 80, height: 40, type: 'wood', radius: 0, health: 1 }
        ],
        7: [
            { id: '', x: 250, y: 360, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 300, y: 320, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 350, y: 280, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 400, y: 320, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 450, y: 360, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 350, y: 160, width: 80, height: 40, type: 'wood', radius: 0, health: 1 }
        ],
        8: [
            { id: '', x: 280, y: 360, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 330, y: 320, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 380, y: 360, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 330, y: 220, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 280, y: 160, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 380, y: 160, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 330, y: 80, width: 80, height: 40, type: 'stone', radius: 0, health: 2 }
        ],
        9: [
            { id: '', x: 260, y: 360, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 310, y: 320, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 360, y: 280, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 410, y: 320, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 460, y: 360, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 310, y: 200, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 410, y: 200, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 360, y: 100, width: 80, height: 40, type: 'wood', radius: 0, health: 1 }
        ],
        10: [
            { id: '', x: 240, y: 370, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 290, y: 330, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 340, y: 290, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 390, y: 330, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 440, y: 370, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 290, y: 210, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 340, y: 170, width: 40, height: 80, type: 'stone', radius: 0, health: 2 },
            { id: '', x: 390, y: 210, width: 40, height: 80, type: 'wood', radius: 0, health: 1 },
            { id: '', x: 340, y: 50, width: 80, height: 40, type: 'stone', radius: 0, health: 2 }
        ]
    };

    const basePigs: { [key: number]: GameObject[] } = {
        1: [
            { id: '', x: 375, y: 220, type: 'pig', radius: 12 }
        ],
        2: [
            { id: '', x: 350, y: 180, type: 'pig', radius: 12 },
            { id: '', x: 400, y: 200, type: 'pig', radius: 12 }
        ],
        3: [
            { id: '', x: 350, y: 150, type: 'pig', radius: 12 },
            { id: '', x: 400, y: 200, type: 'pig', radius: 12 }
        ],
        4: [
            { id: '', x: 330, y: 120, type: 'pig', radius: 12 },
            { id: '', x: 380, y: 150, type: 'pig', radius: 12 },
            { id: '', x: 350, y: 180, type: 'pig', radius: 12 }
        ],
        5: [
            { id: '', x: 330, y: 40, type: 'pig', radius: 12 },
            { id: '', x: 330, y: 130, type: 'pig', radius: 12 },
            { id: '', x: 380, y: 80, type: 'pig', radius: 12 }
        ],
        6: [
            { id: '', x: 350, y: 30, type: 'pig', radius: 12 },
            { id: '', x: 350, y: 120, type: 'pig', radius: 12 },
            { id: '', x: 400, y: 250, type: 'pig', radius: 12 }
        ],
        7: [
            { id: '', x: 350, y: 80, type: 'pig', radius: 12 },
            { id: '', x: 300, y: 160, type: 'pig', radius: 12 },
            { id: '', x: 400, y: 160, type: 'pig', radius: 12 }
        ],
        8: [
            { id: '', x: 330, y: 40, type: 'pig', radius: 12 },
            { id: '', x: 280, y: 120, type: 'pig', radius: 12 },
            { id: '', x: 380, y: 120, type: 'pig', radius: 12 }
        ],
        9: [
            { id: '', x: 360, y: 20, type: 'pig', radius: 12 },
            { id: '', x: 310, y: 130, type: 'pig', radius: 12 },
            { id: '', x: 360, y: 160, type: 'pig', radius: 12 },
            { id: '', x: 410, y: 130, type: 'pig', radius: 12 }
        ],
        10: [
            { id: '', x: 340, y: 10, type: 'pig', radius: 12 },
            { id: '', x: 290, y: 100, type: 'pig', radius: 12 },
            { id: '', x: 340, y: 130, type: 'pig', radius: 12 },
            { id: '', x: 390, y: 100, type: 'pig', radius: 12 }
        ]
    };

    const birds: { [key: number]: number } = {
        1: 2, 2: 2, 3: 2, 4: 3, 5: 3,
        6: 3, 7: 3, 8: 4, 9: 4, 10: 4
    };

    return {
        structures: baseStructures[stage] || [],
        pigs: basePigs[stage] || [],
        birds: birds[stage] || 2
    };
}

export { getStageData };
