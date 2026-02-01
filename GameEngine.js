/**
 * ORBITAL - Game Engine
 * ゲームのコアロジック
 */

class GameEngine {
    constructor() {
        this.audioManager = null;
        this.inputManager = null;
        this.renderer = null;
        this.judgementManager = null;

        // 譜面データ
        this.chart = null;
        this.notes = [];           // 全ノーツ
        this.activeNotes = [];     // 画面上のノーツ

        // 設定
        this.approachTimeMs = 2000; // ノーツが見えてから判定までの時間
        this.offset = 0;

        // 状態
        this.isRunning = false;
        this.isPaused = false;
        this.lastFrameTime = 0;
        this.animationId = null;

        // コールバック
        this.onGameEnd = null;
        this.onPause = null;
    }

    /**
     * 初期化
     */
    init(audioManager, inputManager, renderer, judgementManager) {
        this.audioManager = audioManager;
        this.inputManager = inputManager;
        this.renderer = renderer;
        this.judgementManager = judgementManager;

        // 入力コールバック
        this.inputManager.onKeyPress = (lane, time) => this._handleKeyPress(lane, time);
        this.inputManager.onKeyRelease = (lane, time) => this._handleKeyRelease(lane, time);
    }

    /**
     * 譜面を読み込み
     */
    loadChart(chart) {
        this.chart = chart;

        // ノーツを生成
        this.notes = chart.notes.map((noteData, index) => ({
            id: `note_${index}`,
            data: noteData,
            state: 'waiting',
            holdProgress: 0,
            currentArcLane: noteData.lane,
            arcTransitionIndex: 0,
        }));

        // 時間順にソート
        this.notes.sort((a, b) => a.data.timeMs - b.data.timeMs);

        this.activeNotes = [];

        // コーラスセクション（サビ）を保存
        this.chorusSections = chart.chorusSections || [];
        this.isInChorus = false;

        console.log(`📋 Chart loaded: ${chart.title} (${this.notes.length} notes)`);
    }

    /**
     * 速度を設定
     */
    setSpeed(speed) {
        // speed: 1-10, デフォルト5
        // 2000ms (遅い) 〜 800ms (速い)
        this.approachTimeMs = 2400 - (speed * 160);
    }

    /**
     * オフセットを設定
     */
    setOffset(offset) {
        this.offset = offset;
    }

    /**
     * ゲーム開始
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();

        this.judgementManager.reset();
        this.judgementManager.setTotalNotes(this.notes.length);

        // 全ノーツをwaitingに
        this.notes.forEach(note => {
            note.state = 'waiting';
            note.holdProgress = 0;
            note.arcTransitionIndex = 0;
        });
        this.activeNotes = [];

        this._gameLoop();

        console.log('🎮 Game started!');
    }

    /**
     * 一時停止
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;

        this.isPaused = true;
        this.audioManager.pause();

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.onPause) this.onPause();
    }

    /**
     * 再開
     */
    resume() {
        if (!this.isPaused) return;

        this.isPaused = false;
        this.audioManager.resume();
        this.lastFrameTime = performance.now();
        this._gameLoop();
    }

    /**
     * 停止
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.audioManager.stop();
        this.inputManager.reset();
    }

    /**
     * ゲームループ
     */
    _gameLoop() {
        if (!this.isRunning || this.isPaused) return;

        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        const currentTimeMs = this.audioManager.getCurrentTimeMs() + this.offset;

        // サビ（コーラス）チェック
        this._updateChorusState(currentTimeMs);

        // ノーツ更新
        this._updateNotes(currentTimeMs);

        // 描画
        this._render(currentTimeMs, deltaTime);

        // 入力状態をリセット
        this.inputManager.update();

        // 曲終了チェック
        if (currentTimeMs > (this.audioManager.duration * 1000) + 2000) {
            this._endGame();
            return;
        }

        this.animationId = requestAnimationFrame(() => this._gameLoop());
    }

