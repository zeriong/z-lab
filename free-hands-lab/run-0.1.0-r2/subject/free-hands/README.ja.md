<p align="center"><strong>free-hands</strong></p>

<p align="center"><strong>有限の目標を渡すと、エージェントが質問や中断をせずチェックリストを最後まで進めます。</strong></p>

<p align="center"><a href=".claude-plugin/plugin.json"><img src="https://img.shields.io/badge/version-0.1.0-blue" alt="バージョン"></a> <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="ライセンス: MIT"></a> <a href="https://docs.claude.com/en/docs/claude-code/plugins"><img src="https://img.shields.io/badge/Claude%20Code-Plugin-orange" alt="Claude Code プラグイン"></a></p>

<p align="center"><a href="#開始">開始</a> &bull; <a href="#目標ファイル">目標ファイル</a> &bull; <a href="#質問しない">質問しない</a> &bull; <a href="#フック">フック</a> &bull; <a href="#パネル">パネル</a> &bull; <a href="#積み上げpr">積み上げ PR</a> &bull; <a href="#制限と状態">制限と状態</a> &bull; <a href="#codex">Codex</a> &bull; <a href="#必要条件">必要条件</a> &bull; <a href="#インストール">インストール</a></p>

<p align="center"><a href="README.md">English</a> &bull; <a href="README.ko.md">한국어</a> &bull; <a href="README.ja.md">日本語</a> &bull; <a href="README.zh-CN.md">简体中文</a> &bull; <a href="README.zh-TW.md">繁體中文</a></p>

<p align="center"><sub><a href="../../README.ja.md">because-i-needed</a> の一部</sub></p>

---

free-hands は目標を有限で確認可能なチェックリストにし、未完了項目をユーザーに尋ねたり停止したりせずに進めます。本来ユーザーが決める場面では、読み取り専用の5役パネルが助言し、メインエージェントが証拠に基づいて決定し、異論と元に戻す方法を記録します。

## 開始

- Claude Code: `/free-hands:run <目標>`
- Codex: `$free-hands:run <目標>`
- プロンプトに **free-hands** と書いて開始することもできます。最初の応答でユーザーの言語による開始質問を一度だけ行います。はいと答えるとその目標でスキルを開始し、いいえと答えると可能な方向を提案してターンを終えます。名称の説明や引用は開始要求ではありません。目標が有効な間にもう一度「free-hands」と伝えると、確認なしで進め方を修正します。

## 目標ファイル

リポジトリのルートに `.free-hands/goal.md` を置き、Git のローカル除外ファイルに `.free-hands/` を追加します。目標、有限のチェックリスト、決定、再開時のメモを記録します。

```markdown
status: active
max_iterations: 40
iterations: 0
## Goal
<一文の目標>
## Checklist
- [ ] <完了を確認できる有限の項目>
## Decisions
## Resume
<次のセッションに必要な情報>
```

マークは `- [ ]` 未完了、`- [x]` 完了、`- [-] … — needs the user` ハードリミットや別の障害で進められない項目です。状態は `active`、`done`、`waiting`、`paused` です。未完了 `[ ]` だけが質問・停止ガードを有効にします。すべて完了すると `done`、ユーザー対応待ちだけが残ると `waiting` を記録します。`max_iterations` の40回に達すると、復元メモが `paused` に設定して未完了項目を報告し停止するよう指示します。質問は再び可能です。

## 質問しない

目標が有効な間、スキルはユーザーに質問しません。プロジェクトや他のスキルの質問ルール、claude-x-codex などのワークフローの承認ゲートもこの規則で上書きされます。エージェントは確認を求めずにブランチをプッシュし、PR を作成します。失敗したテスト、ゲート、フック、レビューは修正するか、ユーザー対応が必要として `- [-]` に記録し、合格扱いにしません。他プラグインのフックは引き続き動作します。

## フック

フックごとに条件が異なります。

- 質問・停止ガードは目標が `active` で未完了 `[ ]` があり、`max_iterations` 未満の場合だけ動作します。質問ガードは質問ツールを拒否します。上限では質問が可能です。Stop フックは停止をブロックする前にカウンターをディスクへ記録し、最大40回継続します。
- 復元メモ（`UserPromptSubmit`、`SessionStart`）は目標が `active` の間に出力され、未完了項目がなくても動作します。
- 有効で正しい目標がなく、プロンプトに「free-hands」がある場合は開始メモを出力します。

不正なフック入力では何も起きません。不正または読み取れない目標ファイルでは復元・質問・停止動作は有効になりません。プロンプトに「free-hands」があれば、プロンプトフックは有効な目標がない場合の開始ルートを使い、開始質問を出すことがあります。書き込み失敗やロック待ちタイムアウトでも何も起きず、ツール呼び出しや停止が進みます。

