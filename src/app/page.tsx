'use client';
import Editor from '@/components/Editor';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {PaperPlaneIcon} from '@radix-ui/react-icons';
import {nanoid} from 'nanoid';
import {useRouter} from 'next/navigation';
import {JSONContent} from 'novel';
import {useEffect, useState} from 'react';

type Result = {
  title: string;
  url: string;
};

const resultsToJSONContent = (
  results: string[],
  fragmentsPerParagraph = 15
): JSONContent => {
  return {
    type: 'doc',
    content: results.reduce(
      (
        acc: {type: string; content: {type: string; text: string}[]}[],
        curr,
        index
      ) => {
        if (index % fragmentsPerParagraph === 0) {
          const paragraphText = results
            .slice(index, index + fragmentsPerParagraph)
            .join(' ');
          acc.push({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: paragraphText,
              },
            ],
          });
        }
        return acc;
      },
      []
    ),
  };
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [content, setContent] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState<JSONContent>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setEditorContent(resultsToJSONContent(content));
  }, [content]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch(`/api/realtime-search?query=${query}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/json',
      },
    });
    if (!res.ok) {
      throw new Error(res.statusText);
    }
    const data = res.body;
    if (!data) return;

    const reader = data.getReader();
    const decoder = new TextDecoder();
    setIsLoading(true);
    let done = false;

    while (!done) {
      const {value, done: doneReading} = await reader.read();
      done = doneReading;
      setIsLoading(false);
      const chunkValue = decoder.decode(value);
      setContent((prev) => [...prev, chunkValue]);
      setIsDone(doneReading);
    }
  };
  console.log(content);
  return (
    <main className='py-12 max-w-xl m-auto h-screen grid'>
      <form onSubmit={handleSubmit} className='flex items-center gap-4'>
        <Input
          type='text'
          name='query'
          placeholder='What are you looking for?'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type='submit' size='icon' disabled={isLoading}>
          <PaperPlaneIcon />
        </Button>
      </form>

      {!isDone && <p>{content}</p>}
      {isDone && <Editor externalContent={editorContent} />}
    </main>
  );
}
