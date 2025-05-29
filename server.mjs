import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import https from 'https';

////////////////////////////////////////////////////////////////////////////////
// CONFIGURATION
////////////////////////////////////////////////////////////////////////////////

const OUTFILE = path.resolve('./public/schedule.json');
const API_URL = 'https://www.rolandgarros.com/api/en-us/polling';
const UPDATE_INTERVAL = 30_000; // 30 seconds
const PORT = 3000;

// CORS whitelist
const whitelist = [
  'http://localhost:3000',
  'https://kayleecragg.github.io',
  'https://tennis.ngrok.app/'
];

////////////////////////////////////////////////////////////////////////////////
// EXPRESS SETUP
////////////////////////////////////////////////////////////////////////////////

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    callback(null, whitelist.includes(origin));
  }
}));
app.use(express.static('public'));

////////////////////////////////////////////////////////////////////////////////
// FETCH & TRANSFORM MATCH DATA
////////////////////////////////////////////////////////////////////////////////

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

async function fetchPollingData() {
  const res = await fetch(API_URL, { agent: insecureAgent });
  if (!res.ok) throw new Error(`Failed to fetch RG polling API: ${res.status}`);
  return res.json();
}

function roundToShortLabel(roundLabel) {
  if (!roundLabel) return null;
  const label = roundLabel.toLowerCase();
  if (label.includes('first')) return 'R1';
  if (label.includes('second')) return 'R2';
  if (label.includes('third')) return 'R3';
  if (label.includes('fourth')) return 'R4';
  if (label.includes('quarter')) return 'QF';
  if (label.includes('semi')) return 'SF';
  if (label.includes('final')) return 'F';
  return null;
}

function normalizeStatus(status) {
  const normalized = status?.toLowerCase() || 'unknown';
  const validStatuses = ['in_progress', 'finished', 'not_started', 'interrupted'];
  return validStatuses.includes(normalized) ? normalized : 'unknown';
}

function normalizeMatch(match) {
  const teamAPlayers = match.teamA.players.map(p => ({
    name: `${p.firstName[0]}. ${p.lastName}`,
    country: p.country || null
  }));

  const teamBPlayers = match.teamB.players.map(p => ({
    name: `${p.firstName[0]}. ${p.lastName}`,
    country: p.country || null
  }));

  const score = {
    current: {
      home: match.teamA.points || "0",
      away: match.teamB.points || "0"
    },
    sets: {
      home: match.teamA.sets.map(s => s.score),
      away: match.teamB.sets.map(s => s.score)
    }
  };

  return {
    id: match.id,
    court: match.matchData.courtName || 'Unknown Court',
    typeLabel: match.matchData.typeLabel || null,
    home: teamAPlayers.map(p => p.name).join(' / '),
    away: teamBPlayers.map(p => p.name).join(' / '),
    playersA: teamAPlayers,
    playersB: teamBPlayers,
    seedA: match.teamA.seed || null,
    seedB: match.teamB.seed || null,
    status: normalizeStatus(match.matchData.status),
    startTime: null,
    endTime: match.matchData.endTimestamp || null,
    notBefore: match.matchData.notBefore || null,
    round: roundToShortLabel(match.matchData.roundLabel),
    score,
    duration: sourceMatch.matchData.durationInMinutes || 0
  };
}

async function updateSchedule() {
  try {
    const data = await fetchPollingData();
    const matches = (data.matches || []).map(normalizeMatch);

    const grouped = matches.reduce((acc, match) => {
      (acc[match.court] ||= []).push(match);
      return acc;
    }, {});

    await fs.mkdir(path.dirname(OUTFILE), { recursive: true });
    await fs.writeFile(OUTFILE, JSON.stringify(grouped, null, 2), 'utf8');
    console.log(new Date().toISOString(), 'Updated schedule.json');
  } catch (err) {
    console.error('❌ Update failed:', err);
  }
}

////////////////////////////////////////////////////////////////////////////////
// START SERVER AND SCHEDULER
////////////////////////////////////////////////////////////////////////////////

updateSchedule();
setInterval(updateSchedule, UPDATE_INTERVAL);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
