const path = require("path");
const { image_search } = require("duckduckgo-images-api");
const screenshot = require("screenshot-desktop");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

function base64ToGenerativePart(base64Data, mimeType) {
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
}

function getDateAndTime() {
    const date_and_time = new Date().toISOString();
    return { date_and_time: date_and_time };
}

async function getWeather(location) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.WEATHER_KEY}&units=metric`;
    return fetch(url)
        .then((response) => response.json())
        .then((data) => {
            return { weather: data };
        })
        .catch((error) => {
            console.error(error);
            return { error: error };
        });
}

async function generateImage(query) {
    query = btoa(query);
    const url = `https://api.totob12.com/generate-image?prompt=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return { image: data.result };
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}

async function searchInternet(query) {
    query = btoa(query);
    const url = `https://api.totob12.com/search/search?q=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}

async function lookWebpage(link) {
    link = btoa(link);
    const url = `https://api.totob12.com/search/webpage?url=${encodeURIComponent(link)}`;
    try {
        const response = await fetch(url);
        let data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}

async function searchImages(query) {
    query = btoa(query);
    const url = `https://api.totob12.com/search/images?q=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url);
        let data = await response.json();
        data.images = data.images.slice(0, 7);
        return { images_to_display: data };
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}

async function queryWolframAlpha(query) {
    query = btoa(query);
    const url = `https://api.totob12.com/wolframalpha?query=${encodeURIComponent(query)}`;
    console.log(url);
    try {
        const response = await fetch(url);
        const data = await response.text();
        return { response: data };
    } catch (error) {
        console.error("Error querying Wolfram Alpha:", error);
        return { error: error };
    }
}

async function takeScreenshot() {
    try {
        const img = await screenshot({ format: "png" });
        const base64Image = img.toString("base64");
        const imagePart = base64ToGenerativePart(base64Image, "image/png");
        return imagePart;
    } catch (error) {
        console.error("Error taking screenshot:", error);
        return { error: error.message };
    }
}

async function getRandomPicture() {
    const directoryPath = "C:/a/personal/tmp";

    try {
        const files = fs.readdirSync(directoryPath);

        // Filter only known image extensions
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        const imageFiles = files.filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return allowedExtensions.includes(ext);
        });

        if (imageFiles.length === 0) {
            return { error: "No images found in the specified directory." };
        }

        // Pick a random index
        const randomIndex = Math.floor(Math.random() * imageFiles.length);
        const chosenFile = imageFiles[randomIndex];

        // Create absolute path
        const absolutePath = path.join(directoryPath, chosenFile);

        // Return an object with a "path" (or any key you like)
        return { path: absolutePath.replace(/\\/g, "/") };
    } catch (error) {
        console.error("Error in getRandomPicture:", error);
        return { error: error.message };
    }
}


const functions = {
    getDateAndTime: () => {
        return getDateAndTime();
    },
    getWeather: ({ location }) => {
        return getWeather(location);
    },
    searchInternet: ({ query }) => {
        return searchInternet(query);
    },
    lookWebpage: ({ link }) => {
        return lookWebpage(link);
    },
    searchImages: ({ query }) => {
        return searchImages(query);
    },
    generateImage: ({ query }) => {
        return generateImage(query);
    },
    queryWolframAlpha: ({ query }) => {
        return queryWolframAlpha(query);
    },
    takeScreenshot: () => {
        return takeScreenshot();
    },
    getRandomPicture: () => {
        return getRandomPicture();
    },
};

const tools = [
    {
        name: "getDateAndTime",
        description: "Get the current date and time",
    },
    {
        name: "getWeather",
        parameters: {
            type: "OBJECT",
            description: "Get the current weather for a precise location, in metric units",
            properties: {
                location: {
                    type: "STRING",
                    description: "The precise location/city to get the weather for, in the simplest format possible (e.g. 'washington dc', 'paris').",
                },
            },
            required: ["location"],
        },
    },
    {
        name: "searchInternet",
        parameters: {
            type: "OBJECT",
            description: "Search the internet for information",
            properties: {
                query: {
                    type: "STRING",
                    description: "The query to search the internet for",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "lookWebpage",
        parameters: {
            type: "OBJECT",
            description: "Look up a webpage; gets you the text content of the webpage",
            properties: {
                link: {
                    type: "STRING",
                    description: "The URL of the webpage to look up",
                },
            },
            required: ["link"],
        },
    },
    {
        name: "searchImages",
        parameters: {
            type: "OBJECT",
            description: "Search the internet for images",
            properties: {
                query: {
                    type: "STRING",
                    description: "The query to search the internet for images",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "generateImage",
        parameters: {
            type: "OBJECT",
            description: "Generate and create an image with the given text",
            properties: {
                query: {
                    type: "STRING",
                    description: "The text to generate the image with",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "queryWolframAlpha",
        parameters: {
            type: "OBJECT",
            description: "Query Wolfram Alpha for information, math, statistics. To be used over the internet",
            properties: {
                query: {
                    type: "STRING",
                    description: "The query to send to Wolfram Alpha",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "takeScreenshot",
        description: "Take a screenshot of the user's screen. Use this to see the user's screen and get needed information",
    },
    {
        name: "getRandomPicture",
        description: "Return a random local picture's path from my local pictures.",
    },
];

module.exports = { functions, tools };
