/**
 * ORBITAL - Renderer
 * Canvas2D描画システム
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 画面サイズ
        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;

        // レティクル設定
        this.outerRingRadius = 0;  // 外リング
        this.innerRingRadius = 0;  // 内リング（判定領域）
        this.judgementRadius = 0;  // 判定中心

        // 軌道設定
        this.orbitStartDistance = 0; // ノーツ出現距離

        // レーン角度（ラジアン）
        this.laneAngles = {
            UL: (225 * Math.PI) / 180,
            UR: (315 * Math.PI) / 180,
            DL: (135 * Math.PI) / 180,
            DR: (45 * Math.PI) / 180,
        };

        // レーンカラー
        this.laneColors = {
            UL: '#ff6b9d',
            UR: '#4fc3f7',
            DL: '#69f0ae',
            DR: '#ffd54f',
        };

        // パーティクル
        this.particles = [];
        this.starDust = [];

        // ビートパルスライン
        this.beatPulses = [];

        // 判定きらめきエフェクト
        this.starTwinkles = [];

        // 天の川エフェクト
        this.milkyWayAlpha = 0;
        this.milkyWayTarget = 0;
        this.milkyWayStars = [];
        this.isChorus = false;

        // アニメーション時間
        this.time = 0;

        this._init();
    }

    _init() {
        this.resize();
        this._createStarDust();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        // 画面サイズに基づいてサイズを計算
        const minDim = Math.min(this.width, this.height);
        this.outerRingRadius = minDim * 0.22;
        this.innerRingRadius = minDim * 0.08;
        this.judgementRadius = minDim * 0.05;
        this.orbitStartDistance = Math.max(this.width, this.height) * 0.8;

        this._createStarDust();
        this._createMilkyWayStars();
    }

    /**
     * 天の川の星を生成
     */
    _createMilkyWayStars() {
        this.milkyWayStars = [];
        const count = 200;

        for (let i = 0; i < count; i++) {
            // 斜めの帯状に配置（左上から右下）
            const t = Math.random();
            const spread = (Math.random() - 0.5) * this.height * 0.4;
            const x = t * this.width * 1.4 - this.width * 0.2;
            const y = t * this.height * 0.8 + spread + this.height * 0.1;

            this.milkyWayStars.push({
                x,
                y,
                size: Math.random() * 2.5 + 0.5,
                alpha: Math.random() * 0.6 + 0.2,
                twinkleSpeed: Math.random() * 3 + 2,
                twinkleOffset: Math.random() * Math.PI * 2,
                hue: Math.random() < 0.3 ? 200 : (Math.random() < 0.5 ? 270 : 0), // 青/紫/白
            });
        }
    }

    /**
     * 背景の星屑を生成
     */
    _createStarDust() {
        this.starDust = [];
        const count = 80;

        for (let i = 0; i < count; i++) {
            this.starDust.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.2,
                twinkleSpeed: Math.random() * 2 + 1,
                twinkleOffset: Math.random() * Math.PI * 2,
            });
        }
    }

    /**
     * フレーム開始時のクリア
     */
    clear() {
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * 背景描画
     */
    drawBackground() {
        const ctx = this.ctx;

        // グラデーション背景
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, Math.max(this.width, this.height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(20, 20, 50, 0.3)');
        gradient.addColorStop(0.5, 'rgba(15, 15, 35, 0.2)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // 星屑
        this.starDust.forEach(star => {
            const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
            const alpha = star.alpha * (0.5 + twinkle * 0.5);

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        });
    }

    /**
     * 軌道を描画（星の航跡）
     */
    drawOrbits(activeNotes = []) {
        const ctx = this.ctx;
        const lanes = ['UL', 'UR', 'DL', 'DR'];

        lanes.forEach(lane => {
            const angle = this.laneAngles[lane];
            const color = this.laneColors[lane];

            // このレーンにノーツがあるか確認（濃さを変える）
            const hasNote = activeNotes.some(n => n.data.lane === lane);
            const alpha = hasNote ? 0.4 : 0.15;

            // 軌道の開始点と終了点
            const startX = this.centerX + Math.cos(angle) * this.orbitStartDistance;
            const startY = this.centerY + Math.sin(angle) * this.orbitStartDistance;
            const endX = this.centerX + Math.cos(angle) * this.innerRingRadius;
            const endY = this.centerY + Math.sin(angle) * this.innerRingRadius;

            // グラデーションライン
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `${color}00`);
            gradient.addColorStop(0.5, `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, color);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = hasNote ? 4 : 2;
            ctx.stroke();

            // 粒子エフェクト（ノーツがある時）
            if (hasNote) {
                const particleCount = 5;
                for (let i = 0; i < particleCount; i++) {
                    const t = (this.time * 0.5 + i / particleCount) % 1;
                    const px = startX + (endX - startX) * t;
                    const py = startY + (endY - startY) * t;
                    const pAlpha = (1 - t) * 0.5;

                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fillStyle = `${color}${Math.floor(pAlpha * 255).toString(16).padStart(2, '0')}`;
                    ctx.fill();
                }
            }
        });
    }

    /**
     * 中心レティクルを描画
     */
    drawReticle() {
        const ctx = this.ctx;

        // 外リング（予告ゾーン）
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.outerRingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 外リングの装飾
        const outerGlow = ctx.createRadialGradient(
            this.centerX, this.centerY, this.outerRingRadius - 10,
            this.centerX, this.centerY, this.outerRingRadius + 10
        );
        outerGlow.addColorStop(0, 'transparent');
        outerGlow.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
        outerGlow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.outerRingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = outerGlow;
        ctx.lineWidth = 20;
        ctx.stroke();

        // 内リング（判定領域）
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.innerRingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 内リングのグロー
        const innerGlow = ctx.createRadialGradient(
            this.centerX, this.centerY, this.innerRingRadius - 15,
            this.centerX, this.centerY, this.innerRingRadius + 15
        );
        innerGlow.addColorStop(0, 'transparent');
        innerGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        innerGlow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.innerRingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = innerGlow;
        ctx.lineWidth = 30;
        ctx.stroke();

        // 中心の星
        this._drawCenterStar();

        // レーンインジケーター
        this._drawLaneIndicators();
    }

    /**
     * 中心の星を描画
     */
    _drawCenterStar() {
        const ctx = this.ctx;
        const pulse = 0.8 + Math.sin(this.time * 3) * 0.2;

        // グロー
        const glow = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.judgementRadius * 2
        );
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        glow.addColorStop(0.3, 'rgba(0, 255, 255, 0.3)');
        glow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.judgementRadius * 2 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // 中心点
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    /**
     * レーンインジケーターを描画
     */
    _drawLaneIndicators() {
        const ctx = this.ctx;
        const lanes = ['UL', 'UR', 'DL', 'DR'];

        lanes.forEach(lane => {
            const angle = this.laneAngles[lane];
            const color = this.laneColors[lane];

            // インジケーターの位置（内リング上）
            const x = this.centerX + Math.cos(angle) * this.innerRingRadius;
            const y = this.centerY + Math.sin(angle) * this.innerRingRadius;

            // ダイヤ形状
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.PI / 4);

            ctx.beginPath();
            ctx.rect(-6, -6, 12, 12);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fill();

            ctx.restore();
        });
    }

    /**
     * ノーツを描画
     */
    drawNote(note, currentTimeMs, approachTimeMs) {
        const ctx = this.ctx;
        const { lane, type, timeMs, durationMs, arcPath } = note.data;

        // 進行度を計算（0=出現、1=判定ライン）
        const timeDiff = timeMs - currentTimeMs;
        const progress = 1 - (timeDiff / approachTimeMs);

        if (progress < 0 || progress > 1.5) return;

        const angle = this.laneAngles[lane];
        const color = this.laneColors[lane];

        // 位置を計算
        const distance = this.orbitStartDistance - (this.orbitStartDistance - this.innerRingRadius) * progress;
        const x = this.centerX + Math.cos(angle) * distance;
        const y = this.centerY + Math.sin(angle) * distance;

        // サイズ（近づくと大きくなる）
        const baseSize = 20;
        const size = baseSize * (0.5 + progress * 0.5);

        switch (type) {
            case 'PULSE':
            case 'TWIN':
                this._drawPulseNote(x, y, size, color, type === 'TWIN');
                break;
            case 'COMET':
                this._drawCometNote(note, currentTimeMs, approachTimeMs);
                break;
            case 'ARC':
                this._drawArcNote(note, currentTimeMs, approachTimeMs);
                break;
        }
    }

    /**
     * PULSEノーツを描画
     */
    _drawPulseNote(x, y, size, color, isTwin = false) {
        const ctx = this.ctx;

        // グロー
        const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        glow.addColorStop(0, color);
        glow.addColorStop(0.5, `${color}80`);
        glow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // 本体
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        // 中心の白点
        ctx.beginPath();
        ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        // TWINは二重リング
        if (isTwin) {
            ctx.beginPath();
            ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    /**
     * COMETノーツを描画
     */
    _drawCometNote(note, currentTimeMs, approachTimeMs) {
        const ctx = this.ctx;
        const { lane, timeMs, durationMs } = note.data;
        const angle = this.laneAngles[lane];
        const color = this.laneColors[lane];

        // 開始位置
        const startTimeDiff = timeMs - currentTimeMs;
        const startProgress = 1 - (startTimeDiff / approachTimeMs);

        // 終了位置
        const endTimeMs = timeMs + durationMs;
        const endTimeDiff = endTimeMs - currentTimeMs;
        const endProgress = 1 - (endTimeDiff / approachTimeMs);

        if (startProgress > 1.5 || endProgress < 0) return;

        const clampedStart = Math.max(0, Math.min(1, startProgress));
        const clampedEnd = Math.max(0, Math.min(1, endProgress));

        // 帯を描画
        const startDist = this.orbitStartDistance - (this.orbitStartDistance - this.innerRingRadius) * clampedEnd;
        const endDist = this.orbitStartDistance - (this.orbitStartDistance - this.innerRingRadius) * clampedStart;

        const startX = this.centerX + Math.cos(angle) * startDist;
        const startY = this.centerY + Math.sin(angle) * startDist;
        const endX = this.centerX + Math.cos(angle) * endDist;
        const endY = this.centerY + Math.sin(angle) * endDist;

        // 帯のグラデーション
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, `${color}60`);
        gradient.addColorStop(0.5, `${color}aa`);
        gradient.addColorStop(1, color);

        // 外側のグロー
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `${color}40`;
        ctx.lineWidth = 50;
        ctx.lineCap = 'round';
        ctx.stroke();

        // メインの帯（太く）
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 35;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 中央の光
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 先頭のノーツ（判定点に近い方）
        if (startProgress > 0 && startProgress <= 1.2) {
            const headX = this.centerX + Math.cos(angle) * (this.orbitStartDistance - (this.orbitStartDistance - this.innerRingRadius) * startProgress);
            const headY = this.centerY + Math.sin(angle) * (this.orbitStartDistance - (this.orbitStartDistance - this.innerRingRadius) * startProgress);
            const size = 20 * (0.5 + startProgress * 0.5);
            this._drawPulseNote(headX, headY, size, color);
        }
    }

    /**
     * ARCノーツを描画
     */
    _drawArcNote(note, currentTimeMs, approachTimeMs) {
        const ctx = this.ctx;
        const { lane, timeMs, durationMs, arcPath } = note.data;

        if (!arcPath || arcPath.length === 0) return;

        // 現在のセグメントを見つける
        let currentLane = lane;
        for (let i = arcPath.length - 1; i >= 0; i--) {
            if (currentTimeMs >= arcPath[i].timeMs) {
                currentLane = arcPath[i].lane;
                break;
            }
        }

        const angle = this.laneAngles[currentLane];
        const color = this.laneColors[currentLane];

        // 開始位置の計算
        const startTimeDiff = timeMs - currentTimeMs;
        const startProgress = 1 - (startTimeDiff / approachTimeMs);

        if (startProgress < 0 || startProgress > 1.5) return;

        // ARCパスを描画
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.innerRingRadius,
            this.laneAngles[arcPath[0].lane],
            this.laneAngles[arcPath[arcPath.length - 1].lane]);
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = 8;
        ctx.stroke();

        // 現在位置のノーツ
        const distance = this.orbitStartDistance - (this.orbitStartDistance - this.innerRingRadius) * startProgress;
        const x = this.centerX + Math.cos(angle) * distance;
        const y = this.centerY + Math.sin(angle) * distance;
        const size = 20 * (0.5 + startProgress * 0.5);

        // ARCは星形
        this._drawStarNote(x, y, size, color);
    }

    /**
     * 星形ノーツを描画
     */
    _drawStarNote(x, y, size, color) {
        const ctx = this.ctx;
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.5;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / spikes) - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    /**
     * 円周UIを描画
     */
    drawHUD(scoreData) {
        const ctx = this.ctx;
        const { score, combo, accuracy } = scoreData;

        // 外周にコンボを表示
        if (combo > 0) {
            this._drawComboArc(combo);
        }

        // 上部にスコア
        ctx.font = '600 24px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
        ctx.fillText(score.toLocaleString(), this.centerX, 60);

        // スコアラベル
        ctx.font = '400 12px Orbitron';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('SCORE', this.centerX, 40);

        // 下部に精度
        ctx.font = '500 20px Orbitron';
        ctx.fillStyle = 'rgba(255, 215, 79, 0.9)';
        ctx.fillText(`${accuracy.toFixed(2)}%`, this.centerX, this.height - 40);

        // 精度ラベル
        ctx.font = '400 12px Orbitron';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('ACCURACY', this.centerX, this.height - 60);
    }

    /**
     * コンボアークを描画
     */
    _drawComboArc(combo) {
        const ctx = this.ctx;
        const maxComboForFullArc = 100;
        const arcProgress = Math.min(combo / maxComboForFullArc, 1);
        const radius = this.outerRingRadius + 30;

        // 弧の描画
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + arcProgress * Math.PI * 2;

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(255, 105, 180, 0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // コンボ数を弧の先端に表示
        const textAngle = endAngle;
        const textX = this.centerX + Math.cos(textAngle) * (radius + 25);
        const textY = this.centerY + Math.sin(textAngle) * (radius + 25);

        ctx.font = '700 18px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff69b4';
        ctx.fillText(combo.toString(), textX, textY);
    }

    /**
     * 判定エフェクトを描画
     */
    drawJudgementEffect(lane, judgement) {
        const angle = this.laneAngles[lane];
        const x = this.centerX + Math.cos(angle) * this.innerRingRadius;
        const y = this.centerY + Math.sin(angle) * this.innerRingRadius;

        this.particles.push({
            x, y,
            type: 'judgement',
            judgement,
            life: 1,
            maxLife: 1,
        });
    }

    /**
     * パーティクルを更新・描画
     */
    updateAndDrawParticles(deltaTime) {
        const ctx = this.ctx;

        this.particles = this.particles.filter(p => {
            p.life -= deltaTime * 2;

            if (p.life <= 0) return false;

            const alpha = p.life / p.maxLife;
            const scale = 1 + (1 - alpha) * 0.5;

            if (p.type === 'judgement') {
                const colors = {
                    PERFECT: '#00ffff',
                    GOOD: '#ffd54f',
                    MISS: '#ff4444',
                };
                const color = colors[p.judgement];

                // リング
                ctx.beginPath();
                ctx.arc(p.x, p.y, 30 * scale, 0, Math.PI * 2);
                ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = 3;
                ctx.stroke();

                // テキスト
                ctx.font = '700 16px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.fillText(p.judgement, p.x, p.y - 50 * (1 - alpha));
            }

            return true;
        });
    }

    /**
     * 時間を更新
     */
    updateTime(deltaTime) {
        this.time += deltaTime;

        // 天の川フェード処理
        const fadeSpeed = 0.5 * deltaTime;
        if (this.milkyWayAlpha < this.milkyWayTarget) {
            this.milkyWayAlpha = Math.min(this.milkyWayAlpha + fadeSpeed, this.milkyWayTarget);
        } else if (this.milkyWayAlpha > this.milkyWayTarget) {
            this.milkyWayAlpha = Math.max(this.milkyWayAlpha - fadeSpeed, this.milkyWayTarget);
        }
    }

    /**
     * ビートパルス（リズムに合わせた放射状ライン）を追加
     */
    addBeatPulse() {
        this.beatPulses.push({
            radius: this.innerRingRadius,
            alpha: 0.8,
            maxRadius: this.orbitStartDistance * 0.6,
        });
    }

    /**
     * ビートパルスを描画
     */
    drawBeatPulses(deltaTime) {
        const ctx = this.ctx;

        this.beatPulses = this.beatPulses.filter(pulse => {
            pulse.radius += deltaTime * 400;
            pulse.alpha -= deltaTime * 1.5;

            if (pulse.alpha <= 0) return false;

            // リングを描画
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, pulse.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 200, 255, ${pulse.alpha * 0.3})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // 放射状ライン
            const lineCount = 8;
            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2 + this.time;
                const innerR = pulse.radius * 0.8;
                const outerR = pulse.radius;

                ctx.beginPath();
                ctx.moveTo(
                    this.centerX + Math.cos(angle) * innerR,
                    this.centerY + Math.sin(angle) * innerR
                );
                ctx.lineTo(
                    this.centerX + Math.cos(angle) * outerR,
                    this.centerY + Math.sin(angle) * outerR
                );
                ctx.strokeStyle = `rgba(150, 220, 255, ${pulse.alpha * 0.5})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            return true;
        });
    }

    /**
     * 判定時の星きらめきを追加
     */
    addStarTwinkle(judgement) {
        // いい判定ほど大きく輝く
        const sizeMultiplier = {
            PERFECT: 1.5,
            GOOD: 1.0,
            MISS: 0.5,
        };

        const colors = {
            PERFECT: { h: 180, s: 100, l: 70 }, // シアン
            GOOD: { h: 45, s: 100, l: 65 },    // ゴールド
            MISS: { h: 0, s: 70, l: 50 },      // 赤
        };

        const count = judgement === 'PERFECT' ? 8 : (judgement === 'GOOD' ? 5 : 2);
        const size = sizeMultiplier[judgement] || 1;
        const color = colors[judgement];

        for (let i = 0; i < count; i++) {
            // ランダムな位置の背景星を選択
            if (this.starDust.length > 0) {
                const starIndex = Math.floor(Math.random() * this.starDust.length);
                const star = this.starDust[starIndex];

                this.starTwinkles.push({
                    x: star.x,
                    y: star.y,
                    size: star.size * 3 * size,
                    alpha: 1,
                    color,
                    life: 1,
                });
            }
        }
    }

    /**
     * 星きらめきを描画
     */
    drawStarTwinkles(deltaTime) {
        const ctx = this.ctx;

        this.starTwinkles = this.starTwinkles.filter(twinkle => {
            twinkle.life -= deltaTime * 2;
            twinkle.alpha = twinkle.life;

            if (twinkle.life <= 0) return false;

            const { x, y, size, alpha, color } = twinkle;
            const scale = 1 + (1 - alpha) * 0.5;

            // グロー
            const glow = ctx.createRadialGradient(x, y, 0, x, y, size * scale * 3);
            glow.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`);
            glow.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha * 0.5})`);
            glow.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(x, y, size * scale * 3, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();

            // 中心の星
            ctx.beginPath();
            ctx.arc(x, y, size * scale, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${color.h}, ${color.s}%, 90%, ${alpha})`;
            ctx.fill();

            return true;
        });
    }

    /**
     * サビ（コーラス）モードを設定
     */
    setChorusMode(isChorus) {
        this.isChorus = isChorus;
        this.milkyWayTarget = isChorus ? 1 : 0;
    }

    /**
     * 天の川を描画
     */
    drawMilkyWay() {
        if (this.milkyWayAlpha <= 0.01) return;

        const ctx = this.ctx;
        const alpha = this.milkyWayAlpha;

        // 天の川の帯（グラデーション）
        const bandGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        bandGradient.addColorStop(0, `rgba(100, 120, 180, ${alpha * 0.15})`);
        bandGradient.addColorStop(0.3, `rgba(150, 130, 200, ${alpha * 0.2})`);
        bandGradient.addColorStop(0.5, `rgba(180, 150, 220, ${alpha * 0.25})`);
        bandGradient.addColorStop(0.7, `rgba(150, 130, 200, ${alpha * 0.2})`);
        bandGradient.addColorStop(1, `rgba(100, 120, 180, ${alpha * 0.15})`);

        ctx.fillStyle = bandGradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // 天の川の星々
        this.milkyWayStars.forEach(star => {
            const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset);
            const starAlpha = star.alpha * (0.6 + twinkle * 0.4) * alpha;

            if (starAlpha < 0.05) return;

            // 星のグロー
            if (star.size > 1.5) {
                const glow = ctx.createRadialGradient(
                    star.x, star.y, 0,
                    star.x, star.y, star.size * 3
                );
                if (star.hue === 0) {
                    glow.addColorStop(0, `rgba(255, 255, 255, ${starAlpha})`);
                    glow.addColorStop(1, 'transparent');
                } else {
                    glow.addColorStop(0, `hsla(${star.hue}, 80%, 80%, ${starAlpha})`);
                    glow.addColorStop(1, 'transparent');
                }

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();
            }

            // 星本体
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            if (star.hue === 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
            } else {
                ctx.fillStyle = `hsla(${star.hue}, 70%, 85%, ${starAlpha})`;
            }
            ctx.fill();
        });
    }
}

// グローバルに公開
window.Renderer = Renderer;
