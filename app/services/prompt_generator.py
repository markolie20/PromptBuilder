def combine_files(file_infos):
    """
    Given a list of dicts like:
      [
        {
          'full_path': 'subfolder/file.txt',
          'content': 'Hello World'
        },
        ...
      ]

    1. Produces a "FOLDER STRUCTURE" section at the start of the prompt,
       listing all file paths (even if not selected, assuming file_infos
       includes them all).

    2. Appends each file's content, with a separator indicating which file
       is being shown next in the prompt.

    Returns a single combined string.
    """
    # Sort all files by their full_path for consistent ordering
    sorted_files = sorted(file_infos, key=lambda f: f["full_path"])

    # 1) Build a text listing of all folder/file paths
    folder_structure_lines = ["FOLDER STRUCTURE:"]
    for f in sorted_files:
        folder_structure_lines.append(f" - {f['full_path']}")

    folder_structure_text = "\n".join(folder_structure_lines)

    # 2) Build the combined file contents, adding a separator for each file
    content_lines = []
    for f in sorted_files:
        content_lines.append(f"=== {f['full_path']} ===")
        content_lines.append(f["content"])

    combined_content_text = "\n".join(content_lines)

    # Combine the folder structure at the top with the file contents below
    final_prompt = folder_structure_text + "\n\n" + combined_content_text
    return final_prompt
