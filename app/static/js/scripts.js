document.addEventListener("DOMContentLoaded", function () {
    const folderInput = document.getElementById("folder-input");
    const treeContainer = document.getElementById("tree-container");
    const treeView = document.getElementById("tree-view");
    const processBtn = document.getElementById("process-btn");
    const copyBtn = document.getElementById("copy-btn");
    const promptOutput = document.getElementById("prompt-output");
    const promptSection = document.getElementById("prompt-section");

    let uploadedFiles = [];

    // When a folder is selected via the file input
    folderInput.addEventListener("change", function (event) {
        uploadedFiles = Array.from(event.target.files);
        // Assign a unique _id to each file for later lookup
        uploadedFiles.forEach((file, index) => {
            file._id = index;
        });
        if (uploadedFiles.length > 0) {
            const tree = buildTree(uploadedFiles);
            treeView.innerHTML = "";
            treeView.appendChild(renderTree(tree));
            treeContainer.style.display = "block";
        }
    });

    // Process only the selected files by sending them to the backend for prompt generation
    processBtn.addEventListener("click", function () {
        // Get all checked file checkboxes from the tree view
        const selectedCheckboxes = document.querySelectorAll(
            "#tree-view .file-checkbox:checked"
        );
        const selectedFileIds = Array.from(selectedCheckboxes).map((chk) =>
            parseInt(chk.dataset.fileId, 10)
        );
        const selectedFiles = uploadedFiles.filter((file) =>
            selectedFileIds.includes(file._id)
        );

        if (selectedFiles.length === 0) {
            promptOutput.value = "No files selected.";
            promptSection.style.display = "block";
            return;
        }

        // Create a FormData object and append the selected files
        const formData = new FormData();
        selectedFiles.forEach((file) => {
            // Use file.webkitRelativePath to preserve folder structure on the server
            formData.append("files", file, file.webkitRelativePath);
        });

        // Send the FormData to the backend endpoint /generate_prompt
        fetch("/generate_prompt", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                promptOutput.value = data.prompt;
                promptSection.style.display = "block";
            })
            .catch((error) => {
                console.error("Error generating prompt:", error);
            });
    });

    // Copy the generated prompt to the clipboard
    copyBtn.addEventListener("click", function () {
        promptOutput.select();
        navigator.clipboard.writeText(promptOutput.value).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    });

    // Build a tree structure from the uploaded files using their webkitRelativePath
    function buildTree(files) {
        const tree = {};
        files.forEach((file) => {
            const parts = file.webkitRelativePath.split("/");
            let currentLevel = tree;
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    currentLevel[part] = file;
                } else {
                    currentLevel[part] = currentLevel[part] || {};
                    currentLevel = currentLevel[part];
                }
            });
        });
        return tree;
    }

    // Recursively render the tree as a nested list with checkboxes.
    // Folders get a toggle icon for expand/collapse and a checkbox that selects all children.
    function renderTree(node) {
        const ul = document.createElement("ul");
        for (const key in node) {
            const li = document.createElement("li");
            li.classList.add("tree-node");

            // Create a container for the checkbox, label, and (if folder) toggle icon
            const container = document.createElement("div");
            container.classList.add("node-container");

            if (node[key] instanceof File) {
                // File node
                li.classList.add("file");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("file-checkbox");
                checkbox.dataset.fileId = node[key]._id;

                const label = document.createElement("label");
                label.textContent = key;

                container.appendChild(checkbox);
                container.appendChild(label);
                li.appendChild(container);
            } else {
                // Folder node
                li.classList.add("folder");

                // Create toggle icon (collapsed by default)
                const toggleIcon = document.createElement("span");
                toggleIcon.classList.add("toggle-icon");
                toggleIcon.textContent = "▶";

                // Create folder checkbox
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";

                // Create folder label
                const label = document.createElement("label");
                label.textContent = key;

                container.appendChild(toggleIcon);
                container.appendChild(checkbox);
                container.appendChild(label);
                li.appendChild(container);

                // Render child nodes recursively
                const childUl = renderTree(node[key]);
                childUl.classList.add("nested");
                childUl.style.display = "none"; // start retracted
                li.appendChild(childUl);

                // Toggle expand/collapse on clicking the toggle icon
                toggleIcon.addEventListener("click", function (e) {
                    e.stopPropagation();
                    if (childUl.style.display === "none") {
                        childUl.style.display = "block";
                        toggleIcon.textContent = "▼";
                    } else {
                        childUl.style.display = "none";
                        toggleIcon.textContent = "▶";
                    }
                });

                // Propagate checkbox selection to all descendant checkboxes
                checkbox.addEventListener("change", function () {
                    const checked = this.checked;
                    li.querySelectorAll("input[type='checkbox']").forEach((chk) => {
                        chk.checked = checked;
                    });
                });
            }
            ul.appendChild(li);
        }
        return ul;
    }
});
