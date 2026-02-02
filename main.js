/**
 * ORBITAL - Main Application
 * メインアプリケーション
 */

class OrbitalApp {
    constructor() {
        // コンポーネント
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager();
        this.songLibrary = new SongLibrary();
        this.renderer = null;
        this.gameEngine = new GameEngine();
        this.judgementManager = new JudgementManager();

        // 状態
        this.currentScreen = 'title';
        this.selectedChart = null;
        this.currentFile = null;
        this.currentSongId = null;

        // 設定
        this.settings = {
            offset: 0,
            speed: 5,
            bgmVolume: 80,
            debugMode: false,
            difficulty: 'hard',
        };

        // デモ譜面
        this.demoCharts = {
            tutorial: null,
            showcase: null,
        };

        this._init();
    }

    async _init() {
        // DOM要素
        this.screens = {
            title: document.getElementById('title-screen'),
            select: document.getElementById('select-screen'),
            library: document.getElementById('library-screen'),
            settings: document.getElementById('settings-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen'),
        };

        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);

        // ゲームエンジン初期化
        this.gameEngine.init(
            this.audioManager,
            this.inputManager,
            this.renderer,
            this.judgementManager
        );

        this.gameEngine.onGameEnd = (result) => this._showResult(result);
        this.gameEngine.onPause = () => this._showPauseMenu();

        // ソングライブラリ初期化
        try {
            await this.songLibrary.init();
            this._updateLibraryUI();
        } catch (e) {
            console.error('Failed to init song library:', e);
        }

        this.songLibrary.onSongsUpdated = () => this._updateLibraryUI();

        // デモ譜面を読み込み
        await this._loadDemoCharts();

        // イベント設定
        this._setupEventListeners();

        // 設定を読み込み
        this._loadSettings();

