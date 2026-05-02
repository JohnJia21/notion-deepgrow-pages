(function () {
  const canvas = document.getElementById("decisionCanvas");
  const form = document.getElementById("filter");
  const input = document.getElementById("decisionInput");
  const output = document.getElementById("resultOutput");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const riskSignals = [
    {
      label: "资金承受",
      words: ["投资", "大额", "贷款", "借钱", "买房", "买车", "付费", "预算", "现金流"],
      action: "先写出最大可亏损金额，并确认亏掉后家庭和现金流是否仍能稳定。",
    },
    {
      label: "时间锁定",
      words: ["三个月", "半年", "一年", "长期", "全职", "每天", "持续", "训练营"],
      action: "先把投入压缩成 7 天试验，避免一开始就绑定长期计划。",
    },
    {
      label: "关系绑定",
      words: ["合伙", "合作", "加入", "团队", "伴侣", "家庭", "客户", "朋友"],
      action: "先明确退出条件和责任边界，不要在边界不清时建立强绑定关系。",
    },
    {
      label: "公开承诺",
      words: ["公开", "发布", "承诺", "官宣", "社群", "朋友圈", "直播"],
      action: "先做私下验证，再决定是否公开承诺，避免被面子成本锁住。",
    },
    {
      label: "职业转向",
      words: ["辞职", "裸辞", "转型", "创业", "自由职业", "副业", "离职"],
      action: "先保留主现金流，用一个可退出的小项目验证真实需求。",
    },
    {
      label: "健康消耗",
      words: ["熬夜", "焦虑", "压力", "失眠", "身体", "健康", "疲惫"],
      action: "先设定健康底线，一旦连续透支就暂停，而不是让 AI 继续加计划。",
    },
  ];

  function resizeCanvas() {
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  }

  function drawScene(time) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const ratio = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1 * ratio;

    const lanes = [
      { y: 0.22, color: "rgba(36, 89, 75, 0.22)", phase: 0 },
      { y: 0.38, color: "rgba(180, 107, 35, 0.2)", phase: 1.4 },
      { y: 0.56, color: "rgba(49, 95, 124, 0.18)", phase: 2.7 },
      { y: 0.74, color: "rgba(166, 69, 54, 0.14)", phase: 3.6 },
    ];

    lanes.forEach((lane, laneIndex) => {
      const baseY = height * lane.y;
      ctx.strokeStyle = lane.color;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 18 * ratio) {
        const progress = x / width;
        const wave = Math.sin(progress * 7 + time * 0.00035 + lane.phase) * 28 * ratio;
        const y = baseY + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 0; i < 7; i += 1) {
        const drift = reduceMotion ? 0 : (time * (0.018 + laneIndex * 0.003)) % width;
        const x = (i * width) / 6 - drift + width * 0.08;
        const wrappedX = ((x % width) + width) % width;
        const pulse = Math.sin(time * 0.001 + i + lane.phase) * 0.5 + 0.5;
        const y = baseY + Math.sin((wrappedX / width) * 7 + lane.phase) * 28 * ratio;
        ctx.fillStyle = lane.color;
        ctx.beginPath();
        ctx.arc(wrappedX, y, (3.5 + pulse * 2.5) * ratio, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const labels = [
      ["系统内", 0.64, 0.26, "rgba(36, 89, 75, 0.82)"],
      ["系统边缘", 0.72, 0.48, "rgba(180, 107, 35, 0.82)"],
      ["系统外", 0.82, 0.68, "rgba(166, 69, 54, 0.78)"],
    ];

    ctx.font = `${14 * ratio}px "Microsoft YaHei", sans-serif`;
    labels.forEach(([text, x, y, color]) => {
      ctx.fillStyle = color;
      ctx.fillText(text, width * x, height * y);
    });

    if (!reduceMotion) {
      window.requestAnimationFrame(drawScene);
    }
  }

  function analyzeDecision(text) {
    const normalized = text.trim();
    const matches = riskSignals
      .map((signal) => {
        const hits = signal.words.filter((word) => normalized.includes(word));
        return { ...signal, hits };
      })
      .filter((signal) => signal.hits.length > 0);

    const irreversibleWords = ["签约", "合同", "承诺", "公开", "贷款", "借钱", "辞职", "裸辞", "合伙", "投资"];
    const irreversibleHits = irreversibleWords.filter((word) => normalized.includes(word));
    const score = matches.reduce((total, signal) => total + signal.hits.length, 0) + irreversibleHits.length * 2;

    if (!normalized) {
      return {
        state: "等待输入",
        className: "system-edge",
        summary: "输入你准备让 AI 执行的事，WiseGrow 会先给出“系统内 / 系统边缘 / 系统外”的初步倾向。",
      };
    }

    if (score >= 8) {
      return {
        state: "初步倾向：系统外",
        className: "system-out",
        summary: `命中了 ${matches.length || 1} 类风险信号，且出现不可逆节点。先不要直接让 AI 生成完整执行计划。`,
        detail: irreversibleHits.length
          ? `不可逆节点：${irreversibleHits.slice(0, 4).join("、")}。`
          : "不可逆节点：需要补充签约、投入、公开承诺和退出成本信息。",
        action: matches[0]?.action || "先把行动缩小成一个可退出的小验证，再决定是否继续。",
      };
    }

    if (score >= 3) {
      return {
        state: "初步倾向：系统边缘",
        className: "system-edge",
        summary: `这件事短期可能可做，但已经出现 ${matches.length} 类承受力问题。先降低投入规模。`,
        detail: `核心消耗：${matches.map((signal) => signal.label).join("、")}。`,
        action: matches[0]?.action || "先做小样本验证，不要一次性进入长期绑定。",
      };
    }

    return {
      state: "初步倾向：系统内",
      className: "system-in",
      summary: "目前没有明显高成本或不可逆信号，可以先用低成本方式让 AI 辅助整理信息。",
      detail: "仍建议先写明承受上限，避免普通任务逐渐升级成高成本行动。",
      action: "下一步最小动作：让 AI 只生成 3 个备选路径，并标出每个路径的退出条件。",
    };
  }

  function renderResult(result) {
    output.innerHTML = "";

    const status = document.createElement("div");
    status.className = `result-status ${result.className}`;
    status.textContent = result.state;
    output.appendChild(status);

    [result.summary, result.detail, result.action].filter(Boolean).forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      output.appendChild(paragraph);
    });
  }

  if (form && input && output) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      renderResult(analyzeDecision(input.value));
      output.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });

    input.addEventListener("input", () => {
      if (!input.value.trim()) {
        renderResult(analyzeDecision(""));
      }
    });
  }

  resizeCanvas();
  drawScene(0);
  if (!reduceMotion) {
    window.requestAnimationFrame(drawScene);
  }
  window.addEventListener("resize", resizeCanvas);
})();
