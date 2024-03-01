'use client';

import {ColorSelector} from '@/lib/editor/color-selector';
import {defaultExtensions} from '@/lib/editor/extensions';
import {LinkSelector} from '@/lib/editor/link-selector';
import {NodeSelector} from '@/lib/editor/node-selector';
import {slashCommand, suggestionItems} from '@/lib/editor/slash-command';
import {TextButtons} from '@/lib/editor/text-buttons';
import {parseStructuredTextToJSON} from '@/lib/parse-text-for-editor';
import {
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorContent,
  EditorInstance,
  EditorRoot,
  JSONContent,
  defaultEditorProps,
} from 'novel';
import {useEffect, useRef, useState} from 'react';

const Editor = ({externalContent}: {externalContent: string[] | undefined}) => {
  const editorRef = useRef<EditorInstance | null>(null);
  const lastUpdateIndex = useRef(0); // Tracks the last index of content updated

  const [content, setContent] = useState<JSONContent | undefined>(
    externalContent
  );
  const [cumulativeContent, setCumulativeContent] = useState<string[]>([]);

  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const extensions = [...defaultExtensions, slashCommand];

  useEffect(() => {
    if (editorRef.current && externalContent) {
      // Get new content chunks based on the last update index
      const newContentChunks = externalContent.slice(lastUpdateIndex.current);

      if (newContentChunks.length > 0) {
        // Update the cumulative content with new chunks
        const updatedCumulativeContent = [
          ...cumulativeContent,
          ...newContentChunks,
        ];
        setCumulativeContent(updatedCumulativeContent); // Update the cumulative content state

        // Convert the updated cumulative content into the format expected by the editor
        const jsonContent = parseStructuredTextToJSON(
          updatedCumulativeContent.join(' ')
        );
        editorRef.current.commands.setContent(jsonContent);

        // Update the content state and the last update index
        setContent(jsonContent);
        lastUpdateIndex.current = externalContent.length;
      }
    }
  }, [externalContent, cumulativeContent]);

  console.log('external content', externalContent);
  console.log(editorRef.current?.getText());

  return (
    <EditorRoot>
      <EditorContent
        onCreate={({editor}) => {
          editorRef.current = editor;
        }}
        initialContent={externalContent}
        onUpdate={({editor}) => {
          const json = editor.getJSON();
          setContent(json);
        }}
        extensions={extensions}
        editorProps={{
          ...defaultEditorProps,
          attributes: {
            class: `prose-lg prose-stone dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full`,
          },
        }}
      >
        <EditorCommand className='z-50 h-auto max-h-[330px]  w-72 overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all'>
          <EditorCommandEmpty className='px-2 text-muted-foreground'>
            No results
          </EditorCommandEmpty>
          {suggestionItems.map((item: any) => (
            <EditorCommandItem
              value={item.title}
              onCommand={(val) => item.command(val)}
              className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent `}
              key={item.title}
            >
              <div className='flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background'>
                {item.icon}
              </div>
              <div>
                <p className='font-medium'>{item.title}</p>
                <p className='text-xs text-muted-foreground'>
                  {item.description}
                </p>
              </div>
            </EditorCommandItem>
          ))}
        </EditorCommand>
        <EditorBubble
          tippyOptions={{
            placement: 'top',
          }}
          className='flex w-fit max-w-[90vw] overflow-hidden rounded border border-muted bg-background shadow-xl'
        >
          <NodeSelector open={openNode} onOpenChange={setOpenNode} />
          <LinkSelector open={openLink} onOpenChange={setOpenLink} />
          <TextButtons />
          <ColorSelector
            isOpen={openColor}
            setIsOpen={setOpenColor}
            open={openColor}
            onOpenChange={setOpenColor}
          />
        </EditorBubble>
      </EditorContent>
    </EditorRoot>
  );
};
export default Editor;
