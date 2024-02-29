'use client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {PaperPlaneIcon} from '@radix-ui/react-icons';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

type Result = {
  title: string;
  url: string;
};

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const handleSubmit = async () => {
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
    let done = false;

    while (!done) {
      const {value, done: doneReading} = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setResults((prev) => [...prev, chunkValue]);
    }
  };
  return (
    <main className='py-12 max-w-xl m-auto h-screen grid'>
      <form action={handleSubmit} className='flex items-center gap-4'>
        <Input
          type='text'
          name='query'
          placeholder='What are you looking for?'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type='submit' size='icon'>
          <PaperPlaneIcon />
        </Button>
      </form>

      <p>{results}</p>
    </main>
  );
}
