// Custom markdown-it task-lists plugin

export function taskListsPlugin(md) {
  // Transform inline content in list items to add checkboxes
  md.core.ruler.after("inline", "task-lists", function (state) {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "bullet_list_open") continue;

      const listOpen = tokens[i];
      const listAttrs = listOpen.attrs || [];
      const isTaskList = checkForTasks(tokens, i);

      if (!isTaskList) continue;

      // Mark the list as a task list
      listOpen.attrSet("class", "task-list");

      // Process list items
      let j = i + 1;
      while (j < tokens.length && tokens[j].type !== "bullet_list_close") {
        if (tokens[j].type === "list_item_open") {
          processListItem(tokens, j);
        }
        j++;
      }
    }
  });
}

function checkForTasks(tokens, listIdx) {
  let j = listIdx + 1;
  while (j < tokens.length && tokens[j].type !== "bullet_list_close") {
    if (tokens[j].type === "list_item_open") {
      // Look for inline content with checkbox pattern
      let k = j + 1;
      while (k < tokens.length && tokens[k].type !== "list_item_close") {
        if (tokens[k].type === "inline") {
          const text = tokens[k].content;
          if (/^\[[ x]\]\s/.test(text)) return true;
        }
        k++;
      }
    }
    j++;
  }
  return false;
}

function processListItem(tokens, itemIdx) {
  let k = itemIdx + 1;
  while (k < tokens.length && tokens[k].type !== "list_item_close") {
    if (tokens[k].type === "inline") {
      const text = tokens[k].content;
      const match = text.match(/^\[([ x])\]\s(.*)$/);
      if (match) {
        const checked = match[1] === "x";
        const content = match[2];

        // Mark the list item
        tokens[itemIdx].attrSet("class", "task-list-item");

        // Replace inline content with checkbox HTML + content
        const checkbox = checked
          ? '<input type="checkbox" checked disabled class="task-checkbox">'
          : '<input type="checkbox" disabled class="task-checkbox">';

        // Create new tokens for the transformed content
        const newInline = new state.Token("html_inline", "", 0);
        newInline.content = checkbox + " " + content;

        // Replace the inline token content
        tokens[k].content = content;
        tokens[k].children = [newInline];
      }
    }
    k++;
  }
}

export default taskListsPlugin;
