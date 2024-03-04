import {replicate} from '@/lib/replicate';
import {scrapeContent} from '@/lib/scrape-content';
import {ReplicateStream, StreamingTextResponse} from 'ai';

export async function POST(request: Request) {
  const {searchParams} = new URL(request.url);
  const query = encodeURIComponent(searchParams.get('query') || '');
  console.log(query);
  if (!query || query.length === 0)
    return new Response('No query provided', {status: 400});

  const resultFetchStartTime = performance.now(); // Start timing before the fetch request

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

  const resultFetchEndTime = performance.now(); // End timing after the fetch request completes
  const resultFetchTime = (resultFetchEndTime - resultFetchStartTime) / 1000; // Convert to seconds
  console.log(`Time to fetch results: ${resultFetchTime.toFixed(2)}s`);

  let contentAggregation = '';
  for (const result of results) {
    const content = await scrapeContent(result.url);
    contentAggregation += `${content}\n\n`; // Ensure separation between contents
  }

  const startTime = performance.now();
  let contentAggregationTime = 0;
  for (const result of results) {
    const contentStartTime = performance.now();
    await scrapeContent(result.url); // Assuming scrapeContent is an async function
    const contentEndTime = performance.now();
    contentAggregationTime += (contentEndTime - contentStartTime) / 1000; // Convert to seconds
  }
  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000; // Convert to seconds
  console.log(
    `Total time to get content aggregation: ${contentAggregationTime.toFixed(
      2
    )}s`
  );
  console.log(`Total execution time: ${totalTime.toFixed(2)}s`);

  const input = {
    debug: true,
    top_k: 50,
    top_p: 0.9,
    prompt: `you are trying to give someone the most efficient and up to date information on '${query}'.

    here are the top search results:
    ${contentAggregation}

    organize it as "# " for main headings, "## " for subheadings, "- " for bullet points, and blank lines to separate paragraphs.
    `,
    temperature: 0.6,
    max_new_tokens: 1024,
    prompt_template: '<s>[INST] {prompt} [/INST] ',
    repetition_penalty: 1.15,
  };

  const llmStartTime = performance.now(); // Start timing before the LLM request

  // Create an async generator from replicate.stream
  const response = await replicate.predictions.create({
    stream: true,
    model: 'mistralai/mistral-7b-instruct-v0.2',
    input,
  });
  const stream = await ReplicateStream(response);

  const llmEndTime = performance.now(); // End timing after the LLM request completes
  const llmTime = (llmEndTime - llmStartTime) / 1000; // Convert to seconds
  console.log(`Time to generate LLM response: ${llmTime.toFixed(2)}s`);

  return new StreamingTextResponse(stream);
}
