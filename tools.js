const { image_search } = require("duckduckgo-images-api");
const axios = require('axios');
const cheerio = require('cheerio');

function getDateAndTime() {
    const date_and_time = new Date().toUTCString();
    return { date_and_time: date_and_time };
}

async function getWeather(location) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.WEATHER_KEY}&units=metric`;
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            return { weather: data };
        })
        .catch(error => {
            console.error(error);
            return { error: error };
        });
}

async function getImage(query) {
    try {
        const results = await image_search({
            query: query,
            moderate: false,
            iterations: 1,
            retries: 2,
        });
        const images = results.slice(0, 4).map(result =>
            `https://wsrv.nl/?url=${encodeURIComponent(result.image)}&w=300&h=300`
            // result.image
        );
        return { images };
    } catch (error) {
        console.error(error);
        return { images: [] };
    }
}

async function generateImage(query) {
    const imageUrl = `https://fast-flux-demo.replicate.workers.dev/api/generate-image?text=${encodeURIComponent(query)}`;
    return { generatedImageUrl: imageUrl };
}

async function performInternetSearch(query) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        };

        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, { headers });

        if (response.status !== 200) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const $ = cheerio.load(response.data);
        const webResults = [];
        $('div.result.results_links.results_links_deep.web-result').each((i, elem) => {
            const title = $(elem).find('h2.result__title a.result__a').text().trim();
            const url = $(elem).find('h2.result__title a.result__a').attr('href');
            const description = $(elem).find('a.result__snippet').text().trim();
            const favicon = $(elem).find('img.result__icon__img').attr('src') || '';

            if (!$(elem).find('.badge--ad').length) {
                webResults.push({ title, url, description, favicon });
            }
        });

        const limitedWebResults = webResults.slice(0, 10);

        return { webResults: limitedWebResults };
    } catch (error) {
        console.error(error);
        return { webResults: error };
    }
}

async function queryWolframAlpha(query) {
    const url = `https://www.wolframalpha.com/api/v1/llm-api?appid=${process.env.WOLFRAMALPHA_KEY}&input=${encodeURIComponent(query)}`;
    console.log(url);
    try {
        const response = await fetch(url);
        const data = await response.text();
        return { response: data };
    } catch (error) {
        console.error('Error querying Wolfram Alpha:', error);
        return { error: error };
    }
}

// I want to add a new tool that can take a screenshot of my screen.

const functions = {
    getDateAndTime: () => {
        return getDateAndTime()
    },
    getWeather: ({ location }) => {
        return getWeather(location);
    },
    getImage: ({ query }) => {
        return getImage(query);
    },
    generateImage: ({ query }) => {
        return generateImage(query);
    },
    performInternetSearch: ({ query }) => {
        return performInternetSearch(query);
    },
    queryWolframAlpha: ({ query }) => {
        return queryWolframAlpha(query);
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
                    description: "The precise location/city to get the weather for, in the simplest format possible (e.g. 'washington dc', 'paris'). Do not use commas or other special characters.",
                },
            },
            required: ["location"],
        },
    },
    {
        name: "getImage",
        parameters: {
            type: "OBJECT",
            description: "Search for images on the web",
            properties: {
                query: {
                    type: "STRING",
                    description: "The search query for the images",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "generateImage",
        parameters: {
            type: "OBJECT",
            description: "Generate an image with the given text using AI",
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
        name: "performInternetSearch",
        parameters: {
            type: "OBJECT",
            description: "Perform a search on the internet. To use for general information and web results",
            properties: {
                query: {
                    type: "STRING",
                    description: "The search query for the internet search",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "queryWolframAlpha",
        parameters: {
            type: "OBJECT",
            description: "Query Wolfram Alpha for information, math, statistics",
            properties: {
                query: {
                    type: "STRING",
                    description: "The query to send to Wolfram Alpha",
                },
            },
            required: ["query"],
        },
    },
];

module.exports = { functions, tools };