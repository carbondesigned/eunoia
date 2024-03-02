import {JSONContent} from 'novel';

interface Heading {
  type: 'heading';
  attrs: {level: number};
  content: Array<TextNode>;
}

interface Paragraph {
  type: 'paragraph';
  content: Array<TextNode>;
}

interface BulletList {
  type: 'bulletList';
  content: Array<ListItem>;
}

interface ListItem {
  type: 'listItem';
  content: Array<Paragraph>;
}

interface TextNode {
  type: 'text';
  text: string;
}

interface CodeBlock {
  type: 'codeBlock';
  content: Array<TextNode>;
}

export function parseStructuredTextToJSON(structuredText: string): JSONContent {
  const lines = structuredText.split('\n');
  const jsonContent: JSONContent = {type: 'doc', content: []};

  let currentBlock: Heading | Paragraph | BulletList | CodeBlock | null = null;
  let inCodeBlock = false;
  let codeContent: Array<{type: 'text'; text: string}> = [];

  lines.forEach((originalLine) => {
    const trimmedLineForSyntax = originalLine.trimStart(); // Trim leading spaces for syntax detection only

    // Handling code block toggle
    if (trimmedLineForSyntax.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock && codeContent.length > 0) {
        // Ending a code block
        currentBlock = {type: 'codeBlock', content: codeContent};
        pushCurrentBlock(jsonContent, currentBlock);
        currentBlock = null; // Reset for potential new blocks
        codeContent = []; // Clear accumulated code content
      }
      return; // Skip further processing for this line
    }

    if (inCodeBlock) {
      codeContent.push({type: 'text', text: originalLine}); // Preserve original line including spaces
    } else {
      // Match headings and subheadings with optional leading spaces
      const headingMatch = trimmedLineForSyntax.match(/^(#{1,6})\s(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length; // Determine heading level from match
        pushCurrentBlock(jsonContent, currentBlock); // Push any existing block
        currentBlock = createHeading(headingMatch[2], level); // Create new heading block
      } else if (trimmedLineForSyntax.startsWith('- ')) {
        if (!currentBlock || currentBlock.type !== 'bulletList') {
          pushCurrentBlock(jsonContent, currentBlock); // Push any existing block
          currentBlock = {type: 'bulletList', content: []}; // Start new bullet list
        }
        currentBlock.content.push(
          createListItem(trimmedLineForSyntax.substring(2))
        );
      } else if (trimmedLineForSyntax === '') {
        pushCurrentBlock(jsonContent, currentBlock); // Push any existing block as paragraph end
        currentBlock = null; // Reset for potential new blocks
      } else {
        if (!currentBlock || currentBlock.type !== 'paragraph') {
          pushCurrentBlock(jsonContent, currentBlock); // Push any existing block
          currentBlock = {type: 'paragraph', content: []}; // Start new paragraph
        }
        // For paragraphs, use the original line to preserve leading spaces within the paragraph content
        currentBlock.content.push({
          type: 'text',
          text: originalLine.trimStart(),
        });
      }
    }
  });

  pushCurrentBlock(jsonContent, currentBlock); // Ensure the last block is added

  return jsonContent;
}

// Adjust pushCurrentBlock to accept any block type including CodeBlock
function pushCurrentBlock(
  jsonContent: JSONContent,
  block: Heading | Paragraph | BulletList | CodeBlock | null
): void {
  if (block) {
    jsonContent.content?.push(block as JSONContent);
  }
}

function createHeading(text: string, level: number): Heading {
  return {type: 'heading', attrs: {level}, content: [{type: 'text', text}]};
}

function createListItem(text: string): ListItem {
  return {
    type: 'listItem',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}],
  };
}
