const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const databaseFilePath = path.join(__dirname, "database.json");

const initializeDatabaseFile = () => {
  if (!fs.existsSync(databaseFilePath)) {
    fs.writeFileSync(databaseFilePath, "[]");
  }
};

initializeDatabaseFile();

const scrapeWebsite = async (url) => {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url);
    const allText = await page.evaluate(() => {
      const uniqueText = new Set();
      const traverse = (node) => {
        if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.hidden) {
          return;
        }
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          uniqueText.add(node.textContent.trim());
        }
        node.childNodes.forEach(traverse);
      };
      traverse(document.body);
      return Array.from(uniqueText).join(" ");
    });
    console.log("Scraping successful.");
    return allText;
  } catch (error) {
    console.error(`Error scraping website: ${error}`);
    throw error;
  } finally {
    await browser.close();
  }
};

app.post("/save-gpt-response", async (req, res) => {
  try {
    const { messages } = req.body;

    let data = [];

    if (fs.existsSync(databaseFilePath)) {
      const rawData = fs.readFileSync(databaseFilePath);
      try {
        data = JSON.parse(rawData);
      } catch (error) {
        console.error("Ошибка при парсинге JSON базы данных:", error);
      }
    }

    messages.forEach((message) => {
      data.push(message);
    });

    fs.writeFileSync(databaseFilePath, JSON.stringify(data, null, 2));

    res.status(200).json({ message: "Ответ успешно сохранен" });
  } catch (error) {
    console.error("Ошибка при сохранении ответа:", error);
    res.status(500).json({ error: "Произошла ошибка при сохранении ответа" });
  }
});

app.post("/scrape-and-process", async (req, res) => {
  try {
    const { url } = req.body;

    const scrapedData = await scrapeWebsite(url);

    res.json({ scrapedData });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error occurred while scraping and processing data" });
  }
});

app.post("/check-all-links", async (req, res) => {
  try {
    const { url } = req.body;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href^="/jobs/"]'))
        .map((link) => link.href)
        .filter((link) => /^https:\/\/djinni\.co\/jobs\/\d+-/.test(link));
      return allLinks;
    });

    await browser.close();

    res.json({ links });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error occurred while checking links on the page" });
  }
});

app.get("/get-gpt-responses", async (req, res) => {
  try {
    let data = [];

    if (fs.existsSync(databaseFilePath)) {
      const rawData = fs.readFileSync(databaseFilePath);
      try {
        data = JSON.parse(rawData);
      } catch (error) {
        console.error("Error parsing JSON database:", error);
      }
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error getting GPT responses:", error);
    res.status(500).json({ error: "An error occurred while getting GPT responses" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
