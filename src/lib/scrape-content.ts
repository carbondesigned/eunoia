import puppeteer from "puppeteer"

export async function scrapeContent(url: string): Promise<string> {
  const startTime = performance.now() // Start timing
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  )

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" })
    await page.setRequestInterception(true)
    page.on("request", (request) => {
      if (["image", "stylesheet"].includes(request.resourceType())) {
        request.abort()
      } else {
        request.continue()
      }
    })
    const content = await page.evaluate(() => {
      const texts: string[] = []
      // Example: Exclude known footer and navigation classes/IDs
      document
        .querySelectorAll(
          "p, h1, h2, h3:not(.footer *, .navigation *, #footer *, #navigation *)",
        )
        .forEach((element) => {
          texts.push(element.textContent?.trim() || "")
        })
      return texts.join("\n")
    })
    const endTime = performance.now() // End timing
    console.log(
      `Scraping content for ${url} took ${
        (endTime - startTime) / 1000
      } seconds.`,
    )
    return content
  } catch (error) {
    console.error(`Error fetching content for ${url}:`, error)
    return ""
  } finally {
    await browser.close()
  }
}
