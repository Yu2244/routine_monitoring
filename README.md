# Routine Monitoring App

これは、日々の習慣を記録し、可視化するためのシンプルなデスクトップアプリケーションです。Electron, React, Vite を使用して構築されています。

## 機能

*   **チェックリスト入力:** カスタマイズ可能なチェックリストに毎日回答します。
*   **履歴表示:** 過去の回答をフィルタリング・ソート可能な表形式で表示し、不要な回答を削除できます。
*   **チェックリスト編集:** 質問の追加・編集・削除・並び替え、ランダム順序設定などが可能です。
*   **グラフ表示:** 回答履歴を基に、Yes/No（直近7回答のYes率）、n択（直近7回答の選択確率）、数値（日々の値）の推移をグラフで表示します。
*   **データ管理:** ローカルにデータを保存し、JSONファイルでのインポート/エクスポートに対応します。

## 開発環境での実行

1.  **リポジトリのクローン:**
    ```bash
    git clone https://github.com/Yu2244/routine_monitoring.git
    cd routine_monitoring
    ```
2.  **依存関係のインストール:**
    ```bash
    npm install
    ```
3.  **開発モードで起動:**
    ```bash
    npm run dev
    ```
    これにより、Vite 開発サーバーと Electron アプリケーションが起動します。

## ビルド (配布用パッケージの作成)

以下のコマンドを実行すると、`release` ディレクトリに各 OS 用のパッケージが作成されます。

```bash
npm run build
```

*   **macOS:** `.dmg` ファイルが作成されます。インストールして使用します。
*   **Windows:** ポータブル版の `.exe` ファイル（または `win-unpacked` フォルダ）が作成されます。インストール不要で `.exe` ファイルを実行します。
*   **Linux:** `.AppImage` ファイルが作成されます。

## データ保存場所

入力されたデータ (`routineData.json`) は、OS の標準的なユーザーデータディレクトリに保存されます。

*   **macOS:** `~/Library/Application Support/Routine Monitoring/`
*   **Windows:** `C:\Users\<ユーザー名>\AppData\Roaming\Routine Monitoring\`
*   **Linux:** `~/.config/Routine Monitoring/`

## ドキュメント

*   **設計書:** [DESIGN.md](./DESIGN.md)
*   **使い方説明書 (かんたんバージョン):** [MANUAL.md](./MANUAL.md)
*   **配布/実行方法:** [DISTRIBUTION.md](./DISTRIBUTION.md)
