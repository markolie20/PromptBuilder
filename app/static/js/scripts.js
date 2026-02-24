// static/js/scripts.js
console.log("🛠 scripts.js loaded (Client-Side Generator Mode)");

document.addEventListener("DOMContentLoaded", () => {
  const folderInput = document.getElementById("folder-input");
  const treeContainer = document.getElementById("tree-container");
  const treeView = document.getElementById("tree-view");
  const processBtn = document.getElementById("process-btn");
  const processStatus = document.getElementById("process-status"); // New status label
  const copyBtn = document.getElementById("copy-btn");
  const promptOutput = document.getElementById("prompt-output");
  const promptSection = document.getElementById("prompt-section");
  const promptStats = document.getElementById("prompt-stats");
  const exactTokensChk = document.getElementById("exact-tokens-chk");

  let uploadedFiles = [];
  let fullGeneratedPrompt = ""; // Keeps the massive string in memory

  // --- Helper: GitIgnore Regex ---
  function gitignoreToRegExp(pattern) {
    const isDir = pattern.endsWith("/");
    if (isDir) pattern = pattern.slice(0, -1);
    let re = pattern.split("/").map(seg => {
      if (seg === "**") return ".*";
      return seg.split("").map(ch => {
        if (ch === "*") return "[^/]*";
        if (ch === "?") return "[^/]";
        return ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }).join("");
    }).join("/");
    re = pattern.includes("/") ? "^" + re + (isDir ? "(/|$)" : "$") : "(?:^|/)" + re + (isDir ? "(?:/|$)" : "$");
    return new RegExp(re);
  }

  // --- 1. Handle File Selection ---
  folderInput.addEventListener("change", (event) => {
    let raw = Array.from(event.target.files);
    // Assign ID for tree mapping
    raw.forEach((f, i) => f._id = i);

    // Basic Filter: remove .git folder contents immediately
    uploadedFiles = raw.filter(f => !f.webkitRelativePath.split("/").includes(".git"));

    // Check for .gitignore
    const ignoreFile = uploadedFiles.find(f => f.webkitRelativePath.endsWith(".gitignore"));
    if (!ignoreFile) {
      buildAndRenderTree(uploadedFiles);
      return;
    }

    // Parse .gitignore locally
    const reader = new FileReader();
    reader.onload = () => {
      const patterns = reader.result.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
      const pathRegexes = patterns.filter(p => p.includes("/")).map(gitignoreToRegExp);
      const segmentPatterns = patterns.filter(p => !p.includes("/")).map(p => p.replace(/\/$/, ""));

      uploadedFiles = uploadedFiles.filter(f => {
        if (f === ignoreFile) return false;
        const path = f.webkitRelativePath;
        const segs = path.split("/");
        if (pathRegexes.some(rx => rx.test(path))) return false;
        if (segmentPatterns.some(name => segs.includes(name))) return false;
        return true;
      });
      buildAndRenderTree(uploadedFiles);
    };
    reader.readAsText(ignoreFile);
  });

  // --- 2. Client-Side Processing Logic ---
  processBtn.addEventListener("click", async () => {
    const ids = Array.from(document.querySelectorAll(".file-checkbox:checked"))
      .map(chk => parseInt(chk.dataset.fileId, 10));
    
    // Sort files by path so the prompt is consistent
    const selected = uploadedFiles
      .filter(f => ids.includes(f._id))
      .sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

    if (selected.length === 0) {
      promptOutput.value = "No files selected.";
      promptSection.style.display = "block";
      return;
    }

    // UI Reset
    processBtn.disabled = true;
    promptSection.style.display = "none";
    fullGeneratedPrompt = "";
    
    // --- Step A: Generate Folder Structure ---
    // We do this based on ALL uploaded files (or selected? usually prompt logic is all paths, content selected)
    // Let's stick to: Structure = All uploaded (filtered) files. Content = Selected files.
    const allPaths = uploadedFiles.map(f => f.webkitRelativePath).sort();
    let promptParts = ["FOLDER STRUCTURE:"];
    allPaths.forEach(p => promptParts.push(` - ${p}`));
    promptParts.push("\n\n");

    // --- Step B: Read Files Asynchronously ---
    let readCount = 0;
    const total = selected.length;

    // Helper to read one file as text
    const readFileAsText = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(`[Error reading ${file.name}]`); // Don't crash on binary
        // Try reading as text. If it's binary, this might produce garbage, 
        // but modern browsers handle it reasonably well without crashing.
        reader.readAsText(file);
      });
    };

    // We process in chunks to keep the UI responsive (progress bar)
    const CHUNK_SIZE = 50; 
    
    for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = selected.slice(i, i + CHUNK_SIZE);
        
        // Parallel read for the chunk
        const contents = await Promise.all(chunk.map(readFileAsText));
        
        // Append to promptParts
        contents.forEach((content, idx) => {
            const file = chunk[idx];
            promptParts.push(`=== ${file.webkitRelativePath} ===`);
            promptParts.push(content);
            promptParts.push("\n");
        });

        readCount += chunk.length;
        processStatus.textContent = `Reading files: ${readCount} / ${total}`;
        
        // Small delay to let UI render the text update
        await new Promise(r => setTimeout(r, 0));
    }

    // --- Step C: Final Assembly ---
    fullGeneratedPrompt = promptParts.join("\n");
    
    // Update Textarea (Truncated for performance)
    if (fullGeneratedPrompt.length > 50000) {
        promptOutput.value = fullGeneratedPrompt.slice(0, 50000) + "\n\n... [TRUNCATED FOR DISPLAY PERFORMANCE] ...\n(Click 'Copy Prompt' for full content)";
    } else {
        promptOutput.value = fullGeneratedPrompt;
    }

    // --- Step D: Statistics ---
    const wordCount = fullGeneratedPrompt.split(/\s+/).length;
    // Fast local estimate
    const estTokens = Math.ceil(fullGeneratedPrompt.length / 4);
    
    promptStats.textContent = `Words: ${wordCount} | Est. Tokens: ~${estTokens}`;
    promptSection.style.display = "block";
    processStatus.textContent = "Done.";

    // --- Step E: Optional Server Token Count ---
    if (exactTokensChk.checked) {
        processStatus.textContent = "Fetching exact token count from server...";
        try {
            // We send raw text, not files. Much faster, but still heavy for 1MB+ text.
            const response = await fetch("/count_tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: fullGeneratedPrompt })
            });
            const data = await response.json();
            promptStats.textContent = `Words: ${wordCount} | Exact Tokens: ${data.token_count}`;
            processStatus.textContent = "Done (Exact count verified).";
        } catch (err) {
            console.error(err);
            processStatus.textContent = "Done (Server count failed, using estimate).";
        }
    }
    
    processBtn.disabled = false;
  });

  // --- 3. Copy Logic ---
  copyBtn.addEventListener("click", () => {
    if (!fullGeneratedPrompt) return;
    navigator.clipboard.writeText(fullGeneratedPrompt)
      .then(() => {
        const old = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = old, 2000);
      })
      .catch(() => {
        // Fallback
        promptOutput.select();
        document.execCommand("copy");
      });
  });

  // --- 4. Tree Logic (Standard) ---
  function buildTree(files) {
    const tree = {};
    files.forEach(f => {
      const parts = f.webkitRelativePath.split("/");
      let cur = tree;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) cur[p] = f;
        else { cur[p] = cur[p] || {}; cur = cur[p]; }
      });
    });
    return tree;
  }

  function renderTree(node) {
    const ul = document.createElement("ul");
    for (const key in node) {
      const li = document.createElement("li");
      const wrap = document.createElement("div");
      li.className = "tree-node";
      wrap.className = "node-container";

      if (node[key] instanceof File) {
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.className = "file-checkbox";
        chk.dataset.fileId = node[key]._id;
        chk.checked = true;
        const lbl = document.createElement("label");
        lbl.textContent = key;
        wrap.append(chk, lbl);
        li.appendChild(wrap);
      } else {
        const toggle = document.createElement("span");
        toggle.className = "toggle-icon";
        toggle.textContent = "▶";
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = true;
        const lbl = document.createElement("label");
        lbl.textContent = key;
        wrap.append(toggle, chk, lbl);
        li.appendChild(wrap);
        const children = renderTree(node[key]);
        children.className = "nested";
        children.style.display = "none";
        li.appendChild(children);
        toggle.addEventListener("click", e => {
          e.stopPropagation();
          const visible = children.style.display === "block";
          children.style.display = visible ? "none" : "block";
          toggle.textContent = visible ? "▶" : "▼";
        });
        chk.addEventListener("change", () => {
            li.querySelectorAll("input[type=checkbox]").forEach(c => c.checked = chk.checked);
        });
      }
      ul.appendChild(li);
    }
    return ul;
  }

  function buildAndRenderTree(files) {
    treeView.innerHTML = "";
    treeView.appendChild(renderTree(buildTree(files)));
    treeContainer.style.display = "block";
  }
});