    /**
     * サビ（コーラス）状態を更新
     */
    _updateChorusState(currentTimeMs) {
        let inChorus = false;

        for (const section of this.chorusSections) {
            if (currentTimeMs >= section.startMs && currentTimeMs <= section.endMs) {
                inChorus = true;
                break;
            }
        }

        if (inChorus !== this.isInChorus) {
            this.isInChorus = inChorus;
            this.renderer.setChorusMode(inChorus);
        }
    }

    /**
     * ノーツ更新
     */
    _updateNotes(currentTimeMs) {
        const visibleStartTime = currentTimeMs - 500; // 少し前のノーツも残す
        const visibleEndTime = currentTimeMs + this.approachTimeMs + 500;

        // 新しいノーツをアクティブに
        this.notes.forEach(note => {
            if (note.state === 'waiting') {
                if (note.data.timeMs <= visibleEndTime && note.data.timeMs >= visibleStartTime) {
                    note.state = 'approaching';
                    this.activeNotes.push(note);
                }
            }
        });

        // アクティブノーツを更新
        this.activeNotes = this.activeNotes.filter(note => {
            // 既に処理済み
            if (note.state === 'hit' || note.state === 'missed') {
                return false;
            }

            // ミス判定（時間超過）
            const missWindow = 150; // ms

            switch (note.data.type) {
                case 'PULSE':
                case 'TWIN':
                    if (currentTimeMs > note.data.timeMs + missWindow) {
                        note.state = 'missed';
                        this.judgementManager.judgeMiss();
                        this.renderer.drawJudgementEffect(note.data.lane, 'MISS');
                        return false;
                    }
                    break;

                case 'COMET':
                    const endTimeMs = note.data.timeMs + note.data.durationMs;
                    if (note.state === 'approaching' && currentTimeMs > note.data.timeMs + missWindow) {
                        note.state = 'missed';
                        this.judgementManager.judgeMiss();
                        this.renderer.drawJudgementEffect(note.data.lane, 'MISS');
                        return false;
                    }
                    if (note.state === 'holding') {
                        note.holdProgress = (currentTimeMs - note.data.timeMs) / note.data.durationMs;
                        if (currentTimeMs > endTimeMs + missWindow) {
                            note.state = 'missed';
                            this.judgementManager.judgeMiss();
                            return false;
                        }
                    }
                    break;

                case 'ARC':
                    if (currentTimeMs > note.data.timeMs + missWindow && note.state === 'approaching') {
                        note.state = 'missed';
                        this.judgementManager.judgeMiss();
                        return false;
                    }
                    break;
            }

            return true;
        });
    }

    /**
     * 描画
     */
    _render(currentTimeMs, deltaTime) {
        const renderer = this.renderer;

        renderer.updateTime(deltaTime);
        renderer.clear();

        // 天の川（サビ時にフェードイン）
        renderer.drawMilkyWay();

        renderer.drawBackground();

        // 星きらめきエフェクト
        renderer.drawStarTwinkles(deltaTime);

        // ビートパルス
        renderer.drawBeatPulses(deltaTime);

        renderer.drawOrbits(this.activeNotes);

        // ノーツ描画
        this.activeNotes.forEach(note => {
            if (note.state !== 'hit' && note.state !== 'missed') {
                renderer.drawNote(note, currentTimeMs, this.approachTimeMs);
            }
        });

        renderer.drawReticle();
        renderer.updateAndDrawParticles(deltaTime);
        renderer.drawHUD(this.judgementManager.getScoreData());
    }

