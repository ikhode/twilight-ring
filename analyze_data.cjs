
const https = require('https');

const url = "https://record.inteligent.software/data/08dca284-19aa-4cda-a9b5-7dc7cc924b10";

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Data Type:", typeof json);
            if (Array.isArray(json)) {
                console.log("Is Array: Yes");
                console.log("Length:", json.length);
                if (json.length > 0) {
                    console.log("First Item Structure:", JSON.stringify(json[0], null, 2));
                }
            } else {
                console.log("Is Array: No");
                console.log("Keys:", Object.keys(json));
                // Print first few keys/values structure
                const sample = {};
                for (const key of Object.keys(json).slice(0, 3)) {
                    sample[key] = json[key];
                }
                console.log("Sample Structure:", JSON.stringify(sample, null, 2));
            }
        } catch (e) {
            console.error("Error parsing JSON:", e.message);
            console.log("Raw (first 500 chars):", data.substring(0, 500));
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
