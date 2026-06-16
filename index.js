// index.js
const jobsList = [
  { name: "🇬🇧 英语作业·完整答案", url: "english.txt" },
  { name: "📐 数学作业·完整答案", url: "Math.txt" },
  { name: "🧪 化学作业·完整答案", url: "chemistry.txt" },
  { name: "📚 语文作业·完整答案", url: "cn.txt" },
  { name: "📚 6月16日·完整答案", url: "616all.txt" },
];

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("jobButtonsGrid");
  if (!container) {
    console.warn("未找到 #jobButtonsGrid 容器");
    return;
  }

  container.innerHTML = "";

  jobsList.forEach(job => {
    const btn = document.createElement("button");
    btn.className = "job-btn";
    btn.textContent = job.name;

    btn.addEventListener("click", () => {
      const url = job.url;
      if (url.endsWith('.txt')) {
        if (window.showMarkdownFromUrl) {
          window.showMarkdownFromUrl(url, job.name);
        } else {
          alert("Markdown 渲染器未就绪，请确保 markdown.js 已正确加载。");
        }
      } else {
        window.location.href = url;
      }
    });

    container.appendChild(btn);
  });

  if (jobsList.length === 0) {
    container.innerHTML = '<div style="color:#94a3b8; padding:0.5rem;">暂无作业入口，请在 index.js 的 jobsList 中添加。</div>';
  }
});