const { image_search } = require("duckduckgo-images-api");

function getDateAndTime() {
    const date_and_time = new Date();
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
            `https://wsrv.nl/?url=${encodeURIComponent(result.image)}`
        );
        return { images };
    } catch (error) {
        console.error(error);
        return { images: [] };
    }
}

async function generateImage(query) {
        const imageUrl = `https://fast-flux-demo.replicate.workers.dev/api/generate-image?text=${encodeURIComponent(query)}`;
        return { url: imageUrl };
}

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
];

module.exports = { functions, tools };