    /**
     * キー押下処理
     */
    _handleKeyPress(lane, time) {
        if (!this.isRunning || this.isPaused) return;

        const currentTimeMs = this.audioManager.getCurrentTimeMs() + this.offset;

        // 対応するレーンのノーツを探す
        const targetNote = this.activeNotes.find(note => {
            if (note.data.lane !== lane) return false;
            if (note.state !== 'approaching') return false;

            const timeDiff = Math.abs(currentTimeMs - note.data.timeMs);
            return timeDiff <= 150; // 判定窓内
        });

        if (!targetNote) return;

        switch (targetNote.data.type) {
            case 'PULSE':
            case 'TWIN':
                const judgement = this.judgementManager.judgeNote(targetNote, currentTimeMs);
                if (judgement) {
                    targetNote.state = 'hit';
                    this.renderer.drawJudgementEffect(lane, judgement);
                    // 判定時の星きらめきとビートパルス
                    this.renderer.addStarTwinkle(judgement);
                    if (judgement === 'PERFECT') {
                        this.renderer.addBeatPulse();
                    }
                }
                break;

            case 'COMET':
                const startJudgement = this.judgementManager.judgeCometStart(targetNote, currentTimeMs);
                if (startJudgement && startJudgement !== 'MISS') {
                    targetNote.state = 'holding';
                    this.renderer.drawJudgementEffect(lane, startJudgement);
                    this.renderer.addStarTwinkle(startJudgement);
                    if (startJudgement === 'PERFECT') {
                        this.renderer.addBeatPulse();
                    }
                } else if (startJudgement === 'MISS') {
                    targetNote.state = 'missed';
                    this.renderer.drawJudgementEffect(lane, 'MISS');
                    this.renderer.addStarTwinkle('MISS');
                }
                break;

            case 'ARC':
                // ARCの開始判定
                const arcJudgement = this.judgementManager.judgeNote(targetNote, currentTimeMs);
                if (arcJudgement && arcJudgement !== 'MISS') {
                    targetNote.state = 'holding';
                    this.renderer.drawJudgementEffect(lane, arcJudgement);
                    this.renderer.addStarTwinkle(arcJudgement);
                    if (arcJudgement === 'PERFECT') {
                        this.renderer.addBeatPulse();
                    }
                }
                break;
        }
    }

    /**
     * キー離し処理
     */
    _handleKeyRelease(lane, time) {
        if (!this.isRunning || this.isPaused) return;

        const currentTimeMs = this.audioManager.getCurrentTimeMs() + this.offset;

        // ホールド中のCOMETを探す
        const holdingNote = this.activeNotes.find(note => {
            return note.data.lane === lane &&
                note.state === 'holding' &&
                note.data.type === 'COMET';
        });

        if (holdingNote) {
            const endJudgement = this.judgementManager.judgeCometEnd(holdingNote, currentTimeMs);
            holdingNote.state = 'hit';
            this.renderer.drawJudgementEffect(lane, endJudgement);
        }

        // ARC処理
        const arcNote = this.activeNotes.find(note => {
            return note.state === 'holding' && note.data.type === 'ARC';
        });

        if (arcNote && arcNote.data.arcPath) {
            // 次のレーンへの遷移をチェック
            const nextIndex = arcNote.arcTransitionIndex + 1;
            if (nextIndex < arcNote.data.arcPath.length) {
                const expectedTime = arcNote.data.arcPath[nextIndex].timeMs;
                const timeDiff = Math.abs(currentTimeMs - expectedTime);

                if (timeDiff <= 200) {
                    const transitionJudgement = this.judgementManager.judgeArcTransition(
                        arcNote, currentTimeMs, expectedTime
                    );
                    arcNote.currentArcLane = arcNote.data.arcPath[nextIndex].lane;
                    arcNote.arcTransitionIndex = nextIndex;
                    this.renderer.drawJudgementEffect(arcNote.currentArcLane, transitionJudgement);
                }
            } else {
                // ARC完了
                arcNote.state = 'hit';
            }
        }
    }

    /**
     * ゲーム終了
     */
    _endGame() {
        this.isRunning = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.onGameEnd) {
            this.onGameEnd(this.judgementManager.getResult());
        }
    }
}

// グローバルに公開
window.GameEngine = GameEngine;
