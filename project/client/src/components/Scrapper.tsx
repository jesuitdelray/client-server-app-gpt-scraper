import { useState } from "react"
import axios from "axios"

export function Scrapper() {
    const [url, setUrl] = useState("")
    const [responseGPT, setResponseGPT] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    async function handleScrapeAndSendToGPT() {
        setError("")
        setIsLoading(true)
        try {
            const scrapeResponse = await axios.post("http://localhost:4000/scrape-and-process", {
                url,
            })
            if (scrapeResponse.data.scrapedData) {
                const gptResponse = await axios.post(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content:
                                    "Fill in the blanks - position: . \n salary: . \n requirements: . \n responsibilities: . \n location: . \n company: . \n links: .",
                            },
                            { role: "user", content: scrapeResponse.data.scrapedData },
                        ],
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
                        },
                    }
                )
                setResponseGPT(gptResponse.data.choices[0].message.content)
                setIsLoading(false)
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.response ? err.response.data.error : "Error occurred while fetching data")
        }
    }

    function formatResponse(text: string) {
        return text.split("-").join("<br/>")
    }

    return (
        <div>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} />
            <button onClick={handleScrapeAndSendToGPT} disabled={isLoading}>
                Click
            </button>
            <div>
                {error && <p style={{ color: "red" }}>{error}</p>}
                {responseGPT && (
                    <div>
                        <h3>Response:</h3>
                        <p dangerouslySetInnerHTML={{ __html: formatResponse(responseGPT) }}></p>
                    </div>
                )}
            </div>
        </div>
    )
}
