function taskyMain() {
  console.log('=== Tasky実行開始 ===');
  
  const allTasks = fetchAllRelevantNotionTasks();
  console.log(`取得したタスク数: ${allTasks.length}`);
  
  const kotchiTasks = allTasks.filter(t => {
    const ball = getBall(t);
    console.log(`タスク: ${t.properties['プロジェクト名']?.title?.[0]?.plain_text}, ボール: "${ball}"`);
    return ball === 'こっち';
  });
  const mukouTasks = allTasks.filter(t => {
    const ball = getBall(t);
    return ball === 'むこう' || ball === '';
  });
  
  console.log(`こっちタスク: ${kotchiTasks.length}件`);
  console.log(`むこう/未設定タスク: ${mukouTasks.length}件`);

  const formatted = formatTasksForAI(kotchiTasks);
  console.log('AI送信データ:', formatted);
  
  if (kotchiTasks.length === 0) {
    console.log('こっちタスクが0件のため、AI分析をスキップ');
    const mukouList = formatMukouProjects(mukouTasks);
    const fullReport = `今日分析すべき「こっち」タスクはありません。\n\n---\n🔍 相手または未割当のタスク一覧:\n${mukouList}`;
    sendEmailReport(fullReport);
    return;
  }

  const aiSummary = analyzeWithOpenRouter(formatted);
  const mukouList = formatMukouProjects(mukouTasks);

  const fullReport = `
━━━━━━━━━━━━━━━━━━

📋 **今日のプロジェクト優先順位分析**

${aiSummary}

━━━━━━━━━━━━━━━━━━

🔄 **相手待ち・未割当タスク一覧**

${mukouList}

━━━━━━━━━━━━━━━━━━

📊 **本日の概要**
・分析対象タスク: ${kotchiTasks.length}件
・相手待ち/未割当: ${mukouTasks.length}件
・合計: ${kotchiTasks.length + mukouTasks.length}件

🤖 Generated with Tasky - AI Task Analyzer
  `.trim();
  sendEmailReport(fullReport);
}
