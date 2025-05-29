
# Backend for [Tennis checkerboard](https://github.com/kayleecragg/tennis)

## Installation
```
npm i
```

## To run
```
npm start
```

This will start a Node.js + Express server that periodically polls the [Roland-Garros official API](https://www.rolandgarros.com/api/en-us/polling), normalises match data (e.g. player names, seeds, scores), and writes it to a local schedule.json file served via a static endpoint. 

This allows the frontend to fetch fresh match data every 4 seconds.

Ngrok is used to expose the backend publicly so that GitHub Pages can access schedule.json during development.

Notes:
- ngrok must be running and updated if the URL changes, and the frontend should fetch from that public [URL](https://tennis.ngrok.app/).

## Start ngrok

```
npx ngrok http --url=tennis.ngrok.app 3000
```

But you might my authtoken

