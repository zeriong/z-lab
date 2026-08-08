import { AudioState, EffectState } from './types';

export class AudioManager {
    private state: AudioState;
    private audioContext: AudioContext | null = null;
    private sounds: { [key: string]: AudioBuffer | null } = {
        slingshot: null,
        impact: null,
        pig_death: null
    };

    constructor() {
        this.state = {
            muted: false,
            volume: 0.8
        };
        this.initAudioContext();
    }

    private initAudioContext(): void {
        try {
            const contextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (contextClass) {
                this.audioContext = new contextClass();
            }
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    playSlinghotSound(): void {
        if (this.state.muted || !this.audioContext) return;
        this.playTone(440, 0.1, 0.2); // Twang sound
    }

    playImpactSound(force: number): void {
        if (this.state.muted || !this.audioContext) return;
        const frequency = 200 + Math.min(force * 100, 400);
        const duration = Math.min(force * 0.05, 0.1);
        this.playTone(frequency, duration, 0.3);
    }

    playPigDeathSound(): void {
        if (this.state.muted || !this.audioContext) return;
        this.playTone(100, 0.2, 0.4);
        setTimeout(() => {
            if (this.audioContext) {
                this.playTone(80, 0.1, 0.3);
            }
        }, 100);
    }

    private playTone(frequency: number, duration: number, volume: number): void {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume * this.state.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    setMuted(muted: boolean): void {
        this.state.muted = muted;
    }

    setVolume(volume: number): void {
        this.state.volume = Math.max(0, Math.min(1, volume));
    }

    isMuted(): boolean {
        return this.state.muted;
    }

    getVolume(): number {
        return this.state.volume;
    }
}

export class EffectManager {
    private state: EffectState;
    private nextAnimationId: number = 0;

    constructor() {
        this.state = {
            animations: []
        };
    }

    addDestructionAnimation(x: number, y: number): void {
        this.state.animations.push({
            id: `effect-${this.nextAnimationId++}`,
            type: 'destruction',
            x,
            y,
            start_time: Date.now(),
            duration: 500, // 0.5s
            progress: 0
        });
    }

    addScoreAnimation(x: number, y: number, points: number): void {
        this.state.animations.push({
            id: `effect-${this.nextAnimationId++}`,
            type: 'score',
            x,
            y,
            start_time: Date.now(),
            duration: 1000, // 1s
            progress: 0
        });
    }

    updateAnimations(): void {
        const now = Date.now();
        this.state.animations = this.state.animations.filter(anim => {
            const elapsed = now - anim.start_time;
            anim.progress = Math.min(1, elapsed / anim.duration);
            return anim.progress < 1;
        });
    }

    getState(): EffectState {
        return this.state;
    }

    clear(): void {
        this.state.animations = [];
    }
}
