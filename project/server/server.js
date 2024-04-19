const express = require("express")
const bodyParser = require("body-parser")
const puppeteer = require("puppeteer")
const path = require("path")
const cors = require("cors")

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "public")))

const scrapeWebsite = async url => {
    const browser = await puppeteer.launch()
    try {
        const page = await browser.newPage()
        await page.goto(url)
        const allText = await page.evaluate(() => {
            const uniqueText = new Set()
            const traverse = node => {
                if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.hidden) {
                    return
                }
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    uniqueText.add(node.textContent.trim())
                }
                node.childNodes.forEach(traverse)
            }
            traverse(document.body)
            return Array.from(uniqueText).join(" ")
        })
        console.log("Scraping successful.")
        return allText
    } catch (error) {
        console.error(`Error scraping website: ${error}`)
        throw error
    } finally {
        await browser.close()
    }
}

app.post("/scrape-and-process", async (req, res) => {
    try {
        const { url } = req.body

        const scrapedData = await scrapeWebsite(url)

        res.json({ scrapedData })
    } catch (error) {
        console.error("Error:", error)
        res.status(500).json({ error: "Error occurred while scraping and processing data" })
    }
})

app.use(
    cors({
        origin: "http://localhost:5173",
    })
)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
