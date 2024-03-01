'use client';
import Editor from '@/components/Editor';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {parseStructuredTextToJSON} from '@/lib/parse-text-for-editor';
import {PaperPlaneIcon} from '@radix-ui/react-icons';
import {nanoid} from 'nanoid';
import {JSONContent, useEditor} from 'novel';
import {useEffect, useState, useRef} from 'react';

export default function Home() {
  const [editorKey, setEditorKey] = useState(() => nanoid());
  const [query, setQuery] = useState('');
  const [content, setContent] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState<JSONContent>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // useEffect(() => {
  //   setEditorContent(parseStructuredTextToJSON(content.join(' ')));
  // }, [content]);

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
    setIsDone(done);

    while (!done) {
      const {value, done: doneReading} = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setContent((prev) => [...prev, chunkValue]);

      setIsDone(doneReading);
      setIsLoading(false);
    }
  };
  console.log('parsed content', parseStructuredTextToJSON(content.join(' ')));
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

      <p className='duration-100 animate-accordion-up'>{content}</p>

      <Editor externalContent={content} key={editorKey} />
    </main>
  );
}
