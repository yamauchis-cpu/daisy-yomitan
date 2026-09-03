/**
 * ============================================================
 * 訪問看護 事務 まとめダッシュボード ― メール通知スクリプト
 * 訪問看護ステーション デイジー読谷
 * ============================================================
 *
 * 【できること】
 * 毎朝（初期設定：平日8:00）、以下を自動チェックしてメールでお知らせします。
 *   ・指示書期限管理：期限切れ／要更新（30日以内）の利用者
 *   ・上限額管理表　：区分支給限度基準額の超過
 *   ・提供表突合　　：対応状況が「未対応」の項目
 * 該当がまったくない日は、メールを送信しません（無駄な通知を防ぐため）。
 *
 * 【セットアップ手順】
 * 1. 対象のGoogleスプレッドシートを開く
 * 2. メニュー「拡張機能」→「Apps Script」を開く
 * 3. デフォルトで開かれる「コード.gs」の中身をすべて削除し、
 *    このファイルの内容を丸ごと貼り付ける
 * 4. 上部の「保存」（フロッピーディスクのアイコン）をクリック
 * 5. 5〜8行目の CONFIG を、実際の宛先メールアドレス等に書き換える
 * 6. 関数選択のプルダウンで「sendDailyDigest」を選び、▶実行ボタンを押す
 *    → 初回のみGoogleの権限確認画面が出るので「許可」する
 *    → 正しく動けば、対象がある場合に指定アドレスへメールが届きます
 * 7. 左メニューの「トリガー」（時計アイコン）→右下「＋トリガーを追加」
 *      実行する関数：sendDailyDigest
 *      イベントのソース：時間主導型
 *      時間ベースのトリガーのタイプ：日付ベースのタイマー
 *      時刻：午前7時〜8時（お好みで調整可）
 *    を設定して保存すれば、毎日自動で実行されるようになります。
 *
 * 【注意】
 * ・実行にはこのスプレッドシートを開けるGoogleアカウントでの認証が必要です。
 * ・シート名・列構成を変更した場合は、下記 CONFIG の列番号も合わせて変更してください
 *   （列番号は A列=1, B列=2 ... という数え方です）。
 * ============================================================
 */

const CONFIG = {
  // 通知の送り先（複数人に送る場合はカンマ区切りで並べる）
  // 例: "manager@daisyflower.one, staff2@daisyflower.one"
  RECIPIENTS: "info@daisyflower.one",

  // メールの件名に付ける事業所名
  STATION_NAME: "デイジー読谷",

  // シート名（変更していなければそのままでOK）
  SHEET_SHIJISHO: "指示書期限管理",
  SHEET_JOGEN: "上限額管理表",
  SHEET_TOTSUGO: "提供表・ケアプラン突合",

  // データ開始行・終了行（ヘッダーの次の行から、テンプレートの最終行まで）
  ROW_START: 5,
  ROW_END: 24,

  // 指示書期限管理：列番号（A=1,B=2,C=3...）
  SHIJISHO_COL_NAME: 1,     // 利用者名
  SHIJISHO_COL_KIND: 4,     // 指示書種類
  SHIJISHO_COL_END: 7,      // 終了日
  SHIJISHO_COL_STATUS: 9,   // ステータス

  // 上限額管理表：列番号
  JOGEN_COL_NAME: 1,        // 利用者名
  JOGEN_COL_LIMIT: 3,       // 区分支給限度基準額
  JOGEN_COL_TOTAL: 10,      // 合計単位数
  JOGEN_COL_DIFF: 11,       // 限度額との差
  JOGEN_COL_HANTEI: 12,     // 判定

  // 提供表突合：列番号
  TOTSUGO_COL_MONTH: 1,     // 対象年月
  TOTSUGO_COL_NAME: 2,      // 利用者名
  TOTSUGO_COL_DIFF: 7,      // 差異件数
  TOTSUGO_COL_STATUS: 9,    // 対応状況
};

