// static/js/scripts.js
console.log("🛠 scripts.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("🛠 DOMContentLoaded fired");

  const folderInput   = document.getElementById("folder-input");
  const treeContainer = document.getElementById("tree-container");
  const treeView      = document.getElementById("tree-view");
  const processBtn    = document.getElementById("process-btn");
  const copyBtn       = document.getElementById("copy-btn");
  const promptOutput  = document.getElementById("prompt-output");
  const promptSection = document.getElementById("prompt-section");
  const promptStats   = document.getElementById("prompt-stats");

  let uploadedFiles = [];

  // Convert a .gitignore glob (with “/”) into a JS RegExp
  function gitignoreToRegExp(pattern) {
    const isDir = pattern.endsWith("/");
    if (isDir) pattern = pattern.slice(0, -1);

    let re = pattern
      .split("/")
      .map(seg => {
        if (seg === "**") return ".*";
        return seg
          .split("")
          .map(ch => {
            if (ch === "*") return "[^/]*";
            if (ch === "?") return "[^/]";
            return ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
          })
          .join("");
      })
      .join("/");

    if (pattern.includes("/")) {
      re = "^" + re + (isDir ? "(/|$)" : "$");
    } else {
      // unused for slash‐patterns
      re = "(?:^|/)" + re + (isDir ? "(?:/|$)" : "$");
    }
    return new RegExp(re);
  }

  folderInput.addEventListener("change", (event) => {
    // 1) grab all files
    let raw = Array.from(event.target.files);
    raw.forEach((f,i) => f._id = i);
    console.log("🛠 raw files:", raw.length);

    // 2) strip out any .git directory (and its contents)
    const noGit = raw.filter(f => {
      const segs = f.webkitRelativePath.split("/");
      return !segs.includes(".git");
    });
    console.log("🛠 after .git filter:", noGit.length);
    uploadedFiles = noGit;

    // 3) find .gitignore (if present)
    const ignoreFile = uploadedFiles.find(f => f.webkitRelativePath.endsWith(".gitignore"));
    console.log("🛠 .gitignore found?", Boolean(ignoreFile));

    if (!ignoreFile) {
      buildAndRenderTree(uploadedFiles);
      return;
    }

    // 4) read .gitignore and parse patterns
    const reader = new FileReader();
    reader.onload = () => {
      const patterns = reader.result
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));
      console.log("🛠 patterns:", patterns);

      // a) regexes for any slash‐patterns
      const pathRegexes = patterns
        .filter(p => p.includes("/"))
        .map(gitignoreToRegExp);

      // b) simple segment names for no‑slash patterns
      const segmentPatterns = patterns
        .filter(p => !p.includes("/"))
        .map(p => p.replace(/\/$/, ""));

      // 5) final filter: drop .gitignore itself, venv, pycache, plus matches
      const filtered = uploadedFiles.filter(f => {
        if (f === ignoreFile) return false;
        const path = f.webkitRelativePath;
        const segs = path.split("/");

        // drop if any path‐regex matches
        if (pathRegexes.some(rx => rx.test(path))) return false;

        // drop if any segment name matches
        if (segmentPatterns.some(name => segs.includes(name))) return false;

        return true;
      });

      uploadedFiles = filtered;
      console.log("🛠 post-filter count:", uploadedFiles.length);
      buildAndRenderTree(uploadedFiles);
    };
    reader.readAsText(ignoreFile);
  });

  processBtn.addEventListener("click", () => {
    const ids = Array.from(document.querySelectorAll(".file-checkbox:checked"))
      .map(chk => parseInt(chk.dataset.fileId,10));
    const selected = uploadedFiles.filter(f => ids.includes(f._id));

    if (selected.length === 0) {
      promptOutput.value = "No files selected.";
      promptSection.style.display = "block";
      return;
    }

    const fd = new FormData();
    fd.append("all_paths", JSON.stringify(uploadedFiles.map(f => f.webkitRelativePath)));
    selected.forEach(f => fd.append("files", f, f.webkitRelativePath));

    fetch("/generate_prompt", { method: "POST", body: fd })
      .then(r => r.json())
      .then(data => {
        promptOutput.value      = data.prompt;
        promptStats.textContent = `Words: ${data.word_count}  Tokens: ${data.token_count}`;
        promptSection.style.display = "block";
      })
      .catch(err => console.error("Error:", err));
  });

  copyBtn.addEventListener("click", () => {
    promptOutput.select();
    navigator.clipboard.writeText(promptOutput.value).then(() => {
      const old = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => copyBtn.textContent = old, 2000);
    });
  });

  // ─── Tree Helpers ──────────────────────────────────────────────────────────

  function buildTree(files) {
    const tree = {};
    files.forEach(f => {
      const parts = f.webkitRelativePath.split("/");
      let cur = tree;
      parts.forEach((p,i) => {
        if (i === parts.length - 1) cur[p] = f;
        else { cur[p] = cur[p]||{}; cur = cur[p]; }
      });
    });
    return tree;
  }

  function renderTree(node) {
    const ul = document.createElement("ul");
    for (const key in node) {
      const li   = document.createElement("li");
      const wrap = document.createElement("div");
      li.className   = "tree-node";
      wrap.className = "node-container";

      if (node[key] instanceof File) {
        const chk = document.createElement("input");
        chk.type         = "checkbox";
        chk.className    = "file-checkbox";
        chk.dataset.fileId = node[key]._id;
        const lbl = document.createElement("label");
        lbl.textContent = key;
        wrap.append(chk, lbl);
        li.appendChild(wrap);
      } else {
        const toggle = document.createElement("span");
        toggle.className   = "toggle-icon";
        toggle.textContent = "▶";
        const chk = document.createElement("input");
        chk.type    = "checkbox";
        const lbl   = document.createElement("label");
        lbl.textContent = key;
        wrap.append(toggle, chk, lbl);
        li.appendChild(wrap);

        const children = renderTree(node[key]);
        children.className  = "nested";
        children.style.display = "none";
        li.appendChild(children);

        toggle.addEventListener("click", e => {
          e.stopPropagation();
          if (children.style.display === "none") {
            children.style.display = "block"; toggle.textContent = "▼";
          } else {
            children.style.display = "none";  toggle.textContent = "▶";
          }
        });
        chk.addEventListener("change", () => {
          li.querySelectorAll("input[type=checkbox]")
            .forEach(c => c.checked = chk.checked);
        });
      }

      ul.appendChild(li);
    }
    return ul;
  }

  function buildAndRenderTree(files) {
    console.log("🛠 rendering tree with", files.length, "files");
    treeView.innerHTML = "";
    treeView.appendChild(renderTree(buildTree(files)));
    treeContainer.style.display = "block";
  }
});
