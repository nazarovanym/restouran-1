class SoundService {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Mətbəx üçün yeni sifariş siqnalı (İki tonlu şən akkord)
  public playNewOrderSound() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // 523Hz (C5) -> 659Hz (E5)
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

      osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35); // C6

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.15);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 2. Ofisiant çağırışı zəngi (Restoran stolu zəngi "Ding-Dong")
  public playWaiterBell() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 3. Uğurlu Ödəniş və Hesab Bağlama (Kassa kassa səsi "Ka-Ching")
  public playPaymentSuccess() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

export const soundService = new SoundService();