function sendDailyDigest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const expired = [];       // 期限切れ
  const nearExpiry = [];    // 要更新(30日以内)
  const overLimit = [];     // 上限超過
  const unresolved = [];    // 提供表未対応

  // ---- ① 指示書期限管理 ----
  const sh1 = ss.getSheetByName(CONFIG.SHEET_SHIJISHO);
  if (sh1) {
    for (let r = CONFIG.ROW_START; r <= CONFIG.ROW_END; r++) {
      const name = sh1.getRange(r, CONFIG.SHIJISHO_COL_NAME).getValue();
      if (!name) continue;
      const status = sh1.getRange(r, CONFIG.SHIJISHO_COL_STATUS).getValue();
      const kind = sh1.getRange(r, CONFIG.SHIJISHO_COL_KIND).getValue();
      const end = sh1.getRange(r, CONFIG.SHIJISHO_COL_END).getValue();
      const endStr = end ? Utilities.formatDate(new Date(end), Session.getScriptTimeZone(), "yyyy/MM/dd") : "";
      if (status === "期限切れ") {
        expired.push(`・${name}（${kind}／終了日:${endStr}）`);
      } else if (status === "要更新(30日以内)") {
        nearExpiry.push(`・${name}（${kind}／終了日:${endStr}）`);
      }
    }
  }

  // ---- ② 上限額管理表 ----
  const sh2 = ss.getSheetByName(CONFIG.SHEET_JOGEN);
  if (sh2) {
    for (let r = CONFIG.ROW_START; r <= CONFIG.ROW_END; r++) {
      const name = sh2.getRange(r, CONFIG.JOGEN_COL_NAME).getValue();
      if (!name) continue;
      const hantei = sh2.getRange(r, CONFIG.JOGEN_COL_HANTEI).getValue();
      if (hantei === "超過") {
        const limit = sh2.getRange(r, CONFIG.JOGEN_COL_LIMIT).getValue();
        const total = sh2.getRange(r, CONFIG.JOGEN_COL_TOTAL).getValue();
        const diff = sh2.getRange(r, CONFIG.JOGEN_COL_DIFF).getValue();
        overLimit.push(`・${name}（限度額:${limit} / 合計:${total} / 差:${diff}）`);
      }
    }
  }

  // ---- ③ 提供表・ケアプラン突合 ----
  const sh3 = ss.getSheetByName(CONFIG.SHEET_TOTSUGO);
  if (sh3) {
    for (let r = CONFIG.ROW_START; r <= CONFIG.ROW_END; r++) {
      const name = sh3.getRange(r, CONFIG.TOTSUGO_COL_NAME).getValue();
      if (!name) continue;
      const status = sh3.getRange(r, CONFIG.TOTSUGO_COL_STATUS).getValue();
      if (status === "未対応") {
        const month = sh3.getRange(r, CONFIG.TOTSUGO_COL_MONTH).getValue();
        const monthStr = month ? Utilities.formatDate(new Date(month), Session.getScriptTimeZone(), "yyyy/MM") : "";
        const diff = sh3.getRange(r, CONFIG.TOTSUGO_COL_DIFF).getValue();
        unresolved.push(`・${name}（対象年月:${monthStr} / 差異件数:${diff}）`);
      }
    }
  }

  const totalCount = expired.length + nearExpiry.length + overLimit.length + unresolved.length;
  if (totalCount === 0) {
    // 対応が必要な項目がなければ、メールは送らずに終了
    return;
  }

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd");
  const subject = `【${CONFIG.STATION_NAME}】要対応 ${totalCount}件 (${today}) 指示書・上限管理・突合チェック`;

  let body = `${CONFIG.STATION_NAME} 事務まとめダッシュボードからの自動通知です。\n`;
  body += `以下の項目をご確認ください（${today} 時点）。\n\n`;

  if (expired.length) {
    body += `■ 指示書：期限切れ（${expired.length}件）\n${expired.join("\n")}\n\n`;
  }
  if (nearExpiry.length) {
    body += `■ 指示書：要更新・30日以内（${nearExpiry.length}件）\n${nearExpiry.join("\n")}\n\n`;
  }
  if (overLimit.length) {
    body += `■ 上限管理：区分支給限度基準額 超過（${overLimit.length}件）\n${overLimit.join("\n")}\n\n`;
  }
  if (unresolved.length) {
    body += `■ 提供表・ケアプラン突合：未対応（${unresolved.length}件）\n${unresolved.join("\n")}\n\n`;
  }

  body += `詳細はスプレッドシートの「0_まとめ」シートをご確認ください。\n`;
  body += ss.getUrl();

  MailApp.sendEmail({
    to: CONFIG.RECIPIENTS,
    subject: subject,
    body: body,
  });
}

/**
 * 動作確認用：件数に関わらず必ずテストメールを送りたいときに実行してください。
 * （sendDailyDigestは「該当0件のときはメールを送らない」仕様のため、
 * 　初回セットアップ時の疎通確認にはこちらが便利です）
 */
function sendTestMail() {
  MailApp.sendEmail({
    to: CONFIG.RECIPIENTS,
    subject: `【${CONFIG.STATION_NAME}】通知テストメール`,
    body: "このメールが届いていれば、メール通知の設定は正常に完了しています。",
  });
}
