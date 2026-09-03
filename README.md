# デイジー読谷 事務マニュアル

訪問看護ステーション デイジー読谷（沖縄県中頭郡読谷村）の事務作業マニュアル・関連ツール一式です。
訪問看護指示書の交付依頼フロー、依頼書テンプレート、指示書・提供表・上限額の突合管理、送付状メーカーなどをまとめています。

## 公開サイト

`docs/` フォルダの中身が、Netlifyでそのまま公開できる静的サイトになっています。

- `docs/index.html` … 事務マニュアル本体（トップページ）
- `docs/soufujo.html` … 送付状メーカー（マニュアル内「13. 送付状メーカー」から遷移）

この2ファイルは**同じ階層**に置く必要があります（`soufujo.html` へのリンクが相対パスのため）。

## Netlifyへのデプロイ

### 初回のデプロイ（GitHub連携）
1. [Netlify](https://app.netlify.com) にログイン
2. 「Add new site」→「Import an existing project」→「Deploy with GitHub」
3. このリポジトリを選択
4. ビルド設定：
   - Build command: 空欄のまま（静的サイトのためビルド不要）
   - Publish directory: `docs`
5. 「Deploy site」をクリック

この方法で連携すると、**GitHub上でファイルを更新してpushするだけで、Netlifyが自動的に再デプロイ**してくれるようになります（毎回ドラッグ＆ドロップする必要がなくなります）。

### 手動デプロイ（従来の方法）
`docs/` フォルダの中身を [Netlify Drop](https://app.netlify.com/drop) にドラッグ＆ドロップしても公開できます。

## フォルダ構成

```
.
├── docs/                          ← Netlifyで公開する静的サイト本体
│   ├── index.html                 事務マニュアル本体
│   └── soufujo.html                送付状メーカー
├── assets/
│   ├── templates/                 Word/Excelの初期テンプレート（参考用）
│   │   ├── 訪問看護指示書交付依頼書_テンプレート.docx
│   │   ├── 訪問看護指示書交付依頼業務マニュアル.docx
│   │   └── 指示書_提供表_突合管理表_初期テンプレート.xlsx
│   └── scripts/
│       └── メール通知セットアップ.gs   Google Apps Script（期限切れ等のメール通知）
└── README.md
```

## 指示書・提供表・上限額 突合管理表について

実際に運用中の管理表は **Googleスプレッドシート**で管理しています（`assets/templates/` 内のxlsxは初期構築時のテンプレートで、最新の運用版ではありません）。

- 現在リンクしているスプレッドシート: `docs/index.html` 内の「12. 突合管理表」セクションを参照
- メール通知を設定する場合は `assets/scripts/メール通知セットアップ.gs` を、対象のスプレッドシートの Apps Script エディタに貼り付けてください（手順はファイル冒頭のコメントに記載）

## Claude Codeとの連携

このリポジトリをローカルにクローンし、フォルダ内で `claude` コマンドを実行するだけでClaude Codeが使えるようになります。

```bash
git clone <このリポジトリのURL>
cd <リポジトリ名>
claude
```

Claude Codeでの主な用途例：
- `docs/index.html` や `docs/soufujo.html` の修正・機能追加
- 新しいセクションの追加や、既存デザインに合わせたスタイル調整
- 動作確認用のテストスクリプト作成

変更後は通常のgit操作でコミット・pushすれば、Netlifyが自動的に再デプロイします（GitHub連携済みの場合）。

## 技術メモ

- 依頼書テンプレートのExcel取込機能、送付状メーカーのExcel取込機能は [SheetJS](https://sheetjs.com/) をCDN経由で読み込んでいます。インターネット接続が必要です。
- 送付状メーカーはブラウザの `localStorage` を使ってロゴ・差出人情報・封筒位置調整値を保存します（端末・ブラウザごとに個別）。
- どちらのページも印刷・PDF出力を前提としたレイアウト（`@media print`）を組み込んでいます。
