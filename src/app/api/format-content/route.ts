import { replicate } from "@/lib/replicate"
import { JSONContent } from "novel"
interface Heading {
  type: "heading"
  attrs: { level: number }
  content: Array<TextNode>
}

interface Paragraph {
  type: "paragraph"
  content: Array<TextNode>
}

interface BulletList {
  type: "bulletList"
  content: Array<ListItem>
}

interface ListItem {
  type: "listItem"
  content: Array<Paragraph>
}

interface TextNode {
  type: "text"
  text: string
}

function parseStructuredTextToJSON(structuredText: string): JSONContent {
  const lines = structuredText.split("\n")
  const jsonContent: JSONContent = { type: "doc", content: [] }

  let currentBlock: Heading | Paragraph | BulletList | null = null

  lines.forEach((line) => {
    if (line.startsWith("# ")) {
      pushCurrentBlock(jsonContent, currentBlock)
      currentBlock = createHeading(line.substring(2), 1)
    } else if (line.startsWith("## ")) {
      pushCurrentBlock(jsonContent, currentBlock)
      currentBlock = createHeading(line.substring(3), 2)
    } else if (line.startsWith("- ")) {
      if (!currentBlock || currentBlock.type !== "bulletList") {
        pushCurrentBlock(jsonContent, currentBlock)
        currentBlock = { type: "bulletList", content: [] }
      }
      currentBlock.content.push(createListItem(line.substring(2)))
    } else if (line.trim() === "") {
      pushCurrentBlock(jsonContent, currentBlock)
      currentBlock = null
    } else {
      if (!currentBlock || currentBlock.type !== "paragraph") {
        pushCurrentBlock(jsonContent, currentBlock)
        currentBlock = { type: "paragraph", content: [] }
      }
      currentBlock.content.push({ type: "text", text: line })
    }
  })

  pushCurrentBlock(jsonContent, currentBlock) // Add the last block

  return jsonContent
}

function pushCurrentBlock(
  jsonContent: JSONContent,
  block: Heading | Paragraph | BulletList | null,
): void {
  if (block) {
    jsonContent.content?.push(block)
  }
}

function createHeading(text: string, level: number): Heading {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  }
}

function createListItem(text: string): ListItem {
  return {
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  }
}

export async function POST(request: Request) {
  const body: { rawContent: string[] } = await request.json()

  const contentAggregation = body.rawContent.join("\n")
  console.log(contentAggregation)

  const structuringInput = {
    prompt: `Given the content, please organize it into a structured document with clear separations for headings, paragraphs, and bullet lists. Use simple markers to denote the structure, such as "# " for main headings, "## " for subheadings, "- " for bullet points, and blank lines to separate paragraphs.

    Content to structure: ${contentAggregation}`,
    temperature: 0.5,
    max_tokens: 2048,
    top_p: 1.0,
    frequency_penalty: 0.0,
    prompt_template: "<s>[INST] {prompt} [/INST] ",
    presence_penalty: 0.0,
  }

  let response = await replicate.predictions.create({
    model: "mistralai/mistral-7b-instruct-v0.2",
    input: structuringInput,
  })

  while (response.status === "starting" || response.status === "processing") {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for 1 second before checking the status again
    response = await replicate.predictions.get(response.id) // Re-fetch the response status
    console.log(response.status)
  }
  if (response.status === "succeeded") {
    console.log("output", response.output)
    return new Response(
      JSON.stringify(parseStructuredTextToJSON(response.output as string)),
      { headers: { "Content-Type": "application/json" } },
    )
  } else if (response.status === "failed") {
    return new Response("Error formatting content", { status: 500 })
  }

  return new Response("Error formatting content", {
    status: 500,
    statusText: response.error,
  })
}
