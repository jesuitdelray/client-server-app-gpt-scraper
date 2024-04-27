import { useState } from "react";
import axios from "axios";

export function Scrapper() {
  const [url, setUrl] = useState("");
  const [scrapedData, setScrapedData] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [gptResponseData, setGptResponseData] = useState<any>([]);
  const [shownData, setShownData] = useState<"scrapedData" | "gptResponseData" | null>(null);

  async function handleCheckAllLinks() {
    setError("");
    setIsLoading(true);
    try {
      const checkLinksResponse = await axios.post("http://localhost:4000/check-all-links", {
        url,
      });
      if (checkLinksResponse.data.links) {
        setLinks(checkLinksResponse.data.links);

        const scrapePromises = checkLinksResponse.data.links.map(async (link: string) => {
          try {
            const scrapeResponse = await axios.post("http://localhost:4000/scrape-and-process", {
              url: link,
            });
            if (scrapeResponse.data.scrapedData) {
              setScrapedData(scrapeResponse.data.scrapedData);

              const gptResponse = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                  model: "gpt-3.5-turbo",
                  messages: [
                    {
                      role: "system",
                      content:
                        "Fill in the blanks - *position: . *salary: . *requirements: . *responsibilities: . *location: . *company: . *links: . ",
                    },
                    {
                      role: "user",
                      content: scrapeResponse.data.scrapedData,
                    },
                  ],
                },
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
                  },
                }
              );

              if (gptResponse.data.choices[0]?.message?.content) {
                setGptResponseData((prev: any) => [...prev, gptResponse.data.choices[0].message.content]);

                await axios.post("http://localhost:4000/save-gpt-response", {
                  messages: [
                    {
                      content: gptResponse.data.choices[0].message.content,
                    },
                  ],
                });
              }
            }
          } catch (error) {
            console.error("Error scraping data for", link, ":", error);
          }
        });

        await Promise.all(scrapePromises);

        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.response ? err.response.data.error : "Error occurred while checking links");
    }
  }

  return (
    <div>
      <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button onClick={handleCheckAllLinks} disabled={isLoading}>
        Check All Links
      </button>
      <div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          disabled={!scrapedData.length}
          onClick={() => {
            if (shownData === "scrapedData") return setShownData(null);
            return setShownData("scrapedData");
          }}
        >
          {shownData === "scrapedData" ? "Hide Scraped Data" : "Show Scraped Data"}
        </button>
        {scrapedData && shownData === "scrapedData" && (
          <div>
            <h3>Response:</h3>
            <p dangerouslySetInnerHTML={{ __html: scrapedData }}></p>
          </div>
        )}
        {links.length > 0 && (
          <div>
            <h3>Links:</h3>
            <ul>
              {links.map((link, index) => (
                <li key={index}>
                  <a href={link}>{link}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <button
            disabled={!gptResponseData.length}
            onClick={() => {
              if (shownData === "gptResponseData") return setShownData(null);
              return setShownData("gptResponseData");
            }}
          >
            {shownData === "gptResponseData" ? "Hide GPT Responses" : "Show GPT Responses"}
          </button>
          {shownData === "gptResponseData" && (
            <div>
              <h3>GPT Responses:</h3>
              {gptResponseData?.map((response: any, index: number) => (
                <div>
                  <div key={index}>
                    {response.split("\n").map((line: string, index: number) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  <p>--------------------</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
