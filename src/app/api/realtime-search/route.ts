import {replicate} from '@/lib/replicate';
import {scrapeContent} from '@/lib/scrape-content';
import {ReplicateStream, StreamingTextResponse} from 'ai';

export async function POST(request: Request) {
  const {searchParams} = new URL(request.url);
  const query = encodeURIComponent(searchParams.get('query') || '');
  console.log(query);
  if (!query || query.length === 0)
    return new Response('No query provided', {status: 400});

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${query}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_TOKEN as string,
      },
    }
  );
  if (!res.ok) throw Error(res.statusText);
  const data = await res.json();
  const results = data.web.results.slice(0, 3); // Limit to first 3 for simplicity
  console.log(results);

  let contentAggregation = '';
  for (const result of results) {
    const content = await scrapeContent(result.url);
    contentAggregation += `${content}\n\n`; // Ensure separation between contents
  }

  // Debug: Log the aggregated content to ensure it's being compiled
  console.log('Aggregated Content:', contentAggregation);

  const input = {
    debug: false,
    top_k: 50,
    top_p: 0.9,
    prompt: `you are trying to give someone the most efficient and up to date information on '${query}' here is the top search results: \n\n ${contentAggregation}`,
    temperature: 0.6,
    max_new_tokens: 512,
    prompt_template: '<s>[INST] {prompt} [/INST] ',
    repetition_penalty: 1.15,
  };

  // Create an async generator from replicate.stream
  const response = await replicate.predictions.create({
    stream: true,
    model: 'mistralai/mistral-7b-instruct-v0.2',
    input,
  });
  const stream = await ReplicateStream(response);
  return new StreamingTextResponse(stream);
}
