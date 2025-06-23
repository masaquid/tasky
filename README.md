# Tasky 🤖

Notionタスク管理を自動でAI分析・優先順位付けして通知するGoogle Apps Scriptプロジェクト。

## 📋 概要

TaskyはNotionデータベースから進行中のタスクを取得し、優先順位付きでメール通知するリマインダーツール。

※トークン消費抑制のためNotion本文解析は制限中。  
そのためAI要約精度は限定的です。

**主な機能:**
- 📊 Notionタスクの自動取得・フィルタリング
- 🧠 OpenRouter AI による優先順位分析 ⚠️ **試験版・動作不安定**
- 📧 美しいHTMLメール形式での要約通知
- ⏰ Google Apps Script トリガーによる定期実行

## 🚀 セットアップ

### 1. Notion設定

**Integration作成:**
1. [Notion Integrations](https://www.notion.so/my-integrations) でIntegration作成
2. 「コンテンツとコメントの読み取り」権限を付与

**データベース共有:**
1. Notionデータベースで `...` → `接続を追加`
2. 作成したIntegrationを選択

### 2. 環境変数設定

GASエディタで `プロジェクトのプロパティ > スクリプトのプロパティ` に以下を設定:

```
NOTION_API_KEY=secret_xxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx
OPENROUTER_MODEL_ID=meta-llama/llama-3.2-3b-instruct:free
DATABASE_ID=your_database_id
REPORT_EMAIL=your@email.com
```

### 3. OpenRouter設定

1. [OpenRouter](https://openrouter.ai/)でアカウント作成
2. API Keyを取得
3. 無料モデル利用可能（推奨: `meta-llama/llama-3.2-3b-instruct:free`）

## 🏗️ データベース構造

**注意:** このプロジェクトは特定のNotionプロパティ構成に最適化されています。

**必要なプロパティ:**
- `プロジェクト名` (タイトル型) - タスクのメインタイトル
- `ステータス` (ステータス型) - 準備中/進行中/検収中/完了/など
- `優先度` (選択型) - 高/中/低
- `ボール` (選択型) - こっち/むこう/未設定

**カスタマイズが必要な場合:**  
自分のプロパティ状況に合わせて作ってあるので  
プロパティ名が異なる場合は `utils.gs` の以下部分を修正してください:

```javascript
// プロパティアクセス部分
task.properties['プロジェクト名']?.title?.[0]?.plain_text
task.properties['ステータス']?.status?.name
task.properties['優先度']?.select?.name
task.properties['ボール']?.select?.name
```

## 🔧 使い方

### 手動実行
GASエディタで `taskyMain()` 関数を実行

### 自動実行
1. GASエディタで「トリガー」を設定
2. `taskyMain` 関数を選択
3. 実行頻度を設定（推奨: 1日1回）

## 📊 動作フロー

1. **データ取得** - Notion APIで「準備中/進行中/検収中」タスクを取得
2. **フィルタリング** - ボール値で「こっち」「むこう/未設定」に分類
3. **AI分析** - 「こっち」タスクをOpenRouterで優先順位分析
4. **レポート生成** - HTML形式の美しいメール作成
5. **通知送信** - 設定されたメールアドレスに送信

## 📄 出力例

```
📋 今日のプロジェクト優先順位分析
━━━━━━━━━━━━━━━━━━

1. ECサイトリニューアル（優先度：高）
   - 顧客からの要望が多く、売上に直結するため緊急性が高いです。
   期限も迫っているため最優先で進める必要があります。

2. 営業資料作成（優先度：中）
   - 来週のプレゼンで必要ですが、他のタスクと比較すると
   中程度の優先度です。

🔄 相手待ち・未割当タスク一覧

⏳ (検収中) システム監修案件
❓ (準備中) 新規サイト制作
❓ (未着手) マーケティング企画

📊 本日の概要
・分析対象タスク: 4件
・相手待ち/未割当: 3件
・合計: 7件
```

## 🛠️ カスタマイズ

### ステータスフィルタ変更
`utils.js` の `isTargetStatus` 関数を修正:

```javascript
function isTargetStatus(status) {
  return ['準備中', '進行中', '検収中'].includes(status);
}
```

### プロンプト調整
`Prompt.gs` でAI分析の指示内容を変更可能

⚠️ **AI分析について:**
現在のAI優先度評価機能は試験版のため、動作が不安定な場合があります。
- プロンプトを変更してAI出力の改善を試してみてください
- 異なるAIモデルでの動作テストを推奨します
- より良い結果が得られるプロンプト例があれば共有をお願いします

### 出力フォーマット変更
`Code.gs` の `fullReport` テンプレートを編集

## 🔍 トラブルシューティング

**データが取得できない場合:**
- Notion Integration権限を確認
- DATABASE_IDが正しいか確認
- プロパティ名の大文字小文字を確認

**AI分析が動作しない場合:**
- OpenRouter API Keyを確認
- 無料モデルの利用制限を確認

**メールが送信されない場合:**
- REPORT_EMAILの設定を確認
- GASの実行権限を確認

## 🤝 コントリビューション

このプロジェクトは個人用として作成されていますが、改善提案やバグ報告は歓迎します。
