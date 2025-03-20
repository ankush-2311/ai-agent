const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getDataFromWeb, extractAnswerFromWebpage } = require("./helper");
require("dotenv").config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



app.post("/extract", async (req, res) => {
  const { url, query } = req.body;

  if (!url || !query) {
    return res.status(400).json({ error: "Both URL and query are required." });
  }

  try {
    const html = await getDataFromWeb(url);
    const answer = await extractAnswerFromWebpage(html, query);

    res.json({
      url,
      query,
      answer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/extract-legal", async (req, res) => {
  const { agreementText } = req.body;

  if (!agreementText) {
    return res.status(400).json({ error: "Agreement text is required." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
    Extract the following details from the legal agreement:
    1. Name of the parties
    2. Payment amount
    3. Payment method
    4. Payment date
    5. Two-line description of the agreement

    Agreement Text: 
    """${agreementText}"""
    
    Provide the output in JSON format like this:
    {
      "parties": ["Party 1", "Party 2"],
      "paymentAmount": "$X",
      "paymentMethod": "Payment Method",
      "paymentDate": "YYYY-MM-DD",
      "description": "Two-line summary"
    }
    `;

    const res = await model.generateContent(prompt);
    const extractedText = res.response.text().trim();
    
    const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/);
    let extractedData;
    try {
      extractedData = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(extractedText);
    } catch (error) {
      extractedData = { error: "Failed to parse JSON", rawResponse: extractedText };
    }

    res.json({ agreementText, extractedData });
  } catch (error) {
    console.error("Error extracting legal agreement details:", error);
    res.status(500).json({ error: "Failed to extract legal details." });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});