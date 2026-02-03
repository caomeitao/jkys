// 配置信息 - 使用本地代理服务器
const CONFIG = {
    PROXY_URL: 'http://localhost:3000/api/analyze'
};

// DOM 元素
const messagesContainer = document.getElementById('messages');
const foodInput = document.getElementById('foodInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const btnText = analyzeBtn.querySelector('.btn-text');
const btnLoading = analyzeBtn.querySelector('.btn-loading');

// 会话历史
let conversationHistory = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    analyzeBtn.addEventListener('click', handleAnalyze);
    foodInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleAnalyze();
        }
    });
});

// 处理分析请求
async function handleAnalyze() {
    const foodText = foodInput.value.trim();

    if (!foodText) {
        showError('请输入你今天吃的食物');
        return;
    }

    // 添加用户消息
    addMessage(foodText, 'user');

    // 清空输入框
    foodInput.value = '';

    // 禁用按钮
    setButtonLoading(true);

    try {
        // 调用代理服务器
        const response = await callProxyAPI(foodText);

        // 添加助手回复
        addMessage(response, 'assistant');

        // 保存到会话历史
        conversationHistory.push({
            user: foodText,
            assistant: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('分析失败:', error);
        showError('分析失败，请稍后重试。错误信息：' + error.message);
    } finally {
        setButtonLoading(false);
    }
}

// 调用代理 API
async function callProxyAPI(foodText) {
    try {
        const response = await fetch(CONFIG.PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: foodText
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
            return data.data;
        } else {
            throw new Error(data.error || '返回数据格式错误');
        }

    } catch (error) {
        console.error('调用代理 API 出错:', error);
        throw error;
    }
}

// 添加消息到聊天界面
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // 格式化消息内容
    contentDiv.innerHTML = formatMessage(text);

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // 滚动到底部
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// 格式化消息内容
function formatMessage(text) {
    // 转义 HTML 特殊字符
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // 先转义
    let formatted = escapeHtml(text);

    // 处理换行
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');

    // 处理加粗
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 处理标题
    formatted = formatted.replace(/^### (.*?)(<br>|$)/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*?)(<br>|$)/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^# (.*?)(<br>|$)/gm, '<h3>$1</h3>');

    // 处理列表
    const lines = formatted.split('<br>');
    let inList = false;
    let listType = null;
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检查是否是列表项
        const bulletMatch = line.match(/^[•\-\*]\s+(.+)$/);
        const numberMatch = line.match(/^\d+\.\s+(.+)$/);

        if (bulletMatch) {
            if (!inList || listType !== 'ul') {
                if (inList) processedLines.push(`</${listType}>`);
                processedLines.push('<ul>');
                inList = true;
                listType = 'ul';
            }
            processedLines.push(`<li>${bulletMatch[1]}</li>`);
        } else if (numberMatch) {
            if (!inList || listType !== 'ol') {
                if (inList) processedLines.push(`</${listType}>`);
                processedLines.push('<ol>');
                inList = true;
                listType = 'ol';
            }
            processedLines.push(`<li>${numberMatch[1]}</li>`);
        } else {
            if (inList) {
                processedLines.push(`</${listType}>`);
                inList = false;
                listType = null;
            }
            if (line) {
                processedLines.push(line + '<br>');
            }
        }
    }

    if (inList) {
        processedLines.push(`</${listType}>`);
    }

    formatted = processedLines.join('');

    return '<p>' + formatted + '</p>';
}

// 显示错误消息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant';
    errorDiv.innerHTML = `
        <div class="message-content">
            <div class="error-message">${message}</div>
        </div>
    `;
    messagesContainer.appendChild(errorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 设置按钮加载状态
function setButtonLoading(isLoading) {
    analyzeBtn.disabled = isLoading;
    foodInput.disabled = isLoading;

    if (isLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}
