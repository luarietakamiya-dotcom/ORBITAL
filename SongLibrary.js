/**
 * ORBITAL - Song Library
 * IndexedDBを使用した楽曲ライブラリ管理
 */

class SongLibrary {
    constructor() {
        this.dbName = 'OrbitalSongLibrary';
        this.dbVersion = 1;
        this.db = null;
        this.songs = [];

        // コールバック
        this.onSongsUpdated = null;
    }

    /**
     * 初期化
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                this._loadAllSongs().then(resolve);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains('songs')) {
                    const store = db.createObjectStore('songs', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
            };
        });
    }

    /**
     * 楽曲を追加
     */
    async addSong(file, metadata = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const songData = {
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    audioData: e.target.result,
                    bpm: metadata.bpm || null,
                    duration: metadata.duration || null,
                    addedAt: new Date().toISOString(),
                    playCount: 0,
                };

                const transaction = this.db.transaction(['songs'], 'readwrite');
                const store = transaction.objectStore('songs');
                const request = store.add(songData);

                request.onsuccess = () => {
                    songData.id = request.result;
                    this.songs.push(this._toSongInfo(songData));
                    if (this.onSongsUpdated) {
                        this.onSongsUpdated(this.songs);
                    }
                    resolve(songData.id);
                };

                request.onerror = () => reject(request.error);
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * ZIPファイルから楽曲を追加
     * ZIP内: 音声ファイル(mp3/ogg/wav), 画像(jpg/png), テキスト(info.txt)
     * info.txt形式:
     *   title: 曲名
     *   artist: アーティスト
     *   credit: クレジット
     */
    async addSongFromZip(zipFile) {
        const zip = await JSZip.loadAsync(zipFile);

        let audioFile = null;
        let imageFile = null;
        let infoText = null;

        // ZIP内のファイルを解析
        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;

            const lowerName = filename.toLowerCase();

            // 音声ファイル
            if (/\.(mp3|ogg|wav|m4a)$/.test(lowerName)) {
                audioFile = {
                    name: filename,
                    data: await zipEntry.async('arraybuffer'),
                    type: this._getMimeType(lowerName)
                };
            }
            // 画像ファイル
            else if (/\.(jpg|jpeg|png)$/.test(lowerName)) {
                imageFile = {
                    name: filename,
                    data: await zipEntry.async('arraybuffer'),
                    type: lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg'
                };
            }
            // テキストファイル (info.txt or *.txt)
            else if (lowerName.endsWith('.txt')) {
                infoText = await zipEntry.async('string');
            }
        }

        if (!audioFile) {
            throw new Error('ZIPファイル内に音声ファイル（mp3/ogg/wav）が見つかりません');
        }

        // info.txtを解析
        let title = zipFile.name.replace(/\.zip$/i, '');
        let artist = 'Unknown Artist';
        let credit = '';

        if (infoText) {
            const parsed = this._parseInfoText(infoText);
            title = parsed.title || title;
            artist = parsed.artist || artist;
            credit = parsed.credit || '';
        }

        // 画像をBase64に変換
        let jacketDataUrl = null;
        if (imageFile) {
            const blob = new Blob([imageFile.data], { type: imageFile.type });
            jacketDataUrl = await this._blobToDataUrl(blob);
        }

        // データベースに保存
        const songData = {
            name: title,
            artist: artist,
            credit: credit,
            fileName: audioFile.name,
            fileType: audioFile.type,
            fileSize: audioFile.data.byteLength,
            audioData: audioFile.data,
            jacket: jacketDataUrl,
            addedAt: new Date().toISOString(),
            playCount: 0,
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.add(songData);

            request.onsuccess = () => {
                songData.id = request.result;
                this.songs.push(this._toSongInfo(songData));
                if (this.onSongsUpdated) {
                    this.onSongsUpdated(this.songs);
                }
                resolve(songData.id);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * info.txtを解析
     */
    _parseInfoText(text) {
        const result = { title: null, artist: null, credit: null };
        // Windows改行(\r\n)とUnix改行(\n)両方に対応
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // コロン（半角・全角）で分割
            const colonIndex = trimmedLine.search(/[:：]/);
            if (colonIndex === -1) continue;

            const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
            const value = trimmedLine.substring(colonIndex + 1).trim();

            if (!key || !value) continue;

            if (key === 'title' || key === 'タイトル' || key === '曲名') {
                result.title = value;
            } else if (key === 'artist' || key === 'アーティスト' || key === '歌手') {
                result.artist = value;
            } else if (key === 'credit' || key === 'クレジット') {
                result.credit = value;
            }
        }

        return result;
    }

    /**
     * MIME typeを取得
     */
    _getMimeType(filename) {
        if (filename.endsWith('.mp3')) return 'audio/mpeg';
        if (filename.endsWith('.ogg')) return 'audio/ogg';
        if (filename.endsWith('.wav')) return 'audio/wav';
        if (filename.endsWith('.m4a')) return 'audio/mp4';
        return 'audio/mpeg';
    }

    /**
     * BlobをDataURLに変換
     */
    _blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    /**
     * 楽曲を削除
     */
    async deleteSong(songId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.delete(songId);

            request.onsuccess = () => {
                this.songs = this.songs.filter(s => s.id !== songId);
                if (this.onSongsUpdated) {
                    this.onSongsUpdated(this.songs);
                }
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 楽曲情報を更新
     */
    async updateSong(songId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const getRequest = store.get(songId);

            getRequest.onsuccess = () => {
                const song = getRequest.result;
                if (!song) {
                    reject(new Error('Song not found'));
                    return;
                }

                Object.assign(song, updates);
                const putRequest = store.put(song);

                putRequest.onsuccess = () => {
                    const index = this.songs.findIndex(s => s.id === songId);
                    if (index !== -1) {
                        Object.assign(this.songs[index], updates);
                    }
                    resolve();
                };

                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * 楽曲を取得
     */
    async getSong(songId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.get(songId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 全楽曲を読み込み
     */
    async _loadAllSongs() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();

            request.onsuccess = () => {
                this.songs = request.result.map(s => this._toSongInfo(s));
                resolve(this.songs);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 楽曲リストを取得（軽量）
     */
    getSongList() {
        return this.songs;
    }

    /**
     * 楽曲数を取得
     */
    getSongCount() {
        return this.songs.length;
    }

    /**
     * 楽曲をBlobとして取得
     */
    async getSongBlob(songId) {
        const song = await this.getSong(songId);
        if (!song) return null;
        return new Blob([song.audioData], { type: song.fileType });
    }

    /**
     * 楽曲をFileとして取得
     */
    async getSongFile(songId) {
        const song = await this.getSong(songId);
        if (!song) return null;
        return new File([song.audioData], song.fileName, { type: song.fileType });
    }

    /**
     * 軽量な楽曲情報に変換
     */
    _toSongInfo(song) {
        return {
            id: song.id,
            name: song.name,
            artist: song.artist || null,
            credit: song.credit || null,
            jacket: song.jacket || null,
            fileName: song.fileName,
            fileType: song.fileType,
            fileSize: song.fileSize,
            duration: song.duration,
            bpm: song.bpm,
            addedAt: song.addedAt,
            playCount: song.playCount,
        };
    }

    /**
     * 再生時間をフォーマット
     */
    formatDuration(seconds) {
        if (!seconds) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * 全削除
     */
    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.clear();

            request.onsuccess = () => {
                this.songs = [];
                if (this.onSongsUpdated) {
                    this.onSongsUpdated(this.songs);
                }
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }
}

// グローバルに公開
window.SongLibrary = SongLibrary;
