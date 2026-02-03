const http = require('http');
const https = require('https');

// 配置信息
const CONFIG = {
    API_KEY: 'sk-d9519b7b809346b2a12012bd84ff69fd',
    APP_ID: '727b1f13a9fd45b78fe0278a76ed3acd',
    PORT: 3000
};

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 处理 POST 请求
    if (req.method === 'POST' && req.url === '/api/analyze') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { prompt } = JSON.parse(body);

                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '缺少 prompt 参数' }));
                    return;
                }

                // 调用阿里云百炼 API
                const result = await callBailianAPI(prompt);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, data: result }));

            } catch (error) {
                console.error('处理请求失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
    }
});

// 调用阿里云百炼 API
function callBailianAPI(prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            input: {
                prompt: prompt
            },
            parameters: {
                has_thoughts: false
            },
            debug: {}
        });

        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: `/api/v1/apps/${CONFIG.APP_ID}/completion`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-DashScope-SSE': 'disable'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (res.statusCode !== 200) {
                        reject(new Error(result.message || `API 返回错误: ${res.statusCode}`));
                        return;
                    }

                    if (result.output && result.output.text) {
                        resolve(result.output.text);
                    } else {
                        reject(new Error('API 返回数据格式错误'));
                    }
                } catch (error) {
                    reject(new Error('解析 API 响应失败: ' + error.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error('请求失败: ' + error.message));
        });

        req.write(postData);
        req.end();
    });
}

// 启动服务器
server.listen(CONFIG.PORT, () => {
    console.log(`\n🚀 服务器已启动！`);
    console.log(`📡 监听端口: ${CONFIG.PORT}`);
    console.log(`🌐 访问地址: http://localhost:${CONFIG.PORT}`);
    console.log(`\n请在浏览器中打开 index.html 文件\n`);
});
