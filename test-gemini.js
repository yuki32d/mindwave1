import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Testing Gemini API with key:", apiKey ? apiKey.substring(0, 10) + "..." : "MISSING");

    if (!apiKey) {
        console.error("API Key is missing!");
        return;
    }

    try {
        // 1. List models to find a valid one
        console.log("Listing models...");
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();

        let modelName = "gemini-1.5-flash"; // Default

        if (listData.models) {
            const validModel = listData.models.find(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes("generateContent")
            );
            if (validModel) {
                modelName = validModel.name.replace("models/", "");
                console.log("Found valid model:", modelName);
            } else {
                console.log("No models with generateContent found, trying default:", modelName);
            }
        } else {
            console.log("Failed to list models:", listData);
        }

        // 2. Generate content
        console.log(`Sending request to ${modelName}...`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent("Say hello");
        const response = await result.response;
        const text = response.text();

        console.log("Success! Response:", text);

    } catch (error) {
        console.error("Error details:", error);
    }
}

testGemini();