## パネル

5役はラウンド1で同じブリーフを独立して検討します。ラウンド2はラウンド1で意見が割れた場合だけ行います。不足または不正な応答は一度だけ再試行し、有効な応答が3件未満なら **panel degraded** と記録してメインエージェントが単独で決めます。最新モデルを確認できない役は代替モデルを使わずスキップし、不足として数えます。Claude Code で `ANTHROPIC_DEFAULT_<FAMILY>_MODEL` のリダイレクトがある場合、その family の役は利用できません。メインエージェントは重要な主張を確認し、投票ではなく証拠で決定します。リポジトリや実行で確認した事実、出典のある証拠、推論の順で重視し、各意見、異論、決定、元に戻す方法を記録します。

| 役割 | 観点 | Claude のモデル系列 |
|---|---|---|
| `quick-thinker` | 素早い第一原理の判断 | `sonnet` |
| `deep-thinker` | 結果、端のケース、二次的影響 | `opus` |
| `evidence-hunter` | ドキュメントとソースの証拠 | `sonnet` |
| `trend-tracker` | 日付付きの最近の変化 | `sonnet` |
| `devils-advocate` | 有力案への最も強い反論 | `opus` |

各役は系列内で利用可能な最新モデルを使います。Claude Code の Agent ツールは実行されたモデル ID を表示しないため、resolver が返した family alias と「id not visible」を記録します。Codex では子プロセスの実行が報告したモデルを記録します。

## 積み上げPR

最初の PR はリポジトリの integration ブランチを対象にします。すべての PR のタイトル末尾に実行内で増える番号 ` (n)` を付け、後続の PR は直前のブランチを基にします。ユーザーが積み上げ順に PR をマージします。先行 PR のマージ後、必要ならエージェントが次の PR の base を integration ブランチに変更し、後続の各ブランチに `origin/<integration>` をマージしてプッシュします。詰まった batch を飛ばさないため、積み上げ順がマージ順です。

## 制限と状態

パネルが単独エージェントより良い判断をするという主張は、**測定前の仮説**です。両ホストでフックとパネルを測る z-lab シリーズは**計画中**です：[z-lab `free-hands-lab/run-0.1.0`](https://github.com/zeriong/z-lab/tree/main/free-hands-lab)。結果は後日公開します。

以下はスキルと復元メモがエージェントに伝えるルールです。該当コマンドをブロックするフックはありません。

- PR をマージしたり、デフォルトブランチに何かをマージしたりしません。
- リポジトリ外のファイル、データ、リモートブランチ、データベースを取り消せない形で削除しません。
- デプロイ、公開、外部への送信（リリース、パッケージ公開、メール、メッセージなど）をしません。

該当項目は理由を付けて `- [-]` と記し、他の作業を続けます。すでにプッシュしたブランチへの force-push は一行で通知した後に可能です。

一時停止するには **「pause」**、「**stop**」、または **「일시정지」** と入力します。目標を `paused` と記録します。コマンドを再実行すると再開します。

由来: プロジェクトローカルのスキルを移植しました。

## Codex

自動動作に頼る前に `/hooks` でプラグインのフックを信頼してください。質問フックの matcher には `request_user_input` が含まれますが、Codex で拒否が届くかはまだ測定していません。Codex のデフォルトモードには質問ツールがないため、作業継続のルールは Stop フックが担います。フックを信頼または有効化していない場合も、スキルの規則に従いますがフックの効果は無効な可能性があります。読み取り専用に制限できる場合だけ native subagent を使い、それ以外は役ごとに `codex exec -s read-only` の子プロセスを使います。`evidence-hunter` と `trend-tracker` ではウェブ検索を有効にします。Codex のパネル経路はリリース前に z-lab で測定予定です。サンドボックス内の Codex メインエージェントはホストの権限昇格経路でパネルコマンドを実行します。

## 必要条件

- フック用の `python3`（`PATH` 上に必要）。
- リポジトリルートとローカル除外設定用の `git`。
- 積み上げ PR の処理に `gh`。
- Codex パネル経路に Codex CLI（`codex`）。

## インストール

先にマーケットプレイスを追加し、その後プラグインをインストールします。

```bash
claude plugin marketplace add https://github.com/zeriong/because-i-needed.git
claude plugin install free-hands@because-i-needed
```

Codex は[マーケットプレイスの説明](../../README.ja.md#codex)を参照してください。

## ライセンス

MIT。[LICENSE](../../LICENSE) を参照してください。
