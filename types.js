/**
 * ORBITAL - Type Definitions
 * 型定義・定数
 */

// ============================================
// 定数
// ============================================
const LANE_ANGLES = {
    UL: (225 * Math.PI) / 180, // 左上から中心へ
    UR: (315 * Math.PI) / 180, // 右上から中心へ
    DL: (135 * Math.PI) / 180, // 左下から中心へ
    DR: (45 * Math.PI) / 180,  // 右下から中心へ
};

const LANE_COLORS = {
    UL: '#ff6b9d', // ピンク
    UR: '#4fc3f7', // シアン
    DL: '#69f0ae', // グリーン
    DR: '#ffd54f', // ゴールド
};

const JUDGEMENT_WINDOWS = {
    PERFECT: 40,   // ±40ms
    GOOD: 100,     // ±100ms
    MISS: 150,     // >150ms で見逃し
};

const SCORE_VALUES = {
    PERFECT: 1000,
    GOOD: 500,
    MISS: 0,
};

const DEFAULT_SETTINGS = {
    offset: 0,
    speed: 5,
    bgmVolume: 80,
    debugMode: false,
    difficulty: 'hard',
    keyBindings: {
        UL: 'KeyA',
        UR: 'KeyK',
        DL: 'KeyZ',
        DR: 'KeyM',
    },
};

const APPROACH_TIME_MS = 2000; // ノーツが見えてから判定までの時間

