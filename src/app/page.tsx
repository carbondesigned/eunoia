"use client"
import Editor from "@/components/Editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RealtimeSearchLoading from "@/components/ui/realtime-search-loading"
import { parseStructuredTextToJSON } from "@/lib/parse-text-for-editor"
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons"
import { nanoid } from "nanoid"
import { JSONContent, useEditor } from "novel"
import { useEffect, useState } from "react"

export default function Home() {
  const [editorKey, setEditorKey] = useState(() => nanoid())
  const [query, setQuery] = useState("")
  const [content, setContent] = useState<string[]>([])
  const [editorContent, setEditorContent] = useState<JSONContent>()
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)
    const res = await fetch(`/api/realtime-search?query=${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/json",
      },
    })
    if (!res.ok) {
      throw new Error(res.statusText)
    }
    const data = res.body
    if (!data) return

    const reader = data.getReader()
    const decoder = new TextDecoder()
    let done = false
    setIsDone(done)

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      const chunkValue = decoder.decode(value)
      setContent((prev) => [...prev, chunkValue])

      setIsDone(doneReading)
    }
  }
  useEffect(() => {
    if (content.length > 0) {
      setIsLoading(false)
    }
  }, [content])
  console.log("parsed content", parseStructuredTextToJSON(content.join(" ")))
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center gap-6 py-12">
      <section className="text-center">
        <h2 className="text-2xl font-bold">Start your notes here.</h2>
        <p className="text-gray-500">
          You can start writing your notes here and edit them later
        </p>
      </section>
      <div className="w-full space-y-12">
        <form onSubmit={handleSubmit} className="flex items-center gap-4">
          <Input
            type="text"
            name="query"
            placeholder="What are you looking for?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            {isLoading ? (
              <ReloadIcon className="animate-spin" />
            ) : (
              <PaperPlaneIcon />
            )}
          </Button>
        </form>

        {isLoading ? (
          <RealtimeSearchLoading />
        ) : (
          <Editor externalContent={content} key={editorKey} />
        )}
      </div>
    </main>
  )
}
