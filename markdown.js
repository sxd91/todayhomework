// markdown.js
(function() {
    function createModalIfNeeded() {
        if (document.getElementById('markdownModal')) return;
        const modalHTML = `
            <div id="markdownModal" class="markdown-modal">
                <div class="markdown-card">
                    <div class="markdown-header">
                        <span id="modalTitle">📄 作业文档</span>
                        <button class="close-modal" id="closeModalBtn">&times;</button>
                    </div>
                    <div class="markdown-content" id="modalMarkdownContent">
                        加载中...
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('markdownModal');
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.getElementById('modalMarkdownContent').innerHTML = '';
            });
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.getElementById('modalMarkdownContent').innerHTML = '';
            }
        });
    }

    async function renderMathWithStableLayout() {
        if (!window.MathJax) return;
        await new Promise(resolve => setTimeout(resolve, 30));
        try {
            await MathJax.typesetPromise();
        } catch (err) {
            console.warn('MathJax 渲染失败:', err);
        }
    }

    // 改进的自动包裹：避免重复包裹，不破坏已有的 $...$ 内容
    function autoWrapMathCommands(text) {
        // 用于存储提取出的数学模式块
        const mathBlocks = [];
        // 匹配所有 $...$ 和 $$...$$ 以及 \(...\) 和 \[...\] 的内容
        // 注意：正则不会贪婪跨越多个块
        const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/gs;
        // 将数学模式块替换为占位符
        let processed = text.replace(mathRegex, (match) => {
            const placeholder = `__MATHBLOCK_${mathBlocks.length}__`;
            mathBlocks.push(match);
            return placeholder;
        });

        // 定义需要自动包裹的 LaTeX 命令及其参数模式
        const commands = [
            // 化学命令
            { pattern: '\\\\ce\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}', wrap: '$$\\ce{$1}$$' },
            { pattern: '\\\\xlongequal\\{([^{}]*)\\}', wrap: '$$\\xlongequal{$1}$$' },
            { pattern: '\\\\xrightarrow\\{([^{}]*)\\}', wrap: '$$\\xrightarrow{$1}$$' },
            { pattern: '\\\\xleftarrow\\{([^{}]*)\\}', wrap: '$$\\xleftarrow{$1}$$' },
            // 分数类：两个花括号参数
            { pattern: '\\\\dfrac(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})\\s*(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})', wrap: '$$\\dfrac$1$2$$' },
            { pattern: '\\\\frac(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})\\s*(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})', wrap: '$$\\frac$1$2$$' },
            { pattern: '\\\\tfrac(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})\\s*(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})', wrap: '$$\\tfrac$1$2$$' },
            // 根式
            { pattern: '\\\\sqrt(\\[[^\\]]*\\])?(\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})', wrap: '$$\\sqrt$1$2$$' },
            // 大型运算符
            { pattern: '\\\\sum(\\_[^\\s]*)?(\\^[^\\s]*)?(\\{[^{}]*\\})?', wrap: '$$\\sum$1$2$3$$' },
            { pattern: '\\\\int(\\_[^\\s]*)?(\\^[^\\s]*)?(\\{[^{}]*\\})?', wrap: '$$\\int$1$2$3$$' },
            { pattern: '\\\\oint(\\_[^\\s]*)?(\\^[^\\s]*)?(\\{[^{}]*\\})?', wrap: '$$\\oint$1$2$3$$' },
            { pattern: '\\\\prod(\\_[^\\s]*)?(\\^[^\\s]*)?(\\{[^{}]*\\})?', wrap: '$$\\prod$1$2$3$$' },
            // 极限
            { pattern: '\\\\lim(\\_[^\\s]*)?(\\^[^\\s]*)?', wrap: '$$\\lim$1$2$$' },
            // 对数指数
            { pattern: '\\\\log(\\_[^\\s]*)?(\\{[^{}]*\\})?', wrap: '$$\\log$1$2$$' },
            { pattern: '\\\\ln(\\{[^{}]*\\})?', wrap: '$$\\ln$1$$' },
            { pattern: '\\\\lg(\\{[^{}]*\\})?', wrap: '$$\\lg$1$$' },
            { pattern: '\\\\exp(\\{[^{}]*\\})?', wrap: '$$\\exp$1$$' },
            // 三角函数
            ...['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','arccot','sinh','cosh','tanh','coth'].map(name => ({
                pattern: `\\\\${name}(\\^[^\\s]*)?(\\{[^{}]*\\})?`,
                wrap: `$$\\${name}$1$2$$`
            })),
            // 希腊字母
            ...['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega','Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Upsilon','Phi','Psi','Omega'].map(name => ({
                pattern: `\\\\${name}\\b`,
                wrap: `$$\\${name}$$`
            })),
            // 关系符、箭头
            ...['leq','geq','neq','approx','equiv','sim','cong','to','rightarrow','leftarrow','leftrightarrow','Rightarrow','Leftarrow'].map(name => ({
                pattern: `\\\\${name}\\b`,
                wrap: `$$\\${name}$$`
            }))
        ];

        // 对非数学模式的文本进行包裹
        for (const cmd of commands) {
            const regex = new RegExp(cmd.pattern, 'gs');
            processed = processed.replace(regex, (match) => {
                // 使用命令的 wrap 模板，但注意 wrap 中已经包含了 $$...$$
                // 我们需要将匹配到的命令及其参数整体替换为包裹后的形式
                // 由于 wrap 模板中用了 $1 $2 等占位符，我们不能简单用 replace 函数，而是动态构造
                // 简便方法：使用函数，提取参数
                // 但是我们的 pattern 已经捕获了参数，所以我们可以用命令的 wrap 字符串，并通过 replace 的替换值函数来构建
                // 这里重新匹配一次以获取捕获组
                const fullMatch = match;
                // 对于不同的命令，我们直接使用 wrap 字符串，但需要动态填充捕获组
                // 由于正则表达式不同，简单方式：对于每个命令，我们单独处理匹配，但为了通用，我们使用 eval 或直接替换
                // 更稳健：为每个命令编写独立的替换函数，但为了代码简洁，我们采用字符串替换模式：
                // 先取 wrap 模板，然后用捕获组内容替换 $1 $2 等
                let result = cmd.wrap;
                // 提取所有捕获组（通过 exec）
                const re = new RegExp(cmd.pattern);
                const execResult = re.exec(fullMatch);
                if (execResult) {
                    for (let i = 1; i < execResult.length; i++) {
                        result = result.replace(new RegExp(`\\$${i}`, 'g'), execResult[i] || '');
                    }
                }
                return result;
            });
        }

        // 恢复数学模式块
        for (let i = 0; i < mathBlocks.length; i++) {
            processed = processed.replace(`__MATHBLOCK_${i}__`, mathBlocks[i]);
        }
        return processed;
    }

    window.showMarkdownFromUrl = async function(url, displayName) {
        createModalIfNeeded();
        const modal = document.getElementById('markdownModal');
        const modalContent = document.getElementById('modalMarkdownContent');
        const modalTitle = document.getElementById('modalTitle');
        modalTitle.innerText = displayName || '📄 作业文档';
        modalContent.innerHTML = '<div style="text-align:center;">⏳ 加载中...</div>';
        modal.classList.add('active');
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            let markdownText = await response.text();
            // 启用自动包裹（带防重复）
            markdownText = autoWrapMathCommands(markdownText);

            if (typeof marked !== 'undefined') {
                marked.setOptions({ breaks: true, gfm: true });
                const html = marked.parse(markdownText);
                modalContent.innerHTML = html;
                await new Promise(resolve => setTimeout(resolve, 20));
                await renderMathWithStableLayout();
            } else {
                modalContent.innerHTML = `<pre>${escapeHtml(markdownText)}</pre>`;
            }
        } catch (err) {
            modalContent.innerHTML = `<div style="color:red; padding:1rem;">❌ 加载失败: ${err.message}<br>请确认文件 "${url}" 存在且可通过 HTTP 访问。</div>`;
        }
    };

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
})();