        console.log('🌌 ORBITAL initialized!');
    }

    async _loadDemoCharts() {
        try {
            const tutorialRes = await fetch('charts/tutorial.json');
            this.demoCharts.tutorial = await tutorialRes.json();

            const showcaseRes = await fetch('charts/showcase.json');
            this.demoCharts.showcase = await showcaseRes.json();

            console.log('📋 Demo charts loaded');
        } catch (e) {
            console.error('Failed to load demo charts:', e);
        }
    }

    _setupEventListeners() {
        // タイトル画面
        document.getElementById('btn-start').addEventListener('click', () => {
            this._showScreen('select');
        });

        document.getElementById('btn-library').addEventListener('click', () => {
            this._showScreen('library');
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this._showScreen('settings');
        });

        // 楽曲選択画面
        document.getElementById('btn-back-title').addEventListener('click', () => {
            this._showScreen('title');
        });

        // タブ切り替え
        document.querySelectorAll('.select-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.select-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const tabId = tab.dataset.tab + '-tab';
                document.getElementById(tabId).classList.add('active');

                // タブ切り替え時に選択をリセット
                this.selectedChart = null;
                this.currentFile = null;
                this.currentSongId = null;
                document.getElementById('selected-song').classList.add('hidden');

                // ライブラリとデモの選択状態もリセット
                document.querySelectorAll('.library-item').forEach(i => i.classList.remove('selected'));
                document.querySelectorAll('.demo-chart-item').forEach(i => i.classList.remove('selected'));
            });
        });

        // ファイルドロップ
        const dropZone = document.getElementById('drop-zone');
        this._setupDropZone(dropZone, (files) => this._handleFileSelected(files[0]));

        document.getElementById('file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleFileSelected(e.target.files[0]);
            }
        });

        // デモ譜面選択
        document.querySelectorAll('.demo-chart-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.demo-chart-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                const chartId = item.dataset.chart;
                this._selectDemoChart(chartId);
            });
        });

        // プレイボタン
        document.getElementById('btn-play').addEventListener('click', () => {
            this._startGame();
        });

        // ライブラリ画面
        document.getElementById('btn-back-library').addEventListener('click', () => {
            this._showScreen('title');
        });

        const libraryDropZone = document.getElementById('library-drop-zone');
        this._setupDropZone(libraryDropZone, (files) => this._handleLibraryFilesSelected(files));

        document.getElementById('library-file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleLibraryFilesSelected(Array.from(e.target.files));
            }
        });

        // 設定画面
        document.getElementById('btn-back-settings').addEventListener('click', () => {
            this._showScreen('title');
            this._saveSettings();
        });

        this._setupSlider('offset', -200, 200, 0, v => `${v}ms`);
        this._setupSlider('speed', 1, 10, 5, v => `${(v * 0.5).toFixed(1)}x`);
        this._setupSlider('bgm', 0, 100, 80, v => `${v}%`);

        document.getElementById('debug-toggle').addEventListener('change', (e) => {
            this.settings.debugMode = e.target.checked;
        });

        // 難易度ボタン
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.difficulty = btn.dataset.difficulty;
            });
        });

        // ゲーム画面
        document.getElementById('btn-resume').addEventListener('click', () => {
            this._resumeGame();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this._restartGame();
        });

        document.getElementById('btn-quit').addEventListener('click', () => {
            this._quitGame();
        });

        // リザルト画面
        document.getElementById('btn-retry').addEventListener('click', () => {
            this._restartGame();
        });

        document.getElementById('btn-back-select').addEventListener('click', () => {
            this._showScreen('select');
        });

        document.getElementById('btn-exit-title').addEventListener('click', () => {
            this._showScreen('title');
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.currentScreen === 'game') {
                if (this.gameEngine.isRunning && !this.gameEngine.isPaused) {
                    this.gameEngine.pause();
                }
            }
        });
    }

    _setupDropZone(dropZone, onDrop) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files).filter(f =>
                f.type.startsWith('audio/') ||
                f.name.toLowerCase().endsWith('.zip')
            );
            if (files.length > 0) {
                onDrop(files);
            }
        });
    }

    _setupSlider(name, min, max, defaultValue, formatter) {
        const slider = document.getElementById(`${name}-slider`);
        const valueDisplay = document.getElementById(`${name}-value`);

        slider.min = min;
        slider.max = max;
        slider.value = defaultValue;
        valueDisplay.textContent = formatter(defaultValue);

        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueDisplay.textContent = formatter(value);

            switch (name) {
                case 'offset':
                    this.settings.offset = value;
                    break;
                case 'speed':
                    this.settings.speed = value;
                    break;
                case 'bgm':
                    this.settings.bgmVolume = value;
                    this.audioManager.setVolume(value / 100);
                    break;
            }
        });
    }

    _showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        this.screens[screenName].classList.add('active');
        this.currentScreen = screenName;

        if (screenName === 'game') {
            this.renderer.resize();
        }
    }

    async _handleFileSelected(file) {
        if (!file) return;

        try {
            await this.audioManager.loadFile(file);
            this.currentFile = file;
            this.currentSongId = null;

            // 自動生成譜面を作成
            this.selectedChart = this._generateChart(
                file.name.replace(/\.[^/.]+$/, ''),
                this.audioManager.duration
            );

            this._showSongInfo(file.name.replace(/\.[^/.]+$/, ''));
        } catch (e) {
            console.error('Failed to load file:', e);
            alert('ファイルの読み込みに失敗しました。');
        }
    }

    _generateChart(title, duration) {
        // 簡易的な譜面自動生成
        const notes = [];

        // 難易度に応じたレーン設定
        const allLanes = ['UL', 'UR', 'DL', 'DR'];
        const easyLanes = ['UL', 'UR'];
        const lanes = this.settings.difficulty === 'easy' ? easyLanes : allLanes;

        const interval = 500; // 500ms間隔
        const durationMs = duration * 1000;

        for (let time = 2000; time < durationMs - 1000; time += interval) {
            const lane = lanes[Math.floor(Math.random() * lanes.length)];

            // ランダムにノーツタイプを決定
            const rand = Math.random();
            let type = 'PULSE';
            let noteData = { timeMs: time, lane, type };

            if (rand < 0.1 && time < durationMs - 2000) {
                // COMET
                type = 'COMET';
                noteData = { timeMs: time, lane, type, durationMs: 800 };
                time += 800;
            } else if (rand < 0.25 && lanes.length > 1) {
                // TWIN（2レーン以上の場合のみ）
                type = 'TWIN';
                const otherLaneIndex = (lanes.indexOf(lane) + 1) % lanes.length;
                const otherLane = lanes[otherLaneIndex];
                notes.push({ timeMs: time, lane, type: 'TWIN' });
                notes.push({ timeMs: time, lane: otherLane, type: 'TWIN' });
                continue;
            }

            notes.push(noteData);
        }

        return {
            title,
            artist: 'Auto Generated',
            bpm: 120,
            offset: 0,
            difficulty: this.settings.difficulty,
            notes: notes.sort((a, b) => a.timeMs - b.timeMs),
        };
    }

    _selectDemoChart(chartId) {
        const chart = this.demoCharts[chartId];
        if (!chart) return;

        this.selectedChart = chart;
        this.currentFile = null;
        this.currentSongId = null;

        this._showSongInfo(chart.title, true);
    }

    _showSongInfo(name, isDemo = false) {
        const selectedSong = document.getElementById('selected-song');
        selectedSong.classList.remove('hidden');

        document.getElementById('song-name').textContent = name;
        document.getElementById('song-duration').textContent = isDemo
            ? 'デモ譜面'
            : this._formatDuration(this.audioManager.duration);
    }

    _formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    async _handleLibraryFilesSelected(files) {
        const overlay = document.getElementById('adding-overlay');
        const status = document.getElementById('adding-status');

        overlay.classList.remove('hidden');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            status.textContent = `楽曲を追加中 (${i + 1}/${files.length}): ${file.name}`;

            try {
                if (file.name.toLowerCase().endsWith('.zip')) {
                    // ZIPファイル
                    await this.songLibrary.addSongFromZip(file);
                } else {
                    // 通常の音声ファイル
                    await this.audioManager.loadFile(file);
                    await this.songLibrary.addSong(file, {
                        duration: this.audioManager.duration,
                    });
                }
            } catch (e) {
                console.error(`Failed to add song: ${file.name}`, e);
                alert(`エラー: ${file.name}\n${e.message}`);
            }
        }

        overlay.classList.add('hidden');
    }

    _updateLibraryUI() {
        const songs = this.songLibrary.getSongList();

        // ライブラリ画面のリスト
        const librarySongs = document.getElementById('library-songs');
        const libraryCount = document.getElementById('library-count');

        libraryCount.textContent = `(${songs.length}曲)`;

        if (songs.length === 0) {
            librarySongs.innerHTML = '<div class="library-empty-msg"><p>まだ楽曲が追加されていません</p></div>';
        } else {
            librarySongs.innerHTML = songs.map(song => `
                <div class="library-item" data-song-id="${song.id}">
                    <div class="library-item-icon">♪</div>
                    <div class="library-item-info">
                        <div class="library-item-name">${song.name}</div>
                        <div class="library-item-meta">
                            <span>${this._formatDuration(song.duration || 0)}</span>
                        </div>
                    </div>
                    <div class="library-song-actions">
                        <button class="library-song-btn delete" title="削除">🗑️</button>
                    </div>
                </div>
            `).join('');

            // 削除ボタン
            librarySongs.querySelectorAll('.library-song-btn.delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const item = btn.closest('.library-item');
                    const songId = parseInt(item.dataset.songId);

                    if (confirm('この楽曲を削除しますか？')) {
                        await this.songLibrary.deleteSong(songId);
                    }
                });
            });
        }

        // 選択画面のリスト
        const songLibraryList = document.getElementById('song-library-list');

        if (songs.length === 0) {
            songLibraryList.innerHTML = `
                <div class="library-empty">
                    <div class="empty-icon">🌌</div>
                    <p>ライブラリに楽曲がありません</p>
                    <p class="empty-hint">「MUSIC LIBRARY」から楽曲を追加してください</p>
                </div>
            `;
        } else {
            songLibraryList.innerHTML = songs.map(song => `
                <div class="library-item select-item" data-song-id="${song.id}">
                    <div class="select-jacket">
                        ${song.jacket
                    ? `<img src="${song.jacket}" alt="Jacket">`
                    : '<span class="jacket-placeholder-small">♪</span>'}
                    </div>
                    <div class="select-info">
                        <div class="select-title">${song.name}</div>
                        <div class="select-artist">${song.artist || 'Unknown Artist'}</div>
                        ${song.credit ? `<div class="select-credit">${song.credit}</div>` : ''}
                    </div>
                    <div class="select-duration">${this._formatDuration(song.duration || 0)}</div>
                </div>
            `).join('');

            // 選択イベント
            songLibraryList.querySelectorAll('.library-item').forEach(item => {
                item.addEventListener('click', async () => {
                    songLibraryList.querySelectorAll('.library-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');

                    const songId = parseInt(item.dataset.songId);
                    await this._selectLibrarySong(songId);
                });
            });
        }
    }

    async _selectLibrarySong(songId) {
        try {
            const song = await this.songLibrary.getSong(songId);
            const file = await this.songLibrary.getSongFile(songId);

            await this.audioManager.loadFromArrayBuffer(song.audioData);

            this.currentFile = file;
            this.currentSongId = songId;

            this.selectedChart = this._generateChart(
                song.name,
                this.audioManager.duration
            );

            this._showSongInfo(song.name);
        } catch (e) {
            console.error('Failed to load library song:', e);
            alert('楽曲の読み込みに失敗しました。');
        }
    }

    async _startGame() {
        if (!this.selectedChart) {
            alert('楽曲を選択してください。');
            return;
        }

        // 設定を適用
        this.gameEngine.setSpeed(this.settings.speed);
        this.gameEngine.setOffset(this.settings.offset);
        this.audioManager.setVolume(this.settings.bgmVolume / 100);

        // ライブラリ曲の場合、現在の難易度で譜面を再生成
        if (this.currentSongId && this.audioManager.duration) {
            console.log('Regenerating chart with difficulty:', this.settings.difficulty);
            this.selectedChart = this._generateChart(
                this.selectedChart.title,
                this.audioManager.duration
            );
        }

        // 譜面を読み込み
        this.gameEngine.loadChart(this.selectedChart);

        // ゲーム画面に楽曲情報を表示
        this._updateGameSongInfo();

        // 画面遷移
        this._showScreen('game');

        // カウントダウン
        await this._countdown();

        // ゲーム開始
        this.audioManager.play();
        this.gameEngine.start();
    }

    _updateGameSongInfo() {
        const chart = this.selectedChart;
        if (!chart) return;

        // ライブラリから選んだ曲の情報を使う
        let artist = chart.artist || 'Unknown Artist';
        let credit = chart.credit || '';
        let jacket = chart.jacket || null;

        // ライブラリ曲の場合は追加情報を取得
        if (this.currentSongId) {
            const songInfo = this.songLibrary.getSongList().find(s => s.id === this.currentSongId);
            if (songInfo) {
                artist = songInfo.artist || artist;
                credit = songInfo.credit || credit;
                jacket = songInfo.jacket || jacket;
            }
        }

        // タイトル、アーティスト、クレジットを設定
        document.getElementById('game-title').textContent = chart.title || 'Unknown';
        document.getElementById('game-artist').textContent = artist;
        document.getElementById('game-credit').textContent = credit;

        // ジャケット画像
        const jacketEl = document.getElementById('game-jacket');
        if (jacket) {
            jacketEl.innerHTML = `<img src="${jacket}" alt="Jacket">`;
        } else {
            jacketEl.innerHTML = '<span class="jacket-placeholder">♪</span>';
        }

        // ジャケット下のアーティスト名
        const jacketArtistEl = document.getElementById('game-jacket-artist');
        if (jacketArtistEl) {
            jacketArtistEl.textContent = artist;
        }
    }

    async _countdown() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'countdown-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(10, 10, 26, 0.9);
                z-index: 1000;
            `;

            const text = document.createElement('div');
            text.style.cssText = `
                font-family: 'Orbitron', sans-serif;
                font-size: 8rem;
                font-weight: 900;
                color: #00ffff;
                text-shadow: 0 0 30px #00ffff, 0 0 60px #00ffff;
            `;

            overlay.appendChild(text);
            document.body.appendChild(overlay);

            let count = 3;

            const tick = () => {
                if (count > 0) {
                    text.textContent = count;
                    text.style.animation = 'none';
                    text.offsetHeight;
                    text.style.animation = 'countPop 0.5s ease-out';
                    count--;
                    setTimeout(tick, 800);
                } else {
                    text.textContent = 'GO!';
                    text.style.color = '#ff69b4';
                    text.style.textShadow = '0 0 30px #ff69b4, 0 0 60px #ff69b4';
                    setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, 500);
                }
            };

            const style = document.createElement('style');
            style.textContent = `
                @keyframes countPop {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            tick();
        });
    }

    _showPauseMenu() {
        document.getElementById('pause-menu').classList.remove('hidden');
    }

    _resumeGame() {
        document.getElementById('pause-menu').classList.add('hidden');
        this.gameEngine.resume();
    }

    _restartGame() {
        document.getElementById('pause-menu').classList.add('hidden');
        this.gameEngine.stop();
        this._startGame();
    }

    _quitGame() {
        document.getElementById('pause-menu').classList.add('hidden');
        this.gameEngine.stop();
        this._showScreen('select');
    }

    _showResult(result) {
        this._showScreen('result');

        document.querySelector('.rank-letter-big').textContent = result.rank;
        document.getElementById('result-score').textContent = result.score.toLocaleString();
        document.getElementById('result-combo').textContent = result.maxCombo;
        document.getElementById('result-accuracy').textContent = `${result.accuracy.toFixed(2)}%`;
        document.getElementById('result-perfect').textContent = result.perfect;
        document.getElementById('result-good').textContent = result.good;
        document.getElementById('result-miss').textContent = result.miss;
    }

    _loadSettings() {
        try {
            const saved = localStorage.getItem('orbital-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                Object.assign(this.settings, settings);

                // UIに反映
                document.getElementById('offset-slider').value = this.settings.offset;
                document.getElementById('offset-value').textContent = `${this.settings.offset}ms`;

                document.getElementById('speed-slider').value = this.settings.speed;
                document.getElementById('speed-value').textContent = `${(this.settings.speed * 0.5).toFixed(1)}x`;

                document.getElementById('bgm-slider').value = this.settings.bgmVolume;
                document.getElementById('bgm-value').textContent = `${this.settings.bgmVolume}%`;

                document.getElementById('debug-toggle').checked = this.settings.debugMode;

                // 難易度ボタン
                document.querySelectorAll('.difficulty-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.difficulty === this.settings.difficulty);
                });
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    _saveSettings() {
        try {
            localStorage.setItem('orbital-settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    _showResult(result) {
        // ゲームを停止
        this.gameEngine.stop();

        // ランク計算
        const rank = this._calculateRank(result.accuracy);

        // 結果をUIに反映
        document.getElementById('result-score').textContent = result.score.toLocaleString();
        document.getElementById('result-combo').textContent = result.maxCombo;
        document.getElementById('result-accuracy').textContent = `${result.accuracy.toFixed(2)}%`;
        document.getElementById('result-perfect').textContent = result.perfect;
        document.getElementById('result-good').textContent = result.good;
        document.getElementById('result-miss').textContent = result.miss;

        // ランク表示
        const rankEl = document.getElementById('result-rank');
        const rankLetter = rankEl.querySelector('.rank-letter-big');
        rankLetter.textContent = rank;

        // ランクに応じた色
        rankEl.className = 'result-rank-big rank-' + rank.toLowerCase();

        // リザルト画面を表示
        this._showScreen('result');
    }

    _calculateRank(accuracy) {
        if (accuracy >= 95) return 'S';
        if (accuracy >= 90) return 'A';
        if (accuracy >= 80) return 'B';
        if (accuracy >= 70) return 'C';
        if (accuracy >= 60) return 'D';
        return 'E';
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OrbitalApp();
});
