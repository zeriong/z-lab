import { describe, expect, it } from 'vitest';
import { AudioSystem } from '../audio';

function fakeContext(): { ctx: AudioContext; gains: Array<{ gain: { value: number } }> } {
  const gains: Array<{ gain: { value: number } }> = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    resume: async () => undefined,
    createGain: () => {
      const g = { gain: param(), connect() {}, disconnect() {} };
      gains.push(g);
      return g;
    },
    createOscillator: () => ({ type: 'sine', frequency: param(), connect() {}, start() {}, stop() {} }),
  };
  return { ctx: ctx as unknown as AudioContext, gains };
}

describe('audio (B10)', () => {
  it('mute toggles the master gain between 0 and 1', () => {
    const { ctx, gains } = fakeContext();
    const audio = new AudioSystem(() => ctx);
    expect(audio.masterGain).toBe(1);
    audio.setMuted(true);
    expect(audio.masterGain).toBe(0);
    audio.unlock();
    expect(gains[0]!.gain.value).toBe(0);
    expect(audio.toggleMuted()).toBe(false);
    expect(gains[0]!.gain.value).toBe(1);
    audio.toggleMuted();
    expect(gains[0]!.gain.value).toBe(0);
  });

  it('never throws: before unlock, with a failing factory, and while playing/bgm', () => {
    const silent = new AudioSystem(() => {
      throw new Error('no audio');
    });
    expect(() => silent.unlock()).not.toThrow();
    expect(silent.unlocked).toBe(false);
    expect(() => silent.play('launch')).not.toThrow();
    expect(() => silent.startBgm('main')).not.toThrow();
    expect(() => silent.stopBgm()).not.toThrow();

    const { ctx } = fakeContext();
    const audio = new AudioSystem(() => ctx);
    expect(() => audio.play('break')).not.toThrow();
    audio.unlock();
    for (const n of ['stretch', 'launch', 'hit', 'break', 'pig', 'clear', 'fail', 'click'] as const) {
      expect(() => audio.play(n)).not.toThrow();
    }
    audio.startBgm('game');
    audio.startBgm('game');
    audio.stopBgm();
  });
});
