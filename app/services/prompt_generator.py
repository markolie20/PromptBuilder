def combine_files(file_infos, all_paths=None):
    """
    Given:
      file_infos: list of dicts with 'full_path' and 'content' for selected files
      all_paths:  optional list of all file paths in the folder (strings)

    1. Renders a "FOLDER STRUCTURE" section listing every path in all_paths
       (or, if all_paths is None, the paths in file_infos).
    2. Appends each selected file's contents, with separators.
    """

    # Sort selected files by path
    sorted_files = sorted(file_infos, key=lambda f: f["full_path"])

    # If no all_paths provided, derive from the selected files
    if all_paths is None:
        all_paths = [f["full_path"] for f in sorted_files]

    # 1) Build the folder structure listing
    folder_structure_lines = ["FOLDER STRUCTURE:"]
    for p in sorted(all_paths):
        folder_structure_lines.append(f" - {p}")
    folder_structure_text = "\n".join(folder_structure_lines)

    # 2) Build the combined content for selected files
    content_lines = []
    for f in sorted_files:
        content_lines.append(f"=== {f['full_path']} ===")
        content_lines.append(f["content"])
    combined_content_text = "\n".join(content_lines)

    # 3) Assemble final prompt
    final_prompt = folder_structure_text + "\n\n" + combined_content_text
    return final_prompt