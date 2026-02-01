# 🌌 ORBITAL - 天体観測リズムゲーム

斜め4軌道・中心吸い込み型の新しいリズムゲーム。

## 🎮 起動方法

1. **ローカルサーバーで起動**
   ```bash
   cd orbital
   python -m http.server 8080
   ```
   または任意のローカルサーバー（VS Code Live Server等）

2. **ブラウザでアクセス**
   ```
   http://localhost:8080
   ```

## 🎵 操作方法

### キー配置

| キー | 方向 | 軌道 |
|------|------|------|
| **A** | 左上 | UL |
| **K** | 右上 | UR |
| **Z** | 左下 | DL |
| **M** | 右下 | DR |

### ノーツ種類

| 種類 | 操作 | 見た目 |
|------|------|--------|
| **PULSE** | タイミングでキーを押す | 円形ノーツ |
| **TWIN** | 2つのキーを同時に押す | 二重リング |
| **COMET** | 押し始め → 押しっぱなし → 離す | 帯状ノーツ |
| **ARC** | 押しながらキーを順番に受け渡し | 星形ノーツ |

### ゲーム中

- **ESC**: 一時停止

---

## 📦 楽曲ZIPファイルの作り方

ライブラリに楽曲を追加するには、以下の構成でZIPファイルを作成してください。

### ZIPファイルの構成

```
MySong.zip
├── song.mp3         ← 音声ファイル（必須）
├── jacket.jpg       ← ジャケット画像（任意）
└── info.txt         ← 楽曲情報（任意）
```

### 対応ファイル形式

| 種類 | 対応形式 | 必須 | 備考 |
|------|----------|------|------|
| **音声** | `.mp3`, `.ogg`, `.wav`, `.m4a` | ✅ 必須 | 複数ある場合は最初の1つを使用 |
| **画像** | `.jpg`, `.jpeg`, `.png` | ❌ 任意 | 正方形推奨 |
| **情報** | `.txt` | ❌ 任意 | ファイル名は自由 |

### 画像の推奨サイズ

| 用途 | 推奨サイズ | 最大サイズ |
|------|------------|------------|
| ジャケット | **500×500px** | 1024×1024px |
| アスペクト比 | 1:1（正方形） | - |
| ファイルサイズ | 500KB以下 | 2MB以下 |

> **注意**: 大きすぎる画像はメモリを消費し、パフォーマンスに影響する可能性があります。

### info.txt の書き方

コロン（`:`）で区切って、以下のキーワードで情報を記述します。

```
title: OUT OF RANGE
artist: 高宮ルアリエ
credit: 作詞・作曲: 高宮ルアリエ
```

#### 対応キーワード

| 日本語 | 英語 | 説明 |
|--------|------|------|
| `タイトル` / `曲名` | `title` | 楽曲タイトル |
| `アーティスト` / `歌手` | `artist` | アーティスト名 |
| `クレジット` | `credit` | 作詞・作曲等の情報 |

#### 書き方の例

**英語キーワード:**
```
title: Galaxy Express
artist: Cosmic Band
credit: Composed by Star Master
```

**日本語キーワード:**
```
曲名: 銀河鉄道の夜
歌手: 宇宙楽団
クレジット: 作曲: スターマスター
```

**全角コロンも使用可能:**
```
タイトル：夜空への旅
アーティスト：月光バンド
```

### ZIPファイルの作成手順（Windows）

1. フォルダを作成し、音声ファイル・画像・info.txtを入れる
2. 全てのファイルを選択
3. 右クリック → 「送る」→「圧縮（zip形式）フォルダー」
4. 作成されたZIPファイルをORBITALにドラッグ&ドロップ

### ZIPファイルの作成手順（Mac）

1. フォルダを作成し、ファイルを入れる
2. フォルダを右クリック →「"〇〇"を圧縮」
3. 作成されたZIPファイルをORBITALにドラッグ&ドロップ

---

## 📋 譜面JSON形式

```json
{
  "title": "曲名",
  "artist": "アーティスト",
  "bpm": 120,
  "offset": 0,
  "notes": [
    { "timeMs": 1000, "lane": "UL", "type": "PULSE" },
    { "timeMs": 2000, "lane": "UR", "type": "TWIN" },
    { "timeMs": 3000, "lane": "DL", "type": "COMET", "durationMs": 1000 },
    {
      "timeMs": 5000,
      "lane": "UL",
      "type": "ARC",
      "durationMs": 2000,
      "arcPath": [
        { "lane": "UL", "timeMs": 5000 },
        { "lane": "UR", "timeMs": 5666 },
        { "lane": "DR", "timeMs": 6333 }
      ]
    }
  ]
}
```

### フィールド説明

| フィールド | 型 | 説明 |
|------------|-----|------|
| `timeMs` | number | 判定タイミング（ミリ秒） |
| `lane` | "UL" \| "UR" \| "DL" \| "DR" | 軌道 |
| `type` | "PULSE" \| "TWIN" \| "COMET" \| "ARC" | ノーツ種類 |
| `durationMs` | number? | COMET/ARCの長さ（ミリ秒） |
| `arcPath` | array? | ARCの遷移パス |

## ⚙️ キー配置の変更

`InputManager.js` の `keyBindings` オブジェクトを編集:

```javascript
this.keyBindings = {
    UL: 'KeyA',  // 左上
    UR: 'KeyK',  // 右上
    DL: 'KeyZ',  // 左下
    DR: 'KeyM',  // 右下
};
```

キーコードは [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) を参照。

## 🎯 判定窓

| 判定 | 範囲 | スコア |
|------|------|--------|
| PERFECT | ±40ms | 1000点 |
| GOOD | ±100ms | 500点 |
| MISS | >150ms | 0点 |

## 📁 ファイル構成

```
orbital/
├── index.html          # メインHTML
├── styles.css          # スタイルシート
├── main.js             # メインアプリケーション
├── AudioManager.js     # 音声管理
├── InputManager.js     # 入力管理
├── SongLibrary.js      # 楽曲ライブラリ
├── Renderer.js         # 描画システム
├── GameEngine.js       # ゲームエンジン
├── JudgementManager.js # 判定管理
├── types.js            # 型定義
├── charts/
│   ├── tutorial.json   # チュートリアル譜面
│   └── showcase.json   # ショーケース譜面
├── LICENSE             # MITライセンス
└── README.md
```

## 🔧 デバッグ機能

設定画面で「デバッグ表示」をONにすると:
- 現在時刻
- FPS
- アクティブノーツ数

が表示されます。

## ⚠️ 音声ファイルについて

本ゲームで読み込む音楽ファイルは、各プレイヤーが権利（利用許諾）を確認したもののみご使用ください。
音声データはブラウザ内でローカル処理され、サーバーへアップロードされません。

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照
