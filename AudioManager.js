/**
 * ORBITAL - Audio Manager
 * WebAudio APIを使用した音声再生管理
 */

class AudioManager {
    constructor() {
        this.context = null;
        this.source = null;
        this.gainNode = null;
        this.audioBuffer = null;

        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;        // 再生開始した時刻 (performance.now基準)
        this.pauseTime = 0;        // 一時停止時の再生位置
        this.offset = 0;           // ユーザー設定オフセット (ms)

        this.duration = 0;

        // コールバック
        this.onTimeUpdate = null;
        this.onEnded = null;
    }

    /**
     * 初期化
     */
    async init() {
        if (this.context) return;

        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.context.createGain();
        this.gainNode.connect(this.context.destination);

        console.log('🔊 AudioManager initialized');
    }

    /**
     * ファイルを読み込み
     */
    async loadFile(file) {
        await this.init();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    this.audioBuffer = await this.context.decodeAudioData(e.target.result);
                    this.duration = this.audioBuffer.duration;
                    console.log(`🎵 Loaded: ${file.name} (${this.duration.toFixed(2)}s)`);
                    resolve(this.audioBuffer);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * ArrayBufferから読み込み
     */
    async loadFromArrayBuffer(arrayBuffer) {
        await this.init();

        this.audioBuffer = await this.context.decodeAudioData(arrayBuffer.slice(0));
        this.duration = this.audioBuffer.duration;
        return this.audioBuffer;
    }

    /**
     * 再生開始
     */
    play(startOffset = 0) {
        if (!this.audioBuffer || this.isPlaying) return;

        // サスペンド状態なら再開
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        this.source = this.context.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.gainNode);

        this.source.onended = () => {
            if (this.isPlaying && !this.isPaused) {
                this.isPlaying = false;
                if (this.onEnded) this.onEnded();
            }
        };

        const offsetSeconds = startOffset / 1000;
        this.source.start(0, offsetSeconds);
        this.startTime = performance.now() - startOffset;
        this.isPlaying = true;
        this.isPaused = false;

        // 時間更新ループ開始
        this._startTimeUpdateLoop();
    }

    /**
     * 一時停止
     */
    pause() {
        if (!this.isPlaying || this.isPaused) return;

        this.pauseTime = this.getCurrentTimeMs();
        this.source.stop();
        this.isPlaying = false;
        this.isPaused = true;
    }

    /**
     * 再開
     */
    resume() {
        if (!this.isPaused) return;
        this.play(this.pauseTime);
    }

    /**
     * 停止
     */
    stop() {
        if (this.source) {
            try {
                this.source.stop();
            } catch (e) { }
        }
        this.isPlaying = false;
        this.isPaused = false;
        this.pauseTime = 0;
    }

    /**
     * 現在の再生時間を取得（ms）- ゲーム判定用
     */
    getCurrentTimeMs() {
        if (!this.isPlaying) {
            return this.pauseTime;
        }
        return performance.now() - this.startTime + this.offset;
    }

    /**
     * 現在の再生時間を取得（秒）
     */
    getCurrentTime() {
        return this.getCurrentTimeMs() / 1000;
    }

    /**
     * 音量設定
     */
    setVolume(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * オフセット設定
     */
    setOffset(ms) {
        this.offset = ms;
    }

    /**
     * 時間更新ループ
     */
    _startTimeUpdateLoop() {
        const update = () => {
            if (this.isPlaying && !this.isPaused) {
                if (this.onTimeUpdate) {
                    this.onTimeUpdate(this.getCurrentTime(), this.duration);
                }
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
    }

    /**
     * リソース解放
     */
    dispose() {
        this.stop();
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}

// グローバルに公開
window.AudioManager = AudioManager;
