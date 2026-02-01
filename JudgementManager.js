/**
 * ORBITAL - Judgement Manager
 * 判定処理とスコア管理
 */

class JudgementManager {
    constructor() {
        // 判定窓（ms）
        this.windows = {
            PERFECT: 40,
            GOOD: 100,
            MISS: 150,
        };

        // スコア
        this.scoreValues = {
            PERFECT: 1000,
            GOOD: 500,
            MISS: 0,
        };

        // 統計
        this.reset();

        // コールバック
        this.onJudgement = null;
    }

    /**
     * リセット
     */
    reset() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalNotes = 0;
        this.judgements = {
            perfect: 0,
            good: 0,
            miss: 0,
        };
    }

    /**
     * 総ノーツ数を設定
     */
    setTotalNotes(count) {
        this.totalNotes = count;
    }

    /**
     * ノーツ判定（PULSE/TWIN用）
     */
    judgeNote(note, inputTimeMs) {
        const timeDiff = Math.abs(inputTimeMs - note.data.timeMs);

        let judgement;
        if (timeDiff <= this.windows.PERFECT) {
            judgement = 'PERFECT';
        } else if (timeDiff <= this.windows.GOOD) {
            judgement = 'GOOD';
        } else if (timeDiff <= this.windows.MISS) {
            judgement = 'MISS';
        } else {
            return null; // 判定範囲外
        }

        this._recordJudgement(judgement);
        return judgement;
    }

    /**
     * ミス判定（時間超過）
     */
    judgeMiss() {
        this._recordJudgement('MISS');
        return 'MISS';
    }

    /**
     * COMET開始判定
     */
    judgeCometStart(note, inputTimeMs) {
        return this.judgeNote(note, inputTimeMs);
    }

    /**
     * COMET終了判定（離し）
     */
    judgeCometEnd(note, releaseTimeMs) {
        const endTimeMs = note.data.timeMs + note.data.durationMs;
        const timeDiff = Math.abs(releaseTimeMs - endTimeMs);

        let judgement;
        if (timeDiff <= this.windows.PERFECT) {
            judgement = 'PERFECT';
        } else if (timeDiff <= this.windows.GOOD) {
            judgement = 'GOOD';
        } else {
            judgement = 'MISS';
        }

        this._recordJudgement(judgement);
        return judgement;
    }

    /**
     * ARC遷移判定
     */
    judgeArcTransition(note, transitionTimeMs, expectedTimeMs) {
        const timeDiff = Math.abs(transitionTimeMs - expectedTimeMs);

        let judgement;
        if (timeDiff <= this.windows.PERFECT * 1.5) {
            judgement = 'PERFECT';
        } else if (timeDiff <= this.windows.GOOD * 1.5) {
            judgement = 'GOOD';
        } else {
            judgement = 'MISS';
        }

        // ARC遷移は部分的なスコアを付与
        this._recordJudgement(judgement, 0.5);
        return judgement;
    }

    /**
     * 判定を記録
     */
    _recordJudgement(judgement, multiplier = 1) {
        // スコア計算
        const baseScore = this.scoreValues[judgement];
        const comboMultiplier = 1 + Math.floor(this.combo / 10) * 0.1;
        const scoreGain = Math.floor(baseScore * comboMultiplier * multiplier);

        this.score += scoreGain;

        // コンボ
        if (judgement === 'MISS') {
            this.combo = 0;
        } else {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        }

        // 統計
        const key = judgement.toLowerCase();
        this.judgements[key]++;

        // コールバック
        if (this.onJudgement) {
            this.onJudgement(judgement, scoreGain);
        }
    }

    /**
     * 精度を取得
     */
    getAccuracy() {
        const totalJudged = this.judgements.perfect + this.judgements.good + this.judgements.miss;
        if (totalJudged === 0) return 100;

        const perfectWeight = 1.0;
        const goodWeight = 0.5;
        const weightedScore = this.judgements.perfect * perfectWeight + this.judgements.good * goodWeight;

        return (weightedScore / totalJudged) * 100;
    }

    /**
     * ランクを取得
     */
    getRank() {
        const accuracy = this.getAccuracy();

        if (accuracy >= 100) return 'S';
        if (accuracy >= 95) return 'A';
        if (accuracy >= 85) return 'B';
        if (accuracy >= 70) return 'C';
        return 'D';
    }

    /**
     * フルコンボかどうか
     */
    isFullCombo() {
        return this.judgements.miss === 0;
    }

    /**
     * オールパーフェクトかどうか
     */
    isAllPerfect() {
        return this.judgements.miss === 0 && this.judgements.good === 0;
    }

    /**
     * リザルトを取得
     */
    getResult() {
        return {
            score: this.score,
            maxCombo: this.maxCombo,
            accuracy: this.getAccuracy(),
            perfect: this.judgements.perfect,
            good: this.judgements.good,
            miss: this.judgements.miss,
            rank: this.getRank(),
            isFullCombo: this.isFullCombo(),
            isAllPerfect: this.isAllPerfect(),
        };
    }

    /**
     * スコアデータを取得（HUD用）
     */
    getScoreData() {
        return {
            score: this.score,
            combo: this.combo,
            maxCombo: this.maxCombo,
            perfect: this.judgements.perfect,
            good: this.judgements.good,
            miss: this.judgements.miss,
            accuracy: this.getAccuracy(),
        };
    }
}

// グローバルに公開
window.JudgementManager = JudgementManager;
