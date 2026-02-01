/**
 * ORBITAL - Input Manager
 * キー入力管理
 */

class InputManager {
    constructor() {
        // キーバインド（変更可能）
        this.keyBindings = {
            UL: 'KeyA',
            UR: 'KeyK',
            DL: 'KeyZ',
            DR: 'KeyM',
        };

        // 逆引きマップ
        this.codeToLane = {};
        this._updateCodeToLane();

        // 押下状態
        this.pressed = { UL: false, UR: false, DL: false, DR: false };
        this.justPressed = { UL: false, UR: false, DL: false, DR: false };
        this.justReleased = { UL: false, UR: false, DL: false, DR: false };
        this.pressTime = { UL: 0, UR: 0, DL: 0, DR: 0 };

        // イベントハンドラをバインド
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);

        // コールバック
        this.onKeyPress = null;
        this.onKeyRelease = null;

        this._init();
    }

    _init() {
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        console.log('⌨️ InputManager initialized');
    }

    _updateCodeToLane() {
        this.codeToLane = {};
        for (const [lane, code] of Object.entries(this.keyBindings)) {
            this.codeToLane[code] = lane;
        }
    }

    _handleKeyDown(e) {
        const lane = this.codeToLane[e.code];
        if (!lane) return;

        e.preventDefault();

        if (!this.pressed[lane]) {
            this.pressed[lane] = true;
            this.justPressed[lane] = true;
            this.pressTime[lane] = performance.now();

            if (this.onKeyPress) {
                this.onKeyPress(lane, this.pressTime[lane]);
            }
        }
    }

    _handleKeyUp(e) {
        const lane = this.codeToLane[e.code];
        if (!lane) return;

        e.preventDefault();

        if (this.pressed[lane]) {
            this.pressed[lane] = false;
            this.justReleased[lane] = true;

            if (this.onKeyRelease) {
                this.onKeyRelease(lane, performance.now());
            }
        }
    }

    /**
     * フレーム更新後にjust状態をリセット
     */
    update() {
        for (const lane of ['UL', 'UR', 'DL', 'DR']) {
            this.justPressed[lane] = false;
            this.justReleased[lane] = false;
        }
    }

    /**
     * 押下中かどうか
     */
    isPressed(lane) {
        return this.pressed[lane];
    }

    /**
     * このフレームで押されたか
     */
    wasJustPressed(lane) {
        return this.justPressed[lane];
    }

    /**
     * このフレームで離されたか
     */
    wasJustReleased(lane) {
        return this.justReleased[lane];
    }

    /**
     * 入力状態を取得
     */
    getInputState() {
        return {
            pressed: { ...this.pressed },
            justPressed: { ...this.justPressed },
            justReleased: { ...this.justReleased },
            pressTime: { ...this.pressTime },
        };
    }

    /**
     * キーバインドを設定
     */
    setBinding(lane, keyCode) {
        this.keyBindings[lane] = keyCode;
        this._updateCodeToLane();
    }

    /**
     * キーバインドを取得
     */
    getBindings() {
        return { ...this.keyBindings };
    }

    /**
     * 全ての入力をリセット
     */
    reset() {
        for (const lane of ['UL', 'UR', 'DL', 'DR']) {
            this.pressed[lane] = false;
            this.justPressed[lane] = false;
            this.justReleased[lane] = false;
        }
    }

    /**
     * リソース解放
     */
    dispose() {
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
    }
}

// グローバルに公開
window.InputManager = InputManager;
