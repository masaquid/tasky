function getEnv(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

// 共通：ボール値取得
function getBall(task) {
  return task.properties['ボール']?.select?.name || '';
}

// ステータスが該当するか
function isTargetStatus(status) {
  return ['準備中', '進行中', '検収中'].includes(status);
}

// すべての該当タスクを取得（こっち＋むこう＋未設定）
function fetchAllRelevantNotionTasks() {
  const NOTION_API_KEY = getEnv('NOTION_API_KEY');
  const DATABASE_ID = getEnv('DATABASE_ID');
  
  console.log('=== Notion API設定確認 ===');
  console.log('API_KEY:', NOTION_API_KEY ? `${NOTION_API_KEY.substring(0, 20)}...` : 'なし');
  console.log('DATABASE_ID:', DATABASE_ID);
  
  if (!NOTION_API_KEY || !DATABASE_ID) {
    console.error('❌ 環境変数が未設定です');
    console.error('NOTION_API_KEY:', NOTION_API_KEY ? 'あり' : '❌ なし');
    console.error('DATABASE_ID:', DATABASE_ID ? 'あり' : '❌ なし');
    return [];
  }
  
  console.log('✅ 環境変数設定OK');

  const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28'
    }
  };

  try {
    console.log('Notion APIリクエスト開始...');
    const response = UrlFetchApp.fetch(url, options);
    console.log('APIレスポンス取得完了');
    
    const data = JSON.parse(response.getContentText());
    const results = data.results || [];
    console.log(`全タスク取得数: ${results.length}件`);
    
    
    // ステータスフィルタ（準備中 / 進行中 / 検収中）のみに絞る
    const filteredTasks = results.filter(task => {
      // ステータス型プロパティは .status.name でアクセス
      const status = task.properties['ステータス']?.status?.name || '';
      console.log(`タスク: ${task.properties['プロジェクト名']?.title?.[0]?.plain_text || '(no title)'}, ステータス: "${status}"`);
      return isTargetStatus(status);
    });
    
    console.log(`フィルタ後タスク数: ${filteredTasks.length}件`);
    return filteredTasks;
  } catch (error) {
    console.error('Notion API Error:', error);
    console.error('エラー詳細:', error.toString());
    return [];
  }
}

// AI用のプロンプト整形（こっち）
function formatTasksForAI(tasks) {
  return tasks.map(task => {
    const name = task.properties['プロジェクト名']?.title?.[0]?.plain_text || '(no title)';
    const prio = task.properties['優先度']?.select?.name || '未設定';
    const status = task.properties['ステータス']?.status?.name || '未設定';
    return `■ ${name}\n- ステータス: ${status}\n- 優先度: ${prio}`;
  }).join('\n\n');
}

// 相手または未設定のタスク名だけ抽出
function formatMukouProjects(tasks) {
  if (tasks.length === 0) {
    return '🎉 相手待ち・未割当のタスクはありません！';
  }
  
  return tasks.map((task, index) => {
    const name = task.properties['プロジェクト名']?.title?.[0]?.plain_text || '(no title)';
    const status = task.properties['ステータス']?.status?.name || '未設定';
    const ball = task.properties['ボール']?.select?.name || '未設定';
    
    const ballIcon = ball === 'むこう' ? '⏳' : '❓';
    return `${ballIcon} (${status}) ${name}`;
  }).join('\n');
}

// OpenRouter分析
function analyzeWithOpenRouter(content) {
  const OPENROUTER_API_KEY = getEnv('OPENROUTER_API_KEY');
  const MODEL_ID = getEnv('OPENROUTER_MODEL_ID') || 'mistralai/mistral-7b-instruct:free';
  const systemPrompt = getPromptTemplate();

  const payload = {
    model: MODEL_ID,
    messages: [{
      role: 'user',
      content: `${systemPrompt}\n\n${content}`
    }],
    temperature: 0.4
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', options);
    const data = JSON.parse(response.getContentText());
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const rawContent = data.choices[0].message.content;
      // AI出力を整形: 長い行を適切に改行し、見やすくする
      return formatAiOutput(rawContent);
    }
    console.error('Unexpected OpenRouter response format:', data);
    return 'AI分析に失敗しました。';
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    return 'AI分析でエラーが発生しました。';
  }
}

// AI出力の整形（メール表示用）
function formatAiOutput(content) {
  return content
    // 番号付きリストを見やすく整形
    .replace(/(\d+\.\s)([^(]+)(\([^)]+\))\s*-\s*(.+)/g, (match, num, name, priority, comment) => {
      // 長いコメントを適切に改行
      const formattedComment = comment.length > 60 
        ? comment.replace(/(.{50,60}[\s、。])/g, '$1\n     ') 
        : comment;
      
      return `${num}${name.trim()}${priority}\n   - ${formattedComment}`;
    })
    // 各項目の間に空行を追加
    .replace(/(\d+\.\s[^\n]+(?:\n\s+[^\n]+)*)/g, '$1\n');
}


// メール送信
function sendEmailReport(text) {
  const to = getEnv('REPORT_EMAIL') || 'default@example.com';
  
  // HTMLメール用に変換（改行とインデントを保持）
  const htmlBody = text
    .replace(/\n/g, '<br>')
    .replace(/━━━/g, '<hr style="border: 1px solid #ccc;">')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\s+)/gm, (match) => '&nbsp;'.repeat(match.length))
    .replace(/📋|🔄|📊|🤖|⏳|❓|🎉/g, '<span style="font-size: 16px;">$&</span>');
  
  // 日時を件名に追加して、毎回新しいメールとして認識させる
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'MM/dd HH:mm');
  
  MailApp.sendEmail({
    to: to,
    subject: `[Tasky] プロジェクト要約 - ${dateStr}`,
    body: text, // プレーンテキスト版も保持
    htmlBody: `
      <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; max-width: 800px;">
        ${htmlBody}
      </div>
    `
  });
}
